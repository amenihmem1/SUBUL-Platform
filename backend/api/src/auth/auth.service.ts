import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { Response, Request } from 'express';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { ReferralsService } from '../referrals/referrals.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import type { User } from '../users/entities/user.entity';
import { effectiveRoleForEmail } from './admin-emails';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly companiesService: CompaniesService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly referralsService: ReferralsService,
  ) {}

  private get sessionSecret() {
    return this.configService.get<string>('SESSION_SECRET') || 'fallback-secret-for-dev-only';
  }

  // Sign cookie data
  private signSessionData(data: string): string {
    const hmac = crypto.createHmac('sha256', this.sessionSecret);
    hmac.update(data);
    const signature = hmac.digest('hex');
    return `${data}.${signature}`;
  }

  // Verify and extract cookie data
  private verifySessionData(signedData: string): string | null {
    if (!signedData || typeof signedData !== 'string') return null;
    
    const parts = signedData.split('.');
    // Expect exactly one dot separating payload and signature
    if (parts.length !== 2) {
      // It might be an old unsigned cookie, reject it to be safe
      return null;
    }
    
    const [payload, signature] = parts;
    const hmac = crypto.createHmac('sha256', this.sessionSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Prevent timing attacks
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return payload;
    }
    
    return null;
  }

  async logout(req: Request, res: Response) {
    console.log('Logging out user...');

    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('auth_session', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('auth_state', { path: '/' });
    res.clearCookie('selected_role', { path: '/' });
    res.clearCookie('access_token', { path: '/' });

    const wantsJson =
      req.headers.accept?.includes('application/json') ||
      req.headers['x-requested-with'] === 'XMLHttpRequest';

    if (wantsJson) {
      return res.json({ message: 'Logged out' });
    }

    const returnToUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`;
    return res.redirect(returnToUrl);
  }

  // ── Local JWT Auth (email/password) ────────────────────────────────────────

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash || user.passwordHash === 'auth0-managed') {
      return null;
    }
    const bcrypt = await import('bcrypt');
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;
    return user;
  }

  async loginLocal(
    email: string,
    password: string,
  ): Promise<
    | { access_token: string; user: { id: number; email: string; fullName?: string; role?: string; isEmailVerified?: boolean } }
    | { requiresVerification: true; email: string }
  > {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isEmailVerified) {
      return { requiresVerification: true, email: user.email };
    }
    try {
      await this.usersService.updateLastLogin(user.id);
    } catch (error) {
      this.logger.warn(
        `[Auth] Unable to update last_login for user id=${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const role = effectiveRoleForEmail(user.role, user.email);
    const payload = {
      sub: user.id,
      email: user.email,
      role,
      hasCompletedAssessment: user.hasCompletedAssessment,
      isEmailVerified: user.isEmailVerified,
    };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async registerLocal(
    email: string,
    password: string,
    fullName?: string,
    role?: string,
    companyName?: string,
    refCode?: string,
    signupIp?: string,
  ): Promise<
    | { requiresVerification: true; email: string; emailSent: boolean; emailError?: string }
    | {
        requiresVerification: false;
        email: string;
        user: {
          id: number;
          email: string;
          fullName?: string;
          role?: string;
          companyId?: string;
          isEmailVerified: boolean;
        };
      }
  > {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }
    const userRole = (role || 'learner').toLowerCase();
    const blocked = new Set(['employer', 'university', 'admin', 'recruiter', 'instructor']);
    if (blocked.has(userRole)) {
      throw new ForbiddenException('This account type must be created by an administrator');
    }
    const user = await this.usersService.createLocalUser({
      email,
      password,
      fullName,
      role: 'learner',
      companyName,
    });

    // Referral tracking — fire-and-forget, never blocks registration
    if (refCode) {
      this.referralsService.trackSignup(user.id, refCode, signupIp).catch((err) => {
        this.logger.warn(`[Auth] Referral trackSignup failed (non-blocking): ${err instanceof Error ? err.message : String(err)}`);
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.usersService.updateVerificationToken(email, verificationToken, tokenExpires);

    try {
      await this.mailService.sendEmailVerification(email, verificationToken);
      this.logger.log(`[Auth] Verification email sent to ${email}`);
      return {
        requiresVerification: true,
        email: user.email,
        emailSent: true,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[Auth] Verification email failed for ${email}: ${reason}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        requiresVerification: true,
        email: user.email,
        emailSent: false,
        emailError: reason,
      };
    }
  }

  async getMe(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: effectiveRoleForEmail(user.role, user.email),
      profilePicture: user.profilePicture,
      companyName: user.companyName,
      companyId: user.companyId,
      universityId: user.universityId,
      phone: user.phone,
      address: user.address,
      bio: user.bio,
      isEmailVerified: user.isEmailVerified,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      status: user.status,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }


  async forgotPasswordEmail(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.updateResetToken(email, resetToken, tokenExpires);

    try {
      await this.mailService.sendPasswordReset(email, resetToken);
    } catch (error) {
      await this.usersService.clearResetToken(email);
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[Auth] Password reset email failed for ${email}: ${reason}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Unable to send password reset email. Please try again in a few minutes or contact support.',
      );
    }

    try {
      await this.dataSource.query(`INSERT INTO password_reset_request_log (user_id) VALUES ($1)`, [user.id]);
    } catch (e) {
      this.logger.warn(`password_reset_request_log insert failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    return { message: 'If an account exists with this email, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new BadRequestException('Password must include uppercase, lowercase, and a number');
    }

    const user = await this.usersService.findByResetToken(token);

    if (!user || !user.passwordResetTokenExpires || new Date(user.passwordResetTokenExpires) < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.email, passwordHash);
    await this.usersService.clearResetToken(user.email);

    this.logger.log(`Password reset completed for user id=${user.id}`);

    return { message: 'Password has been reset successfully' };
  }

  async resendEmailVerification(email: string): Promise<{ message: string; emailSent: boolean }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return {
        message: 'If an account exists with this email and is not verified, a verification email has been sent.',
        emailSent: false,
      };
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.updateVerificationToken(email, verificationToken, tokenExpires);

    try {
      this.logger.log(`[Auth] ── Resend email trigger START for ${email} ──`);
      await this.mailService.sendEmailVerification(email, verificationToken);
      this.logger.log(`[Auth] ── Resend email trigger END — SUCCESS for ${email} ──`);
      return { message: 'Verification email has been sent successfully.', emailSent: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[Auth] ── Resend email trigger END — FAILED for ${email}: ${reason} ──`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(`Failed to send verification email: ${reason}`);
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.usersService.findByVerificationToken(token);

    if (!user || !user.emailVerificationTokenExpires || new Date(user.emailVerificationTokenExpires) < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.usersService.verifyEmail(user.email);
    await this.usersService.clearVerificationToken(user.email);

    // Notify referral system — fire-and-forget
    this.referralsService.onEmailVerified(user.id).catch((err) => {
      this.logger.warn(`[Auth] Referral onEmailVerified failed (non-blocking): ${err instanceof Error ? err.message : String(err)}`);
    });

    return { message: 'Email has been verified successfully' };
  }

  /**
   * Change email for unverified users. Generates a new verification token and sends to the new email.
   */
  async changeEmail(currentEmail: string, newEmail: string): Promise<{ message: string; emailSent: boolean }> {
    // Validate new email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new BadRequestException('Invalid email address format');
    }

    // Update the email in DB (only works if user is unverified)
    const updatedUser = await this.usersService.updateEmail(currentEmail, newEmail);

    if (!updatedUser) {
      return {
        message: 'If an account exists with this email and is not verified, the email has been updated.',
        emailSent: false,
      };
    }

    // Generate new verification token for the new email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.updateVerificationToken(newEmail, verificationToken, tokenExpires);

    // Send verification email to the NEW address
    try {
      this.logger.log(`[Auth] ── Email change: sending verification to ${newEmail} ──`);
      await this.mailService.sendEmailVerification(newEmail, verificationToken);
      this.logger.log(`[Auth] ── Email change: verification sent to ${newEmail} ──`);
      return { message: 'Email updated successfully. A verification email has been sent to the new address.', emailSent: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[Auth] ── Email change: failed to send verification to ${newEmail}: ${reason} ──`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(`Failed to send verification email: ${reason}`);
    }
  }
}

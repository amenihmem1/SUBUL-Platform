import { Controller, Get, Post, Body, Param, Res, Req, UseGuards, HttpCode, HttpStatus, Ip } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiCookieAuth,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Local login (email/password)', description: 'Authenticates with email and password, returns JWT.' })
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] } })
  @ApiResponse({ status: 200, description: 'Returns access_token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async loginLocal(@Body() body: { email: string; password: string }) {
    return this.authService.loginLocal(body.email, body.password);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Local registration', description: 'Registers a new user locally. Does not return a session until email is verified (except university invite flow).' })
  @ApiResponse({ status: 201, description: 'requiresVerification + email, or invite user payload without access_token' })
  @ApiResponse({ status: 400, description: 'User already exists or invalid data' })
  async registerLocal(
    @Body() body: {
      email: string;
      password: string;
      fullName?: string;
      role?: string;
      companyName?: string;
      refCode?: string;
    },
    @Req() req: Request & { ip?: string; headers?: Record<string, string> },
  ) {
    const ip = (req as any).headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      || (req as any).headers?.['x-real-ip']
      || (req as any).ip
      || undefined;
    return this.authService.registerLocal(
      body.email,
      body.password,
      body.fullName,
      body.role,
      body.companyName,
      body.refCode,
      ip,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Get current user from JWT', description: 'Returns the authenticated user.' })
  @ApiResponse({ status: 200, description: 'User object' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Req() req: Request & { user: { id: number; email: string; fullName?: string; role?: string; [key: string]: unknown } }) {
    return this.authService.getMe(req.user as any);
  }

  @Get('logout')
  @ApiOperation({ summary: 'Log out current user', description: 'Clears auth cookies and redirects to home.' })
  @ApiResponse({ status: 302, description: 'Redirects to home' })
  logout(@Req() req: Request, @Res() res: Response) {
    return this.authService.logout(req, res);
  }

  @Post('forgot-password-email')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset via email', description: 'Sends a password reset email to the user with a reset link.' })
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] } })
  @ApiResponse({ status: 200, description: 'Reset email sent if user exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async forgotPasswordEmail(@Body() body: { email: string }) {
    return this.authService.forgotPasswordEmail(body.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token', description: 'Resets the user password using a valid reset token.' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string' }, newPassword: { type: 'string' } }, required: ['token', 'newPassword'] } })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email (JSON)', description: 'Validates token and marks email verified.' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] } })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmailPost(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('resend-verification')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend email verification', description: 'Rate limited: 1 per 60s per IP.' })
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] } })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resendVerificationAlias(@Body() body: { email: string }) {
    return this.authService.resendEmailVerification(body.email);
  }

  @Post('verify-email/resend')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend email verification (legacy path)', description: 'Same as POST /resend-verification.' })
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] } })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendEmailVerification(body.email);
  }

  @Get('verify-email/:token')
  @ApiOperation({
    summary: 'Verify email via link (redirect)',
    description: 'Legacy: verifies then redirects to localized frontend. Prefer SPA POST /verify-email.',
  })
  @ApiParam({ name: 'token', description: 'Email verification token' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend verify-email page' })
  async verifyEmailRedirect(@Param('token') token: string, @Res() res: Response) {
    const raw = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    // Strip trailing slashes and trailing locale path (e.g. /fr) to prevent double-locale URLs
    const frontendUrl = raw.replace(/\/+$/, '').replace(/\/[a-z]{2}$/i, '');
    const locale = this.configService.get<string>('EMAIL_VERIFICATION_LOCALE', 'en');
    try {
      await this.authService.verifyEmail(token);
      return res.redirect(`${frontendUrl}/${locale}/auth/verify-email?status=success`);
    } catch {
      return res.redirect(`${frontendUrl}/${locale}/auth/verify-email?status=invalid`);
    }
  }

  @Post('change-email')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change email for unverified accounts', description: 'Updates email address for unverified users and sends verification to new email. Rate limited: 3 per 60s.' })
  @ApiBody({ schema: { type: 'object', properties: { currentEmail: { type: 'string' }, newEmail: { type: 'string' } }, required: ['currentEmail', 'newEmail'] } })
  @ApiResponse({ status: 200, description: 'Email updated and verification sent' })
  @ApiResponse({ status: 400, description: 'Invalid email or already verified' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async changeEmail(@Body() body: { currentEmail: string; newEmail: string }) {
    return this.authService.changeEmail(body.currentEmail, body.newEmail);
  }
}

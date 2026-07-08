import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { UniversityInvite, InviteStatus } from './entities/university-invite.entity';
import { University } from './entities/university.entity';
import { User } from '../users/entities/user.entity';
import { UniversityMembership, UniversityMemberRole } from './entities/university-membership.entity';
import { UniversityMembersService } from './university-members.service';
import { UniversityLicensesService } from './university-licenses.service';
import { UniversityAuditService } from './university-audit.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

const INVITE_TTL_DAYS = 7;
const MAX_RESENDS = 3;

@Injectable()
export class UniversityInvitesService {
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(UniversityInvite)
    private readonly inviteRepo: Repository<UniversityInvite>,
    @InjectRepository(University)
    private readonly uniRepo: Repository<University>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UniversityMembership)
    private readonly memberRepo: Repository<UniversityMembership>,
    private readonly members: UniversityMembersService,
    private readonly licenses: UniversityLicensesService,
    private readonly audit: UniversityAuditService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000').replace(/\/+$/, '');
  }

  async list(universityId: string, status?: string) {
    const qb = this.inviteRepo
      .createQueryBuilder('i')
      .where('i.university_id = :universityId', { universityId })
      .orderBy('i.created_at', 'DESC');
    if (status) qb.andWhere('i.status = :status', { status });
    return qb.getMany();
  }

  async sendInvite(universityId: string, dto: {
    email: string;
    role?: UniversityMemberRole;
    cohortId?: string;
    departmentId?: string;
    invitedBy?: number;
  }): Promise<{ invite: UniversityInvite; conflict?: string }> {
    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? 'student';

    const uni = await this.uniRepo.findOne({ where: { id: universityId } });
    if (!uni) throw new NotFoundException('University not found');

    if (role === 'student') {
      await this.licenses.assertCanInviteStudent(universityId);
    } else {
      await this.licenses.assertActiveLicenseNotExpired(universityId);
    }

    // Duplicate invite check
    const existing = await this.inviteRepo.findOne({
      where: { universityId, email, status: 'pending' },
    });
    if (existing) {
      throw new ConflictException('An active invite already exists for this email');
    }

    // Existing account conflict check
    let conflict: string | undefined;
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      if (existingUser.universityId && existingUser.universityId !== universityId) {
        throw new ConflictException('This user already belongs to another university');
      }
      if (existingUser.universityId === universityId) {
        throw new ConflictException('This user is already a member of your university');
      }
      conflict = 'existing_account'; // linked account scenario
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
    const token = randomBytes(32).toString('hex');

    const invite = this.inviteRepo.create({
      universityId,
      email,
      token,
      role,
      status: 'pending',
      cohortId: dto.cohortId,
      departmentId: dto.departmentId,
      invitedBy: dto.invitedBy,
      expiresAt,
    });
    const saved = await this.inviteRepo.save(invite);

    await this.sendInviteEmail(saved, uni.name);

    await this.audit.log({
      universityId, actorUserId: dto.invitedBy,
      entityType: 'invite', entityId: saved.id,
      action: 'invite.sent', newValue: { email, role },
    });

    return { invite: saved, conflict };
  }

  async bulkInvite(universityId: string, rows: Array<{
    email: string;
    fullName?: string;
    department?: string;
    cohort?: string;
  }>, invitedBy?: number): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const uni = await this.uniRepo.findOne({ where: { id: universityId } });
    if (!uni) throw new NotFoundException('University not found');

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const seen = new Set<string>();
    for (const row of rows) {
      const email = row.email?.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Invalid email: ${row.email}`);
        skipped++;
        continue;
      }
      if (seen.has(email)) {
        errors.push(`Duplicate in CSV: ${email}`);
        skipped++;
        continue;
      }
      seen.add(email);
      try {
        await this.sendInvite(universityId, { email, role: 'student', invitedBy });
        imported++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${email}: ${msg}`);
        skipped++;
      }
    }
    return { imported, skipped, errors };
  }

  async resend(universityId: string, inviteId: string, actorUserId?: number) {
    const invite = await this.inviteRepo.findOne({ where: { id: inviteId, universityId } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status === 'expired') {
      invite.status = 'pending';
    }
    if (invite.status !== 'pending') {
      throw new BadRequestException(`Cannot resend an invite with status '${invite.status}'`);
    }
    if (invite.role === 'student') {
      await this.licenses.assertCanInviteStudent(universityId);
    } else {
      await this.licenses.assertActiveLicenseNotExpired(universityId);
    }
    if (invite.resendCount >= MAX_RESENDS) {
      throw new BadRequestException('Maximum resend limit reached for this invite');
    }
    invite.token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
    invite.expiresAt = expiresAt;
    invite.resendCount += 1;
    invite.lastResentAt = new Date();
    await this.inviteRepo.save(invite);

    const uni = await this.uniRepo.findOne({ where: { id: universityId } });
    await this.sendInviteEmail(invite, uni?.name ?? 'Your University');

    await this.audit.log({
      universityId, actorUserId, entityType: 'invite', entityId: inviteId,
      action: 'invite.resent', newValue: { resendCount: invite.resendCount },
    });
    return { resendCount: invite.resendCount };
  }

  async cancel(universityId: string, inviteId: string, actorUserId?: number) {
    const invite = await this.inviteRepo.findOne({ where: { id: inviteId, universityId } });
    if (!invite) throw new NotFoundException('Invite not found');
    invite.status = 'cancelled';
    await this.inviteRepo.save(invite);
    await this.audit.log({
      universityId, actorUserId, entityType: 'invite', entityId: inviteId,
      action: 'invite.cancelled',
    });
    return { cancelled: true };
  }

  async acceptInvite(token: string, opts: {
    fullName?: string;
    passwordHash?: string;
    existingUserId?: number;
    ipAddress?: string;
  }): Promise<{ universityId: string; userId: number; role: UniversityMemberRole }> {
    const invite = await this.inviteRepo.findOne({ where: { token, status: 'pending' } });
    if (!invite) throw new BadRequestException('Invalid or already used invite token');
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      invite.status = 'expired';
      await this.inviteRepo.save(invite);
      throw new BadRequestException('This invite has expired. Please ask your administrator to resend it.');
    }

    let userId: number;
    const uni = await this.uniRepo.findOne({ where: { id: invite.universityId } });
    if (!uni) throw new NotFoundException('University not found');

    if (invite.role === 'student') {
      await this.licenses.assertActiveLicenseNotExpired(invite.universityId);
    }

    if (opts.existingUserId) {
      // Link existing account
      const user = await this.userRepo.findOne({ where: { id: opts.existingUserId } });
      if (!user) throw new NotFoundException('User not found');
      if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new BadRequestException('Invite email does not match your account email');
      }
      userId = user.id;
      await this.userRepo.update(userId, { universityId: invite.universityId });
    } else {
      // Create new user account
      if (!opts.fullName || !opts.passwordHash) {
        throw new BadRequestException('fullName and password required for new account');
      }
      const existing = await this.userRepo.findOne({ where: { email: invite.email } });
      if (existing) {
        throw new ConflictException('An account with this email already exists. Please log in first.');
      }
      const newUser = this.userRepo.create({
        email: invite.email,
        fullName: opts.fullName,
        passwordHash: opts.passwordHash,
        role: invite.role === 'student' ? 'student' : 'university',
        status: 'active',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        universityId: invite.universityId,
      });
      const saved = await this.userRepo.save(newUser);
      userId = saved.id;
    }

    const existingMember = await this.memberRepo.findOne({
      where: { universityId: invite.universityId, userId },
    });
    if (existingMember?.status === 'active') {
      invite.status = 'accepted';
      await this.inviteRepo.save(invite);
      await this.audit.log({
        universityId: invite.universityId, actorUserId: userId,
        entityType: 'invite', entityId: invite.id,
        action: 'invite.accepted_idempotent', ipAddress: opts.ipAddress,
        newValue: { userId, role: invite.role },
      });
      return { universityId: invite.universityId, userId, role: invite.role };
    }

    if (
      invite.role === 'student' &&
      (!existingMember || existingMember.status === 'removed' || existingMember.status === 'inactive')
    ) {
      await this.licenses.assertCanInviteStudent(invite.universityId);
    }

    await this.members.createMembership(invite.universityId, {
      userId,
      role: invite.role,
      cohortId: invite.cohortId,
      departmentId: invite.departmentId,
    });

    if (invite.role === 'student') {
      await this.licenses.consumeSeat(invite.universityId);
    }

    invite.status = 'accepted';
    await this.inviteRepo.save(invite);

    await this.audit.log({
      universityId: invite.universityId, actorUserId: userId,
      entityType: 'invite', entityId: invite.id,
      action: 'invite.accepted', ipAddress: opts.ipAddress,
      newValue: { userId, role: invite.role },
    });

    return { universityId: invite.universityId, userId, role: invite.role };
  }

  /** Validate invite token without consuming it (for the accept page GET) */
  async validateToken(token: string) {
    const invite = await this.inviteRepo.findOne({
      where: { token, status: 'pending' },
      relations: ['university'],
    });
    if (!invite) throw new NotFoundException('Invalid or expired invite token');
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      if (invite.status === 'pending') {
        invite.status = 'expired';
        await this.inviteRepo.save(invite);
      }
      throw new BadRequestException('This invite has expired');
    }
    return {
      email: invite.email,
      role: invite.role,
      universityName: invite.university?.name,
      universityLogo: invite.university?.logo,
    };
  }

  private async sendInviteEmail(invite: UniversityInvite, universityName: string) {
    const link = `${this.frontendUrl}/en/auth/university-invite?token=${invite.token}`;
    await this.mail.sendUniversityInvite(invite.email, { universityName, inviteLink: link, role: invite.role });
  }

}

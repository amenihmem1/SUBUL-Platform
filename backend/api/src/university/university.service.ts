import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { University } from './entities/university.entity';
import { UniversityProgram } from './entities/university-program.entity';
import { UniversityLicense } from './entities/university-license.entity';
import { UniversityProgramEnrollment } from './entities/university-program-enrollment.entity';
import { UniversityInvite } from './entities/university-invite.entity';
import { UniversityMembership } from './entities/university-membership.entity';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 150);
}

@Injectable()
export class UniversityService {
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(University)
    private readonly uniRepo: Repository<University>,
    @InjectRepository(UniversityProgram)
    private readonly progRepo: Repository<UniversityProgram>,
    @InjectRepository(UniversityLicense)
    private readonly licRepo: Repository<UniversityLicense>,
    @InjectRepository(UniversityProgramEnrollment)
    private readonly enrollRepo: Repository<UniversityProgramEnrollment>,
    @InjectRepository(UniversityInvite)
    private readonly inviteRepo: Repository<UniversityInvite>,
    @InjectRepository(UniversityMembership)
    private readonly memberRepo: Repository<UniversityMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000').replace(/\/+$/, '');
  }

  async createUniversity(data: {
    name: string;
    slug?: string;
    billingEmail?: string;
    primaryContactUserId?: number;
    metadata?: string;
  }): Promise<University> {
    let slug = data.slug || slugify(data.name);
    let n = 0;
    while (await this.uniRepo.findOne({ where: { slug } })) {
      slug = `${slugify(data.name)}-${++n}`;
    }
    const u = this.uniRepo.create({
      name: data.name,
      slug,
      billingEmail: data.billingEmail,
      primaryContactUserId: data.primaryContactUserId,
      metadata: data.metadata,
    });
    return this.uniRepo.save(u);
  }

  async listUniversities(): Promise<University[]> {
    return this.uniRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getUniversity(id: string): Promise<University | null> {
    return this.uniRepo.findOne({ where: { id }, relations: ['programs', 'licenses', 'licenses.plan'] });
  }

  async updateUniversity(id: string, data: Partial<University>): Promise<University> {
    const u = await this.uniRepo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('University not found');
    Object.assign(u, data);
    return this.uniRepo.save(u);
  }

  async deleteUniversity(id: string): Promise<void> {
    const r = await this.uniRepo.delete(id);
    if (!r.affected) throw new NotFoundException('University not found');
  }

  async createProgram(universityId: string, data: { title: string; description?: string; certificationId?: number }) {
    await this.ensureUni(universityId);
    const p = this.progRepo.create({
      universityId,
      title: data.title,
      description: data.description,
      certificationId: data.certificationId,
      active: true,
    });
    return this.progRepo.save(p);
  }

  async listPrograms(universityId: string) {
    return this.progRepo.find({ where: { universityId }, order: { createdAt: 'DESC' } });
  }

  async updateProgram(
    universityId: string,
    programId: string,
    data: { title?: string; description?: string; active?: boolean; certificationId?: number },
  ) {
    const p = await this.progRepo.findOne({ where: { id: programId, universityId } });
    if (!p) throw new NotFoundException('Program not found');
    if (data.title !== undefined) p.title = data.title;
    if (data.description !== undefined) p.description = data.description;
    if (data.active !== undefined) p.active = data.active;
    if (data.certificationId !== undefined) p.certificationId = data.certificationId;
    return this.progRepo.save(p);
  }

  async deleteProgram(universityId: string, programId: string) {
    const p = await this.progRepo.findOne({ where: { id: programId, universityId } });
    if (!p) throw new NotFoundException('Program not found');
    await this.progRepo.remove(p);
    return { deleted: true };
  }

  async assignLicense(
    universityId: string,
    planId: string,
    seatsTotal: number,
    validFrom?: Date,
    validUntil?: Date,
  ) {
    if (!Number.isFinite(seatsTotal) || seatsTotal < 1) {
      throw new BadRequestException('seatsTotal must be at least 1');
    }
    await this.ensureUni(universityId);
    const lic = this.licRepo.create({
      universityId,
      planId,
      seatsTotal,
      seatsUsed: 0,
      validFrom,
      validUntil,
      status: 'active',
    });
    return this.licRepo.save(lic);
  }

  async listLicenses(universityId: string) {
    return this.licRepo.find({ where: { universityId }, relations: ['plan'] });
  }

  private async ensureUni(id: string) {
    const u = await this.uniRepo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('University not found');
    return u;
  }

  assertUniversityAccess(userUniversityId: string | undefined | null, resourceUniversityId: string) {
    if (!userUniversityId || userUniversityId !== resourceUniversityId) {
      throw new ForbiddenException('Not allowed for this university');
    }
  }

  async getDashboardForStaff(universityId: string) {
    const programs = await this.progRepo.count({ where: { universityId } });
    const enrollments = await this.enrollRepo
      .createQueryBuilder('e')
      .innerJoin('e.program', 'p')
      .where('p.university_id = :uid', { uid: universityId })
      .getCount();
    const staff = await this.userRepo.count({ where: { universityId, role: 'university' } });
    const licenses = await this.licRepo.find({ where: { universityId }, relations: ['plan'] });
    const pendingInvites = await this.inviteRepo.count({ where: { universityId, status: 'pending' } });
    return {
      programsCount: programs,
      enrollmentsCount: enrollments,
      staffCount: staff,
      pendingInvites,
      licenses: licenses.map(l => ({
        id: l.id,
        planName: l.plan?.name,
        seatsTotal: l.seatsTotal,
        seatsUsed: l.seatsUsed,
        status: l.status,
        validUntil: l.validUntil,
      })),
    };
  }

  async createInvites(universityId: string, emails: string[], programId?: string) {
    await this.ensureUni(universityId);
    if (programId) {
      const prog = await this.progRepo.findOne({ where: { id: programId, universityId } });
      if (!prog) throw new NotFoundException('Program not found');
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const out: UniversityInvite[] = [];
    for (const email of [...new Set(emails.map(e => e.trim().toLowerCase()))]) {
      if (!email) continue;
      const token = randomBytes(32).toString('hex');
      const inv = this.inviteRepo.create({
        universityId,
        programId,
        email,
        token,
        status: 'pending',
        expiresAt,
      });
      out.push(await this.inviteRepo.save(inv));
    }
    return out;
  }

  async listInvites(universityId: string) {
    return this.inviteRepo.find({ where: { universityId }, order: { createdAt: 'DESC' } });
  }

  async deleteInvite(userId: number, inviteId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.universityId) {
      throw new ForbiddenException('User is not associated with a university');
    }
    const invite = await this.inviteRepo.findOne({ where: { id: inviteId } });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.universityId !== user.universityId) {
      throw new ForbiddenException('Invite does not belong to your university');
    }
    await this.inviteRepo.remove(invite);
    return { message: 'Invite deleted successfully' };
  }

  async listEnrollmentsForProgram(universityId: string, programId: string) {
    const prog = await this.progRepo.findOne({ where: { id: programId, universityId } });
    if (!prog) throw new NotFoundException('Program not found');
    return this.enrollRepo.find({ where: { programId }, relations: ['user'] });
  }

  /** Accept invite token after user registers/logs in with matching email */
  async acceptInviteToken(userId: number, email: string, token: string) {
    const inv = await this.inviteRepo.findOne({ where: { token, status: 'pending' } });
    if (!inv) throw new BadRequestException('Invalid or used invite');
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
      throw new BadRequestException('Invite expired');
    }
    if (inv.email.toLowerCase() !== email.toLowerCase()) {
      throw new BadRequestException('Invite email does not match');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.userRepo.update(userId, { universityId: inv.universityId });

    if (inv.programId) {
      const exists = await this.enrollRepo.findOne({ where: { userId, programId: inv.programId } });
      if (!exists) {
        await this.enrollRepo.save(
          this.enrollRepo.create({
            userId,
            programId: inv.programId,
            status: 'active',
            invitedAt: new Date(),
          }),
        );
      }
    }
    inv.status = 'accepted';
    await this.inviteRepo.save(inv);

    await this.incrementSeatIfNeeded(inv.universityId);
    return { universityId: inv.universityId, programId: inv.programId };
  }

  private async incrementSeatIfNeeded(universityId: string) {
    const lic = await this.licRepo.findOne({
      where: { universityId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
    if (lic && lic.seatsUsed < lic.seatsTotal) {
      lic.seatsUsed += 1;
      await this.licRepo.save(lic);
    }
  }

  /* ─── Admin-only methods ─── */

  async adminList(opts: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 20 } = opts;
    const qb = this.uniRepo.createQueryBuilder('u').orderBy('u.created_at', 'DESC');
    if (status) qb.andWhere('u.status = :status', { status });
    if (search) qb.andWhere('LOWER(u.name) LIKE LOWER(:s)', { s: `%${search}%` });
    const [items, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const data = await Promise.all(items.map(async u => {
      const lic = await this.licRepo.findOne({ where: { universityId: u.id, status: 'active' }, order: { createdAt: 'DESC' } });
      const studentCount = await this.memberRepo.count({ where: { universityId: u.id, role: 'student', status: 'active' } });
      return {
        ...u,
        seatsTotal: lic?.seatsTotal ?? 0,
        seatsUsed: lic?.seatsUsed ?? 0,
        validUntil: lic?.validUntil,
        studentCount,
        daysUntilExpiry: lic?.validUntil
          ? Math.max(0, Math.ceil((new Date(lic.validUntil).getTime() - Date.now()) / 86400000))
          : null,
      };
    }));
    return { data, total, page, limit };
  }

  async getUniversityDetail(id: string) {
    const u = await this.uniRepo.findOne({ where: { id }, relations: ['programs', 'licenses', 'licenses.plan'] });
    if (!u) throw new NotFoundException('University not found');
    const adminCount = await this.memberRepo.count({ where: { universityId: id, role: 'admin', status: 'active' } });
    const studentCount = await this.memberRepo.count({ where: { universityId: id, role: 'student', status: 'active' } });
    const pendingInvites = await this.inviteRepo.count({ where: { universityId: id, status: 'pending' } });
    return { ...u, adminCount, studentCount, pendingInvites };
  }

  async createWithSetup(data: {
    name: string; billingEmail?: string; contactEmail: string;
    contactName?: string; country?: string; website?: string;
  }, actorUserId?: number): Promise<University> {
    let slug = slugify(data.name);
    let n = 0;
    while (await this.uniRepo.findOne({ where: { slug } })) {
      slug = `${slugify(data.name)}-${++n}`;
    }
    const setupToken = randomBytes(48).toString('hex');
    const setupTokenExpiresAt = new Date(Date.now() + 72 * 3600 * 1000);

    // Create or find the contact user
    let contactUser = await this.userRepo.findOne({ where: { email: data.contactEmail } });
    if (!contactUser) {
      contactUser = this.userRepo.create({
        email: data.contactEmail,
        fullName: data.contactName,
        role: 'university',
        status: 'pending',
        requiresPasswordReset: true,
        isEmailVerified: false,
      });
      contactUser = await this.userRepo.save(contactUser);
    }

    const u = this.uniRepo.create({
      name: data.name,
      slug,
      billingEmail: data.billingEmail ?? data.contactEmail,
      primaryContactUserId: contactUser.id,
      country: data.country,
      website: data.website,
      status: 'pending',
      setupToken,
      setupTokenExpiresAt,
      isSetupComplete: false,
    });
    const saved = await this.uniRepo.save(u);

    // Set universityId on the contact user
    await this.userRepo.update(contactUser.id, { universityId: saved.id });

    // Create owner membership
    const membership = this.memberRepo.create({
      universityId: saved.id,
      userId: contactUser.id,
      role: 'owner',
      status: 'inactive',
    });
    await this.memberRepo.save(membership);

    const link = `${this.frontendUrl}/en/auth/university-setup?token=${setupToken}`;
    await this.mail.sendUniversitySetup(data.contactEmail, {
      universityName: data.name,
      setupLink: link,
      contactName: data.contactName,
    });

    return saved;
  }

  async adminUpdate(id: string, data: {
    name?: string; status?: string; logo?: string; website?: string;
    country?: string; phone?: string; address?: string; billingEmail?: string;
    contractStartDate?: string; contractEndDate?: string; suspendReason?: string;
  }, actorUserId?: number): Promise<University> {
    const u = await this.uniRepo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('University not found');
    Object.assign(u, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.logo !== undefined && { logo: data.logo }),
      ...(data.website !== undefined && { website: data.website }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.billingEmail !== undefined && { billingEmail: data.billingEmail }),
      ...(data.contractStartDate !== undefined && { contractStartDate: data.contractStartDate }),
      ...(data.contractEndDate !== undefined && { contractEndDate: data.contractEndDate }),
    });
    return this.uniRepo.save(u);
  }

  async resendSetupEmail(id: string, actorUserId?: number) {
    const u = await this.uniRepo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('University not found');
    if (u.isSetupComplete) throw new BadRequestException('University setup already completed');
    const setupToken = randomBytes(48).toString('hex');
    u.setupToken = setupToken;
    u.setupTokenExpiresAt = new Date(Date.now() + 72 * 3600 * 1000);
    await this.uniRepo.save(u);
    const contact = u.primaryContactUserId
      ? await this.userRepo.findOne({ where: { id: u.primaryContactUserId } })
      : null;
    if (!contact) throw new BadRequestException('No contact user found for this university');
    const link = `${this.frontendUrl}/en/auth/university-setup?token=${setupToken}`;
    await this.mail.sendUniversitySetup(contact.email, { universityName: u.name, setupLink: link });
    return { sent: true };
  }

  async setTempPassword(id: string, tempPassword: string, actorUserId?: number) {
    const u = await this.uniRepo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('University not found');
    if (!u.primaryContactUserId) throw new BadRequestException('No contact user for this university');
    const hash = await bcrypt.hash(tempPassword, 12);
    await this.userRepo.update(u.primaryContactUserId, {
      passwordHash: hash,
      requiresPasswordReset: true,
      status: 'active',
      isEmailVerified: true,
    });
    return { updated: true };
  }

  async getExpiringSoon(days = 30) {
    const cutoff = new Date(Date.now() + days * 86400 * 1000);
    const lics = await this.licRepo.find({
      where: { status: 'active', validUntil: LessThan(cutoff) },
      relations: ['university'],
      order: { validUntil: 'ASC' },
    });
    return lics.map(l => ({
      universityId: l.universityId,
      universityName: l.university?.name,
      licenseId: l.id,
      seatsUsed: l.seatsUsed,
      seatsTotal: l.seatsTotal,
      validUntil: l.validUntil,
      daysLeft: l.validUntil
        ? Math.max(0, Math.ceil((new Date(l.validUntil).getTime() - Date.now()) / 86400000))
        : null,
    }));
  }

  async getAnalytics(universityId: string) {
    const u = await this.uniRepo.findOne({ where: { id: universityId } });
    if (!u) throw new NotFoundException('University not found');
    const [studentCount, adminCount, pendingInvites] = await Promise.all([
      this.memberRepo.count({ where: { universityId, role: 'student', status: 'active' } }),
      this.memberRepo.count({ where: { universityId, status: 'active' } }),
      this.inviteRepo.count({ where: { universityId, status: 'pending' } }),
    ]);
    const lic = await this.licRepo.findOne({ where: { universityId, status: 'active' }, order: { createdAt: 'DESC' } });
    return {
      universityId,
      name: u.name,
      studentCount,
      adminCount,
      pendingInvites,
      license: lic ? { seatsTotal: lic.seatsTotal, seatsUsed: lic.seatsUsed, validUntil: lic.validUntil } : null,
    };
  }

  /** Used by auth controller to complete university owner setup */
  async completeSetup(token: string, opts: { fullName: string; passwordHash: string }) {
    const u = await this.uniRepo.findOne({ where: { setupToken: token } });
    if (!u) throw new BadRequestException('Invalid or already used setup token');
    if (u.setupTokenExpiresAt && new Date(u.setupTokenExpiresAt) < new Date()) {
      throw new BadRequestException('Setup link has expired. Ask your Subul administrator to resend it.');
    }
    if (!u.primaryContactUserId) throw new BadRequestException('No contact user found');
    await this.userRepo.update(u.primaryContactUserId, {
      fullName: opts.fullName,
      passwordHash: opts.passwordHash,
      status: 'active',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      requiresPasswordReset: false,
    });
    await this.memberRepo.update(
      { universityId: u.id, userId: u.primaryContactUserId },
      { status: 'active', joinedAt: new Date() },
    );
    u.setupToken = undefined;
    u.setupTokenExpiresAt = undefined;
    u.isSetupComplete = true;
    u.status = 'active';
    await this.uniRepo.save(u);
    const user = await this.userRepo.findOne({ where: { id: u.primaryContactUserId } });
    return { university: u, user };
  }

  async validateSetupToken(token: string) {
    const u = await this.uniRepo.findOne({ where: { setupToken: token } });
    if (!u) throw new NotFoundException('Invalid or already used setup token');
    if (u.setupTokenExpiresAt && new Date(u.setupTokenExpiresAt) < new Date()) {
      throw new BadRequestException('Setup link has expired');
    }
    const contact = u.primaryContactUserId
      ? await this.userRepo.findOne({ where: { id: u.primaryContactUserId } })
      : null;
    return { universityName: u.name, email: contact?.email };
  }

  /** Student-facing: get own university info (logo, name, cohort, etc.) */
  async getMyInstitution(userId: number, universityId: string) {
    const u = await this.uniRepo.findOne({ where: { id: universityId } });
    if (!u) return null;
    const lic = await this.licRepo.findOne({ where: { universityId, status: 'active' }, order: { createdAt: 'DESC' } });
    const membership = await this.memberRepo.findOne({
      where: { userId, universityId },
      relations: ['cohort', 'department'],
    });
    return {
      id: u.id,
      name: u.name,
      logo: u.logo,
      website: u.website,
      status: u.status,
      license: lic ? { validUntil: lic.validUntil, status: lic.status } : null,
      membership: membership ? {
        role: membership.role,
        cohort: membership.cohort ? { id: membership.cohort.id, name: membership.cohort.name } : null,
        department: membership.department ? { id: membership.department.id, name: membership.department.name } : null,
      } : null,
    };
  }

  async adminListEmployers(page = 1, limit = 20) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.company', 'c')
      .where('LOWER(u.role) = :r', { r: 'employer' })
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    const withJobCount = await Promise.all(
      items.map(async u => {
        let jobCount = 0;
        if (u.companyId) {
          jobCount = await this.userRepo.manager.query(
            `SELECT COUNT(*)::int AS c FROM jobs WHERE company_id = $1`,
            [u.companyId],
          ).then((r: { c: number }[]) => r[0]?.c ?? 0);
        }
        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          status: u.status,
          lastLogin: u.lastLogin,
          company: u.company ? { id: u.company.id, name: u.company.name } : null,
          jobCount,
        };
      }),
    );
    return { data: withJobCount, total, page, limit };
  }

  async listStudents(
    universityId: string,
    options: { page?: number; limit?: number; programId?: string; status?: string; search?: string }
  ) {
    const { page = 1, limit = 10, programId, status, search } = options;

    const programs = await this.progRepo.find({
      where: { universityId },
      select: ['id'],
    });
    const programIds = programs.map(p => p.id);

    if (programIds.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    const qb = this.enrollRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .leftJoinAndSelect('e.program', 'program')
      .where('e.program_id IN (:...programIds)', { programIds });

    if (programId) {
      qb.andWhere('e.program_id = :programId', { programId });
    }

    if (status) {
      qb.andWhere('e.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(user.fullName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    const [items, total] = await qb
      .orderBy('e.enrolledAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: items.map(e => ({
        id: e.user?.id,
        enrollmentId: e.id,
        email: e.user?.email,
        fullName: e.user?.fullName,
        phone: e.user?.phone,
        status: e.status,
        progress: e.progress || 0,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        program: e.program ? {
          id: e.program.id,
          title: e.program.title,
        } : null,
      })),
      total,
      page,
      limit,
    };
  }

  async getStudent(universityId: string, userId: number) {
    const enrollments = await this.enrollRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .leftJoinAndSelect('e.program', 'program')
      .innerJoin('program', 'p', 'p.id = e.program_id AND p.university_id = :uid', { uid: universityId })
      .where('user.id = :userId', { userId })
      .getMany();

    if (enrollments.length === 0) {
      throw new NotFoundException('Student not found in this university');
    }

    const user = enrollments[0].user;
    return {
      id: user?.id,
      email: user?.email,
      fullName: user?.fullName,
      phone: user?.phone,
      createdAt: user?.createdAt,
      enrollments: enrollments.map(e => ({
        enrollmentId: e.id,
        status: e.status,
        progress: e.progress || 0,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        program: e.program ? {
          id: e.program.id,
          title: e.program.title,
        } : null,
      })),
    };
  }

  async updateStudent(
    universityId: string,
    userId: number,
    data: { enrollmentStatus?: string; programId?: string }
  ) {
    const program = data.programId
      ? await this.progRepo.findOne({ where: { id: data.programId, universityId } })
      : null;

    if (data.programId && !program) {
      throw new NotFoundException('Program not found');
    }

    const qb = this.enrollRepo
      .createQueryBuilder('e')
      .innerJoin('e.program', 'p', 'p.id = e.program_id AND p.university_id = :uid', { uid: universityId })
      .where('e.user_id = :userId', { userId });

    if (data.programId) {
      qb.andWhere('e.program_id = :programId', { programId: data.programId });
    }

    const enrollment = await qb.getOne();
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (data.enrollmentStatus) {
      enrollment.status = data.enrollmentStatus;
      if (data.enrollmentStatus === 'completed') {
        enrollment.completedAt = new Date();
      }
    }

    await this.enrollRepo.save(enrollment);
    return this.getStudent(universityId, userId);
  }

  async removeStudent(universityId: string, userId: number, programId?: string) {
    const qb = this.enrollRepo
      .createQueryBuilder('e')
      .innerJoin('e.program', 'p', 'p.id = e.program_id AND p.university_id = :uid', { uid: universityId })
      .where('e.user_id = :userId', { userId });

    if (programId) {
      qb.andWhere('e.program_id = :programId', { programId });
    }

    const enrollment = await qb.getOne();
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    await this.enrollRepo.remove(enrollment);
    return { deleted: true };
  }
}

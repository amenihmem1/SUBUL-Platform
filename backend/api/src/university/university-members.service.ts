import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UniversityMembership, UniversityMemberRole, UniversityMemberStatus } from './entities/university-membership.entity';
import { User } from '../users/entities/user.entity';
import { UniversityLicense } from './entities/university-license.entity';
import { UniversityAuditService } from './university-audit.service';

@Injectable()
export class UniversityMembersService {
  constructor(
    @InjectRepository(UniversityMembership)
    private readonly memberRepo: Repository<UniversityMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UniversityLicense)
    private readonly licRepo: Repository<UniversityLicense>,
    private readonly audit: UniversityAuditService,
    private readonly dataSource: DataSource,
  ) {}

  async list(universityId: string, opts: {
    page?: number; limit?: number; search?: string; role?: string; status?: string;
  } = {}) {
    const { page = 1, limit = 20, search, role, status } = opts;
    const qb = this.memberRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .leftJoinAndSelect('m.department', 'd')
      .leftJoinAndSelect('m.cohort', 'c')
      .where('m.university_id = :universityId', { universityId });
    if (role) qb.andWhere('m.role = :role', { role });
    if (status) qb.andWhere('m.status = :status', { status });
    if (search) {
      qb.andWhere(
        '(LOWER(u.fullName) LIKE LOWER(:s) OR LOWER(u.email) LIKE LOWER(:s))',
        { s: `%${search}%` },
      );
    }
    const [items, total] = await qb
      .orderBy('m.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data: items.map(m => this.toDto(m)),
      total, page, limit,
    };
  }

  async updateStatus(
    universityId: string,
    membershipId: string,
    newStatus: UniversityMemberStatus,
    actorUserId: number,
    ipAddress?: string,
  ) {
    const m = await this.findOwned(universityId, membershipId);
    if (m.role === 'owner' && newStatus === 'removed') {
      throw new ForbiddenException('Cannot remove the university owner');
    }
    const oldStatus = m.status;

    if (newStatus === 'removed') {
      await this.dataSource.transaction(async em => {
        m.status = 'removed';
        m.removedAt = new Date();
        await em.save(m);
        // release seat
        const lic = await em.findOne(UniversityLicense, {
          where: { universityId, status: 'active' },
          order: { createdAt: 'DESC' },
        });
        if (lic && lic.seatsUsed > 0) {
          lic.seatsUsed -= 1;
          await em.save(lic);
        }
        // clear universityId on user
        await em.update(User, { id: m.userId }, { universityId: undefined });
      });
    } else {
      m.status = newStatus;
      await this.memberRepo.save(m);
    }

    await this.audit.log({
      universityId, actorUserId, entityType: 'membership', entityId: m.id,
      action: `membership.status.${newStatus}`,
      oldValue: { status: oldStatus }, newValue: { status: newStatus }, ipAddress,
    });
    return { id: m.id, status: newStatus };
  }

  async assignCohort(universityId: string, membershipId: string, cohortId: string | null) {
    const m = await this.findOwned(universityId, membershipId);
    m.cohortId = cohortId ?? undefined;
    return this.memberRepo.save(m);
  }

  async assignDepartment(universityId: string, membershipId: string, departmentId: string | null) {
    const m = await this.findOwned(universityId, membershipId);
    m.departmentId = departmentId ?? undefined;
    return this.memberRepo.save(m);
  }

  /** Create membership without invite (admin manually adds) */
  async createMembership(universityId: string, opts: {
    userId: number;
    role: UniversityMemberRole;
    cohortId?: string;
    departmentId?: string;
    actorUserId?: number;
  }) {
    const existing = await this.memberRepo.findOne({
      where: { universityId, userId: opts.userId },
    });
    if (existing) {
      if (existing.status === 'removed' || existing.status === 'inactive') {
        existing.status = 'active';
        existing.role = opts.role;
        existing.cohortId = opts.cohortId;
        existing.departmentId = opts.departmentId;
        existing.joinedAt = new Date();
        (existing as { removedAt?: Date | null }).removedAt = null;
        const saved = await this.memberRepo.save(existing);
        await this.userRepo.update(opts.userId, { universityId });
        return saved;
      }
      throw new ConflictException('User is already a member of this university');
    }
    const m = this.memberRepo.create({
      universityId,
      userId: opts.userId,
      role: opts.role,
      status: 'active',
      cohortId: opts.cohortId,
      departmentId: opts.departmentId,
      joinedAt: new Date(),
    });
    const saved = await this.memberRepo.save(m);
    await this.userRepo.update(opts.userId, { universityId });
    return saved;
  }

  /** Resolve membership id for admin removal flows */
  async findMembershipIdByUserId(universityId: string, userId: number): Promise<string | null> {
    const m = await this.memberRepo.findOne({ where: { universityId, userId } });
    return m?.id ?? null;
  }

  private async findOwned(universityId: string, id: string) {
    const m = await this.memberRepo.findOne({
      where: { id, universityId },
      relations: ['user'],
    });
    if (!m) throw new NotFoundException('Membership not found');
    return m;
  }

  private toDto(m: UniversityMembership) {
    return {
      id: m.id,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      removedAt: m.removedAt,
      cohort: m.cohort ? { id: m.cohort.id, name: m.cohort.name } : null,
      department: m.department ? { id: m.department.id, name: m.department.name } : null,
      user: m.user ? {
        id: m.user.id,
        email: m.user.email,
        fullName: m.user.fullName,
        status: m.user.status,
      } : null,
    };
  }
}

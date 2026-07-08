import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UniversityLicense, LicenseStatus } from './entities/university-license.entity';
import { University } from './entities/university.entity';
import { UniversityAuditService } from './university-audit.service';
import { randomBytes } from 'crypto';

@Injectable()
export class UniversityLicensesService {
  constructor(
    @InjectRepository(UniversityLicense)
    private readonly licRepo: Repository<UniversityLicense>,
    @InjectRepository(University)
    private readonly uniRepo: Repository<University>,
    private readonly audit: UniversityAuditService,
    private readonly dataSource: DataSource,
  ) {}

  async list(universityId: string) {
    return this.licRepo.find({
      where: { universityId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async assign(universityId: string, dto: {
    planId: string;
    seatsTotal: number;
    validFrom?: Date;
    validUntil?: Date;
    priceCents?: number;
    currency?: string;
    notes?: string;
    actorUserId?: number;
  }) {
    if (!Number.isFinite(dto.seatsTotal) || dto.seatsTotal < 1) {
      throw new BadRequestException('seatsTotal must be at least 1');
    }
    const uni = await this.uniRepo.findOne({ where: { id: universityId } });
    if (!uni) throw new NotFoundException('University not found');

    const licenseKey = randomBytes(12).toString('hex').toUpperCase();
    const lic = this.licRepo.create({
      universityId,
      planId: dto.planId,
      seatsTotal: dto.seatsTotal,
      seatsUsed: 0,
      validFrom: dto.validFrom,
      validUntil: dto.validUntil,
      priceCents: dto.priceCents,
      currency: dto.currency ?? 'EUR',
      notes: dto.notes,
      licenseKey,
      status: 'active',
    });
    const saved = await this.licRepo.save(lic);

    // Auto-activate university on first license
    if (uni.status === 'pending' || uni.status === 'expired') {
      await this.uniRepo.update(universityId, { status: 'active' });
    }

    await this.audit.log({
      universityId, actorUserId: dto.actorUserId,
      entityType: 'license', entityId: saved.id,
      action: 'license.assigned',
      newValue: { planId: dto.planId, seatsTotal: dto.seatsTotal, validUntil: dto.validUntil },
    });
    return saved;
  }

  async update(universityId: string, licId: string, dto: {
    seatsTotal?: number;
    validUntil?: Date;
    status?: LicenseStatus;
    notes?: string;
    actorUserId?: number;
  }) {
    const lic = await this.licRepo.findOne({ where: { id: licId, universityId } });
    if (!lic) throw new NotFoundException('License not found');
    const old = { seatsTotal: lic.seatsTotal, status: lic.status, validUntil: lic.validUntil };
    if (dto.seatsTotal !== undefined) {
      if (dto.seatsTotal < lic.seatsUsed) {
        throw new BadRequestException(`Cannot reduce seats below current usage (${lic.seatsUsed})`);
      }
      lic.seatsTotal = dto.seatsTotal;
    }
    if (dto.validUntil !== undefined) lic.validUntil = dto.validUntil;
    if (dto.status !== undefined) lic.status = dto.status;
    if (dto.notes !== undefined) lic.notes = dto.notes;
    const saved = await this.licRepo.save(lic);
    await this.audit.log({
      universityId, actorUserId: dto.actorUserId,
      entityType: 'license', entityId: licId,
      action: 'license.updated', oldValue: old,
      newValue: { seatsTotal: lic.seatsTotal, status: lic.status, validUntil: lic.validUntil },
    });
    return saved;
  }

  /** Atomically increment seatsUsed. Throws ConflictException if seat limit reached. */
  async consumeSeat(universityId: string): Promise<void> {
    await this.dataSource.transaction(async em => {
      const lic = await em
        .getRepository(UniversityLicense)
        .createQueryBuilder('l')
        .where('l.university_id = :universityId', { universityId })
        .andWhere('l.status = :s', { s: 'active' })
        .orderBy('l.created_at', 'DESC')
        .setLock('pessimistic_write')
        .getOne();
      if (!lic) throw new NotFoundException('No active license for this university');
      if (lic.seatsUsed >= lic.seatsTotal) {
        throw new ConflictException('Seat limit reached. Purchase more seats to invite additional students.');
      }
      lic.seatsUsed += 1;
      await em.save(lic);
    });
  }

  /** Get active license (for access checks) */
  async getActiveLicense(universityId: string) {
    return this.licRepo.findOne({
      where: { universityId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  /** Latest active license must exist, not past validUntil, and have a free seat (student invites only). */
  async assertCanInviteStudent(universityId: string): Promise<void> {
    const lic = await this.getActiveLicense(universityId);
    if (!lic) {
      throw new BadRequestException('No active license for this university. Assign a license before inviting students.');
    }
    if (lic.validUntil && lic.validUntil.getTime() < Date.now()) {
      throw new BadRequestException('The university license has expired. Renew the license before inviting students.');
    }
    if (lic.seatsUsed >= lic.seatsTotal) {
      throw new ConflictException('Seat limit reached. Purchase more seats to invite additional students.');
    }
  }

  /** License exists and is not past validUntil (seat capacity not checked). */
  async assertActiveLicenseNotExpired(universityId: string): Promise<void> {
    const lic = await this.getActiveLicense(universityId);
    if (!lic) {
      throw new BadRequestException('No active license for this university.');
    }
    if (lic.validUntil && lic.validUntil.getTime() < Date.now()) {
      throw new BadRequestException('The university license has expired.');
    }
  }
}

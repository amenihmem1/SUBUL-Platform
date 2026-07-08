import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UniversityMembership } from './entities/university-membership.entity';
import { UniversityLicense } from './entities/university-license.entity';
import { University } from './entities/university.entity';

/**
 * Guards routes for institutional students (role='student').
 * Replaces SubscriptionGuard for this role — checks membership + license validity.
 * Non-student roles always pass through.
 */
@Injectable()
export class UniversityMemberGuard implements CanActivate {
  constructor(
    @InjectRepository(UniversityMembership)
    private readonly memberRepo: Repository<UniversityMembership>,
    @InjectRepository(UniversityLicense)
    private readonly licRepo: Repository<UniversityLicense>,
    @InjectRepository(University)
    private readonly uniRepo: Repository<University>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { role?: string; id?: number; sub?: number; universityId?: string } | undefined;

    if (!user) return false;
    const role = (user.role || '').toLowerCase();

    // Only enforce for institutional students
    if (role !== 'student') return true;

    const userId = user.sub ?? user.id;
    const universityId = user.universityId;

    if (!userId || !universityId) {
      throw new ForbiddenException('No institutional access found. Please contact your university administrator.');
    }

    // Check university is active
    const uni = await this.uniRepo.findOne({ where: { id: universityId } });
    if (!uni || uni.status === 'suspended') {
      throw new ForbiddenException('Your university account has been suspended. Please contact your administrator.');
    }

    // Check membership
    const membership = await this.memberRepo.findOne({
      where: { userId, universityId },
    });
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('Your institutional access has been deactivated. Please contact your university administrator.');
    }

    // Check license validity
    const license = await this.licRepo
      .createQueryBuilder('l')
      .where('l.university_id = :universityId', { universityId })
      .andWhere('l.status = :s', { s: 'active' })
      .orderBy('l.created_at', 'DESC')
      .getOne();

    if (!license) {
      throw new ForbiddenException('No active license found for your institution.');
    }
    if (license.validUntil && new Date(license.validUntil) < new Date()) {
      throw new ForbiddenException('Your institutional license has expired. Please contact your university administrator.');
    }

    return true;
  }
}

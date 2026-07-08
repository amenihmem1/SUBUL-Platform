import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UniversityCohort } from './entities/university-cohort.entity';

@Injectable()
export class UniversityCohortsService {
  constructor(
    @InjectRepository(UniversityCohort)
    private readonly repo: Repository<UniversityCohort>,
  ) {}

  async list(universityId: string) {
    return this.repo.find({
      where: { universityId },
      relations: ['department'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(universityId: string, dto: {
    name: string;
    description?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
    planSlug?: string;
  }) {
    const cohort = this.repo.create({ universityId, ...dto });
    return this.repo.save(cohort);
  }

  async update(universityId: string, id: string, dto: {
    name?: string;
    description?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }) {
    const cohort = await this.findOwned(universityId, id);
    Object.assign(cohort, dto);
    return this.repo.save(cohort);
  }

  async remove(universityId: string, id: string): Promise<void> {
    const cohort = await this.findOwned(universityId, id);
    await this.repo.remove(cohort);
  }

  private async findOwned(universityId: string, id: string) {
    const cohort = await this.repo.findOne({ where: { id, universityId } });
    if (!cohort) throw new NotFoundException('Cohort not found');
    return cohort;
  }
}

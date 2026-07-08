import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UniversityDepartment } from './entities/university-department.entity';

@Injectable()
export class UniversityDepartmentsService {
  constructor(
    @InjectRepository(UniversityDepartment)
    private readonly repo: Repository<UniversityDepartment>,
  ) {}

  async list(universityId: string) {
    return this.repo.find({ where: { universityId }, order: { name: 'ASC' } });
  }

  async create(universityId: string, dto: { name: string; description?: string }) {
    const dept = this.repo.create({ universityId, name: dto.name, description: dto.description });
    return this.repo.save(dept);
  }

  async update(universityId: string, id: string, dto: { name?: string; description?: string }) {
    const dept = await this.findOwned(universityId, id);
    if (dto.name !== undefined) dept.name = dto.name;
    if (dto.description !== undefined) dept.description = dto.description;
    return this.repo.save(dept);
  }

  async remove(universityId: string, id: string): Promise<void> {
    const dept = await this.findOwned(universityId, id);
    await this.repo.remove(dept);
  }

  private async findOwned(universityId: string, id: string) {
    const dept = await this.repo.findOne({ where: { id, universityId } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }
}

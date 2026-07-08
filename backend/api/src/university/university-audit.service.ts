import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UniversityAuditLog, AuditEntityType } from './entities/university-audit-log.entity';

@Injectable()
export class UniversityAuditService {
  constructor(
    @InjectRepository(UniversityAuditLog)
    private readonly repo: Repository<UniversityAuditLog>,
  ) {}

  async log(opts: {
    universityId: string;
    actorUserId?: number;
    entityType: AuditEntityType;
    entityId: string;
    action: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    const entry = this.repo.create(opts);
    await this.repo.save(entry);
  }

  async list(universityId: string, limit = 50) {
    return this.repo.find({
      where: { universityId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

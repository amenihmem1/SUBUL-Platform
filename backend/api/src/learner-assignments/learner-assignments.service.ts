import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LearnerContentAssignment, ContentType } from './entities/learner-content-assignment.entity';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Lab } from '../labs/entities/lab.entity';
import { Certification } from '../certifications/entities/certification.entity';

export interface AssignContentDto {
  contentType: ContentType;
  contentRef: string;
  expiresAt?: string | null;
  note?: string | null;
}

export interface BulkAssignDto extends AssignContentDto {
  userIds: number[];
}

@Injectable()
export class LearnerAssignmentsService {
  constructor(
    @InjectRepository(LearnerContentAssignment)
    private readonly repo: Repository<LearnerContentAssignment>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Course)
    private readonly coursesRepo: Repository<Course>,
    @InjectRepository(Lab)
    private readonly labsRepo: Repository<Lab>,
    @InjectRepository(Certification)
    private readonly certificationsRepo: Repository<Certification>,
    private readonly dataSource: DataSource,
  ) {}

  /** Active (non-expired) content_ref values for a user + type. */
  async getActiveAssignments(userId: number, contentType: ContentType): Promise<string[]> {
    const now = new Date();
    const rows = await this.repo
      .createQueryBuilder('a')
      .select('a.content_ref', 'ref')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.content_type = :contentType', { contentType })
      .andWhere('(a.expires_at IS NULL OR a.expires_at > :now)', { now })
      .getRawMany<{ ref: string }>();
    return rows.map((r) => r.ref);
  }

  /** All assignments for a learner (including expired), for admin display. */
  async getLearnerAssignments(userId: number): Promise<LearnerContentAssignment[]> {
    return this.repo.find({
      where: { userId },
      order: { grantedAt: 'DESC' },
    });
  }

  /** Assign a single content item to a learner. Idempotent — updates expiry/note on conflict. */
  async assignContent(
    adminId: number,
    userId: number,
    dto: AssignContentDto,
  ): Promise<LearnerContentAssignment> {
    await this.assertAssignable(userId, dto.contentType, dto.contentRef);

    const existing = await this.repo.findOne({
      where: {
        userId,
        contentType: dto.contentType,
        contentRef: dto.contentRef,
      },
    });

    if (existing) {
      existing.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
      existing.note = dto.note ?? null;
      existing.grantedBy = adminId;
      return this.repo.save(existing);
    }

    const assignment = this.repo.create({
      userId,
      contentType: dto.contentType,
      contentRef: dto.contentRef,
      grantedBy: adminId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      note: dto.note ?? null,
    });
    return this.repo.save(assignment);
  }

  /** Remove a single assignment. Only the assignment owner (admin) or any admin can remove. */
  async removeAssignment(assignmentId: number): Promise<void> {
    const assignment = await this.repo.findOne({ where: { id: assignmentId } });
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }
    await this.repo.remove(assignment);
  }

  /**
   * Bulk assign the same content item to many users.
   * Uses raw INSERT ... ON CONFLICT DO NOTHING for performance.
   * Returns counts of newly inserted vs. skipped (already existed).
   */
  async bulkAssign(
    adminId: number,
    dto: BulkAssignDto,
  ): Promise<{ assigned: number; skipped: number }> {
    if (!dto.userIds || dto.userIds.length === 0) {
      return { assigned: 0, skipped: 0 };
    }

    await this.assertContentRefExists(dto.contentType, dto.contentRef);

    const validUserRows = await this.usersRepo
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .where('u.id IN (:...userIds)', { userIds: dto.userIds })
      .getRawMany<{ id: number }>();
    const validUserIds = [...new Set(validUserRows.map((row) => Number(row.id)))];
    if (validUserIds.length === 0) {
      return { assigned: 0, skipped: dto.userIds.length };
    }

    const params: unknown[] = [
      validUserIds,
      dto.contentType,
      dto.contentRef,
      adminId,
      dto.expiresAt ? new Date(dto.expiresAt) : null,
      dto.note ?? null,
    ];
    const result = await this.dataSource.query<{ id: number }[]>(
      `INSERT INTO learner_content_assignments
         (user_id, content_type, content_ref, granted_by, granted_at, expires_at, note)
       SELECT uid, $2, $3, $4, NOW(), $5, $6
       FROM unnest($1::int[]) AS uid
       ON CONFLICT (user_id, content_type, content_ref) DO NOTHING
       RETURNING id`,
      params,
    );

    const assigned = Array.isArray(result) ? result.length : 0;
    return { assigned, skipped: dto.userIds.length - assigned };
  }

  private async assertAssignable(
    userId: number,
    contentType: ContentType,
    contentRef: string,
  ): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    await this.assertContentRefExists(contentType, contentRef);
  }

  private async assertContentRefExists(contentType: ContentType, contentRef: string): Promise<void> {
    const normalizedRef = contentRef.trim();
    if (!normalizedRef) {
      throw new BadRequestException('contentRef is required');
    }

    if (contentType === 'course') {
      const exists = await this.coursesRepo.exist({ where: { courseId: normalizedRef } });
      if (!exists) {
        throw new BadRequestException(`Course "${normalizedRef}" does not exist`);
      }
      return;
    }

    if (contentType === 'lab') {
      const exists = await this.labsRepo.exist({
        where: { slug: normalizedRef, status: 'published' },
      });
      if (!exists) {
        throw new BadRequestException(`Published lab "${normalizedRef}" does not exist`);
      }
      return;
    }

    const certId = Number.parseInt(normalizedRef, 10);
    if (!Number.isFinite(certId)) {
      throw new BadRequestException(`Certification ref "${normalizedRef}" must be a numeric id`);
    }
    const exists = await this.certificationsRepo.exist({ where: { id: certId } });
    if (!exists) {
      throw new BadRequestException(`Certification "${normalizedRef}" does not exist`);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizFeedback, FeedbackReason, FeedbackStatus } from './quiz-feedback.entity';

export interface CreateFeedbackDto {
  courseId?: string;
  moduleTitle?: string;
  questionText: string;
  questionType?: string;
  correctAnswer?: string;
  reason?: FeedbackReason;
  comment?: string;
}

@Injectable()
export class QuizFeedbackService {
  constructor(
    @InjectRepository(QuizFeedback)
    private readonly repo: Repository<QuizFeedback>,
  ) {}

  async create(userId: number | null, dto: CreateFeedbackDto): Promise<QuizFeedback> {
    const record = this.repo.create({
      userId: userId ?? null,
      courseId: dto.courseId ?? null,
      moduleTitle: dto.moduleTitle ?? null,
      questionText: dto.questionText,
      questionType: dto.questionType ?? 'qcm',
      correctAnswer: dto.correctAnswer ?? null,
      reason: dto.reason ?? 'off_topic',
      comment: dto.comment ?? null,
      status: 'pending',
    });
    return this.repo.save(record);
  }

  async listAll(status?: FeedbackStatus, courseId?: string) {
    const qb = this.repo
      .createQueryBuilder('f')
      .orderBy('f.created_at', 'DESC');

    if (status) qb.andWhere('f.status = :status', { status });
    if (courseId) qb.andWhere('f.course_id = :courseId', { courseId });

    return qb.getMany();
  }

  async updateStatus(id: number, status: FeedbackStatus): Promise<void> {
    await this.repo.update(id, { status });
  }

  async getStats() {
    const total = await this.repo.count();
    const pending = await this.repo.count({ where: { status: 'pending' } });
    const byReason = await this.repo
      .createQueryBuilder('f')
      .select('f.reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .groupBy('f.reason')
      .getRawMany();
    const byCourse = await this.repo
      .createQueryBuilder('f')
      .select('f.course_id', 'courseId')
      .addSelect('COUNT(*)', 'count')
      .where('f.course_id IS NOT NULL')
      .groupBy('f.course_id')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
    return { total, pending, byReason, byCourse };
  }
}

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TranslationService } from '../translation/translation.service';
import { PracticeExam } from './entities/practice-exam.entity';
import { PracticeExamQuestion } from './entities/practice-exam-question.entity';
import { PracticeExamAttempt } from './entities/practice-exam-attempt.entity';
import { Certification } from '../certifications/entities/certification.entity';
import {
  CreatePracticeExamDto,
  CreatePracticeExamQuestionDto,
  UpdatePracticeExamDto,
} from './dto/practice-exam.dto';

const IMPORT_SOURCE = 'practice_exams_json';

class DryRunRollback extends Error {
  constructor() {
    super('dry-run rollback');
    this.name = 'DryRunRollback';
  }
}

export interface PracticeExamValidationError {
  path: string;
  message: string;
}

export interface PracticeExamImportSummary {
  dryRun: boolean;
  exams: { created: number; updated: number; skipped: number };
  questions: { created: number; updated: number; skipped: number };
  errors: PracticeExamValidationError[];
}

@Injectable()
export class PracticeExamsService {
  private readonly logger = new Logger(PracticeExamsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PracticeExam) private readonly examRepo: Repository<PracticeExam>,
    @InjectRepository(PracticeExamQuestion)
    private readonly questionRepo: Repository<PracticeExamQuestion>,
    @InjectRepository(PracticeExamAttempt)
    private readonly attemptRepo: Repository<PracticeExamAttempt>,
    private readonly translationService: TranslationService,
  ) {}

  // ─── Read ────────────────────────────────────────────────────────────────

  async listAdmin(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'draft' | 'published' | 'archived';
    certificationId?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const qb = this.examRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.questions', 'q')
      .orderBy('e.updatedAt', 'DESC')
      .addOrderBy('q.questionOrder', 'ASC');
    if (params.search) {
      const s = `%${params.search.toLowerCase()}%`;
      qb.andWhere('(LOWER(e.title) LIKE :s OR LOWER(e.slug) LIKE :s)', { s });
    }
    if (params.status) qb.andWhere('e.status = :st', { st: params.status });
    if (params.certificationId) qb.andWhere('e.certificationId = :cid', { cid: params.certificationId });
    const total = await qb.getCount();
    const rows = await qb.skip((page - 1) * limit).take(limit).getMany();
    return {
      data: rows.map((r) => this.toDto(r)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getBySlug(slug: string) {
    const exam = await this.examRepo.findOne({
      where: { slug },
      relations: ['questions'],
      order: { questions: { questionOrder: 'ASC' } as any },
    });
    if (!exam) throw new NotFoundException(`Practice exam "${slug}" not found`);
    return this.toDto(exam);
  }

  async listForLearner(userId: number) {
    const exams = await this.examRepo.find({
      where: { status: 'published' },
      relations: ['questions'],
      order: { updatedAt: 'DESC' },
    });
    const attempts = await this.attemptRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const byExam = new Map<number, PracticeExamAttempt[]>();
    for (const a of attempts) {
      const bucket = byExam.get(a.practiceExamId) ?? [];
      bucket.push(a);
      byExam.set(a.practiceExamId, bucket);
    }
    return exams.map((exam) => {
      const rows = byExam.get(exam.id) ?? [];
      const latest = rows[0];
      const best = rows.reduce((acc, r) => Math.max(acc, Number(r.score ?? 0)), 0);
      return {
        slug: exam.slug,
        title: exam.title,
        certificationId: exam.certificationId,
        durationMinutes: exam.durationMinutes,
        passingScore: exam.passingScore,
        difficulty: exam.difficulty,
        questionCount: exam.questions?.length ?? 0,
        attempts: rows.length,
        latestScore: latest ? Number(latest.score) : null,
        bestScore: rows.length ? best : null,
        latestStatus: latest?.status ?? null,
      };
    });
  }

  private async translateAndCacheQuestion(
    q: PracticeExamQuestion,
    locale: string,
  ): Promise<{ prompt: string; options: Array<{ id: string; text: string }>; explanation: string | null }> {
    const translated = await this.translationService.translateExamQuestion(
      { prompt: q.prompt, options: q.options, explanation: q.explanation ?? null },
      locale,
    );
    q.translations = { ...(q.translations ?? {}), [locale]: translated };
    try {
      await this.questionRepo.save(q);
    } catch {
      // non-critical — cache miss is acceptable
    }
    return translated;
  }

  async getLearnerSession(userId: number, slug: string, locale = 'en') {
    const exam = await this.examRepo.findOne({
      where: { slug, status: 'published' },
      relations: ['questions'],
      order: { questions: { questionOrder: 'ASC' } as any },
    });
    if (!exam) throw new NotFoundException(`Practice exam "${slug}" not found`);

    const normalised = locale.toLowerCase().split('-')[0];
    const applyTranslation = normalised !== 'en' && this.translationService.isConfigured();

    const sortedQuestions = (exam.questions ?? [])
      .slice()
      .sort((a, b) => a.questionOrder - b.questionOrder);

    const questions = await Promise.all(
      sortedQuestions.map(async (q) => {
        let hit = applyTranslation ? ((q.translations ?? {})[normalised] ?? null) : null;
        if (!hit && applyTranslation) {
          hit = await this.translateAndCacheQuestion(q, normalised);
        }
        return {
          id: q.id,
          questionOrder: q.questionOrder,
          prompt: hit?.prompt ?? q.prompt,
          options: hit?.options ?? q.options,
          explanation: hit?.explanation !== undefined ? hit.explanation : (q.explanation ?? null),
        };
      }),
    );

    const previousAttempts = await this.attemptRepo.count({ where: { userId, practiceExamId: exam.id } });
    return {
      exam: {
        slug: exam.slug,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        passingScore: exam.passingScore,
        difficulty: exam.difficulty,
      },
      previousAttempts,
      questions,
    };
  }

  async submitLearnerAttempt(
    userId: number,
    slug: string,
    answers: Record<string, string | string[]>,
    timeSpent?: string,
  ) {
    const exam = await this.examRepo.findOne({
      where: { slug, status: 'published' },
      relations: ['questions'],
      order: { questions: { questionOrder: 'ASC' } as any },
    });
    if (!exam) throw new NotFoundException(`Practice exam "${slug}" not found`);
    const questions = (exam.questions ?? []).slice().sort((a, b) => a.questionOrder - b.questionOrder);
    if (!questions.length) throw new BadRequestException('Practice exam has no questions');

    let correctCount = 0;
    for (const q of questions) {
      const submitted = answers[String(q.id)];
      const submittedArr = Array.isArray(submitted) ? submitted.map(String).sort() : [String(submitted ?? '')];
      const expected = (q.correct ?? []).map(String).sort();
      if (submittedArr.length === expected.length && submittedArr.every((v, i) => v === expected[i])) {
        correctCount += 1;
      }
    }
    const questionCount = questions.length;
    const score = Math.round((correctCount / questionCount) * 10000) / 100;
    const status: 'passed' | 'failed' = score >= exam.passingScore ? 'passed' : 'failed';
    const attempt = await this.attemptRepo.save(
      this.attemptRepo.create({
        userId,
        practiceExamId: exam.id,
        score,
        status,
        correctCount,
        questionCount,
        timeSpent: timeSpent ?? null,
      }),
    );
    return {
      attemptId: attempt.id,
      score,
      status,
      correctCount,
      questionCount,
      passingScore: exam.passingScore,
    };
  }

  async getLearnerAttempts(userId: number, slug: string) {
    const exam = await this.examRepo.findOne({ where: { slug } });
    if (!exam) throw new NotFoundException(`Practice exam "${slug}" not found`);
    const rows = await this.attemptRepo.find({
      where: { userId, practiceExamId: exam.id },
      order: { createdAt: 'DESC' },
    });
    const avg = rows.length
      ? Math.round((rows.reduce((acc, r) => acc + Number(r.score), 0) / rows.length) * 100) / 100
      : 0;
    const best = rows.length ? Math.max(...rows.map((r) => Number(r.score))) : 0;
    return {
      exam: { slug: exam.slug, title: exam.title, passingScore: exam.passingScore },
      stats: { attempts: rows.length, average: avg, best },
      attempts: rows.map((r) => ({
        id: r.id,
        score: Number(r.score),
        status: r.status,
        correctCount: r.correctCount,
        questionCount: r.questionCount,
        timeSpent: r.timeSpent,
        createdAt: r.createdAt,
      })),
    };
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async create(dto: CreatePracticeExamDto) {
    if (!dto.slug?.trim()) throw new BadRequestException('slug is required');
    const existing = await this.examRepo.findOne({ where: { slug: dto.slug.trim() } });
    if (existing) throw new BadRequestException(`Practice exam with slug "${dto.slug}" already exists`);
    const exam = await this.examRepo.save(
      this.examRepo.create({
        slug: dto.slug.trim(),
        title: dto.title.trim(),
        description: dto.description ?? null,
        certificationId: dto.certificationId ?? null,
        durationMinutes: dto.durationMinutes ?? 60,
        passingScore: dto.passingScore ?? 70,
        difficulty: dto.difficulty ?? 'beginner',
        status: dto.status ?? 'draft',
        externalId: dto.externalId ?? null,
        tags: dto.tags ?? [],
      }),
    );
    if (dto.questions?.length) await this.replaceQuestions(exam.id, dto.questions);
    return this.getBySlug(exam.slug);
  }

  async update(slug: string, dto: UpdatePracticeExamDto) {
    const exam = await this.examRepo.findOne({ where: { slug } });
    if (!exam) throw new NotFoundException(`Practice exam "${slug}" not found`);
    Object.assign(exam, {
      title: dto.title ?? exam.title,
      description: dto.description ?? exam.description,
      certificationId: dto.certificationId !== undefined ? dto.certificationId : exam.certificationId,
      durationMinutes: dto.durationMinutes ?? exam.durationMinutes,
      passingScore: dto.passingScore ?? exam.passingScore,
      difficulty: dto.difficulty ?? exam.difficulty,
      status: dto.status ?? exam.status,
      tags: dto.tags ?? exam.tags,
    });
    await this.examRepo.save(exam);
    if (dto.questions) await this.replaceQuestions(exam.id, dto.questions);
    return this.getBySlug(exam.slug);
  }

  async remove(slug: string) {
    const exam = await this.examRepo.findOne({ where: { slug } });
    if (!exam) throw new NotFoundException(`Practice exam "${slug}" not found`);
    await this.examRepo.remove(exam);
    return { deleted: true, slug };
  }

  // ─── JSON import (validate + dryRun + admin_upsert) ─────────────────────

  /** Pure structural validation. No DB calls. */
  validateShape(payload: unknown): PracticeExamValidationError[] {
    const errors: PracticeExamValidationError[] = [];
    if (!Array.isArray(payload)) {
      errors.push({ path: '$', message: 'Payload must be an array of practice exams' });
      return errors;
    }
    const seenSlugs = new Set<string>();
    payload.forEach((exam: any, ei) => {
      const examPath = `practiceExams[${ei}]`;
      if (!exam || typeof exam !== 'object' || Array.isArray(exam)) {
        errors.push({ path: examPath, message: 'Exam must be an object' });
        return;
      }
      const slug = String(exam.slug ?? '').trim();
      if (!slug) {
        errors.push({ path: `${examPath}.slug`, message: 'slug is required (string)' });
      } else if (seenSlugs.has(slug)) {
        errors.push({ path: `${examPath}.slug`, message: `Duplicate slug "${slug}" in payload` });
      } else {
        seenSlugs.add(slug);
      }
      if (!exam.title || typeof exam.title !== 'string' || !exam.title.trim()) {
        errors.push({ path: `${examPath}.title`, message: 'title is required (string)' });
      }
      if (exam.durationMinutes !== undefined && (typeof exam.durationMinutes !== 'number' || exam.durationMinutes < 1)) {
        errors.push({ path: `${examPath}.durationMinutes`, message: 'durationMinutes must be a positive number' });
      }
      if (exam.passingScore !== undefined && (typeof exam.passingScore !== 'number' || exam.passingScore < 0 || exam.passingScore > 100)) {
        errors.push({ path: `${examPath}.passingScore`, message: 'passingScore must be 0–100' });
      }
      const questions = Array.isArray(exam.questions) ? exam.questions : [];
      if (questions.length === 0) {
        errors.push({ path: `${examPath}.questions`, message: 'At least one question is required' });
      }
      questions.forEach((q: any, qi: number) => {
        const qPath = `${examPath}.questions[${qi}]`;
        if (!q || typeof q !== 'object') {
          errors.push({ path: qPath, message: 'Question must be an object' });
          return;
        }
        const promptRaw = (q as Record<string, unknown>).prompt ?? (q as Record<string, unknown>).question;
        if (!promptRaw || typeof promptRaw !== 'string' || !promptRaw.trim()) {
          errors.push({ path: `${qPath}.prompt`, message: 'prompt or question is required (string)' });
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
          errors.push({ path: `${qPath}.options`, message: 'options must be an array of at least 2 items' });
        }
        if (q.correct === undefined || q.correct === null) {
          errors.push({ path: `${qPath}.correct`, message: 'correct answer is required (string or array)' });
        } else if (typeof q.correct !== 'string' && !Array.isArray(q.correct)) {
          errors.push({ path: `${qPath}.correct`, message: 'correct must be a string or array of strings' });
        } else if (Array.isArray(q.correct) && q.correct.length === 0) {
          errors.push({ path: `${qPath}.correct`, message: 'correct array cannot be empty' });
        }
      });
    });
    return errors;
  }

  async importFromJson(
    payload: Array<Record<string, unknown>>,
    dryRun = true,
  ): Promise<PracticeExamImportSummary> {
    const shapeErrors = this.validateShape(payload);
    const summary: PracticeExamImportSummary = {
      dryRun,
      exams: { created: 0, updated: 0, skipped: 0 },
      questions: { created: 0, updated: 0, skipped: 0 },
      errors: shapeErrors,
    };
    if (shapeErrors.some((e) => e.path === '$')) return summary;

    try {
      await this.dataSource.transaction(async (manager) => {
        for (const raw of payload as any[]) {
          const slug = String(raw?.slug ?? '').trim();
          const title = String(raw?.title ?? '').trim();
          if (!slug || !title) {
            summary.exams.skipped += 1;
            continue;
          }
          let certificationId: number | null =
            typeof raw.certificationId === 'number' ? raw.certificationId : null;
          if (
            certificationId === null &&
            typeof raw.certificationExternalId === 'string' &&
            raw.certificationExternalId.trim()
          ) {
            const certRow = await manager.findOne(Certification, {
              where: { externalId: raw.certificationExternalId.trim() },
            });
            if (certRow) certificationId = certRow.id;
          }
          let exam = await manager.findOne(PracticeExam, { where: { slug } });
          const patch: Partial<PracticeExam> = {
            slug,
            title,
            description: typeof raw.instructions === 'string' ? raw.instructions : typeof raw.description === 'string' ? raw.description : null,
            certificationId,
            durationMinutes: typeof raw.durationMinutes === 'number' ? raw.durationMinutes : 60,
            passingScore: typeof raw.passingScore === 'number' ? raw.passingScore : 70,
            difficulty: ['beginner', 'intermediate', 'advanced'].includes(raw.difficulty)
              ? raw.difficulty
              : 'beginner',
            status: ['draft', 'published', 'archived'].includes(raw.status)
              ? raw.status
              : 'published',
            externalId: typeof raw.externalId === 'string' ? raw.externalId : (typeof raw.id === 'string' ? raw.id : null),
            tags: Array.isArray(raw.tags) ? raw.tags.filter((t: unknown) => typeof t === 'string') : [],
            source: IMPORT_SOURCE,
          };
          const wasNew = !exam;
          if (!exam) {
            exam = manager.create(PracticeExam, patch);
            exam = await manager.save(PracticeExam, exam);
            summary.exams.created += 1;
          } else {
            Object.assign(exam, patch);
            exam = await manager.save(PracticeExam, exam);
            summary.exams.updated += 1;
          }

          // Replace questions atomically — on re-import the question set is
          // authoritative from the JSON.
          const questions: any[] = Array.isArray(raw.questions) ? raw.questions : [];
          if (!wasNew) {
            await manager.delete(PracticeExamQuestion, { practiceExamId: exam.id });
          }
          for (const [qi, q] of questions.entries()) {
            if (!q || typeof q !== 'object') {
              summary.questions.skipped += 1;
              continue;
            }
            const opts = Array.isArray(q.options)
              ? q.options.map((o: any, oi: number) =>
                  typeof o === 'string'
                    ? { id: String.fromCharCode(65 + oi), text: o }
                    : { id: String(o.id ?? String.fromCharCode(65 + oi)), text: String(o.text ?? '') },
                )
              : [];
            const correct = Array.isArray(q.correct)
              ? q.correct.map(String)
              : q.correct !== undefined && q.correct !== null
                ? [String(q.correct)]
                : [];
            const entity = manager.create(PracticeExamQuestion, {
              practiceExamId: exam.id,
              externalId: typeof q.id === 'string' ? q.id : null,
              questionOrder: typeof q.questionOrder === 'number' ? q.questionOrder : qi + 1,
              prompt: String((q as any).prompt ?? (q as any).question ?? '').trim(),
              options: opts,
              correct,
              explanation: typeof q.explanation === 'string' ? q.explanation : null,
              domain: typeof q.domain === 'string' ? q.domain : null,
              difficulty: typeof q.difficulty === 'string' ? q.difficulty : null,
            });
            await manager.save(PracticeExamQuestion, entity);
            if (wasNew) summary.questions.created += 1;
            else summary.questions.updated += 1;
          }
        }
        if (dryRun) throw new DryRunRollback();
      });
    } catch (err) {
      if (!(err instanceof DryRunRollback)) throw err;
    }

    this.logger.log(
      `practice exams import: c/u/s=${summary.exams.created}/${summary.exams.updated}/${summary.exams.skipped}, questions ${summary.questions.created}/${summary.questions.updated}/${summary.questions.skipped}`,
    );
    return summary;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async replaceQuestions(examId: number, questions: CreatePracticeExamQuestionDto[]) {
    await this.questionRepo.delete({ practiceExamId: examId });
    for (const [qi, q] of questions.entries()) {
      const opts = Array.isArray(q.options)
        ? q.options.map((o: any, oi: number) =>
            typeof o === 'string'
              ? { id: String.fromCharCode(65 + oi), text: o }
              : { id: String(o.id ?? String.fromCharCode(65 + oi)), text: String(o.text ?? '') },
          )
        : [];
      const correct = Array.isArray(q.correct) ? q.correct.map(String) : [];
      await this.questionRepo.save(
        this.questionRepo.create({
          practiceExamId: examId,
          externalId: q.externalId ?? null,
          questionOrder: q.questionOrder ?? qi + 1,
          prompt: q.prompt.trim(),
          options: opts,
          correct,
          explanation: q.explanation ?? null,
          domain: q.domain ?? null,
          difficulty: q.difficulty ?? null,
        }),
      );
    }
  }

  private toDto(exam: PracticeExam) {
    return {
      id: exam.id,
      slug: exam.slug,
      title: exam.title,
      description: exam.description,
      certificationId: exam.certificationId,
      durationMinutes: exam.durationMinutes,
      passingScore: exam.passingScore,
      difficulty: exam.difficulty,
      status: exam.status,
      externalId: exam.externalId,
      tags: exam.tags ?? [],
      questionCount: exam.questions?.length ?? 0,
      questions: (exam.questions ?? [])
        .slice()
        .sort((a, b) => a.questionOrder - b.questionOrder)
        .map((q) => ({
          id: q.id,
          externalId: q.externalId,
          questionOrder: q.questionOrder,
          prompt: q.prompt,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation,
          domain: q.domain,
          difficulty: q.difficulty,
        })),
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './entities/exam.entity';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { UserExamStreak } from './entities/user-exam-streak.entity';
import { ExamQuestion, ExamQuestionOption } from './entities/exam-question.entity';
import { SubmitExamDto } from './dto/submit-exam.dto';

const ONE_DAY_MS = 86_400_000;

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepo: Repository<ExamAttempt>,
    @InjectRepository(UserExamStreak)
    private readonly streakRepo: Repository<UserExamStreak>,
    @InjectRepository(ExamQuestion)
    private readonly questionRepo: Repository<ExamQuestion>,
  ) {}

  async getExams(userId: number) {
    const [allExams, attempts, streak] = await Promise.all([
      this.examRepo.find({ order: { date: 'ASC' } }),
      this.attemptRepo.find({ where: { userId }, relations: ['exam'], order: { completedAt: 'DESC' } }),
      this.streakRepo.findOne({ where: { userId } }),
    ]);
    const attemptedExamIds = new Set(attempts.map((a) => a.examId));
    const upcomingRaw = allExams.filter((e) => !attemptedExamIds.has(e.id));
    const upcoming = upcomingRaw.map((exam) => ({
      id: exam.id,
      title: exam.title,
      course: exam.course ?? '',
      date: this.formatDateOnly(exam.date),
      duration: exam.duration ?? '',
      questions: exam.questionsCount,
      passingScore: exam.passingScore,
      status: exam.status,
      attempts: 0,
      readiness: exam.readinessScore,
    }));

    const completed = attempts.map((a) => ({
      id: a.id,
      title: a.exam.title,
      course: a.exam.course ?? '',
      date: this.formatDateOnly(a.completedAt),
      score: Number(a.score),
      status: a.status,
      attempts: 1,
      timeSpent: a.timeSpent ?? '—',
      streakBonus: Boolean(a.streakBonus),
    }));

    const passed = completed.filter((c) => c.status === 'passed').length;
    const total = completed.length;
    const avgScore = total > 0 ? Math.round(completed.reduce((acc, c) => acc + c.score, 0) / total) : 0;
    return {
      upcoming,
      completed,
      streak: streak?.currentStreak ?? 0,
      stats: {
        upcoming: upcoming.length,
        completed: total,
        passed,
        avgScore,
        total: upcoming.length + total,
      },
    };
  }

  async getStreak(userId: number) {
    const streak = await this.streakRepo.findOne({ where: { userId } });
    return { streak: streak?.currentStreak ?? 0 };
  }

  async getExamSession(userId: number, examId: number) {
    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    const existing = await this.attemptRepo.findOne({ where: { userId, examId } });
    if (existing) {
      throw new ConflictException('You have already completed this exam');
    }
    const rows = await this.questionRepo.find({
      where: { examId },
      order: { sortOrder: 'ASC' },
    });
    if (rows.length === 0) {
      throw new BadRequestException('This exam has no questions yet');
    }
    const questions = rows.map((q) => ({
      id: q.id,
      sortOrder: q.sortOrder,
      prompt: q.prompt,
      options: q.options.map((o: ExamQuestionOption) => ({ id: o.id, text: o.text })),
    }));
    return {
      exam: {
        id: exam.id,
        title: exam.title,
        course: exam.course ?? '',
        duration: exam.duration ?? '',
        passingScore: exam.passingScore,
      },
      questions,
    };
  }

  async submitExam(userId: number, examId: number, dto: SubmitExamDto) {
    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    const existing = await this.attemptRepo.findOne({ where: { userId, examId } });
    if (existing) {
      throw new ConflictException('You have already completed this exam');
    }
    const rows = await this.questionRepo.find({
      where: { examId },
      order: { sortOrder: 'ASC' },
    });
    if (rows.length === 0) {
      throw new BadRequestException('This exam has no questions yet');
    }
    const answers = dto.answers ?? {};
    let correct = 0;
    for (const q of rows) {
      const selected = answers[String(q.id)];
      if (selected && selected === q.correctOptionId) {
        correct++;
      }
    }
    const score = Math.round((correct / rows.length) * 10000) / 100;
    const passed = score >= exam.passingScore;
    const status = passed ? 'passed' : 'failed';

    const { streakBonus, currentStreak } = await this.applyStreakAfterAttempt(userId, passed);

    const attempt = this.attemptRepo.create({
      userId,
      examId,
      score,
      status,
      timeSpent: dto.timeSpent,
      streakBonus,
    });
    await this.attemptRepo.save(attempt);

    return {
      score,
      status,
      streak: currentStreak,
      streakBonusApplied: streakBonus,
      attemptId: attempt.id,
    };
  }

  private formatDateOnly(d: Date | null | undefined): string {
    if (!d) return '';
    try {
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }

  private startOfUtcDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private async applyStreakAfterAttempt(
    userId: number,
    passed: boolean,
  ): Promise<{ currentStreak: number; streakBonus: boolean }> {
    let streak = await this.streakRepo.findOne({ where: { userId } });
    if (!streak) {
      streak = this.streakRepo.create({ userId });
    }

    if (!passed) {
      streak.currentStreak = 0;
      await this.streakRepo.save(streak);
      return { currentStreak: 0, streakBonus: false };
    }

    const today = this.startOfUtcDay(new Date());
    const last = streak.lastExamDate ? this.startOfUtcDay(streak.lastExamDate) : null;
    let next: number;

    if (!last) {
      next = 1;
    } else if (today.getTime() === last.getTime()) {
      next = (streak.currentStreak ?? 0) + 1;
    } else if (today.getTime() === last.getTime() + ONE_DAY_MS) {
      next = (streak.currentStreak ?? 0) + 1;
    } else {
      next = 1;
    }

    streak.currentStreak = next;
    streak.lastExamDate = new Date();
    streak.longestStreak = Math.max(streak.longestStreak ?? 0, streak.currentStreak);
    await this.streakRepo.save(streak);

    const streakBonus = streak.currentStreak >= 2;
    return { currentStreak: streak.currentStreak, streakBonus };
  }
}

import { CertifCoursesImportService } from '../certifications/certif-courses-import.service';
import { LabsService } from '../labs/labs.service';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { Exam } from '../exams/entities/exam.entity';
import { ExamQuestion } from '../exams/entities/exam-question.entity';
import { ExamAttempt } from '../exams/entities/exam-attempt.entity';
import { UserExamStreak } from '../exams/entities/user-exam-streak.entity';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Certification } from '../certifications/entities/certification.entity';
import { UserCourseProgress } from '../courses/entities/user-course-progress.entity';
import { IssuedCertificate } from '../certifications/entities/issued-certificate.entity';
import { BASELINE_EXAMS } from './data/exams.seed.data';
import { BASELINE_EXAM_QUESTIONS } from './data/exam-questions.seed.data';
import { DEMO_PROGRESS_TEMPLATES } from './data/demo-progress.seed.data';
import { DEMO_EXAM_ATTEMPTS } from './data/demo-exam-attempts.seed.data';

export type SeedProfile = 'baseline' | 'demo' | 'none';

export async function runSeed(
  dataSource: DataSource,
  importService: CertifCoursesImportService,
  labsService: LabsService,
  profile: SeedProfile = 'baseline',
): Promise<void> {
  console.log(`[Seed] Starting seeding with profile="${profile}"...`);
  const seedLegacyCatalog =
    String(process.env.SEED_LEGACY_CATALOG ?? 'false').toLowerCase() === 'true';

  if (profile === 'none') {
    console.log('[Seed] Profile "none": skipped all write stages (no integrity checks — empty DB is valid).');
    return;
  }

  if (seedLegacyCatalog) {
    await seedCatalogData(importService);
  } else {
    console.log('[Seed] Skipping legacy certif_courses catalog import (SEED_LEGACY_CATALOG=false).');
  }
  // Exams before labs: baseline exams do not depend on labs; if labs seed fails, exams still seed.
  await seedExamsData(dataSource);
  await seedLabsData(labsService);

  if (profile === 'demo') {
    await seedDemoLearnerData(dataSource);
  }

  await runIntegrityChecks(dataSource, profile);
  console.log('[Seed] Done.');
}

async function seedCatalogData(importService: CertifCoursesImportService): Promise<void> {
  let courseImportOk = false;
  console.log('[Seed] Importing certifications & courses...');

  try {
    const summary = await importService.importFromFile(undefined, 'upsert_only');
    console.log('[Seed] Course import complete:');
    console.log(
      `  Certifications — created: ${summary.certifications.created}, updated: ${summary.certifications.updated}, skipped: ${summary.certifications.skipped}`,
    );
    console.log(
      `  Courses        — created: ${summary.courses.created}, updated: ${summary.courses.updated}, skipped: ${summary.courses.skipped}`,
    );
    console.log(
      `  Modules        — created: ${summary.modules.created}, updated: ${summary.modules.updated}, skipped: ${summary.modules.skipped}`,
    );
    console.log(
      `  Lessons        — created: ${summary.lessons.created}, updated: ${summary.lessons.updated}, skipped: ${summary.lessons.skipped}`,
    );
    courseImportOk = true;
  } catch (error) {
    console.error('[Seed] Failed to import courses:', error);
  }

  if (!courseImportOk) {
    throw new Error('[Seed] Course import failed.');
  }
}

async function seedLabsData(labsService: LabsService): Promise<void> {
  let labsSeedOk = false;
  try {
    await labsService.seedAwsLabs();
    console.log('[Seed] Labs seed upsert complete.');
    labsSeedOk = true;
  } catch (error) {
    console.error('[Seed] Failed to seed labs:', error);
  }

  if (!labsSeedOk) {
    throw new Error('[Seed] Labs seed failed.');
  }
}

async function seedExamsData(dataSource: DataSource): Promise<void> {
  const examRepo = dataSource.getRepository(Exam);
  const questionRepo = dataSource.getRepository(ExamQuestion);
  let created = 0;
  let updated = 0;
  let questionsUpserted = 0;

  for (const seedExam of BASELINE_EXAMS) {
    const existing = await examRepo.findOne({
      where: { title: seedExam.title, course: seedExam.course },
    });
    const date = new Date(Date.now() + seedExam.dateOffsetDays * 24 * 60 * 60 * 1000);
    let examEntity: Exam;
    if (existing) {
      Object.assign(existing, {
        description: seedExam.description,
        date,
        duration: seedExam.duration,
        questionsCount: seedExam.questionsCount,
        passingScore: seedExam.passingScore,
        readinessScore: seedExam.readinessScore,
        status: 'available',
      });
      examEntity = await examRepo.save(existing);
      updated++;
    } else {
      examEntity = await examRepo.save(
        examRepo.create({
          title: seedExam.title,
          course: seedExam.course,
          description: seedExam.description,
          date,
          duration: seedExam.duration,
          questionsCount: seedExam.questionsCount,
          passingScore: seedExam.passingScore,
          readinessScore: seedExam.readinessScore,
          status: 'available',
        }),
      );
      created++;
    }

    const key = `${seedExam.title}|${seedExam.course}`;
    const qSeeds = BASELINE_EXAM_QUESTIONS[key];
    if (qSeeds?.length) {
      await questionRepo.delete({ examId: examEntity.id });
      await questionRepo.insert(
        qSeeds.map((q) => ({
          examId: examEntity.id,
          sortOrder: q.sortOrder,
          prompt: q.prompt,
          options: q.options,
          correctOptionId: q.correctOptionId,
        })),
      );
      questionsUpserted += qSeeds.length;
    }
  }

  console.log(
    `[Seed] Exams upsert complete (created=${created}, updated=${updated}, examQuestions=${questionsUpserted}).`,
  );
}

function verificationCode(userId: number, certificationId: number): string {
  return createHash('sha256')
    .update(`${userId}:${certificationId}:subul_certificate`)
    .digest('hex');
}

async function seedDemoLearnerData(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const courseRepo = dataSource.getRepository(Course);
  const progressRepo = dataSource.getRepository(UserCourseProgress);
  const certRepo = dataSource.getRepository(Certification);
  const issuedRepo = dataSource.getRepository(IssuedCertificate);
  const examRepo = dataSource.getRepository(Exam);
  const attemptRepo = dataSource.getRepository(ExamAttempt);
  const streakRepo = dataSource.getRepository(UserExamStreak);

  const learners = await userRepo.find({ where: { role: 'learner' }, take: 2 });
  if (learners.length === 0) {
    console.warn('[Seed] Demo profile: no learner users found; skipping learner fixtures.');
    return;
  }

  const courses = await courseRepo.find({ order: { id: 'ASC' }, take: 3 });
  if (courses.length === 0) {
    console.warn('[Seed] Demo profile: no courses found; skipping learner fixtures.');
    return;
  }

  for (const learner of learners) {
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const template = DEMO_PROGRESS_TEMPLATES[i % DEMO_PROGRESS_TEMPLATES.length];
      const existing = await progressRepo.findOne({
        where: { userId: learner.id, courseId: course.id },
      });

      const entity = existing ?? progressRepo.create({ userId: learner.id, courseId: course.id });
      const completedLessons =
        template.status === 'completed'
          ? ['module_1_lesson_1', 'module_1_lesson_2']
          : template.status === 'in_progress'
            ? ['module_1_lesson_1']
            : [];
      const now = new Date();
      Object.assign(entity, {
        status: template.status,
        overallProgress: template.overallProgress,
        completedLessons,
        completedModules: template.status === 'completed' ? [1] : [],
        completedLabs: [],
        moduleProgress:
          template.status === 'completed'
            ? { '1': 100 }
            : template.status === 'in_progress'
              ? { '1': 52 }
              : {},
        currentModule: 1,
        currentLesson: template.status === 'not_started' ? 1 : 2,
        startedAt: template.status === 'not_started' ? undefined : now,
        completedAt: template.status === 'completed' ? now : undefined,
        lastAccessedAt: now,
      });
      await progressRepo.save(entity);

      if (template.status === 'completed' && course.certificationId) {
        const cert = await certRepo.findOne({ where: { id: course.certificationId } });
        if (cert) {
          const existingIssued = await issuedRepo.findOne({
            where: { userId: learner.id, certificationId: cert.id },
          });
          if (!existingIssued) {
            await issuedRepo.save(
              issuedRepo.create({
                userId: learner.id,
                certificationId: cert.id,
                courseId: course.id,
                issuedAt: now,
                verificationCode: verificationCode(learner.id, cert.id),
                metadata: {
                  seeded: true,
                  courseId: course.courseId,
                  courseTitle: course.title,
                },
              }),
            );
          }
        }
      }
    }
  }

  const exams = await examRepo.find({ order: { id: 'ASC' }, take: 2 });
  if (exams.length > 0) {
    for (let i = 0; i < learners.length; i++) {
      const learner = learners[i];
      const exam = exams[i % exams.length];
      const attemptTemplate = DEMO_EXAM_ATTEMPTS[i % DEMO_EXAM_ATTEMPTS.length];
      const existingAttempt = await attemptRepo.findOne({
        where: { userId: learner.id, examId: exam.id },
      });
      if (!existingAttempt) {
        await attemptRepo.save(
          attemptRepo.create({
            userId: learner.id,
            examId: exam.id,
            score: attemptTemplate.score,
            status: attemptTemplate.status,
            timeSpent: attemptTemplate.timeSpent,
            streakBonus: attemptTemplate.streakBonus,
            completedAt: new Date(Date.now() - attemptTemplate.completedDaysAgo * 24 * 60 * 60 * 1000),
          }),
        );
      }

      const streak = await streakRepo.findOne({ where: { userId: learner.id } });
      const streakEntity = streak ?? streakRepo.create({ userId: learner.id });
      streakEntity.currentStreak = attemptTemplate.status === 'passed' ? 1 : 0;
      streakEntity.longestStreak = Math.max(streakEntity.longestStreak ?? 0, streakEntity.currentStreak);
      streakEntity.lastExamDate = new Date();
      await streakRepo.save(streakEntity);
    }
  }

  console.log('[Seed] Demo learner fixtures complete.');
}

async function runIntegrityChecks(dataSource: DataSource, profile: SeedProfile): Promise<void> {
  if (profile === 'none') {
    return;
  }

  const certRepo = dataSource.getRepository(Certification);
  const examRepo = dataSource.getRepository(Exam);
  const progressRepo = dataSource.getRepository(UserCourseProgress);
  const issuedRepo = dataSource.getRepository(IssuedCertificate);

  const activeAvailableCerts = await certRepo.find({
    where: { status: 'Active', available: true },
    relations: ['courses'],
  });
  const unlinkedCerts = activeAvailableCerts.filter((cert) => (cert.courses?.length ?? 0) === 0);
  if (unlinkedCerts.length > 0) {
    throw new Error(`[Seed] Integrity failed: ${unlinkedCerts.length} active+available certifications have no linked course.`);
  }

  const examsCount = await examRepo.count();
  if (examsCount < 1) {
    throw new Error('[Seed] Integrity failed: no exams exist after seeding.');
  }

  const inProgressCount = await progressRepo.count({ where: { status: 'in_progress' } });
  const completedCount = await progressRepo.count({ where: { status: 'completed' } });
  const issuedCount = await issuedRepo.count();

  if (profile === 'demo') {
    if (inProgressCount < 1 || completedCount < 1 || issuedCount < 1) {
      throw new Error(
        `[Seed] Integrity failed for demo profile: inProgress=${inProgressCount}, completed=${completedCount}, issued=${issuedCount}.`,
      );
    }
  }

  console.log(
    '[Seed] Integrity summary:',
    JSON.stringify(
      {
        profile,
        activeAvailableCertifications: activeAvailableCerts.length,
        exams: examsCount,
        progress: {
          inProgress: inProgressCount,
          completed: completedCount,
        },
        issuedCertificates: issuedCount,
      },
      null,
      2,
    ),
  );
}

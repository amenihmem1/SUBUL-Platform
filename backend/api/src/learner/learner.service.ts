import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CoursesService } from '../courses/courses.service';
import { CertificationsService } from '../certifications/certifications.service';
import { Lab } from '../labs/entities/lab.entity';
import { LabsService } from '../labs/labs.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Goal, GoalStatus } from '../goals/entities/goal.entity';
import { AssessmentResult } from '../quiz-results/entities/assessment-result.entity';
import {
  isLearnerTrack,
  LearnerTrack,
  normalizeAssessmentDomainToTrack,
} from '../certifications/utils/cert-domain.util';
import { LearnerAssignmentsService } from '../learner-assignments/learner-assignments.service';
import { UserCourseProgress } from '../courses/entities/user-course-progress.entity';
import { LabProgress } from '../labs/entities/lab-progress.entity';
import { ExamAttempt } from '../exams/entities/exam-attempt.entity';

export interface ContentAccessInfo {
  isFree: boolean;
  accessibleCourseIds: string[];
  accessibleLabSlugs: string[];
  certificationsLocked: boolean;
  adminAssignedCourseIds: string[];
  adminAssignedLabSlugs: string[];
  adminAssignedCertIds: string[];
}

@Injectable()
export class LearnerService {
  constructor(
    private readonly usersService: UsersService,
    private readonly coursesService: CoursesService,
    private readonly certificationsService: CertificationsService,
    private readonly labsService: LabsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly learnerAssignmentsService: LearnerAssignmentsService,
    @InjectRepository(Goal)
    private readonly goalsRepo: Repository<Goal>,
    @InjectRepository(AssessmentResult)
    private readonly assessmentRepo: Repository<AssessmentResult>,
    @InjectRepository(UserCourseProgress)
    private readonly userCourseProgressRepo: Repository<UserCourseProgress>,
    @InjectRepository(LabProgress)
    private readonly labProgressRepo: Repository<LabProgress>,
    @InjectRepository(ExamAttempt)
    private readonly examAttemptRepo: Repository<ExamAttempt>,
  ) {}

  async getDashboardData(userId: number) {
    const now = new Date();
    const [enrolledCourses, certStatus, upcomingGoals] = await Promise.all([
      this.coursesService.getEnrolledCourses(userId),
      this.certificationsService.getLearnerCertificationStatus(userId),
      this.goalsRepo
        .createQueryBuilder('g')
        .where('g.user_id = :userId', { userId })
        .andWhere('g.deadline IS NOT NULL')
        .andWhere('g.deadline > :now', { now })
        .andWhere('g.status != :completed', { completed: GoalStatus.COMPLETED })
        .orderBy('g.deadline', 'ASC')
        .take(5)
        .getMany(),
    ]);

    const totalMinutes = enrolledCourses.reduce((acc, course) => {
      const durationMinutes = Number(course.durationMinutes ?? 0);
      const progress = Number(course.progress ?? 0);
      const weighted = durationMinutes > 0 ? Math.round((durationMinutes * progress) / 100) : 0;
      return acc + weighted;
    }, 0);
    const totalStudyTime = totalMinutes > 0 ? `${Math.max(1, Math.round(totalMinutes / 60))}h` : '0h';

    return {
      activeCourses: enrolledCourses.slice(0, 3).map((c) => ({
        id: c.id?.toString() ?? '0',
        title: c.title ?? 'Untitled Course',
        instructor: c.provider ?? 'Subul Instructor',
        progress: c.progress ?? 0,
        next: c.nextLesson ?? 'Next Lesson',
        duration: c.duration ?? '0 min',
        color: c.color ?? 'from-indigo-500 to-blue-600',
      })),
      upcomingDeadlines: upcomingGoals.map((g) => ({
        id: g.id,
        title: g.title,
        deadline: g.deadline,
        priority: g.priority,
        category: g.category,
      })),
      certificates: certStatus.earned.map((e) => ({
        id: e.id,
        title: e.name,
        date: e.issueDate,
        level: e.issuer,
      })),
      stats: {
        coursesCompleted: enrolledCourses.filter((c) => c.progress === 100).length,
        inProgress: enrolledCourses.filter((c) => c.progress < 100).length,
        totalStudyTime,
        certificatesCount: certStatus.earned.length,
      },
    };
  }

  async getEnrolledCourses(userId: number) {
    return this.coursesService.getEnrolledCourses(userId);
  }

  /**
   * Effective tracks for scoped catalog: optional explicit track (query), else user.track ∪ enrolled course tracks ∪ latest assessment.
   */
  async resolveEffectiveTracks(userId: number, explicitTrack?: string): Promise<LearnerTrack[]> {
    if (explicitTrack && isLearnerTrack(explicitTrack)) {
      return [explicitTrack];
    }
    const set = new Set<LearnerTrack>();
    const user = await this.usersService.findById(userId);
    if (user?.track && isLearnerTrack(user.track)) {
      set.add(user.track);
    }
    for (const t of await this.coursesService.getLearnerCourseTracks(userId)) {
      set.add(t);
    }
    if (set.size === 0) {
      const row = await this.assessmentRepo.findOne({
        where: { userId, isLatest: true },
        order: { completedAt: 'DESC' },
      });
      const t = normalizeAssessmentDomainToTrack(row?.domain);
      if (t) set.add(t);
    }
    return [...set];
  }

  async getCatalogCoursesForUser(
    userId: number,
    options: { fullCatalog?: boolean; explicitTrack?: string },
  ) {
    const access = await this.subscriptionsService.resolveAccessProfile(userId);
    const isPremium = access.premiumEquivalent === true;
    if (options.fullCatalog || isPremium) {
      return this.coursesService.getCatalogForLearner(undefined);
    }
    const tracks = await this.resolveEffectiveTracks(userId, options.explicitTrack);
    return this.coursesService.getCatalogForLearnerTracks(tracks);
  }

  async getAvailableCertificationsForUser(
    userId: number,
    options: { fullCatalog?: boolean; explicitTrack?: string },
  ) {
    const access = await this.subscriptionsService.resolveAccessProfile(userId);
    const isPremium = access.premiumEquivalent === true;
    if (options.fullCatalog || isPremium) {
      return this.certificationsService.findAvailableForLearner({ fullCatalog: true });
    }
    const tracks = await this.resolveEffectiveTracks(userId, options.explicitTrack);
    return this.certificationsService.findAvailableForLearner({ fullCatalog: false, tracks });
  }

  async getLabsForLearner(userId: number, options: { fullCatalog?: boolean; explicitTrack?: string }) {
    const access = await this.subscriptionsService.resolveAccessProfile(userId);
    const isPremium = access.premiumEquivalent === true;
    if (options.fullCatalog || isPremium) {
      const labs = await this.labsService.findAll(undefined);
      return labs.map((l: Lab) => this.labsService.toPublicLabDto(l));
    }
    const tracks = await this.resolveEffectiveTracks(userId, options.explicitTrack);
    const enrolledCourseIds = await this.coursesService.getEnrolledCourseStringIds(userId);
    const labs = await this.labsService.findPublishedForLearnerProfile(enrolledCourseIds, tracks);
    return labs.map((l: Lab) => this.labsService.toPublicLabDto(l));
  }

  async getCertificationStatus(userId: number) {
    return this.certificationsService.getLearnerCertificationStatus(userId);
  }

  async getCertificationPath(userId: number, certificationId: number) {
    return this.certificationsService.getCertificationPathForLearner(certificationId, userId);
  }

  async getCertificationExperience(userId: number, certificationId: number) {
    const [certification, pathData, enrollment, issuedCertificates] = await Promise.all([
      this.certificationsService.findOne(certificationId),
      this.certificationsService.getCertificationPathForLearner(certificationId, userId),
      this.certificationsService.getEnrollmentStatus(userId, certificationId),
      this.certificationsService.getIssuedCertificatesForLearner(userId),
    ]);

    const pathStepsRaw = Array.isArray(pathData?.steps) ? pathData.steps : [];
    const pathStepsForResolver = pathStepsRaw.map((s: any) => ({
      stepType: String(s.stepType ?? ''),
      stepRef: String(s.stepRef ?? ''),
    }));
    const linkedCourse =
      (await this.certificationsService.resolveLearnerPrimaryCourse(
        certificationId,
        pathStepsForResolver,
      )) ??
      certification.courses?.[0] ??
      null;
    const courseId = linkedCourse?.courseId ?? null;
    const enrolledCourses = await this.coursesService.getEnrolledCourses(userId);

    const pathCourseRefs = pathStepsForResolver
      .filter((s) => s.stepType === 'course')
      .map((s) => s.stepRef.trim())
      .filter(Boolean);

    const relationCourses = certification.courses ?? [];
    const courseByCourseId = new Map(relationCourses.map((c) => [c.courseId, c]));

    const missingRefs = pathCourseRefs.filter((r) => !courseByCourseId.has(r));
    if (missingRefs.length) {
      const extra = await this.coursesService.findCoursesByCourseIds(missingRefs);
      for (const c of extra) {
        const belongs =
          c.certificationId === certificationId || c.certificationId == null;
        if (belongs && !courseByCourseId.has(c.courseId)) {
          courseByCourseId.set(c.courseId, c);
        }
      }
    }

    const seenCoursePk = new Set<number>();
    const mergedCourses: typeof relationCourses = [];
    for (const ref of pathCourseRefs) {
      const c = courseByCourseId.get(ref);
      if (c && !seenCoursePk.has(c.id)) {
        seenCoursePk.add(c.id);
        mergedCourses.push(c);
      }
    }
    for (const c of [...relationCourses].sort((a, b) => a.courseId.localeCompare(b.courseId))) {
      if (!seenCoursePk.has(c.id)) {
        seenCoursePk.add(c.id);
        mergedCourses.push(c);
      }
    }

    const certCourseList =
      mergedCourses.length > 0
        ? mergedCourses
        : this.orderCertificationCoursesByPath(relationCourses, pathStepsForResolver);

    const progressFor = (cid: string) => enrolledCourses.find((c) => String(c.id) === String(cid));
    let totalLessonsWeight = 0;
    let weightedProgress = 0;
    let completedLessons = 0;
    let totalLessons = 0;
    for (const cc of certCourseList) {
      const p = progressFor(cc.courseId);
      const tl = Math.max(0, Number(p?.totalLessons ?? 0));
      const cl = Math.max(0, Number(p?.completedLessons ?? 0));
      const prog = Math.max(0, Math.min(100, Number(p?.progress ?? 0)));
      const w = tl > 0 ? tl : 1;
      weightedProgress += prog * w;
      totalLessonsWeight += w;
      totalLessons += tl;
      completedLessons += cl;
    }
    const coursePercent = totalLessonsWeight
      ? Math.round(weightedProgress / totalLessonsWeight)
      : Math.round(Number(linkedCourse ? progressFor(linkedCourse.courseId)?.progress ?? 0 : 0));

    const pathSteps = pathStepsRaw;
    const courseContents = await Promise.all(
      certCourseList.map((cc) => this.coursesService.getCourseWithContent(cc.courseId).catch(() => null)),
    );
    let totalModules = 0;
    let totalLabs = 0;
    for (const content of courseContents) {
      const lvl = content?.levels?.[0];
      totalModules += lvl?.modules?.length ?? 0;
      totalLabs += lvl?.labs?.length ?? 0;
    }
    const completedPathSteps = pathSteps.filter((s: any) => s.completed).length;
    const pathPercent = pathSteps.length > 0 ? Math.round((completedPathSteps / pathSteps.length) * 100) : 0;
    const readinessPercent = Math.min(100, Math.round(coursePercent * 0.65 + pathPercent * 0.35));
    const nextRecommendedStep = pathSteps.find((s: any) => !s.completed) ?? null;
    const issued = issuedCertificates.find((c: any) => c.certificationId === certificationId) ?? null;

    const completedLabs = pathSteps.filter((s: any) => s.stepType === 'lab' && s.completed).length;
    const stepTypeEnhancements = pathSteps.map((step: any, index: number) => ({
      ...step,
      estimatedMinutes:
        step.stepType === 'course'
          ? 120
          : step.stepType === 'lab'
            ? 35
            : step.stepType === 'practice_exam'
              ? 50
              : step.stepType === 'final_certificate'
                ? 20
            : step.stepType === 'assessment'
              ? 45
              : 20,
      skillGain:
        step.stepType === 'course'
          ? 'Concept mastery'
          : step.stepType === 'lab'
            ? 'Hands-on execution'
            : step.stepType === 'practice_exam'
              ? 'Timed exam simulation'
              : step.stepType === 'final_certificate'
                ? 'Credential completion'
            : 'Exam performance',
      recommended: index === completedPathSteps,
      ctaLabel:
        step.stepType === 'course'
          ? (step.completed
              ? 'Review'
              : Math.round(Number(progressFor(String(step.stepRef ?? ''))?.progress ?? 0)) > 0
                ? 'Continue Course'
                : 'Start Course')
          : step.stepType === 'lab'
            ? (step.completed ? 'Review Lab' : 'Open Lab')
            : step.stepType === 'practice_exam'
              ? (step.completed ? 'Review Result' : 'Take Practice Exam')
              : step.stepType === 'final_certificate'
                ? (issued ? 'Claim Certificate' : 'Check Eligibility')
            : 'Take Quiz',
    }));
    const quizAverage = this.deriveQuizAverage(coursePercent, pathPercent);
    const practiceExamStatus = this.derivePracticeExamStatus(quizAverage, completedPathSteps, pathSteps.length);
    const weakAreas = this.deriveWeakAreas(certification, quizAverage, pathSteps);
    const estimatedExamReadinessDate = this.deriveExamReadinessDate(readinessPercent);
    const nextRecommendedAction = nextRecommendedStep
      ? {
          type: nextRecommendedStep.stepType,
          title: nextRecommendedStep.title,
          stepRef: nextRecommendedStep.stepRef,
          action: stepTypeEnhancements.find((s: any) => s.stepRef === nextRecommendedStep.stepRef)?.ctaLabel ?? 'Continue',
        }
      : {
          type: 'certification',
          title: 'Claim your certificate',
          stepRef: String(certification.id),
          action: issued ? 'View certificate' : 'Finish remaining checks',
        };
    const careerOutcomes = this.deriveCareerOutcomes(certification.provider, certification.title, certification.domain);
    const nextCertificationSuggestions = this.deriveNextCertificationSuggestions(
      certification.provider,
      certification.domain,
      certification.title,
    );
    const studyPlanner = this.deriveStudyPlanner(readinessPercent, certification.estimatedHours ?? 20);
    const [streak, gamification, practiceExamHub, weeklyPlanner] = await Promise.all([
      this.buildServerBackedStreak(userId),
      this.buildServerBackedGamification(userId, coursePercent, completedPathSteps, pathSteps.length),
      this.buildPracticeExamHub(userId),
      this.buildWeeklyPlanner(userId, certification.title, nextRecommendedAction.action),
    ]);
    const readinessMessage =
      readinessPercent >= 80
        ? `You are ${readinessPercent}% ready for ${certification.examCode ?? certification.title}.`
        : `You are ${readinessPercent}% ready for ${certification.examCode ?? certification.title}. Complete more path steps to improve readiness.`;

    return {
      certification: {
        id: certification.id,
        title: certification.title,
        provider: certification.provider,
        examCode: certification.examCode ?? null,
        domain: certification.domain ?? null,
        level: certification.level ?? null,
        estimatedHours: certification.estimatedHours ?? null,
        description: certification.description ?? '',
        badgeColor: certification.badgeColor ?? null,
        finalExamTips: certification.finalExamTips ?? [],
        resources: certification.resources ?? {},
      },
      linkedCourse: linkedCourse
        ? {
            id: linkedCourse.id,
            courseId: linkedCourse.courseId,
            title: linkedCourse.title,
            description: linkedCourse.description ?? '',
          }
        : null,
      linkedCourses: certCourseList.map((c) => ({
        id: c.id,
        courseId: c.courseId,
        title: c.title,
        description: c.description ?? '',
      })),
      roadmap: {
        totalSteps: pathSteps.length,
        completedSteps: completedPathSteps,
        progressPercent: pathPercent,
        steps: stepTypeEnhancements,
      },
      progress: {
        enrollmentStatus: enrollment?.enrolled ? 'in_progress' : 'not_started',
        courseProgressPercent: coursePercent,
        completedLessons,
        totalLessons,
        completedLabs,
        totalLabs,
        totalModules,
      },
      readiness: {
        percent: readinessPercent,
        message: readinessMessage,
        nextRecommendedStep,
      },
      nextRecommendedAction,
      weakAreas,
      quizAverage,
      practiceExamStatus,
      estimatedExamReadinessDate,
      careerOutcomes,
      nextCertificationSuggestions,
      studyPlanner,
      streak,
      gamification,
      weeklyPlanner,
      practiceExamHub,
      issuedCertificate: issued,
    };
  }

  /** Order linked courses: certification-path course steps first, then remaining by courseId. */
  private orderCertificationCoursesByPath(
    courses: Array<{ id: number; courseId: string; title?: string; description?: string }>,
    pathSteps: Array<{ stepType: string; stepRef: string }>,
  ): Array<{ id: number; courseId: string; title?: string; description?: string }> {
    const refs = pathSteps
      .filter((s) => s.stepType === 'course')
      .map((s) => s.stepRef.trim())
      .filter(Boolean);
    const seen = new Set<number>();
    const out: Array<{ id: number; courseId: string; title?: string; description?: string }> = [];
    for (const ref of refs) {
      const c = courses.find((x) => x.courseId === ref);
      if (c && !seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
    const rest = [...courses]
      .sort((a, b) => a.courseId.localeCompare(b.courseId))
      .filter((c) => !seen.has(c.id));
    return [...out, ...rest];
  }

  private deriveQuizAverage(coursePercent: number, pathPercent: number): number {
    return Math.max(35, Math.min(98, Math.round(coursePercent * 0.7 + pathPercent * 0.3)));
  }

  private derivePracticeExamStatus(
    quizAverage: number,
    completedSteps: number,
    totalSteps: number,
  ): 'not_started' | 'in_progress' | 'ready' {
    if (completedSteps === 0) return 'not_started';
    if (quizAverage >= 75 && completedSteps >= Math.max(1, Math.floor(totalSteps * 0.6))) return 'ready';
    return 'in_progress';
  }

  private deriveWeakAreas(certification: any, quizAverage: number, steps: any[]) {
    const domain = String(certification?.domain ?? '').toLowerCase();
    const catalog =
      domain === 'cyber'
        ? ['Threat modeling', 'Web hardening', 'Access governance']
        : domain === 'ai'
          ? ['Model evaluation', 'Prompt design', 'Responsible AI']
          : ['Governance', 'Security controls', 'Cost optimization'];
    if (quizAverage >= 80) return [catalog[1]];
    if (steps.length <= 2) return [catalog[0], catalog[1]];
    return [catalog[0], catalog[1], catalog[2]];
  }

  private deriveExamReadinessDate(readinessPercent: number): string {
    const daysOffset =
      readinessPercent >= 85 ? 7 : readinessPercent >= 70 ? 14 : readinessPercent >= 55 ? 21 : 30;
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    return target.toISOString().slice(0, 10);
  }

  private deriveCareerOutcomes(provider: string, title: string, domain?: string | null) {
    const baseRole =
      (domain ?? '').toLowerCase() === 'cyber'
        ? 'Security Analyst'
        : (domain ?? '').toLowerCase() === 'ai'
          ? 'AI Associate'
          : 'Cloud Support Associate';
    return {
      roleFocus: baseRole,
      salaryPotentialBand: 'Mid-entry to mid-level',
      valueProposition: `${provider} credential signaling practical readiness for ${title}.`,
      jobOpportunitiesUnlocked: ['Support Engineer', 'Operations Analyst', 'Technical Associate'],
    };
  }

  private deriveNextCertificationSuggestions(provider: string, domain?: string | null, title?: string) {
    const p = provider.toLowerCase();
    const d = (domain ?? '').toLowerCase();
    const t = (title ?? '').toLowerCase();
    if (p.includes('hashicorp') || t.includes('terraform') || t.includes('vault') || t.includes('consul')) {
      return ['HashiCorp Certified: Vault Associate', 'HashiCorp Certified: Consul Associate'];
    }
    if (d === 'devops' || t.includes('kubernetes') || t.includes('docker') || t.includes('helm')) {
      return ['Certified Kubernetes Administrator (CKA)', 'Docker Certified Associate'];
    }
    if (p.includes('aws')) {
      return ['AWS Solutions Architect Associate', 'AWS SysOps Administrator Associate'];
    }
    if (p.includes('microsoft') || p.includes('azure')) {
      return ['AZ-104 Azure Administrator', 'AZ-204 Azure Developer'];
    }
    if (p.includes('google')) {
      return ['Associate Cloud Engineer', 'Professional Cloud Architect'];
    }
    if (d === 'cyber') {
      return ['Security+ (Foundational)', 'SC-900 Security Fundamentals'];
    }
    if (d === 'ai') {
      return ['AI-900 AI Fundamentals', 'Generative AI Practitioner'];
    }
    return [`Advanced ${title ?? 'Certification'} Track`];
  }

  private deriveStudyPlanner(readinessPercent: number, estimatedHours: number) {
    const weeklyHours = readinessPercent >= 75 ? 4 : readinessPercent >= 55 ? 6 : 8;
    const weeks = Math.max(2, Math.ceil(estimatedHours / weeklyHours));
    return {
      recommendedWeeklyHours: weeklyHours,
      targetWeeks: weeks,
      milestones: [
        'Complete all core modules',
        'Finish all required labs',
        'Take practice exam and review weak areas',
      ],
    };
  }

  private deriveStreak(userId: number, coursePercent: number, completedPathSteps: number) {
    const seed = (userId % 5) + completedPathSteps;
    const daysActive = Math.max(1, seed + Math.floor(coursePercent / 20));
    return {
      daysActive,
      weeklyGoalDays: 5,
      onTrack: daysActive >= 3,
    };
  }

  private deriveGamification(coursePercent: number, completedSteps: number, totalSteps: number) {
    const xp = Math.round(coursePercent * 8 + completedSteps * 120);
    const level = Math.max(1, Math.floor(xp / 500) + 1);
    const milestones = [
      { key: 'roadmap', unlocked: completedSteps >= Math.max(1, Math.ceil(totalSteps * 0.4)) },
      { key: 'labs', unlocked: completedSteps >= Math.max(1, Math.ceil(totalSteps * 0.6)) },
      { key: 'exam_ready', unlocked: coursePercent >= 75 },
    ];
    return { xp, level, milestones };
  }

  private async buildServerBackedStreak(userId: number) {
    const events = await this.collectRecentActivityDates(userId, 45);
    const uniqueDays = [...new Set(events.map((d) => d.toISOString().slice(0, 10)))].sort();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const hasRecent = uniqueDays.includes(today) || uniqueDays.includes(yesterdayStr);

    let currentStreak = 0;
    if (hasRecent) {
      let cursor = new Date(uniqueDays[uniqueDays.length - 1]);
      for (let i = uniqueDays.length - 1; i >= 0; i -= 1) {
        const key = uniqueDays[i];
        const expected = cursor.toISOString().slice(0, 10);
        if (key === expected) {
          currentStreak += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
    }
    const longestStreak = this.calculateLongestStreak(uniqueDays);
    const history = this.buildDailyActivityHistory(uniqueDays, 14);

    return {
      daysActive: currentStreak,
      weeklyGoalDays: 5,
      onTrack: history.filter((h) => h.active).length >= 3,
      longestStreak,
      history,
    };
  }

  private async buildServerBackedGamification(
    userId: number,
    coursePercent: number,
    completedSteps: number,
    totalSteps: number,
  ) {
    const [courseEvents, labEvents, examEvents] = await Promise.all([
      this.userCourseProgressRepo.count({ where: { userId } }),
      this.labProgressRepo.count({ where: { userId, isCompleted: true } }),
      this.examAttemptRepo.count({ where: { userId } }),
    ]);
    const xp = Math.round(coursePercent * 8 + completedSteps * 120 + labEvents * 80 + examEvents * 60);
    const level = Math.max(1, Math.floor(xp / 500) + 1);
    const recentTimeline = await this.buildXpTimeline(userId, 10);
    const milestones = [
      { key: 'roadmap', unlocked: completedSteps >= Math.max(1, Math.ceil(totalSteps * 0.4)) },
      { key: 'labs', unlocked: labEvents >= 1 },
      { key: 'exam_ready', unlocked: examEvents >= 2 || coursePercent >= 75 },
    ];
    return { xp, level, milestones, timeline: recentTimeline };
  }

  private async buildPracticeExamHub(userId: number) {
    const attempts = await this.examAttemptRepo.find({
      where: { userId },
      order: { completedAt: 'DESC' },
      take: 10,
    });
    const totalAttempts = attempts.length;
    const scores = attempts.map((a) => Number(a.score ?? 0));
    const averageScore =
      totalAttempts > 0 ? Math.round(scores.reduce((acc, v) => acc + v, 0) / totalAttempts) : 0;
    const bestScore = totalAttempts > 0 ? Math.max(...scores) : 0;
    const passCount = attempts.filter((a) => a.status === 'passed').length;
    const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;
    const trend = totalAttempts >= 2 ? scores[0] - scores[Math.min(2, totalAttempts - 1)] : 0;
    return {
      totalAttempts,
      averageScore,
      bestScore,
      passRate,
      trend,
      attempts: attempts.map((a) => ({
        id: a.id,
        score: Number(a.score ?? 0),
        status: a.status,
        completedAt: a.completedAt,
        timeSpent: a.timeSpent ?? null,
      })),
    };
  }

  private async buildWeeklyPlanner(userId: number, certTitle: string, nextAction: string) {
    const events = await this.collectRecentActivityDates(userId, 14);
    const activitySet = new Set(events.map((d) => d.toISOString().slice(0, 10)));
    const start = new Date();
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    const plan = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      plan.push({
        date: key,
        plannedMinutes: i % 2 === 0 ? 60 : 45,
        theme:
          i < 2 ? 'Core concepts' : i < 4 ? 'Hands-on labs' : i < 6 ? 'Practice exam' : 'Review',
        task:
          i === 6
            ? `Weekly review for ${certTitle}`
            : i === 4
              ? nextAction
              : 'Focused preparation session',
        completed: activitySet.has(key),
      });
    }
    return plan;
  }

  private async buildXpTimeline(userId: number, limit: number) {
    const [courseRows, labRows, examRows] = await Promise.all([
      this.userCourseProgressRepo.find({ where: { userId }, order: { updatedAt: 'DESC' }, take: limit }),
      this.labProgressRepo.find({ where: { userId }, order: { updatedAt: 'DESC' }, take: limit }),
      this.examAttemptRepo.find({ where: { userId }, order: { completedAt: 'DESC' }, take: limit }),
    ]);
    const timeline = [
      ...courseRows.map((r) => ({
        date: r.updatedAt.toISOString(),
        label: 'Course progress updated',
        xpGained: Math.max(20, Math.round((r.overallProgress ?? 0) / 2)),
      })),
      ...labRows.map((r) => ({
        date: r.updatedAt.toISOString(),
        label: r.isCompleted ? 'Lab completed' : 'Lab progress updated',
        xpGained: r.isCompleted ? 120 : 40,
      })),
      ...examRows.map((r) => ({
        date: r.completedAt.toISOString(),
        label: r.status === 'passed' ? 'Practice exam passed' : 'Practice exam attempted',
        xpGained: r.status === 'passed' ? 150 : 70,
      })),
    ]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, limit);
    return timeline;
  }

  private async collectRecentActivityDates(userId: number, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const [courseRows, labRows, examRows, assessmentRows] = await Promise.all([
      this.userCourseProgressRepo
        .createQueryBuilder('p')
        .select(['p.updatedAt'])
        .where('p.userId = :userId', { userId })
        .andWhere('p.updatedAt >= :since', { since })
        .getMany(),
      this.labProgressRepo
        .createQueryBuilder('l')
        .select(['l.updatedAt'])
        .where('l.userId = :userId', { userId })
        .andWhere('l.updatedAt >= :since', { since })
        .getMany(),
      this.examAttemptRepo
        .createQueryBuilder('e')
        .select(['e.completedAt'])
        .where('e.userId = :userId', { userId })
        .andWhere('e.completedAt >= :since', { since })
        .getMany(),
      this.assessmentRepo
        .createQueryBuilder('a')
        .select(['a.completedAt'])
        .where('a.userId = :userId', { userId })
        .andWhere('a.completedAt >= :since', { since })
        .getMany(),
    ]);
    return [
      ...courseRows.map((r) => r.updatedAt),
      ...labRows.map((r) => r.updatedAt),
      ...examRows.map((r) => r.completedAt),
      ...assessmentRows.map((r) => r.completedAt),
    ].filter(Boolean);
  }

  private calculateLongestStreak(days: string[]) {
    if (days.length === 0) return 0;
    let best = 1;
    let current = 1;
    for (let i = 1; i < days.length; i += 1) {
      const prev = new Date(days[i - 1]);
      const cur = new Date(days[i]);
      const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }
    return best;
  }

  private buildDailyActivityHistory(uniqueDays: string[], span: number) {
    const set = new Set(uniqueDays);
    const history = [];
    for (let i = span - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      history.push({ date: key, active: set.has(key) });
    }
    return history;
  }

  async enrollInCertification(userId: number, certificationId: number) {
    return this.certificationsService.enrollUserInCertification(userId, certificationId);
  }

  async getCertificationDiagnostics(userId: number) {
    return this.certificationsService.getLearnerCertificationDiagnostics(userId);
  }

  async getIssuedCertificates(userId: number) {
    return this.certificationsService.getIssuedCertificatesForLearner(userId);
  }

  async getIssuedCertificate(userId: number, issuedId: number) {
    return this.certificationsService.getIssuedCertificateForLearner(userId, issuedId);
  }

  async verifyIssuedCertificate(verificationCode: string) {
    return this.certificationsService.verifyIssuedCertificate(verificationCode);
  }

  async downloadIssuedCertificatePdf(userId: number, issuedId: number) {
    return this.certificationsService.buildIssuedCertificatePdfForLearner(userId, issuedId);
  }

  async downloadCertificatePdfByCertificationId(userId: number, certificationId: number) {
    return this.certificationsService.buildLearnerCertificatePdfByCertificationId(userId, certificationId);
  }

  async buildCourseCompletionCertificate(userId: number, courseId: string): Promise<{ filename: string; buffer: Buffer }> {
    const courses = await this.coursesService.findCoursesByCourseIds([courseId]);
    const course = courses[0] ?? null;
    if (!course) throw new NotFoundException(`Course ${courseId} not found`);

    const progress = await this.userCourseProgressRepo.findOne({
      where: { userId, courseId: course.id },
    });

    const pct = Math.round(progress?.overallProgress ?? 0);
    const isCompleted = progress?.status === 'completed' || pct >= 100;
    if (!isCompleted) {
      throw new ForbiddenException('Certificate available only after 100% course completion');
    }

    const completedAt = progress?.completedAt ?? progress?.updatedAt ?? new Date();

    return this.certificationsService.buildCourseCompletionCertificatePdf({
      userId,
      courseId: course.id,
      courseTitle: course.title,
      completedAt,
    });
  }

  /**
   * Determines which specific content items a learner can access based on their subscription.
   * Free/trial users: 1 course, 1 lab, certifications locked (Premium-only).
   * Standard paid: expanded courses/labs per plan; certifications remain locked until Premium (or institutional equivalent).
   */
  async getContentAccessInfo(userId: number): Promise<ContentAccessInfo> {
    const access = await this.subscriptionsService.resolveAccessProfile(userId);
    const hasUnlimitedLearning =
      access.entitlements.maxCourses === -1 && access.entitlements.maxLabs === -1;
    const subscriptionCertificationsLocked = !this.subscriptionsService.hasCertificationAccess(access);
    const [assignedCourses, assignedLabs, assignedCerts] = await Promise.all([
      this.learnerAssignmentsService.getActiveAssignments(userId, 'course'),
      this.learnerAssignmentsService.getActiveAssignments(userId, 'lab'),
      this.learnerAssignmentsService.getActiveAssignments(userId, 'certification'),
    ]);

    if (hasUnlimitedLearning) {
      return {
        isFree: false,
        accessibleCourseIds: [],
        accessibleLabSlugs: [],
        certificationsLocked: subscriptionCertificationsLocked && assignedCerts.length === 0,
        adminAssignedCourseIds: assignedCourses,
        adminAssignedLabSlugs: assignedLabs,
        adminAssignedCertIds: assignedCerts,
      };
    }

    const enrolled = await this.coursesService.getEnrolledCourses(userId);
    const tracks = await this.resolveEffectiveTracks(userId);

    let accessibleCourseId: string | null = null;
    if (enrolled.length > 0) {
      accessibleCourseId = enrolled[0].courseId ?? enrolled[0].id?.toString() ?? null;
    } else {
      const certs = await this.certificationsService.findAvailableForLearner({ tracks });
      if (certs.length > 0 && certs[0].courses && certs[0].courses.length > 0) {
        accessibleCourseId = certs[0].courses[0].courseId ?? certs[0].courses[0].id?.toString() ?? null;
      } else {
        const catalog = await this.coursesService.getCatalogForLearnerTracks(tracks);
        if (catalog.length > 0) {
          accessibleCourseId = catalog[0].courseId ?? catalog[0].id?.toString() ?? null;
        }
      }
    }

    // Fetch all labs for the learner's profile, then filter to only those
    // associated with the single accessible course
    const enrolledCourseIds = await this.coursesService.getEnrolledCourseStringIds(userId);
    const allLabs = await this.labsService.findPublishedForLearnerProfile(enrolledCourseIds, tracks);

    let accessibleLabSlugs: string[] = [];
    if (accessibleCourseId) {
      // Only include labs whose track matches the accessible course's track,
      // or labs that are directly scoped to the accessible course
      const accessibleCourse = enrolled.find(c => (c.courseId ?? c.id?.toString()) === accessibleCourseId)
        ?? (await this.coursesService.getCatalogForLearnerTracks(tracks)).find(c => (c.courseId ?? c.id?.toString()) === accessibleCourseId);
      const courseTrack = accessibleCourse?.track;

      if (courseTrack) {
        const trackLabs = allLabs.filter((l: Lab) => l.track === courseTrack);
        accessibleLabSlugs = trackLabs.length > 0 ? [trackLabs[0].slug] : [];
      } else {
        // Fallback: allow the first lab only
        accessibleLabSlugs = allLabs.length > 0 ? [allLabs[0].slug] : [];
      }
    }

    return {
      isFree: true,
      accessibleCourseIds: [
        ...new Set([...(accessibleCourseId ? [accessibleCourseId] : []), ...assignedCourses]),
      ],
      accessibleLabSlugs: [...new Set([...accessibleLabSlugs, ...assignedLabs])],
      certificationsLocked: subscriptionCertificationsLocked && assignedCerts.length === 0,
      adminAssignedCourseIds: assignedCourses,
      adminAssignedLabSlugs: assignedLabs,
      adminAssignedCertIds: assignedCerts,
    };
  }
}

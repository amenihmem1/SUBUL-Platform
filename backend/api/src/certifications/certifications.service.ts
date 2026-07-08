import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { Certification } from './entities/certification.entity';
import { IssuedCertificate } from './entities/issued-certificate.entity';
import { Course } from '../courses/entities/course.entity';
import { UserCourseProgress } from '../courses/entities/user-course-progress.entity';
import { User } from '../users/entities/user.entity';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
import { LearnerTrack, normalizeCertDomainToTrack } from './utils/cert-domain.util';
import { CertificatePdfService } from './certificate-pdf.service';
import { CertificationPath, CertificationPathStepType } from './entities/certification-path.entity';
import { LabProgress } from '../labs/entities/lab-progress.entity';
import { Lab as InteractiveLab } from '../labs/entities/lab.entity';
import { Lab as CourseLab } from '../courses/entities/lab.entity';
import { AssessmentResult } from '../quiz-results/entities/assessment-result.entity';
import { PracticeExam } from '../practice-exams/entities/practice-exam.entity';
import { PracticeExamAttempt } from '../practice-exams/entities/practice-exam-attempt.entity';
import { CourseCompletionCertificate } from './entities/course-completion-certificate.entity';

@Injectable()
export class CertificationsService {
  private readonly logger = new Logger(CertificationsService.name);
  private readonly interactiveLabRepository: Repository<InteractiveLab>;
  private readonly courseLabRepository: Repository<CourseLab>;

  constructor(
    @InjectRepository(Certification)
    private readonly certificationRepository: Repository<Certification>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(UserCourseProgress)
    private readonly progressRepository: Repository<UserCourseProgress>,
    @InjectRepository(IssuedCertificate)
    private readonly issuedCertificateRepository: Repository<IssuedCertificate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CertificationPath)
    private readonly certificationPathRepository: Repository<CertificationPath>,
    @InjectRepository(LabProgress)
    private readonly labProgressRepository: Repository<LabProgress>,
    @InjectRepository(AssessmentResult)
    private readonly assessmentRepository: Repository<AssessmentResult>,
    @InjectRepository(PracticeExam)
    private readonly practiceExamRepository: Repository<PracticeExam>,
    @InjectRepository(PracticeExamAttempt)
    private readonly practiceExamAttemptRepository: Repository<PracticeExamAttempt>,
    @InjectRepository(CourseCompletionCertificate)
    private readonly courseCompletionCertRepo: Repository<CourseCompletionCertificate>,
    private readonly dataSource: DataSource,
    private readonly certificatePdfService: CertificatePdfService,
  ) {
    // `Lab` entity class name exists in both `labs` and `course_labs` modules.
    // Avoid Nest TypeORM repository-token collision by resolving repositories
    // directly from DataSource using the concrete entity targets.
    this.interactiveLabRepository = this.dataSource.getRepository(InteractiveLab);
    this.courseLabRepository = this.dataSource.getRepository(CourseLab);
  }

  async getCertificationPathForAdmin(certificationId: number) {
    await this.findOne(certificationId);
    return this.certificationPathRepository.find({
      where: { certificationId },
      order: { stepOrder: 'ASC' },
    });
  }

  /**
   * Prefer the linked course that actually has lesson content (stable ordering by id as tie-break).
   * Avoids picking an empty shell row when certification.courses order is undefined.
   */
  private async pickPrimaryLinkedCourse(certificationId: number): Promise<Course | null> {
    const rows = await this.courseRepository
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .addSelect('COUNT(l.id)', 'lesson_count')
      .leftJoin('c.modules', 'm')
      .leftJoin('m.lessons', 'l')
      .where('c.certificationId = :cid', { cid: certificationId })
      .groupBy('c.id')
      .orderBy('lesson_count', 'DESC')
      .addOrderBy('c.id', 'ASC')
      .getRawMany<{ id: number; lesson_count: string }>();
    if (!rows.length) return null;
    const topId = Number(rows[0].id);
    if (!Number.isFinite(topId)) return null;
    return this.courseRepository.findOne({ where: { id: topId } });
  }

  /**
   * Primary course for learner UX: first path step of type course, else best-linked by lesson count.
   */
  async resolveLearnerPrimaryCourse(
    certificationId: number,
    pathSteps: Array<{ stepType: string; stepRef: string }>,
  ): Promise<Course | null> {
    const firstRef = pathSteps.find((s) => s.stepType === 'course')?.stepRef?.trim();
    if (firstRef) {
      const direct = await this.courseRepository.findOne({
        where: { certificationId, courseId: firstRef },
      });
      if (direct) return direct;
    }
    return this.pickPrimaryLinkedCourse(certificationId);
  }

  async saveCertificationPath(
    certificationId: number,
    steps: Array<{
      stepType: CertificationPathStepType;
      stepRef: string;
      title: string;
      description?: string;
    }>,
    createdBy?: number,
  ) {
    await this.findOne(certificationId);
    await this.certificationPathRepository.delete({ certificationId });
    if (!steps.length) return [];
    const normalized = steps.map((step, idx) =>
      this.certificationPathRepository.create({
        certificationId,
        stepOrder: idx + 1,
        stepType: step.stepType,
        stepRef: step.stepRef.trim(),
        title: step.title.trim(),
        description: step.description?.trim() || undefined,
        createdBy,
      }),
    );
    return this.certificationPathRepository.save(normalized);
  }

  async getCertificationPathForLearner(certificationId: number, userId: number) {
    const [certification, steps] = await Promise.all([
      this.findOne(certificationId),
      this.certificationPathRepository.find({
        where: { certificationId },
        order: { stepOrder: 'ASC' },
      }),
    ]);
    if (!steps.length) {
      const linkedCourses = certification.courses ?? [];
      if (!linkedCourses.length) {
        return { certificationId, certificationTitle: certification.title, totalSteps: 0, completedSteps: 0, steps: [] };
      }

      const primaryCourse =
        (await this.pickPrimaryLinkedCourse(certification.id)) ?? linkedCourses[0];
      const progress = await this.progressRepository.findOne({
        where: { userId, courseId: primaryCourse.id },
      });
      const completed = Boolean(
        progress && (progress.status === 'completed' || (progress.overallProgress ?? 0) >= 100),
      );

      return {
        certificationId,
        certificationTitle: certification.title,
        totalSteps: 1,
        completedSteps: completed ? 1 : 0,
        progressPercent: completed ? 100 : 0,
        steps: [
          {
            id: `fallback-course-${primaryCourse.id}`,
            stepOrder: 1,
            stepType: 'course' as const,
            stepRef: primaryCourse.courseId,
            title: primaryCourse.title || `Complete ${primaryCourse.courseId}`,
            description:
              'Default path generated from linked course. Add a custom certification path in admin to configure labs, exams, and milestones.',
            completed,
          },
        ],
      };
    }

    const courseRefsFromPath = steps
      .filter((s) => s.stepType === 'course')
      .map((s) => String(s.stepRef ?? '').trim())
      .filter(Boolean);
    const courseMetaRows =
      courseRefsFromPath.length > 0
        ? await this.courseRepository.find({
            where: { courseId: In([...new Set(courseRefsFromPath)]) },
            select: ['id', 'courseId', 'title', 'certificationId'],
          })
        : [];
    const courseMetaByRef = new Map(courseMetaRows.map((c) => [c.courseId, c]));

    const stepsForLearner = steps.filter((step) => {
      if (step.stepType !== 'course') return true;
      const ref = String(step.stepRef ?? '').trim();
      const row = courseMetaByRef.get(ref);
      if (row?.certificationId != null && row.certificationId !== certificationId) {
        this.logger.warn(
          `Ignoring path step: course "${ref}" is linked to certification ${row.certificationId}, not ${certificationId} (${certification.title})`,
        );
        return false;
      }
      return true;
    });

    const courseIds = stepsForLearner
      .filter((s) => s.stepType === 'course')
      .map((s) => String(s.stepRef ?? '').trim())
      .filter(Boolean);
    const labSlugs = stepsForLearner
      .filter((s) => s.stepType === 'lab')
      .map((s) => String(s.stepRef ?? '').trim())
      .filter(Boolean);
    const assessmentDomains = stepsForLearner
      .filter((s) => s.stepType === 'assessment' || s.stepType === 'quiz')
      .map((s) => String(s.stepRef ?? '').toLowerCase().trim())
      .filter(Boolean);
    const allowedAssessmentDomains = new Set(['cloud', 'cyber', 'ai', 'devops']);
    const filteredAssessmentDomains = assessmentDomains.filter((d) => allowedAssessmentDomains.has(d));
    const practiceExamRefs = stepsForLearner
      .filter((s) => s.stepType === 'practice_exam')
      .map((s) => String(s.stepRef ?? '').trim())
      .filter(Boolean);

    const [courseProgress, interactiveLabs, courseLabs, assessments, practiceExams] = await Promise.all([
      (async () => {
        if (!courseIds.length) return [];
        const courses = await this.courseRepository.find({
          where: { courseId: In([...new Set(courseIds)]) },
          select: ['id', 'courseId'],
        });
        const numericCourseIds = courses.map((c) => c.id);
        if (!numericCourseIds.length) return [];
        return this.progressRepository.find({
          where: { userId, courseId: In(numericCourseIds) },
          relations: ['course'],
        });
      })(),
      labSlugs.length
        ? this.interactiveLabRepository
            .createQueryBuilder('lab')
            .where('lab.slug IN (:...labSlugs)', { labSlugs: [...new Set(labSlugs)] })
            .getMany()
        : Promise.resolve([]),
      labSlugs.length
        ? this.courseLabRepository
            .createQueryBuilder('courseLab')
            .where('courseLab.labId IN (:...labRefs)', { labRefs: [...new Set(labSlugs)] })
            .getMany()
        : Promise.resolve([]),
      filteredAssessmentDomains.length
        ? this.assessmentRepository.find({
            where: { userId, domain: In(filteredAssessmentDomains as ('cloud' | 'cyber' | 'ai' | 'devops')[]) },
            order: { completedAt: 'DESC' },
          })
        : Promise.resolve([]),
      practiceExamRefs.length
        ? (() => {
            const refs = [...new Set(practiceExamRefs)];
            return this.practiceExamRepository
              .createQueryBuilder('pe')
              .where('pe.slug IN (:...peRefs)', { peRefs: refs })
              .orWhere('pe.externalId IN (:...peRefsExt)', { peRefsExt: refs })
              .getMany();
          })()
        : Promise.resolve([]),
    ]);

    const interactiveLabsBySlug = new Map(interactiveLabs.map((l) => [l.slug, l.id]));
    const courseLabIds = new Set(courseLabs.map((l) => l.labId));
    const labIds = [...interactiveLabsBySlug.values()];
    const labProgressRows = labIds.length
      ? await this.labProgressRepository
          .createQueryBuilder('lp')
          .where('lp.userId = :userId', { userId })
          .andWhere('lp.labId IN (:...labIds)', { labIds })
          .getMany()
      : [];
    const courseCompletedById = new Map(
      courseProgress.map((p) => [p.course?.courseId ?? '', p.status === 'completed' || (p.overallProgress ?? 0) >= 100]),
    );
    const completedCourseLabIds = new Set(
      courseProgress.flatMap((p) => (Array.isArray(p.completedLabs) ? p.completedLabs : [])),
    );
    const labCompletedBySlug = new Map(
      labSlugs.map((slug) => {
        const interactiveLabId = interactiveLabsBySlug.get(slug);
        if (interactiveLabId) {
          return [slug, labProgressRows.some((p) => p.labId === interactiveLabId && p.isCompleted)] as const;
        }
        if (courseLabIds.has(slug)) {
          return [slug, completedCourseLabIds.has(slug)] as const;
        }
        return [slug, false] as const;
      }),
    );
    const assessmentDone = new Set(assessments.map((a) => (a.domain ?? '').toLowerCase()));
    const practiceExamByRef = new Map<string, number>();
    for (const pe of practiceExams) {
      practiceExamByRef.set(pe.slug, pe.id);
      if (pe.externalId) practiceExamByRef.set(pe.externalId, pe.id);
    }
    const peIds = practiceExams.map((pe) => pe.id);
    const practiceExamAttemptRows = peIds.length
      ? await this.practiceExamAttemptRepository
          .createQueryBuilder('a')
          .where('a.userId = :userId', { userId })
          .andWhere('a.practiceExamId IN (:...peIds)', { peIds })
          .getMany()
      : [];
    const attemptedPracticeExamIds = new Set(practiceExamAttemptRows.map((a) => a.practiceExamId));
    const hasIssuedCert = await this.issuedCertificateRepository.findOne({
      where: { userId, certificationId },
    });

    const decorated = stepsForLearner.map((step) => {
      const refTrim = String(step.stepRef ?? '').trim();
      const courseMeta = step.stepType === 'course' ? courseMetaByRef.get(refTrim) : undefined;
      const displayTitle =
        step.stepType === 'course' && courseMeta?.title?.trim()
          ? courseMeta.title.trim()
          : String(step.title ?? '').trim();

      const completed =
        step.stepType === 'course'
          ? Boolean(courseCompletedById.get(step.stepRef))
          : step.stepType === 'lab'
            ? Boolean(labCompletedBySlug.get(step.stepRef))
            : step.stepType === 'practice_exam'
              ? (() => {
                  const id = practiceExamByRef.get(step.stepRef);
                  return id ? attemptedPracticeExamIds.has(id) : false;
                })()
              : step.stepType === 'final_certificate'
                ? Boolean(hasIssuedCert)
                : assessmentDone.has(step.stepRef.toLowerCase());
      return {
        id: step.id,
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        stepRef: step.stepRef,
        title: displayTitle,
        description: step.description ?? null,
        completed,
      };
    });

    const completedSteps = decorated.filter((s) => s.completed).length;
    return {
      certificationId,
      certificationTitle: certification.title,
      totalSteps: decorated.length,
      completedSteps,
      progressPercent: decorated.length ? Math.round((completedSteps / decorated.length) * 100) : 0,
      steps: decorated,
    };
  }

  private buildVerificationCode(userId: number, certificationId: number): string {
    return createHash('sha256')
      .update(`${userId}:${certificationId}:subul_certificate`)
      .digest('hex');
  }

  private async ensureIssuedCertificate(userId: number, cert: Certification, progress: UserCourseProgress): Promise<IssuedCertificate> {
    const existing = await this.issuedCertificateRepository.findOne({
      where: { userId, certificationId: cert.id },
    });
    if (existing) return existing;

    const created = this.issuedCertificateRepository.create({
      userId,
      certificationId: cert.id,
      courseId: progress.courseId,
      verificationCode: this.buildVerificationCode(userId, cert.id),
      issuedAt: progress.completedAt ?? new Date(),
      metadata: {
        courseId: progress.course?.courseId,
        courseTitle: progress.course?.title,
        provider: cert.provider,
      },
    });
    return this.issuedCertificateRepository.save(created);
  }

  async findAll(query: {
    search?: string;
    status?: 'Active' | 'Draft' | 'Archived';
    provider?: string;
  }): Promise<Certification[]> {
    const { search, status, provider } = query;
    const where: any = {};

    if (search) where.title = Like(`%${search}%`);
    if (status) where.status = status;
    if (provider) where.provider = provider;

    return this.certificationRepository.find({ where, relations: ['courses'] });
  }

  /**
   * Learner-facing: certifications with available === true.
   * Without options (or fullCatalog: true): return all available (e.g. CV / agents).
   * With fullCatalog: false and tracks: filter by normalized certification.domain or any linked course.track.
   */
  async findAvailableForLearner(opts?: {
    fullCatalog?: boolean;
    tracks?: LearnerTrack[];
  }): Promise<Certification[]> {
    const all = await this.certificationRepository.find({
      where: { available: true },
      relations: ['courses'],
    });
    if (!opts || opts.fullCatalog === true) {
      return all;
    }
    const tracks = opts.tracks ?? [];
    if (tracks.length === 0) {
      return [];
    }
    return all.filter((cert) => {
      const domainTrack = normalizeCertDomainToTrack(cert.domain);
      if (domainTrack && tracks.includes(domainTrack)) return true;
      return (cert.courses ?? []).some(
        (c) => c.track != null && tracks.includes(c.track as LearnerTrack),
      );
    });
  }

  async create(createCertificationDto: CreateCertificationDto): Promise<Certification> {
    const certification = this.certificationRepository.create(createCertificationDto);
    return this.certificationRepository.save(certification);
  }

  async findOne(id: number): Promise<Certification> {
    const certification = await this.certificationRepository.findOne({
      where: { id },
      relations: ['courses'],
    });
    if (!certification) {
      throw new NotFoundException(`Certification with ID ${id} not found`);
    }
    return certification;
  }

  async update(id: number, updateCertificationDto: UpdateCertificationDto): Promise<Certification> {
    const certification = await this.findOne(id);
    Object.assign(certification, updateCertificationDto);
    return this.certificationRepository.save(certification);
  }

  async remove(id: number): Promise<{ message: string }> {
    const certification = await this.findOne(id);
    await this.certificationRepository.remove(certification);
    return { message: 'Certification supprimée' };
  }

  async toggleAvailability(id: number, toggleAvailabilityDto: ToggleAvailabilityDto): Promise<Certification> {
    const certification = await this.findOne(id);
    certification.available = toggleAvailabilityDto.available;
    return this.certificationRepository.save(certification);
  }

  /**
   * Admin: link a course to a certification by the course's string courseId.
   * Sets courses.certification_id = certificationId for that course.
   */
  async linkCourse(certificationId: number, courseStringId: string): Promise<Course> {
    await this.findOne(certificationId); // verify certification exists
    const course = await this.courseRepository.findOneBy({ courseId: courseStringId });
    if (!course) throw new NotFoundException(`Course "${courseStringId}" not found`);
    course.certificationId = certificationId;
    return this.courseRepository.save(course);
  }

  /**
   * Enroll a user in a certification.
   * Finds the first available course linked to this certification and creates
   * a UserCourseProgress record (enrollment) for that course.
   */
  /** Admin: full certification detail — cert + courses (with modules/lessons/labs counts) + interactive labs + practice exams + path */
  async getAdminCertificationFull(id: number) {
    const cert = await this.certificationRepository.findOne({
      where: { id },
      relations: ['courses', 'courses.modules', 'courses.modules.lessons', 'courses.modules.labs'],
    });
    if (!cert) throw new NotFoundException(`Certification ${id} not found`);

    const [practiceExams, pathSteps] = await Promise.all([
      this.practiceExamRepository.find({ where: { certificationId: id }, order: { createdAt: 'ASC' } }),
      this.certificationPathRepository.find({ where: { certificationId: id }, order: { stepOrder: 'ASC' } }),
    ]);

    // Enrich courses with counts
    const courses = (cert.courses ?? []).map((c) => ({
      id: c.id,
      courseId: c.courseId,
      title: c.title,
      track: c.track,
      status: (c as any).status,
      modulesCount: c.modules?.length ?? 0,
      lessonsCount: c.modules?.reduce((s, m) => s + (m.lessons?.length ?? 0), 0) ?? 0,
      labsCount: c.modules?.reduce((s, m) => s + (m.labs?.length ?? 0), 0) ?? 0,
    }));

    // Labs associated with this cert (by track/domain)
    const track = (cert.domain === 'cloud' || cert.domain === 'cyber' || cert.domain === 'ai') ? cert.domain : null;
    const interactiveLabs = track
      ? await this.interactiveLabRepository.find({ where: { track, status: 'published' as any }, order: { createdAt: 'ASC' } })
      : [];

    return {
      ...cert,
      courses,
      practiceExams: practiceExams.map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        questionsCount: e.questions?.length ?? 0,
        passingScore: e.passingScore,
      })),
      interactiveLabs: interactiveLabs.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        difficulty: l.difficulty,
        provider: l.provider,
      })),
      pathSteps,
    };
  }

  async enrollUserInCertification(
    userId: number,
    certificationId: number,
  ): Promise<{ message: string; enrolled: boolean; progress?: Record<string, any> }> {
    const cert = await this.findOne(certificationId);

    if (!cert.courses || cert.courses.length === 0) {
      throw new BadRequestException(
        `Certification "${cert.title}" has no linked courses. An admin must link courses first.`,
      );
    }

    const primaryCourse =
      (await this.pickPrimaryLinkedCourse(cert.id)) ?? cert.courses[0];
    const courseDbId = primaryCourse.id;

    // Check existing enrollment
    const existing = await this.progressRepository.findOne({
      where: { userId, courseId: courseDbId },
    });

    if (existing) {
      if (existing.status === 'not_started') {
        existing.status = 'in_progress';
        existing.startedAt = new Date();
        existing.lastAccessedAt = new Date();
        await this.progressRepository.save(existing);
      }
      return { message: 'Déjà inscrit', enrolled: true, progress: existing.toDict() };
    }

    // Create new enrollment
    const progress = this.progressRepository.create({
      userId,
      courseId: courseDbId,
      status: 'in_progress',
      startedAt: new Date(),
      lastAccessedAt: new Date(),
      completedModules: [],
      completedLessons: [],
      completedLabs: [],
      overallProgress: 0,
      moduleProgress: {},
    });
    await this.progressRepository.save(progress);

    // Increment students count on certification
    cert.students = (cert.students ?? 0) + 1;
    await this.certificationRepository.save(cert);

    return { message: 'Inscription réussie', enrolled: true, progress: progress.toDict() };
  }

  /**
   * Get enrollment status for a user and certification.
   * Checks whether the user is enrolled in any of the certification's courses.
   */
  async getEnrollmentStatus(
    userId: number,
    certificationId: number,
  ): Promise<{ enrolled: boolean; progress?: Record<string, any> }> {
    const cert = await this.findOne(certificationId);
    if (!cert.courses?.length) return { enrolled: false };

    const ids = cert.courses.map((c) => c.id);
    const progresses = await this.progressRepository.find({
      where: { userId, courseId: In(ids) },
      order: { lastAccessedAt: 'DESC' },
    });
    if (!progresses.length) return { enrolled: false };
    return { enrolled: true, progress: progresses[0].toDict() };
  }

  async getLearnerCertificationDiagnostics(userId: number): Promise<
    Array<{
      certificationId: number;
      certificationTitle: string;
      available: boolean;
      linkedCourses: Array<{ id: number; courseId: string; title: string }>;
      progressByCourse: Array<{ courseId: string; status: string; overallProgress: number }>;
      failureClass:
        | 'no_linked_course'
        | 'unavailable'
        | 'not_enrolled'
        | 'in_progress'
        | 'earned';
    }>
  > {
    const certifications = await this.certificationRepository.find({
      relations: ['courses'],
    });
    const progressList = await this.progressRepository.find({
      where: { userId },
      relations: ['course', 'course.certification'],
    });

    const byCourseId = new Map<number, UserCourseProgress>();
    for (const p of progressList) {
      if (p.courseId != null) byCourseId.set(p.courseId, p);
    }

    return certifications.map((cert) => {
      const linkedCourses = (cert.courses ?? []).map((course) => ({
        id: course.id,
        courseId: course.courseId,
        title: course.title,
      }));
      const progressByCourse = linkedCourses
        .map((course) => byCourseId.get(course.id))
        .filter((p): p is UserCourseProgress => Boolean(p))
        .map((p) => ({
          courseId: p.course?.courseId ?? String(p.courseId),
          status: p.status,
          overallProgress: Math.round(p.overallProgress ?? 0),
        }));

      const hasLinkedCourse = linkedCourses.length > 0;
      const hasEnrollment = progressByCourse.length > 0;
      const isEarned = progressByCourse.some((p) => p.status === 'completed' || p.overallProgress >= 100);

      let failureClass: 'no_linked_course' | 'unavailable' | 'not_enrolled' | 'in_progress' | 'earned';
      if (!hasLinkedCourse) failureClass = 'no_linked_course';
      else if (!cert.available) failureClass = 'unavailable';
      else if (!hasEnrollment) failureClass = 'not_enrolled';
      else if (isEarned) failureClass = 'earned';
      else failureClass = 'in_progress';

      return {
        certificationId: cert.id,
        certificationTitle: cert.title,
        available: cert.available,
        linkedCourses,
        progressByCourse,
        failureClass,
      };
    });
  }

  /**
   * Get learner certification status: earned (completed) and in-progress.
   * Used by learner certifications page for Earned and In-progress tabs.
   */
  async getLearnerCertificationStatus(userId: number): Promise<{
    earned: Array<{
      id: number;
      name: string;
      issuer: string;
      progress: number;
      issueDate: string;
      expiryDate?: string;
      score?: string;
      courseId?: string;
    }>;
    inProgress: Array<{
      id: number;
      name: string;
      issuer: string;
      progress: number;
      estimatedCompletion?: string;
      nextExam?: string;
      preparationCourse?: string;
      courseId?: string;
    }>;
  }> {
    const progressList = await this.progressRepository.find({
      where: { userId },
      relations: ['course', 'course.certification', 'course.certification.courses'],
    });
    const earned: Array<{
      id: number;
      name: string;
      issuer: string;
      progress: number;
      issueDate: string;
      expiryDate?: string;
      score?: string;
      courseId?: string;
    }> = [];
    const inProgress: Array<{
      id: number;
      name: string;
      issuer: string;
      progress: number;
      estimatedCompletion?: string;
      nextExam?: string;
      preparationCourse?: string;
      courseId?: string;
    }> = [];
    const certProgressMap = new Map<number, UserCourseProgress[]>();

    for (const p of progressList) {
      const cert = p.course?.certification;
      if (!cert) continue;
      const bucket = certProgressMap.get(cert.id) ?? [];
      bucket.push(p);
      certProgressMap.set(cert.id, bucket);
    }

    for (const [, certProgresses] of certProgressMap) {
      const best = certProgresses.reduce((acc, current) => {
        if (!acc) return current;
        const accScore = Math.round(acc.overallProgress ?? 0) + (acc.status === 'completed' ? 1000 : 0);
        const currScore = Math.round(current.overallProgress ?? 0) + (current.status === 'completed' ? 1000 : 0);
        return currScore > accScore ? current : acc;
      }, certProgresses[0]);
      const cert = best.course?.certification;
      if (!cert) continue;

      const linkedCourses = cert.courses ?? [];
      const linkedIds = new Set(linkedCourses.map((c) => c.id));
      const progressesForCert = certProgresses.filter((p) => linkedIds.has(p.courseId));
      const aggregateProgress =
        progressesForCert.length > 0
          ? Math.round(
              progressesForCert.reduce((s, p) => s + Math.round(p.overallProgress ?? 0), 0) /
                progressesForCert.length,
            )
          : Math.round(best.overallProgress ?? 0);
      const multi = linkedCourses.length > 1;
      const allCoursesComplete =
        multi &&
        linkedCourses.length > 0 &&
        linkedCourses.every((course) => {
          const p = progressesForCert.find((pr) => pr.courseId === course.id);
          return p && (p.status === 'completed' || Math.round(p.overallProgress ?? 0) >= 100);
        });
      const singleComplete = !multi && (best.status === 'completed' || Math.round(best.overallProgress ?? 0) >= 100);
      const progress = aggregateProgress;
      const isCompleted = allCoursesComplete || singleComplete;
      const issueDate = best.completedAt
        ? new Date(best.completedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date(cert.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

      if (isCompleted) {
        const issued = await this.ensureIssuedCertificate(userId, cert, best);
        earned.push({
          id: cert.id,
          name: cert.title,
          issuer: cert.provider || '—',
          progress: 100,
          issueDate: issued.issuedAt
            ? new Date(issued.issuedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
            : issueDate,
          courseId: best.course?.courseId,
          score: issued.verificationCode.slice(0, 8).toUpperCase(),
        });
      } else {
        const focus =
          [...progressesForCert].sort((a, b) => Math.round(a.overallProgress ?? 0) - Math.round(b.overallProgress ?? 0))[0] ??
          best;
        inProgress.push({
          id: cert.id,
          name: cert.title,
          issuer: cert.provider || '—',
          progress,
          estimatedCompletion: progress > 0 ? '—' : undefined,
          preparationCourse: multi
            ? `${linkedCourses.length} courses${focus.course?.title ? ` · ${focus.course.title}` : ''}`
            : focus.course?.title,
          courseId: focus.course?.courseId,
        });
      }
    }

    return { earned, inProgress };
  }

  async getIssuedCertificatesForLearner(userId: number) {
    const issued = await this.issuedCertificateRepository.find({ where: { userId } });
    const certIds = issued.map((i) => i.certificationId);
    const certifications = certIds.length
      ? await this.certificationRepository.find({ where: certIds.map((id) => ({ id })) })
      : [];
    const certById = new Map(certifications.map((c) => [c.id, c]));

    return issued.map((i) => {
      const cert = certById.get(i.certificationId);
      return {
        id: i.id,
        certificationId: i.certificationId,
        title: cert?.title ?? `Certification #${i.certificationId}`,
        issuer: cert?.provider ?? '—',
        issuedAt: i.issuedAt,
        verificationCode: i.verificationCode,
        metadata: i.metadata ?? {},
      };
    });
  }

  async getIssuedCertificateForLearner(userId: number, issuedId: number) {
    const issued = await this.issuedCertificateRepository.findOne({
      where: { id: issuedId, userId },
    });
    if (!issued) throw new NotFoundException('Issued certificate not found');

    const cert = await this.certificationRepository.findOneBy({ id: issued.certificationId });
    return {
      id: issued.id,
      certificationId: issued.certificationId,
      title: cert?.title ?? `Certification #${issued.certificationId}`,
      issuer: cert?.provider ?? '—',
      issuedAt: issued.issuedAt,
      verificationCode: issued.verificationCode,
      metadata: issued.metadata ?? {},
    };
  }

  private async getIssuedCertificateOrThrow(issuedId: number): Promise<IssuedCertificate> {
    const issued = await this.issuedCertificateRepository.findOne({ where: { id: issuedId } });
    if (!issued) throw new NotFoundException('Issued certificate not found');
    return issued;
  }

  async buildIssuedCertificatePdfForLearner(userId: number, issuedId: number): Promise<{ filename: string; buffer: Buffer }> {
    const issued = await this.getIssuedCertificateOrThrow(issuedId);
    if (issued.userId !== userId) {
      throw new ForbiddenException('You are not allowed to download this certificate');
    }
    return this.buildIssuedCertificatePdf(issued);
  }

  async buildLearnerCertificatePdfByCertificationId(
    userId: number,
    certificationId: number,
  ): Promise<{ filename: string; buffer: Buffer }> {
    let issued = await this.issuedCertificateRepository.findOne({
      where: { userId, certificationId },
    });

    if (!issued) {
      const cert = await this.certificationRepository.findOne({
        where: { id: certificationId },
        relations: ['courses'],
      });
      if (!cert) {
        throw new NotFoundException('Certification not found');
      }
      const courseIds = (cert.courses ?? []).map((c) => c.id);
      if (courseIds.length === 0) {
        throw new NotFoundException('No course linked to this certification');
      }

      const progress = await this.progressRepository.findOne({
        where: courseIds.map((courseId) => ({ userId, courseId })),
        relations: ['course', 'course.certification'],
        order: { completedAt: 'DESC' },
      });

      if (!progress) {
        throw new ForbiddenException('No enrollment found for this certification');
      }

      const progressValue = Math.round(progress.overallProgress ?? 0);
      const isCompleted = progress.status === 'completed' || progressValue >= 100;
      if (!isCompleted) {
        throw new ForbiddenException('Certificate is available only after completion');
      }

      issued = await this.ensureIssuedCertificate(userId, cert, progress);
    }

    return this.buildIssuedCertificatePdf(issued);
  }

  async buildIssuedCertificatePdfForAdmin(issuedId: number): Promise<{ filename: string; buffer: Buffer }> {
    const issued = await this.getIssuedCertificateOrThrow(issuedId);
    return this.buildIssuedCertificatePdf(issued);
  }

  private async buildIssuedCertificatePdf(issued: IssuedCertificate): Promise<{ filename: string; buffer: Buffer }> {
    const [user, cert] = await Promise.all([
      this.userRepository.findOne({ where: { id: issued.userId } }),
      this.certificationRepository.findOne({ where: { id: issued.certificationId } }),
    ]);

    if (!user || !cert) {
      throw new NotFoundException('Certificate data is incomplete');
    }

    const course = issued.courseId
      ? await this.courseRepository.findOne({ where: { id: issued.courseId } })
      : null;
    const completionDate = new Date(issued.issuedAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const verificationUrl = this.certificatePdfService.buildVerificationUrl(issued.verificationCode);
    const courseMetadataParts = [
      cert.description?.trim(),
      course?.title ? `Course: ${course.title}` : '',
      course?.courseId ? `Program code: ${course.courseId}` : '',
      cert.provider ? `Issuer: ${cert.provider}` : '',
    ].filter(Boolean);

    const certificateId = `CERT-${issued.id}`;
    const filename = `certificate-${certificateId}.pdf`;

    try {
      const buffer = await this.certificatePdfService.buildPdf({
        recipientFullName: user.fullName || user.email,
        programTitle: cert.title,
        completionDate,
        certificateId,
        verificationUrl,
        issuerName: 'Abdelkhalek Bakkari',
        issuerRole: 'CEO & Founder, Smartovate Ltd',
        signerTwoName: '',
        signerTwoRole: '',
        organizationName: 'SUBUL',
        courseMetadata: courseMetadataParts.join(' | ') || 'Professional certification program',
      });
      return { filename, buffer };
    } catch (error) {
      this.logger.error(`Failed to render certificate PDF for issuedId=${issued.id}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async buildCourseCompletionCertificatePdf(data: {
    userId: number;
    courseId: number;
    courseTitle: string;
    completedAt: Date;
  }): Promise<{ filename: string; buffer: Buffer }> {
    const user = await this.userRepository.findOne({ where: { id: data.userId } });
    if (!user) throw new NotFoundException('User not found');

    const completionDate = data.completedAt.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const certHash = createHash('sha256')
      .update(`course:${data.userId}:${data.courseTitle}:subul-completion`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

    // Store idempotently so verification can look it up
    await this.courseCompletionCertRepo
      .createQueryBuilder()
      .insert()
      .into(CourseCompletionCertificate)
      .values({
        userId: data.userId,
        courseId: data.courseId,
        certHash,
        courseTitle: data.courseTitle,
      })
      .orIgnore()
      .execute();

    const verificationUrl = this.certificatePdfService.buildVerificationUrl(`course-${certHash}`);
    const filename = `course-certificate-${certHash}.pdf`;

    const buffer = await this.certificatePdfService.buildCourseCompletionPdf({
      recipientFullName: user.fullName || user.email,
      courseTitle: data.courseTitle,
      completionDate,
      certificateId: `COURSE-${certHash}`,
      verificationUrl,
    });

    return { filename, buffer };
  }

  async verifyIssuedCertificate(verificationCode: string) {
    // ── Course completion certificate ─────────────────────────────────────────
    if (verificationCode.startsWith('course-')) {
      const hash = verificationCode.replace(/^course-/, '').toUpperCase();
      const record = await this.courseCompletionCertRepo.findOne({
        where: { certHash: hash },
        relations: ['user'],
      });
      if (!record) throw new NotFoundException('Certificate not found');
      return {
        valid: true,
        type: 'course_completion' as const,
        verificationCode,
        certificateId: `COURSE-${hash}`,
        title: record.courseTitle,
        issuer: 'Smartovate Ltd / Subul',
        issuedAt: record.issuedAt,
        recipientFullName: record.user?.fullName ?? record.user?.email ?? 'Unknown recipient',
        courseTitle: record.courseTitle,
      };
    }

    // ── Certification (premium) ───────────────────────────────────────────────
    const issued = await this.issuedCertificateRepository.findOne({
      where: { verificationCode },
    });
    if (!issued) throw new NotFoundException('Certificate not found');
    const [cert, user, course] = await Promise.all([
      this.certificationRepository.findOneBy({ id: issued.certificationId }),
      this.userRepository.findOneBy({ id: issued.userId }),
      issued.courseId ? this.courseRepository.findOneBy({ id: issued.courseId }) : Promise.resolve(null),
    ]);
    return {
      valid: true,
      type: 'certification' as const,
      verificationCode,
      certificationId: issued.certificationId,
      certificateId: `CERT-${issued.id}`,
      title: cert?.title ?? `Certification #${issued.certificationId}`,
      issuer: cert?.provider ?? 'Smartovate Ltd / Subul',
      issuedAt: issued.issuedAt,
      recipientFullName: user?.fullName ?? user?.email ?? 'Unknown recipient',
      courseTitle: course?.title ?? null,
    };
  }

  /**
   * Get certifications the user is enrolled in (has progress on at least one linked course).
   * Used for CV Enrich platform data.
   */
  async getEnrolledCertifications(userId: number): Promise<Array<{ id: string; title: string; org: string; date: string }>> {
    const progressList = await this.progressRepository.find({
      where: { userId },
      relations: ['course', 'course.certification'],
    });
    const seen = new Set<number>();
    const result: Array<{ id: string; title: string; org: string; date: string }> = [];
    for (const p of progressList) {
      const cert = p.course?.certification;
      if (!cert || seen.has(cert.id)) continue;
      seen.add(cert.id);
      const date = cert.updatedAt ? new Date(cert.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
      result.push({
        id: String(cert.id),
        title: cert.title,
        org: cert.provider || '—',
        date,
      });
    }
    return result;
  }
}

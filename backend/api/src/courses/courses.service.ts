import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, FindOptionsWhere } from 'typeorm';
import { Course } from './entities/course.entity';
import { CourseModule as CourseModuleEntity } from './entities/course-module.entity';
import { Lesson } from './entities/lesson.entity';
import { LessonTranslation } from './entities/lesson-translation.entity';
import { Lab } from './entities/lab.entity';
import { UserCourseProgress } from './entities/user-course-progress.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CompleteLessonDto } from './dto/complete-lesson.dto';
import { CertificationsService } from '../certifications/certifications.service';
import { LearnerTrack } from '../certifications/utils/cert-domain.util';
import { TranslationService } from '../translation/translation.service';
import { interactiveSlugToCourseUiLevel } from '../labs/utils/lab-course-association.util';
import { LabsService } from '../labs/labs.service';
import { Lab as InteractiveLab } from '../labs/entities/lab.entity';
import { CourseLevel } from './constants/course-level.enum';
import { Certification } from '../certifications/entities/certification.entity';

export interface CourseListItem {
  id: number;
  courseId: string;
  title: string;
  description?: string;
  level?: string;
  certificationId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseForAdmin {
  id: number;
  courseId: string;
  externalId?: string;
  title: string;
  description?: string;
  level?: string;
  certificationId?: number;
  objectives?: string[];
  durationMinutes?: number;
  quiz?: Record<string, unknown>[];
  examTips?: string[];
  resources?: Record<string, unknown>;
  modules: {
    id?: number;
    moduleOrder: number;
    externalId?: string;
    title: string;
    icon?: string;
    durationMinutes?: number;
    objectives?: string[];
    quiz?: Record<string, unknown>[];
    lessons: { id?: number; lessonOrder: number; externalId?: string; title: string; content?: string; bullets?: string[]; keyPoints?: string[]; analogy?: string; comparisonTable?: Record<string, unknown> }[];
    labs: { id?: number; labOrder: number; labId?: string; title: string; objective?: string; learningObjectives?: string[]; evaluationCriteria?: string[]; durationMinutes?: number; difficultyLevel?: string; prerequisites?: string[]; resources?: Record<string, unknown>[] }[];
  }[];
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(CourseModuleEntity)
    private readonly moduleRepo: Repository<CourseModuleEntity>,
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(LessonTranslation)
    private readonly lessonTranslationRepo: Repository<LessonTranslation>,
    @InjectRepository(Lab)
    private readonly labRepo: Repository<Lab>,
    @InjectRepository(UserCourseProgress)
    private readonly progressRepo: Repository<UserCourseProgress>,
    private readonly dataSource: DataSource,
    private readonly certificationsService: CertificationsService,
    private readonly labsService: LabsService,
    private readonly translationService: TranslationService,
  ) {}

  private countLessonsOnCourse(course: Course): number {
    return (course.modules ?? []).reduce((n, m) => n + (m.lessons?.length ?? 0), 0);
  }

  /**
   * Normalize exam-style URL segments (e.g. bare SAA-C03 or typo SOA-C03) to a real course row
   * that has lesson content. Academy segments use ids like SAA-C03-FOUNDATION.
   */
  async resolveToContentCourseId(requestedId: string): Promise<string> {
    const requested = String(requestedId ?? '').trim();
    if (!requested) {
      throw new NotFoundException(`Course "${requestedId}" not found`);
    }

    const loaded = await this.courseRepo.findOne({
      where: { courseId: requested },
      relations: ['modules', 'modules.lessons', 'modules.labs'],
    });

    if (loaded && this.countLessonsOnCourse(loaded) > 0) {
      return loaded.courseId;
    }

    const examVariants = this.examCodeLookupKeys(requested);
    const fromExam = await this.pickCourseForExamCodeVariants(examVariants);
    if (fromExam) {
      return fromExam.courseId;
    }

    if (loaded?.certificationId != null) {
      const sibling = await this.pickSiblingCourseWithLessons(loaded.certificationId, loaded.id);
      if (sibling) return sibling.courseId;
    }

    if (loaded) {
      return loaded.courseId;
    }

    throw new NotFoundException(`Course "${requested}" not found`);
  }

  /** Common learner typos / bare exam codes → certification exam_code in DB. */
  private examCodeLookupKeys(raw: string): string[] {
    const u = String(raw ?? '').trim().toUpperCase();
    const keys = new Set<string>();
    keys.add(u);
    if (u === 'SOA-C03') {
      keys.add('SAA-C03');
    }
    return [...keys];
  }

  private scoreCourseForFoundationFirst(c: Course, lessonCount: number): number {
    const id = (c.courseId ?? '').toUpperCase();
    let pref = 1;
    if (/FOUNDATION|FUNDAMENTALS|ORIENTATION/i.test(id)) pref = 4;
    else if (/CORE|DOMAIN/i.test(id)) pref = 3;
    else if (/CAPSTONE/i.test(id)) pref = 0;
    return pref * 1_000_000 + lessonCount;
  }

  private async pickCourseForExamCodeVariants(codes: string[]): Promise<Course | null> {
    if (!codes.length) return null;
    const certRepo = this.dataSource.getRepository(Certification);
    const certs = await certRepo
      .createQueryBuilder('c')
      .where('UPPER(TRIM(c.exam_code)) IN (:...codes)', { codes })
      .getMany();
    if (!certs.length) return null;

    const certIds = certs.map((c) => c.id);
    const courses = await this.courseRepo.find({
      where: { certificationId: In(certIds) },
      relations: ['modules', 'modules.lessons', 'modules.labs'],
    });

    const ranked = courses
      .map((c) => ({
        c,
        n: this.countLessonsOnCourse(c),
        score: this.scoreCourseForFoundationFirst(c, this.countLessonsOnCourse(c)),
      }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.score - a.score || a.c.courseId.localeCompare(b.c.courseId));

    return ranked[0]?.c ?? null;
  }

  private async pickSiblingCourseWithLessons(
    certificationId: number,
    excludeCoursePk: number,
  ): Promise<Course | null> {
    const courses = await this.courseRepo.find({
      where: { certificationId },
      relations: ['modules', 'modules.lessons', 'modules.labs'],
    });
    const ranked = courses
      .filter((c) => c.id !== excludeCoursePk)
      .map((c) => ({
        c,
        n: this.countLessonsOnCourse(c),
        score: this.scoreCourseForFoundationFirst(c, this.countLessonsOnCourse(c)),
      }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.score - a.score || a.c.courseId.localeCompare(b.c.courseId));
    return ranked[0]?.c ?? null;
  }

  // Build modules + labs arrays for a level
  private buildLevelData(
    sortedModules: CourseModuleEntity[],
    translationMap: Map<number, LessonTranslation> = new Map(),
  ) {
    let labCounter = 1;

    const modules = sortedModules.map((mod) => ({
      id: mod.moduleOrder,
      title: mod.title,
      icon: mod.icon ?? '📚',
      lessons: (mod.lessons ?? [])
        .sort((a, b) => a.lessonOrder - b.lessonOrder)
        .map((l) => {
          const tx = translationMap.get(l.id);
          return {
            id: l.lessonOrder,
            title: tx?.title ?? l.title,
            content: tx?.content ?? l.content ?? '',
            bullets: tx?.bullets ?? l.bullets ?? [],
            examTips: [],
          };
        }),
    }));

    const labs = sortedModules.flatMap((mod) =>
      (mod.labs ?? [])
        .sort((a, b) => a.labOrder - b.labOrder)
        .map((lab) => ({
          id: labCounter++,
          title: lab.title,
          moduleTitle: mod.title,
          tasks: lab.learningObjectives?.length
            ? lab.learningObjectives
            : lab.evaluationCriteria?.length
            ? lab.evaluationCriteria
            : [lab.objective ?? 'Complete the lab'],
        })),
    );

    return { modules, labs };
  }

  /**
   * When relational `modules.labs` are empty, attach published interactive labs (`labs` table)
   * whose slugs match this course id so the learner course UI shows correct lab counts.
   */
  private async mergeInteractiveHandsOnLabs(
    courseIdStr: string,
    beginnerData: {
      modules: { id: number; title: string; icon: string; lessons: unknown[] }[];
      labs: { id: number; title: string; moduleTitle: string; tasks: string[]; slug?: string }[];
    },
    intermediateData: {
      modules: { id: number; title: string; icon: string; lessons: unknown[] }[];
      labs: { id: number; title: string; moduleTitle: string; tasks: string[]; slug?: string }[];
    },
  ): Promise<void> {
    let rows: InteractiveLab[] = [];
    try {
      rows = await this.labsService.findPublishedLabsForCourseId(courseIdStr);
    } catch {
      return;
    }
    if (!rows.length) {
      return;
    }

    const nextId = (labs: { id: number }[]) =>
      labs.length > 0 ? Math.max(...labs.map((l) => l.id)) + 1 : 1;
    let bNext = nextId(beginnerData.labs);
    let iNext = nextId(intermediateData.labs);

    const sorted = [...rows].sort((a, b) => (a.slug ?? '').localeCompare(b.slug ?? ''));

    for (const row of sorted) {
      const slug = row.slug ?? '';
      const tier = interactiveSlugToCourseUiLevel(slug);
      const tasks =
        Array.isArray(row.tasks) && row.tasks.length
          ? row.tasks
          : ['Suivre les étapes du lab sur la plateforme'];
      const item = {
        title: row.title ?? slug,
        moduleTitle: row.moduleTitle ?? 'Labs pratiques',
        tasks,
        slug,
      };
      if (tier === 'beginner' || tier === 'both') {
        beginnerData.labs.push({ id: bNext++, ...item });
      }
      if (tier === 'intermediate' || tier === 'both') {
        intermediateData.labs.push({ id: iNext++, ...item });
      }
    }
  }

  /** Batch-load courses by string courseId (used when certification path lists courses beyond the ORM relation). */
  async findCoursesByCourseIds(courseIds: string[]): Promise<Course[]> {
    const unique = [...new Set(courseIds.map((id) => String(id ?? '').trim()).filter(Boolean))];
    if (!unique.length) return [];
    return this.courseRepo.find({ where: { courseId: In(unique) } });
  }

  async getCourseWithContent(courseId: string, locale = 'en'): Promise<Record<string, any>> {
    const effectiveId = await this.resolveToContentCourseId(courseId);
    const course = await this.courseRepo.findOne({
      where: { courseId: effectiveId },
      relations: ['modules', 'modules.lessons', 'modules.labs'],
    });

    if (!course) {
      throw new NotFoundException(`Course "${courseId}" not found`);
    }

    const sortedModules = (course.modules ?? []).sort(
      (a, b) => a.moduleOrder - b.moduleOrder,
    );

    // Build translation overlay map for non-English locales.
    const translationMap = await this.buildTranslationMap(sortedModules, locale);

    // CourseModule has no per-level tag yet; beginner and intermediate share the same
    // module graph so the learner UI can show two tracks until content is split by level.
    const beginnerData = this.buildLevelData(sortedModules, translationMap);
    const intermediateData = this.buildLevelData(sortedModules, translationMap);

    await this.mergeInteractiveHandsOnLabs(effectiveId, beginnerData, intermediateData);

    return {
      title: course.title,
      description: course.description ?? '',
      locale,
      levels: [
        {
          level: 'beginner',
          label: locale === 'fr' ? 'Débutant' : 'Beginner',
          objective:
            course.description ??
            (locale === 'fr'
              ? 'Comprendre les fondamentaux du cloud et préparer la certification.'
              : 'Understand cloud fundamentals and prepare for certification.'),
          modules: beginnerData.modules,
          labs: beginnerData.labs,
        },
        {
          level: 'intermediate',
          label: locale === 'fr' ? 'Intermédiaire' : 'Intermediate',
          objective:
            course.description ??
            (locale === 'fr'
              ? 'Approfondir les connaissances et maîtriser les services avancés.'
              : 'Deepen knowledge and master advanced services.'),
          modules: intermediateData.modules,
          labs: intermediateData.labs,
        },
      ],
    };
  }

  /**
   * Loads lesson_translations for all lessons in the given modules for the requested locale.
   * When translations are missing and Azure OpenAI is configured, auto-translates and caches.
   * Returns a Map<lessonId, LessonTranslation> for O(1) lookup in buildLevelData.
   * For 'en' (the base language) we skip the query entirely — base lesson fields are used.
   */
  private async buildTranslationMap(
    sortedModules: CourseModuleEntity[],
    locale: string,
  ): Promise<Map<number, LessonTranslation>> {
    const map = new Map<number, LessonTranslation>();
    const normalised = (locale ?? 'en').toLowerCase().split('-')[0]; // 'en-US' → 'en'
    if (normalised === 'en') return map; // base content is English — no overlay needed

    const allLessons = sortedModules.flatMap((m) => m.lessons ?? []);
    const lessonIds = allLessons.map((l) => l.id);
    if (!lessonIds.length) return map;

    const rows = await this.lessonTranslationRepo.find({
      where: { locale: normalised, lessonId: In(lessonIds) },
    });
    for (const row of rows) {
      map.set(row.lessonId, row);
    }

    // Auto-translate lessons that have no cached translation yet
    if (this.translationService.isConfigured()) {
      const untranslated = allLessons.filter((l) => !map.has(l.id));
      const CONCURRENCY = 5;
      for (let i = 0; i < untranslated.length; i += CONCURRENCY) {
        const batch = untranslated.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(async (lesson) => {
            const translated = await this.translationService.translateLesson(
              {
                title: lesson.title ?? '',
                content: lesson.content ?? '',
                bullets: lesson.bullets ?? [],
              },
              normalised,
            );
            const entity = this.lessonTranslationRepo.create({
              lessonId: lesson.id,
              locale: normalised,
              title: translated.title,
              content: translated.content,
              bullets: translated.bullets,
            });
            return this.lessonTranslationRepo.save(entity);
          }),
        );
        for (let j = 0; j < results.length; j++) {
          const r = results[j];
          // fulfilled → add to map; rejected (e.g. duplicate key race) → skip silently
          if (r.status === 'fulfilled') {
            map.set(batch[j].id, r.value);
          }
        }
      }
    }

    return map;
  }

  async getEnrolledCourses(userId: number): Promise<Record<string, any>[]> {
    const progressRecords = await this.progressRepo.find({
      where: { userId, status: In(['in_progress', 'completed']) },
      order: { lastAccessedAt: 'DESC' },
    });

    const results: Record<string, any>[] = [];

    for (const prog of progressRecords) {
      const course = await this.courseRepo.findOne({
        where: { id: prog.courseId },
        relations: ['modules', 'modules.lessons'],
      });
      if (!course) continue;

      const allLessons = (course.modules ?? []).flatMap((m) => m.lessons ?? []);
      const totalLessons = allLessons.length;

      const sortedLessons = (course.modules ?? [])
        .sort((a, b) => a.moduleOrder - b.moduleOrder)
        .flatMap((m) =>
          (m.lessons ?? []).sort((a, b) => a.lessonOrder - b.lessonOrder),
        );

      const moduleOrderByModuleId = new Map(
        (course.modules ?? []).map((m) => [m.id, m.moduleOrder]),
      );
      const nextLesson =
        sortedLessons.find((l) => {
          const order = moduleOrderByModuleId.get(l.moduleId);
          if (order == null) return true;
          return !prog.completedLessons?.includes(
            `module_${order}_lesson_${l.lessonOrder}`,
          );
        })?.title ?? 'Next lesson';

      results.push({
        id: course.courseId,
        courseId: course.courseId,
        title: course.title,
        provider: this.deriveProvider(course.courseId),
        progress: prog.overallProgress,
        totalLessons,
        completedLessons: prog.completedLessons?.length ?? 0,
        duration: `${Math.round(totalLessons * 12)} min`,
        level: course.level ?? CourseLevel.Fundamentals,
        nextLesson,
        description: course.description ?? '',
        status: prog.status,
        color: this.deriveColor(course.courseId),
        track: course.track ?? null,
        certificationId: course.certificationId ?? null,
      });
    }

    return results;
  }

  private deriveProvider(courseId: string): string {
    const id = courseId.toLowerCase();
    if (id.startsWith('az') || id.includes('azure')) return 'Microsoft Azure';
    if (id.startsWith('aws') || id.includes('amazon')) return 'AWS';
    if (id.startsWith('gcp') || id.includes('google')) return 'Google Cloud';
    if (id.includes('kubernetes') || id.includes('k8s')) return 'Kubernetes';
    if (id.includes('terraform')) return 'Terraform';
    return 'Cloud';
  }

  private deriveColor(courseId: string): string {
    const id = courseId.toLowerCase();
    if (id.startsWith('az') || id.includes('azure')) return 'from-blue-500 to-cyan-500';
    if (id.startsWith('aws') || id.includes('amazon')) return 'from-orange-500 to-amber-500';
    if (id.startsWith('gcp') || id.includes('google')) return 'from-red-500 to-yellow-500';
    return 'from-indigo-500 to-blue-600';
  }

  /** Default progress shape when not enrolled, so the API always returns a JSON object. */
  private static readonly DEFAULT_PROGRESS: Record<string, any> = {
    completedLessons: [],
    completedLabs: [],
    currentModule: 1,
    currentLesson: 1,
    overallProgress: 0,
    status: 'not_started',
  };

  /**
   * Get current user's progress for a course by courseId (string).
   * Always returns a JSON object; when not enrolled returns default progress (status: 'not_started').
   */
  async getProgressByCourseId(
    courseIdStr: string,
    userId: number,
  ): Promise<Record<string, any>> {
    let effectiveId = courseIdStr;
    try {
      effectiveId = await this.resolveToContentCourseId(courseIdStr);
    } catch {
      effectiveId = courseIdStr;
    }
    const course = await this.courseRepo.findOne({
      where: { courseId: effectiveId },
      relations: ['modules', 'modules.lessons'],
    });
    if (!course) return { ...CoursesService.DEFAULT_PROGRESS };
    const prog = await this.progressRepo.findOne({
      where: { userId, courseId: course.id },
    });
    if (!prog)
      return {
        ...CoursesService.DEFAULT_PROGRESS,
        status: 'not_started',
      };
    return {
      completedLessons: prog.completedLessons ?? [],
      completedLabs: prog.completedLabs ?? [],
      currentModule: prog.currentModule,
      currentLesson: prog.currentLesson,
      overallProgress: prog.overallProgress,
      status: prog.status,
    };
  }

  /**
   * Mark a lesson as complete for the current user. Creates progress if needed (enrolls user in course).
   * Uses moduleOrder and lessonOrder (same as frontend level structure). Key format: module_${moduleOrder}_lesson_${lessonOrder}.
   */
  async completeLesson(
    courseIdStr: string,
    userId: number,
    dto: CompleteLessonDto,
  ): Promise<Record<string, any>> {
    const effectiveId = await this.resolveToContentCourseId(courseIdStr);
    const course = await this.courseRepo.findOne({
      where: { courseId: effectiveId },
      relations: ['modules', 'modules.lessons'],
    });
    if (!course) {
      throw new NotFoundException(`Course "${courseIdStr}" not found`);
    }
    const moduleOrder = dto.moduleOrder;
    const lessonOrder = dto.lessonOrder;
    const mod = (course.modules ?? []).find((m) => m.moduleOrder === moduleOrder);
    if (!mod) {
      throw new NotFoundException(
        `Module with order ${moduleOrder} not found in course`,
      );
    }
    const lesson = (mod.lessons ?? []).find((l) => l.lessonOrder === lessonOrder);
    if (!lesson) {
      throw new NotFoundException(
        `Lesson with order ${lessonOrder} not found in module ${moduleOrder}`,
      );
    }
    let prog = await this.progressRepo.findOne({
      where: { userId, courseId: course.id },
    });
    if (!prog) {
      const totalLessons = (course.modules ?? []).reduce(
        (sum, m) => sum + (m.lessons ?? []).length,
        0,
      );
      prog = this.progressRepo.create({
        userId,
        courseId: course.id,
        status: 'in_progress',
        completedLessons: [],
        completedLabs: [],
        completedModules: [],
        overallProgress: 0,
        moduleProgress: {},
        startedAt: new Date(),
        lastAccessedAt: new Date(),
      });
      prog = await this.progressRepo.save(prog);
    }
    const key = `module_${moduleOrder}_lesson_${lessonOrder}`;
    const completedLessons = [...(prog.completedLessons ?? [])];
    if (!completedLessons.includes(key)) {
      completedLessons.push(key);
    }
    const totalLessons = (course.modules ?? []).reduce(
      (sum, m) => sum + (m.lessons ?? []).length,
      0,
    );
    const overallProgress =
      totalLessons > 0
        ? Math.min(100, Math.round((completedLessons.length / totalLessons) * 100))
        : 0;
    const status = overallProgress >= 100 ? 'completed' : 'in_progress';
    prog.completedLessons = completedLessons;
    prog.overallProgress = overallProgress;
    prog.status = status;
    prog.lastAccessedAt = new Date();
    if (status === 'completed') {
      prog.completedAt = new Date();
    }
    await this.progressRepo.save(prog);
    return prog.toDict();
  }

  /**
   * Mark a lab as complete for the current user. labId here is the numeric id from the course content (lab counter per level).
   */
  async completeLab(
    courseIdStr: string,
    userId: number,
    labId: number,
  ): Promise<Record<string, any>> {
    const effectiveId = await this.resolveToContentCourseId(courseIdStr);
    const course = await this.courseRepo.findOne({
      where: { courseId: effectiveId },
      relations: ['modules', 'modules.labs'],
    });
    if (!course) {
      throw new NotFoundException(`Course "${courseIdStr}" not found`);
    }
    const labIdStr = String(labId);
    let prog = await this.progressRepo.findOne({
      where: { userId, courseId: course.id },
    });
    if (!prog) {
      prog = this.progressRepo.create({
        userId,
        courseId: course.id,
        status: 'in_progress',
        completedLessons: [],
        completedLabs: [],
        completedModules: [],
        overallProgress: 0,
        moduleProgress: {},
        startedAt: new Date(),
        lastAccessedAt: new Date(),
      });
      prog = await this.progressRepo.save(prog);
    }
    const completedLabs = [...(prog.completedLabs ?? [])];
    if (!completedLabs.includes(labIdStr)) {
      completedLabs.push(labIdStr);
    }
    prog.completedLabs = completedLabs;
    prog.lastAccessedAt = new Date();
    await this.progressRepo.save(prog);
    return prog.toDict();
  }

  async findAll(certificationId?: number, options?: { page?: number; limit?: number }): Promise<{ data: CourseListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;
    const where = certificationId != null ? { certificationId } : {};

    const [courses, total] = await this.courseRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: courses.map((c) => ({
        id: c.id,
        courseId: c.courseId,
        title: c.title,
        description: c.description,
        level: c.level,
        certificationId: c.certificationId,
        track: c.track ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Distinct `course_id` strings for courses the learner has progress for
   * (not_started, in_progress, or completed). Used to surface labs linked to those courses.
   */
  async getEnrolledCourseStringIds(userId: number): Promise<string[]> {
    const rows = await this.progressRepo
      .createQueryBuilder('p')
      .innerJoin('p.course', 'c')
      .select('c.courseId', 'courseId')
      .where('p.userId = :userId', { userId })
      .andWhere('p.status IN (:...st)', { st: ['not_started', 'in_progress', 'completed'] })
      .distinct(true)
      .getRawMany<{ courseId: string }>();
    return [...new Set(rows.map((r) => r.courseId).filter(Boolean))];
  }

  /** Distinct platform tracks from courses the user is enrolled in (any progress row). */
  async getLearnerCourseTracks(userId: number): Promise<LearnerTrack[]> {
    const rows = await this.progressRepo
      .createQueryBuilder('p')
      .innerJoin('p.course', 'c')
      .select('DISTINCT c.track', 'track')
      .where('p.userId = :userId', { userId })
      .andWhere('c.track IS NOT NULL')
      .getRawMany<{ track: string }>();
    const out = new Set<LearnerTrack>();
    for (const r of rows) {
      if (r.track === 'cloud' || r.track === 'cyber' || r.track === 'ai') {
        out.add(r.track as LearnerTrack);
      }
    }
    return [...out];
  }

  async getCatalogForLearnerTracks(tracks: LearnerTrack[]): Promise<Record<string, any>[]> {
    if (tracks.length === 0) {
      return [];
    }
    const where: FindOptionsWhere<Course> =
      tracks.length === 1 ? { track: tracks[0] } : { track: In(tracks) };
    const courses = await this.courseRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['modules', 'modules.lessons'],
    });
    return this.mapCatalogRows(courses);
  }

  private mapCatalogRows(courses: Course[]): Record<string, any>[] {
    return courses.map((course) => {
      const allLessons = (course.modules ?? []).flatMap((m) => m.lessons ?? []);
      const totalLessons = allLessons.length;
      return {
        id: course.courseId,
        title: course.title,
        provider: this.deriveProvider(course.courseId),
        progress: 0,
        totalLessons,
        completedLessons: 0,
        duration: `${Math.round(totalLessons * 12)} min`,
        level: course.level ?? CourseLevel.Fundamentals,
        nextLesson: 'Start course',
        description: course.description ?? '',
        status: 'not_started',
        color: this.deriveColor(course.courseId),
        track: course.track ?? null,
      };
    });
  }

  /**
   * Returns all courses as catalog items for the learner (same shape as enrolled items but with no progress).
   * Used so the learner cours page can display all courses from DB.
   */
  async getCatalogForLearner(track?: string): Promise<Record<string, any>[]> {
    const where: FindOptionsWhere<Course> = {};
    if (track === 'cloud' || track === 'cyber' || track === 'ai') {
      where.track = track;
    }
    const courses = await this.courseRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['modules', 'modules.lessons'],
    });
    return this.mapCatalogRows(courses);
  }

  async findOneForAdmin(idOrCourseId: number | string): Promise<CourseForAdmin> {
    const isNumeric = typeof idOrCourseId === 'number' || /^\d+$/.test(String(idOrCourseId));
    const course = await this.courseRepo.findOne({
      where: isNumeric ? { id: Number(idOrCourseId) } : { courseId: String(idOrCourseId) },
      relations: ['modules', 'modules.lessons', 'modules.labs'],
    });
    if (!course) {
      throw new NotFoundException(`Course not found`);
    }
    const sortedModules = (course.modules ?? []).sort((a, b) => a.moduleOrder - b.moduleOrder);
    return {
      id: course.id,
      courseId: course.courseId,
      externalId: course.externalId ?? undefined,
      title: course.title,
      description: course.description ?? undefined,
      level: course.level ?? undefined,
      certificationId: course.certificationId ?? undefined,
      objectives: course.objectives ?? [],
      durationMinutes: course.durationMinutes ?? undefined,
      quiz: course.quiz ?? [],
      examTips: course.examTips ?? [],
      resources: course.resources ?? {},
      modules: sortedModules.map((mod) => ({
        id: mod.id,
        moduleOrder: mod.moduleOrder,
        externalId: mod.externalId ?? undefined,
        title: mod.title,
        icon: mod.icon ?? undefined,
        durationMinutes: mod.durationMinutes ?? undefined,
        objectives: mod.objectives ?? [],
        quiz: mod.quiz ?? [],
        lessons: (mod.lessons ?? [])
          .sort((a, b) => a.lessonOrder - b.lessonOrder)
          .map((l) => ({
            id: l.id,
            lessonOrder: l.lessonOrder,
            externalId: l.externalId ?? undefined,
            title: l.title,
            content: l.content ?? undefined,
            bullets: l.bullets ?? [],
            keyPoints: l.keyPoints ?? [],
            analogy: l.analogy ?? undefined,
            comparisonTable: l.comparisonTable ?? undefined,
          })),
        labs: (mod.labs ?? [])
          .sort((a, b) => a.labOrder - b.labOrder)
          .map((l) => ({
            id: l.id,
            labOrder: l.labOrder ?? 0,
            labId: l.labId ?? undefined,
            title: l.title,
            objective: l.objective ?? undefined,
            learningObjectives: l.learningObjectives ?? [],
            evaluationCriteria: l.evaluationCriteria ?? [],
            durationMinutes: l.durationMinutes ?? undefined,
            difficultyLevel: l.difficultyLevel ?? undefined,
            prerequisites: l.prerequisites ?? [],
            resources: l.resources ?? [],
          })),
      })),
    };
  }

  async create(dto: CreateCourseDto): Promise<CourseForAdmin> {
    const existing = await this.courseRepo.findOne({ where: { courseId: dto.courseId } });
    if (existing) {
      throw new ConflictException(`Course with courseId "${dto.courseId}" already exists`);
    }
    if (dto.certificationId != null && dto.certificationId !== undefined) {
      try {
        await this.certificationsService.findOne(dto.certificationId);
      } catch (e) {
        if (e instanceof NotFoundException) {
          throw new BadRequestException(
            `Certification with ID ${dto.certificationId} not found. Create a certification first or leave certification empty.`,
          );
        }
        throw e;
      }
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const course = queryRunner.manager.create(Course, {
        courseId: dto.courseId,
        externalId: dto.externalId,
        title: dto.title,
        description: dto.description,
        level: dto.level,
        certificationId: dto.certificationId,
        objectives: dto.objectives ?? [],
        durationMinutes: dto.durationMinutes,
        quiz: dto.quiz ?? [],
        examTips: dto.examTips ?? [],
        resources: dto.resources ?? {},
      });
      const savedCourse = await queryRunner.manager.save(Course, course);
      const modules = dto.modules ?? [];
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        const mod = queryRunner.manager.create(CourseModuleEntity, {
          courseId: savedCourse.id,
          moduleOrder: m.moduleOrder ?? i + 1,
          externalId: m.externalId,
          title: m.title,
          icon: m.icon,
          durationMinutes: m.durationMinutes,
          objectives: m.objectives ?? [],
          quiz: m.quiz ?? [],
        });
        const savedMod = await queryRunner.manager.save(CourseModuleEntity, mod);
        for (let j = 0; j < (m.lessons ?? []).length; j++) {
          const l = m.lessons![j];
          const lesson = queryRunner.manager.create(Lesson, {
            moduleId: savedMod.id,
            lessonOrder: l.lessonOrder ?? j + 1,
            externalId: l.externalId,
            title: l.title,
            content: l.content,
            bullets: l.bullets ?? [],
            keyPoints: l.keyPoints ?? [],
            analogy: l.analogy,
            comparisonTable: l.comparisonTable,
          });
          await queryRunner.manager.save(Lesson, lesson);
        }
        for (let k = 0; k < (m.labs ?? []).length; k++) {
          const labDto = m.labs![k];
          const lab = queryRunner.manager.create(Lab, {
            moduleId: savedMod.id,
            labOrder: labDto.labOrder ?? k + 1,
            labId: labDto.labId ?? `lab-${savedMod.id}-${k + 1}`,
            title: labDto.title,
            objective: labDto.objective,
            learningObjectives: labDto.learningObjectives ?? [],
            evaluationCriteria: labDto.evaluationCriteria ?? [],
            durationMinutes: labDto.durationMinutes,
            difficultyLevel: labDto.difficultyLevel,
            prerequisites: labDto.prerequisites ?? [],
            resources: labDto.resources ?? [],
          });
          await queryRunner.manager.save(Lab, lab);
        }
      }
      await queryRunner.commitTransaction();
      return this.findOneForAdmin(savedCourse.id);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async update(idOrCourseId: number | string, dto: UpdateCourseDto): Promise<CourseForAdmin> {
    const isNumeric = typeof idOrCourseId === 'number' || /^\d+$/.test(String(idOrCourseId));
    const course = await this.courseRepo.findOne({
      where: isNumeric ? { id: Number(idOrCourseId) } : { courseId: String(idOrCourseId) },
      relations: ['modules', 'modules.lessons', 'modules.labs'],
    });
    if (!course) {
      throw new NotFoundException(`Course not found`);
    }
    if (dto.courseId != null && dto.courseId !== course.courseId) {
      const existing = await this.courseRepo.findOne({ where: { courseId: dto.courseId } });
      if (existing) {
        throw new ConflictException(`Course with courseId "${dto.courseId}" already exists`);
      }
    }
    if (dto.certificationId !== undefined && dto.certificationId != null) {
      try {
        await this.certificationsService.findOne(dto.certificationId);
      } catch (e) {
        if (e instanceof NotFoundException) {
          throw new BadRequestException(
            `Certification with ID ${dto.certificationId} not found. Create a certification first or leave certification empty.`,
          );
        }
        throw e;
      }
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const persistedCourse = await queryRunner.manager.findOneByOrFail(Course, { id: course.id });
      Object.assign(persistedCourse, {
        ...(dto.courseId != null && { courseId: dto.courseId }),
        ...(dto.externalId !== undefined && { externalId: dto.externalId }),
        ...(dto.title != null && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.certificationId !== undefined && { certificationId: dto.certificationId }),
        ...(dto.objectives !== undefined && { objectives: dto.objectives }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.quiz !== undefined && { quiz: dto.quiz }),
        ...(dto.examTips !== undefined && { examTips: dto.examTips }),
        ...(dto.resources !== undefined && { resources: dto.resources }),
        ...((dto as any).track !== undefined && { track: (dto as any).track }),
      });
      await queryRunner.manager.save(Course, persistedCourse);
      if (dto.modules != null) {
        for (const mod of course.modules ?? []) {
          await queryRunner.manager.delete(Lesson, { moduleId: mod.id });
          await queryRunner.manager.delete(Lab, { moduleId: mod.id });
        }
        await queryRunner.manager.delete(CourseModuleEntity, { courseId: course.id });
        const savedCourse = await queryRunner.manager.findOne(Course, { where: { id: course.id } })!;
        for (let i = 0; i < dto.modules.length; i++) {
          const m = dto.modules[i];
          const mod = queryRunner.manager.create(CourseModuleEntity, {
            courseId: savedCourse!.id,
            moduleOrder: m.moduleOrder ?? i + 1,
            externalId: m.externalId,
            title: m.title,
            icon: m.icon,
            durationMinutes: m.durationMinutes,
            objectives: m.objectives ?? [],
            quiz: m.quiz ?? [],
          });
          const savedMod = await queryRunner.manager.save(CourseModuleEntity, mod);
          for (let j = 0; j < (m.lessons ?? []).length; j++) {
            const l = m.lessons![j];
            const lesson = queryRunner.manager.create(Lesson, {
              moduleId: savedMod.id,
              lessonOrder: l.lessonOrder ?? j + 1,
              externalId: l.externalId,
              title: l.title,
              content: l.content,
              bullets: l.bullets ?? [],
              keyPoints: l.keyPoints ?? [],
              analogy: l.analogy,
              comparisonTable: l.comparisonTable,
            });
            await queryRunner.manager.save(Lesson, lesson);
          }
          for (let k = 0; k < (m.labs ?? []).length; k++) {
            const labDto = m.labs![k];
            const lab = queryRunner.manager.create(Lab, {
              moduleId: savedMod.id,
              labOrder: labDto.labOrder ?? k + 1,
              labId: labDto.labId ?? `lab-${savedMod.id}-${k + 1}`,
              title: labDto.title,
              objective: labDto.objective,
              learningObjectives: labDto.learningObjectives ?? [],
              evaluationCriteria: labDto.evaluationCriteria ?? [],
              durationMinutes: labDto.durationMinutes,
              difficultyLevel: labDto.difficultyLevel,
              prerequisites: labDto.prerequisites ?? [],
              resources: labDto.resources ?? [],
            });
            await queryRunner.manager.save(Lab, lab);
          }
        }
      }
      await queryRunner.commitTransaction();
      return this.findOneForAdmin(course.id);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(idOrCourseId: number | string): Promise<{ deleted: true }> {
    const isNumeric = typeof idOrCourseId === 'number' || /^\d+$/.test(String(idOrCourseId));
    const course = await this.courseRepo.findOne({
      where: isNumeric ? { id: Number(idOrCourseId) } : { courseId: String(idOrCourseId) },
    });
    if (!course) {
      throw new NotFoundException(`Course not found`);
    }
    await this.courseRepo.remove(course);
    return { deleted: true };
  }
}

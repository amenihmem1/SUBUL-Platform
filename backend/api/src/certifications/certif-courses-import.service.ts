import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { Certification } from './entities/certification.entity';
import { Course } from '../courses/entities/course.entity';
import { CourseModule } from '../courses/entities/course-module.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { LessonTranslation } from '../courses/entities/lesson-translation.entity';
import { Lab } from '../courses/entities/lab.entity';
import { CourseLevel } from '../courses/constants/course-level.enum';
import { expandCertificationCourses, normalizeCertificationIdentity } from './academy-pack-mappers';

type ImportMode = 'upsert_only' | 'sync_owned' | 'admin_upsert';

interface CertifCoursesPayload {
  platform?: string;
  version?: string;
  last_updated?: string;
  certifications?: CertificationPayload[];
  metadata?: Record<string, unknown>;
}

export interface ImportValidationError {
  path: string;
  message: string;
}

interface CertificationPayload {
  id: string;
  provider: string;
  exam_code?: string;
  title: string;
  domain?: string;
  level?: string;
  badge_color?: string;
  description?: string;
  estimated_hours?: number;
  modules?: ModulePayload[];
  final_exam_tips?: string[];
  resources?: Record<string, unknown>;
}

interface ModulePayload {
  id?: string;
  order?: number;
  title: string;
  duration_min?: number;
  objectives?: string[];
  lessons?: LessonPayload[];
  labs?: LabPayload[];
  quiz?: Record<string, unknown>[];
}

interface LessonTranslationPayload {
  title?: string;
  content?: string;
  key_points?: string[];
  analogy?: string;
  comparison_table?: Record<string, unknown>;
}

interface LessonPayload {
  id?: string;
  title: string;
  content?: string;
  key_points?: string[];
  analogy?: string;
  comparison_table?: Record<string, unknown>;
  /** Locale-keyed translations: { "fr": { title, content, key_points } } */
  translations?: Record<string, LessonTranslationPayload>;
}

interface LabPayload {
  id?: string;
  order?: number;
  title: string;
  description?: string;
  duration_min?: number;
  objectives?: string[];
  difficulty?: string;
  prerequisites?: string[];
  resources?: Record<string, any>[];
}

interface ExternalLabsPayload {
  course_id?: string;
  labs?: LabPayloadWithModule[];
}

interface LabPayloadWithModule extends LabPayload {
  module_id?: string;
}

export interface CertifCoursesImportSummary {
  mode: ImportMode;
  sourcePath?: string;
  sourceVersion?: string;
  certifications: { created: number; updated: number; skipped: number };
  courses: { created: number; updated: number; skipped: number };
  modules: { created: number; updated: number; skipped: number };
  lessons: { created: number; updated: number; skipped: number };
  quizzes: { created: number; updated: number; skipped: number };
  labs: { created: number; updated: number; skipped: number };
  errors: ImportValidationError[];
}

const IMPORT_SOURCE = 'certif_courses_json';

class DryRunRollback extends Error {
  constructor() {
    super('dry-run rollback');
    this.name = 'DryRunRollback';
  }
}

@Injectable()
export class CertifCoursesImportService {
  private readonly logger = new Logger(CertifCoursesImportService.name);

  private normalizeId(raw: string | undefined, maxLen: number): string | undefined {
    const v = String(raw ?? '').trim();
    if (!v) return undefined;
    if (v.length <= maxLen) return v;
    const hash = createHash('sha1').update(v).digest('hex').slice(0, 12);
    const keep = Math.max(1, maxLen - (hash.length + 1));
    return `${v.slice(0, keep)}-${hash}`;
  }

  /** Academy pack JSON often uses `correctAnswer` (index) instead of `correct` (option text). */
  private normalizeModuleQuizRows(raw: unknown): Record<string, unknown>[] {
    const list = Array.isArray(raw) ? raw : [];
    return list.map((item) => {
      if (!item || typeof item !== 'object') return item as Record<string, unknown>;
      const row = { ...(item as Record<string, unknown>) };
      const opts = Array.isArray(row.options) ? row.options : [];
      const hasTextCorrect =
        row.correct !== undefined &&
        row.correct !== null &&
        String(row.correct).trim() !== '';
      if (hasTextCorrect) return row;
      const idxRaw = row.correctAnswer ?? row.correctIndex ?? row.correct;
      if (idxRaw === undefined || idxRaw === null || idxRaw === '') return row;
      const idx = typeof idxRaw === 'number' ? idxRaw : parseInt(String(idxRaw), 10);
      if (Number.isNaN(idx) || opts[idx] === undefined || opts[idx] === null) return row;
      row.correct = String(opts[idx]);
      return row;
    });
  }

  /** True if the quiz row has a usable correct answer (text or index into options). */
  private quizRowHasCorrect(qq: Record<string, unknown>): boolean {
    if (qq.correct !== undefined && qq.correct !== null && String(qq.correct).trim() !== '') {
      return true;
    }
    const opts = Array.isArray(qq.options) ? qq.options : [];
    if (opts.length < 2) return false;
    const idxRaw = qq.correctAnswer ?? qq.correctIndex;
    if (idxRaw === undefined || idxRaw === null || idxRaw === '') return false;
    const idx = typeof idxRaw === 'number' ? idxRaw : parseInt(String(idxRaw), 10);
    if (Number.isNaN(idx)) return false;
    return idx >= 0 && idx < opts.length;
  }

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Certification) private readonly certificationRepo: Repository<Certification>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(CourseModule) private readonly moduleRepo: Repository<CourseModule>,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(LessonTranslation) private readonly lessonTranslationRepo: Repository<LessonTranslation>,
    @InjectRepository(Lab) private readonly labRepo: Repository<Lab>,
  ) {}

  async importFromFile(
    filePath?: string,
    mode: ImportMode = 'upsert_only',
  ): Promise<CertifCoursesImportSummary> {
    const resolvedPath = await this.resolveFilePath(filePath);
    const raw = await fs.readFile(resolvedPath, 'utf8');
    const payload = JSON.parse(raw) as CertifCoursesPayload;
    const enriched = await this.augmentPayloadWithExternalCertLabs(payload, resolvedPath);
    const summary = await this.importFromPayload(enriched, mode);
    summary.sourcePath = resolvedPath;
    return summary;
  }

  /**
   * Validate the JSON-shape of a courses/certifications payload before any DB work.
   * Returns path-precise errors like `certifications[0].modules[2].lessons[1].content is required`.
   * No DB calls — purely structural validation.
   */
  private validateModuleShape(
    errors: ImportValidationError[],
    modPath: string,
    mod: unknown,
  ): void {
    if (!mod || typeof mod !== 'object') {
      errors.push({ path: modPath, message: 'Module must be an object' });
      return;
    }
    const m = mod as Record<string, unknown>;
    if (!m.title || typeof m.title !== 'string' || !m.title.trim()) {
      errors.push({ path: `${modPath}.title`, message: 'Module title is required (string)' });
    }
    const lessons = Array.isArray(m.lessons) ? m.lessons : [];
    lessons.forEach((lesson, li) => {
      const lessonPath = `${modPath}.lessons[${li}]`;
      if (!lesson || typeof lesson !== 'object') {
        errors.push({ path: lessonPath, message: 'Lesson must be an object' });
        return;
      }
      const le = lesson as Record<string, unknown>;
      if (!le.title || typeof le.title !== 'string' || !le.title.trim()) {
        errors.push({ path: `${lessonPath}.title`, message: 'Lesson title is required (string)' });
      }
      if (le.content !== undefined && typeof le.content !== 'string') {
        errors.push({ path: `${lessonPath}.content`, message: 'Lesson content must be a string when provided' });
      }
    });
    const quiz = Array.isArray(m.quiz) ? m.quiz : [];
    quiz.forEach((q: unknown, qi: number) => {
      const qPath = `${modPath}.quiz[${qi}]`;
      if (!q || typeof q !== 'object') {
        errors.push({ path: qPath, message: 'Quiz item must be an object' });
        return;
      }
      const qq = q as Record<string, unknown>;
      if (!qq.question || typeof qq.question !== 'string' || !qq.question.trim()) {
        errors.push({ path: `${qPath}.question`, message: 'Quiz question is required (string)' });
      }
      if (!Array.isArray(qq.options) || qq.options.length < 2) {
        errors.push({ path: `${qPath}.options`, message: 'Quiz options must be an array of at least 2 items' });
      }
      if (!this.quizRowHasCorrect(qq)) {
        errors.push({
          path: `${qPath}.correct`,
          message:
            'Quiz correct answer is required (field "correct", or index via "correctAnswer" / "correctIndex" with valid options[])',
        });
      }
    });
    const labs = Array.isArray(m.labs) ? m.labs : [];
    labs.forEach((lab: unknown, li: number) => {
      const labPath = `${modPath}.labs[${li}]`;
      if (!lab || typeof lab !== 'object') {
        errors.push({ path: labPath, message: 'Lab must be an object' });
        return;
      }
      const lb = lab as Record<string, unknown>;
      if (!lb.title || typeof lb.title !== 'string' || !lb.title.trim()) {
        errors.push({ path: `${labPath}.title`, message: 'Lab title is required (string)' });
      }
    });
  }

  validatePayloadShape(payload: unknown): ImportValidationError[] {
    const errors: ImportValidationError[] = [];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      errors.push({ path: '$', message: 'Payload must be a JSON object with a "certifications" array' });
      return errors;
    }
    const root = payload as CertifCoursesPayload;
    if (!Array.isArray(root.certifications)) {
      errors.push({ path: 'certifications', message: 'Required array "certifications" is missing or not an array' });
      return errors;
    }
    const seenCertIds = new Set<string>();
    root.certifications.forEach((cert, ci) => {
      const certPath = `certifications[${ci}]`;
      if (!cert || typeof cert !== 'object') {
        errors.push({ path: certPath, message: 'Certification must be an object' });
        return;
      }
      const rawCert = cert as unknown as Record<string, unknown>;
      const resolvedId = String(rawCert.id ?? rawCert.externalId ?? rawCert.slug ?? '').trim();
      if (!resolvedId) {
        errors.push({
          path: `${certPath}.id`,
          message: 'Certification id is required (provide id, externalId, or slug)',
        });
      } else if (seenCertIds.has(resolvedId)) {
        errors.push({ path: `${certPath}.id`, message: `Duplicate certification id "${resolvedId}" in payload` });
      } else {
        seenCertIds.add(resolvedId);
      }
      if (!cert.title || typeof cert.title !== 'string' || !cert.title.trim()) {
        errors.push({ path: `${certPath}.title`, message: 'Certification title is required (string)' });
      }
      if (!cert.provider || typeof cert.provider !== 'string' || !cert.provider.trim()) {
        errors.push({ path: `${certPath}.provider`, message: 'Certification provider is required (string)' });
      }
      const certLoose = cert as unknown as Record<string, unknown>;
      const coursesArr = Array.isArray(certLoose.courses)
        ? (certLoose.courses as Record<string, unknown>[])
        : [];
      const topModules = Array.isArray(cert.modules) ? cert.modules : [];
      if (coursesArr.length === 0 && topModules.length === 0) {
        errors.push({
          path: certPath,
          message: 'Certification must include a non-empty modules[] array or a non-empty courses[] array',
        });
      }
      if (coursesArr.length > 0) {
        coursesArr.forEach((course, ci) => {
          const cPath = `${certPath}.courses[${ci}]`;
          if (!course?.courseId || typeof course.courseId !== 'string' || !String(course.courseId).trim()) {
            errors.push({ path: `${cPath}.courseId`, message: 'courseId is required when using courses[]' });
          }
          if (!course?.title || typeof course.title !== 'string' || !String(course.title).trim()) {
            errors.push({ path: `${cPath}.title`, message: 'title is required when using courses[]' });
          }
          const cMods = Array.isArray(course.modules) ? course.modules : [];
          cMods.forEach((mod, mi) => {
            this.validateModuleShape(errors, `${cPath}.modules[${mi}]`, mod);
          });
        });
      }
      const modules = Array.isArray(cert.modules) ? cert.modules : [];
      modules.forEach((mod, mi) => {
        this.validateModuleShape(errors, `${certPath}.modules[${mi}]`, mod);
      });
    });
    return errors;
  }

  async importFromPayload(
    payload: CertifCoursesPayload,
    mode: ImportMode = 'upsert_only',
    options: { dryRun?: boolean } = {},
  ): Promise<CertifCoursesImportSummary> {
    const normalizedCerts = (Array.isArray(payload.certifications) ? payload.certifications : []).map((c) =>
      normalizeCertificationIdentity(c as unknown as Record<string, unknown>),
    ) as unknown as CertificationPayload[];
    const payloadNormalized: CertifCoursesPayload = { ...payload, certifications: normalizedCerts };
    const certifications = normalizedCerts;
    const sourceVersion = String((payload as Record<string, unknown>).schemaVersion ?? payload.version ?? '1.0');
    const importedAt = new Date();
    const shapeErrors = this.validatePayloadShape(payloadNormalized);
    const summary: CertifCoursesImportSummary = {
      mode,
      sourceVersion,
      certifications: { created: 0, updated: 0, skipped: 0 },
      courses: { created: 0, updated: 0, skipped: 0 },
      modules: { created: 0, updated: 0, skipped: 0 },
      lessons: { created: 0, updated: 0, skipped: 0 },
      quizzes: { created: 0, updated: 0, skipped: 0 },
      labs: { created: 0, updated: 0, skipped: 0 },
      errors: shapeErrors,
    };

    // Bail before any DB work if the JSON is fundamentally not a courses payload.
    if (shapeErrors.some((e) => e.path === '$' || e.path === 'certifications')) {
      return summary;
    }

    try {
      await this.dataSource.transaction(async (manager) => {
      for (const cert of certifications) {
        if (!cert?.id || !cert?.title) {
          summary.certifications.skipped += 1;
          continue;
        }

        let certEntity = await manager.findOne(Certification, {
          where: [{ externalId: cert.id }, { title: cert.title }],
        });

        const certAny = cert as unknown as Record<string, unknown>;
        const certPatch: Partial<Certification> = {
          externalId: cert.id,
          examCode: cert.exam_code ?? (certAny['certificationCode'] as string | undefined),
          title: cert.title,
          provider: cert.provider || 'Unknown',
          description: cert.description ?? '',
          level: this.mapCertificationLevel(cert.level),
          domain: (cert.domain as string | undefined) ?? (certAny['track'] as string | undefined) ?? '',
          badgeColor: cert.badge_color,
          estimatedHours: cert.estimated_hours ?? (certAny['estimatedHours'] as number | undefined),
          finalExamTips: cert.final_exam_tips ?? [],
          resources: cert.resources ?? {},
          status: 'Active',
          available: true,
          source: IMPORT_SOURCE,
          sourceVersion,
          importedAt,
          rawMetadata: {
            platform: payload.platform,
            lastUpdated: payload.last_updated,
            metadata: payload.metadata ?? {},
          },
        };

        if (!certEntity) {
          certEntity = manager.create(Certification, certPatch);
          certEntity = await manager.save(Certification, certEntity);
          summary.certifications.created += 1;
        } else if (
          mode === 'upsert_only' &&
          certEntity.source &&
          certEntity.source !== IMPORT_SOURCE
        ) {
          summary.certifications.skipped += 1;
          summary.errors.push({
            path: `certifications[${cert.id}]`,
            message: `Skipped: existing certification owned by source="${certEntity.source}". Use admin_upsert mode to overwrite.`,
          });
          continue;
        } else {
          Object.assign(certEntity, certPatch);
          certEntity = await manager.save(Certification, certEntity);
          summary.certifications.updated += 1;
        }

        const segments = expandCertificationCourses(certAny, (c) =>
          this.makeCourseId(c as unknown as CertificationPayload),
        );

        for (const segment of segments) {
          const modules = segment.modules as ModulePayload[];
          const courseIdStr = segment.courseId;
          const courseExternalId = `${cert.id}:${courseIdStr}`;
          const totalDurationMinutes = modules.reduce((acc, module) => acc + (module.duration_min ?? 0), 0);

          let course = await manager.findOne(Course, {
            where: { courseId: courseIdStr },
            relations: ['modules', 'modules.lessons', 'modules.labs'],
          });

          const coursePatch: Partial<Course> = {
            externalId: courseExternalId,
            courseId: courseIdStr,
            title: segment.title,
            description: segment.description ?? (cert.description ?? ''),
            level: this.mapCertificationLevel(cert.level),
            certificationId: certEntity.id,
            objectives: [],
            durationMinutes: totalDurationMinutes || undefined,
            examTips: cert.final_exam_tips ?? [],
            resources: cert.resources ?? {},
            quiz: [],
            source: IMPORT_SOURCE,
            sourceVersion,
            importedAt,
            ...(segment.track ? { track: segment.track } : {}),
          };

          if (!course) {
            course = manager.create(Course, coursePatch);
            course = await manager.save(Course, course);
            summary.courses.created += 1;
          } else if (mode === 'upsert_only' && course.source && course.source !== IMPORT_SOURCE) {
            summary.courses.skipped += 1;
            summary.errors.push({
              path: `certifications[${cert.id}].course`,
              message: `Skipped: existing course "${course.courseId}" owned by source="${course.source}". Use admin_upsert mode to overwrite.`,
            });
            continue;
          } else {
            Object.assign(course, coursePatch);
            course = await manager.save(Course, course);
            summary.courses.updated += 1;
          }

          for (const [moduleIndex, modulePayload] of modules.entries()) {
          if (!modulePayload?.title) {
            summary.modules.skipped += 1;
            continue;
          }
          const moduleOrder = modulePayload.order ?? moduleIndex + 1;
          let moduleEntity = await manager.findOne(CourseModule, {
            where: modulePayload.id
              ? [{ courseId: course.id, externalId: modulePayload.id }, { courseId: course.id, moduleOrder }]
              : [{ courseId: course.id, moduleOrder }],
            relations: ['lessons'],
          });
          const normalizedQuiz = this.normalizeModuleQuizRows(modulePayload.quiz);
          const modulePatch: Partial<CourseModule> = {
            courseId: course.id,
            externalId: this.normalizeId(modulePayload.id, 100),
            moduleOrder,
            title: modulePayload.title,
            durationMinutes: modulePayload.duration_min,
            objectives: modulePayload.objectives ?? [],
            quiz: normalizedQuiz,
          };
          const moduleIsNew = !moduleEntity;
          if (!moduleEntity) {
            moduleEntity = manager.create(CourseModule, modulePatch);
            moduleEntity = await manager.save(CourseModule, moduleEntity);
            summary.modules.created += 1;
          } else {
            Object.assign(moduleEntity, modulePatch);
            moduleEntity = await manager.save(CourseModule, moduleEntity);
            summary.modules.updated += 1;
          }

          const quizItems = normalizedQuiz;
          if (quizItems.length > 0) {
            if (moduleIsNew) {
              summary.quizzes.created += quizItems.length;
            } else {
              summary.quizzes.updated += quizItems.length;
            }
          }

          const lessons = Array.isArray(modulePayload.lessons) ? modulePayload.lessons : [];
          for (const [lessonIndex, lessonPayload] of lessons.entries()) {
            if (!lessonPayload?.title) {
              summary.lessons.skipped += 1;
              continue;
            }
            const lessonOrder = lessonIndex + 1;
            let lesson = await manager.findOne(Lesson, {
              where: lessonPayload.id
                ? [{ moduleId: moduleEntity.id, externalId: lessonPayload.id }, { moduleId: moduleEntity.id, lessonOrder }]
                : [{ moduleId: moduleEntity.id, lessonOrder }],
            });
            const lessonPatch: Partial<Lesson> = {
              moduleId: moduleEntity.id,
              lessonOrder,
              externalId: this.normalizeId(lessonPayload.id, 100),
              title: lessonPayload.title,
              content: lessonPayload.content ?? '',
              bullets: lessonPayload.key_points ?? [],
              keyPoints: lessonPayload.key_points ?? [],
              analogy: lessonPayload.analogy,
              comparisonTable: lessonPayload.comparison_table,
            };
            if (!lesson) {
              lesson = manager.create(Lesson, lessonPatch);
              await manager.save(Lesson, lesson);
              summary.lessons.created += 1;
            } else {
              Object.assign(lesson, lessonPatch);
              await manager.save(Lesson, lesson);
              summary.lessons.updated += 1;
            }

            // Upsert locale translations when provided in the payload.
            const txMap = lessonPayload.translations ?? {};
            for (const [txLocale, txData] of Object.entries(txMap)) {
              const normLocale = String(txLocale).toLowerCase().trim();
              if (!normLocale || normLocale === 'en') continue; // 'en' = base lesson, skip
              let tx = await manager.findOne(LessonTranslation, {
                where: { lessonId: lesson.id, locale: normLocale },
              });
              const txPatch: Partial<LessonTranslation> = {
                lessonId: lesson.id,
                locale: normLocale,
                title: txData.title,
                content: txData.content,
                bullets: txData.key_points,
                analogy: txData.analogy,
                comparisonTable: txData.comparison_table,
              };
              if (!tx) {
                tx = manager.create(LessonTranslation, txPatch);
              } else {
                Object.assign(tx, txPatch);
              }
              await manager.save(LessonTranslation, tx);
            }
          }

          const labs = Array.isArray(modulePayload.labs) ? modulePayload.labs : [];
          for (const [labIndex, labPayload] of labs.entries()) {
            const lp = labPayload as LabPayload;
            if (!lp?.title) {
              summary.labs.skipped += 1;
              continue;
            }
            const labOrder = lp.order ?? labIndex + 1;
            let lab = await manager.findOne(Lab, {
              where: lp.id
                ? [{ moduleId: moduleEntity.id, labId: lp.id }, { moduleId: moduleEntity.id, labOrder }]
                : [{ moduleId: moduleEntity.id, labOrder }],
            });
            const labPatch: Partial<Lab> = {
              moduleId: moduleEntity.id,
              labId: this.normalizeId(lp.id, 50),
              labOrder,
              title: lp.title,
              objective: lp.description ?? '',
              durationMinutes: lp.duration_min,
              difficultyLevel: lp.difficulty,
              learningObjectives: lp.objectives ?? [],
              prerequisites: lp.prerequisites ?? [],
              resources: lp.resources ?? [],
            };
            if (!lab) {
              lab = manager.create(Lab, labPatch);
              await manager.save(Lab, lab);
              summary.labs.created += 1;
            } else {
              Object.assign(lab, labPatch);
              await manager.save(Lab, lab);
              summary.labs.updated += 1;
            }
          }
        }
        }
      }

        if (options.dryRun) {
          // Force the transaction to roll back so dryRun never persists.
          throw new DryRunRollback();
        }
      });
    } catch (error) {
      if (!(error instanceof DryRunRollback)) {
        throw error;
      }
    }

    this.logger.log(
      `certif_courses import done: certs c/u/s=${summary.certifications.created}/${summary.certifications.updated}/${summary.certifications.skipped}, courses c/u/s=${summary.courses.created}/${summary.courses.updated}/${summary.courses.skipped}`,
    );
    return summary;
  }

  private mapCertificationLevel(level?: string): string {
    const normalized = (level ?? '').toLowerCase();
    if (normalized === 'debutant') return CourseLevel.Fundamentals;
    if (normalized === 'intermediaire') return CourseLevel.Intermediate;
    if (normalized === 'avance') return CourseLevel.Advanced;
    return level ?? CourseLevel.Fundamentals;
  }

  private makeCourseId(cert: CertificationPayload): string {
    const anyCert = cert as unknown as Record<string, unknown>;
    const examCode = (cert.exam_code ?? anyCert['certificationCode'])?.toString().trim();
    if (examCode) return examCode.toUpperCase().replace(/[^A-Z0-9-]/g, '-');
    return cert.id.toUpperCase().replace(/[^A-Z0-9-]/g, '-');
  }

  private async resolveFilePath(filePath?: string): Promise<string> {
    const cwd = process.cwd();
    const candidates = [
      filePath,
      path.resolve(cwd, 'certif_courses.json'),
      path.resolve(cwd, '..', 'certif_courses.json'),
      path.resolve(cwd, '..', '..', 'certif_courses.json'),
      path.resolve(cwd, '..', '..', '..', 'certif_courses.json'),
      path.resolve(cwd, 'courses.json'),
      path.resolve(cwd, '..', 'courses.json'),
      path.resolve(cwd, '..', '..', 'courses.json'),
      path.resolve(cwd, '..', '..', '..', 'courses.json'),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // continue
      }
    }
    throw new Error('Unable to locate certif_courses.json or courses.json');
  }

  private async augmentPayloadWithExternalCertLabs(
    payload: CertifCoursesPayload,
    resolvedPath: string,
  ): Promise<CertifCoursesPayload> {
    const baseDir = path.dirname(resolvedPath);
    const candidates = [
      {
        certFile: 'bootlin_embedded_linux.json',
        labsFile: 'bootlin_embedded_linux_labs.json',
      },
      {
        certFile: 'cisco_iot_digital_transformation.json',
        labsFile: 'cisco_iot_labs.json',
      },
    ];

    const certifications = Array.isArray(payload.certifications) ? [...payload.certifications] : [];

    for (const candidate of candidates) {
      const certPath = path.join(baseDir, candidate.certFile);
      const labsPath = path.join(baseDir, candidate.labsFile);
      try {
        await fs.access(certPath);
        await fs.access(labsPath);
      } catch {
        continue;
      }

      const certRaw = await fs.readFile(certPath, 'utf8');
      const labsRaw = await fs.readFile(labsPath, 'utf8');
      const cert = JSON.parse(certRaw) as CertificationPayload;
      const labsPayload = JSON.parse(labsRaw) as ExternalLabsPayload;

      const moduleLabs = new Map<string, LabPayload[]>();
      for (const rawLab of Array.isArray(labsPayload.labs) ? labsPayload.labs : []) {
        if (!rawLab?.module_id) continue;
        const mapped: LabPayload = {
          id: rawLab.id,
          order: rawLab.order,
          title: rawLab.title,
          description: rawLab.description,
          duration_min: rawLab.duration_min,
          objectives: rawLab.objectives,
          difficulty: rawLab.difficulty,
          prerequisites: rawLab.prerequisites,
          resources: rawLab.resources,
        };
        const list = moduleLabs.get(rawLab.module_id) ?? [];
        list.push(mapped);
        moduleLabs.set(rawLab.module_id, list);
      }

      const enrichedModules = (Array.isArray(cert.modules) ? cert.modules : []).map((module) => ({
        ...module,
        labs: module.id ? moduleLabs.get(module.id) ?? [] : [],
      }));

      const enrichedCert: CertificationPayload = {
        ...cert,
        modules: enrichedModules,
      };

      const existingIdx = certifications.findIndex((item) => item.id === enrichedCert.id);
      if (existingIdx >= 0) {
        certifications[existingIdx] = enrichedCert;
      } else {
        certifications.push(enrichedCert);
      }
    }

    return {
      ...payload,
      certifications,
    };
  }
}

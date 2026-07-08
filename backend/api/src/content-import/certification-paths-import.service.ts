import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Certification } from '../certifications/entities/certification.entity';
import {
  CertificationPath,
  CertificationPathStepType,
} from '../certifications/entities/certification-path.entity';
import { Course } from '../courses/entities/course.entity';
import { Lab } from '../labs/entities/lab.entity';
import { PracticeExam } from '../practice-exams/entities/practice-exam.entity';

const ALLOWED_STEP_TYPES: CertificationPathStepType[] = [
  'course',
  'lab',
  'assessment',
  'quiz',
  'practice_exam',
  'final_certificate',
];

class DryRunRollback extends Error {
  constructor() {
    super('dry-run rollback');
    this.name = 'DryRunRollback';
  }
}

export interface CertificationPathsImportSummary {
  dryRun: boolean;
  paths: { created: number; updated: number; skipped: number };
  steps: { created: number; updated: number; skipped: number };
  errors: Array<{ path: string; message: string }>;
}

interface PathStepPayload {
  stepOrder?: number;
  stepType: CertificationPathStepType | string;
  stepRef: string;
  title?: string;
  description?: string;
  required?: boolean;
  skillGain?: string;
  ctaLabel?: string;
}

interface PathPayload {
  certificationId?: number;
  certificationExternalId?: string;
  /** Resolved only when id/externalId are absent; must match exactly one row (case-insensitive). */
  certificationTitle?: string;
  steps: PathStepPayload[];
}

interface PathsRootPayload {
  version?: string;
  paths?: PathPayload[];
  /** Academy pack key — alias of `paths` */
  certificationPaths?: PathPayload[];
}

@Injectable()
export class CertificationPathsImportService {
  private readonly logger = new Logger(CertificationPathsImportService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Certification) private readonly certRepo: Repository<Certification>,
    @InjectRepository(CertificationPath) private readonly pathRepo: Repository<CertificationPath>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Lab) private readonly labRepo: Repository<Lab>,
    @InjectRepository(PracticeExam) private readonly practiceExamRepo: Repository<PracticeExam>,
  ) {}

  /** Pure structural validation — no DB calls. */
  validateShape(payload: unknown) {
    const errors: Array<{ path: string; message: string }> = [];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      errors.push({ path: '$', message: 'Payload must be an object with a "paths" or "certificationPaths" array' });
      return errors;
    }
    const root = payload as PathsRootPayload;
    const pathsRoot = Array.isArray(root.paths)
      ? root.paths
      : Array.isArray(root.certificationPaths)
        ? root.certificationPaths
        : null;
    if (!pathsRoot) {
      errors.push({ path: 'paths', message: 'Required "paths" or "certificationPaths" array is missing' });
      return errors;
    }
    pathsRoot.forEach((p, pi) => {
      const base = `paths[${pi}]`;
      if (!p || typeof p !== 'object') {
        errors.push({ path: base, message: 'Path entry must be an object' });
        return;
      }
      if (!p.certificationId && !p.certificationExternalId && !p.certificationTitle) {
        errors.push({
          path: `${base}.certification`,
          message:
            'One of certificationId (number), certificationExternalId (string), or certificationTitle (string) is required',
        });
      }
      if (!Array.isArray(p.steps) || p.steps.length === 0) {
        errors.push({ path: `${base}.steps`, message: 'At least one step is required' });
        return;
      }
      p.steps.forEach((s, si) => {
        const sb = `${base}.steps[${si}]`;
        if (!s || typeof s !== 'object') {
          errors.push({ path: sb, message: 'Step must be an object' });
          return;
        }
        if (!ALLOWED_STEP_TYPES.includes(s.stepType as CertificationPathStepType)) {
          errors.push({
            path: `${sb}.stepType`,
            message: `stepType must be one of ${ALLOWED_STEP_TYPES.join(', ')}`,
          });
        }
        if (!s.stepRef || typeof s.stepRef !== 'string') {
          errors.push({ path: `${sb}.stepRef`, message: 'stepRef is required (string)' });
        }
        if (s.stepOrder !== undefined && (typeof s.stepOrder !== 'number' || s.stepOrder < 1)) {
          errors.push({ path: `${sb}.stepOrder`, message: 'stepOrder must be a positive number' });
        }
      });
      const orders = p.steps
        .map((s) => (typeof s?.stepOrder === 'number' ? s.stepOrder : null))
        .filter((o): o is number => o !== null);
      if (orders.length > 0 && new Set(orders).size !== orders.length) {
        errors.push({ path: `${base}.steps`, message: 'stepOrder must be unique within a path' });
      }
    });
    return errors;
  }

  async importFromJson(
    payload: unknown,
    dryRun = true,
  ): Promise<CertificationPathsImportSummary> {
    const shapeErrors = this.validateShape(payload);
    const summary: CertificationPathsImportSummary = {
      dryRun,
      paths: { created: 0, updated: 0, skipped: 0 },
      steps: { created: 0, updated: 0, skipped: 0 },
      errors: shapeErrors,
    };
    if (shapeErrors.some((e) => e.path === '$' || e.path === 'paths')) return summary;

    const root = payload as PathsRootPayload;
    const paths = Array.isArray(root.paths)
      ? root.paths
      : Array.isArray(root.certificationPaths)
        ? root.certificationPaths
        : [];

    try {
      await this.dataSource.transaction(async (manager) => {
        for (const [pi, p] of paths.entries()) {
          const pathPath = `paths[${pi}]`;

          // Resolve certification by id, externalId, or exact title (unsafe ambiguous titles are skipped)
          let cert: Certification | null = null;
          if (typeof p.certificationId === 'number') {
            cert = await manager.findOne(Certification, { where: { id: p.certificationId } });
          } else if (p.certificationExternalId) {
            cert = await manager.findOne(Certification, { where: { externalId: p.certificationExternalId } });
          } else if (p.certificationTitle?.trim()) {
            const t = p.certificationTitle.trim();
            const list = await manager
              .createQueryBuilder(Certification, 'c')
              .where('LOWER(TRIM(c.title)) = LOWER(TRIM(:t))', { t })
              .getMany();
            if (list.length === 1) {
              cert = list[0];
            } else if (list.length > 1) {
              summary.paths.skipped += 1;
              summary.errors.push({
                path: `${pathPath}.certificationTitle`,
                message: `Ambiguous certificationTitle "${t}" — matched ${list.length} rows; use certificationExternalId`,
              });
              continue;
            }
          }
          if (!cert) {
            summary.paths.skipped += 1;
            summary.errors.push({
              path: `${pathPath}.certification`,
              message: `Certification not found (id=${p.certificationId ?? '-'}, externalId=${p.certificationExternalId ?? '-'}, title=${p.certificationTitle ?? '-'})`,
            });
            continue;
          }

          // Validate each step's stepRef against the actual catalog
          const validatedSteps: Array<{
            stepOrder: number;
            stepType: CertificationPathStepType;
            stepRef: string;
            title: string;
            description?: string;
            required?: boolean;
          }> = [];
          let pathInvalid = false;
          for (const [si, s] of p.steps.entries()) {
            const sb = `${pathPath}.steps[${si}]`;
            const ref = String(s.stepRef ?? '').trim();
            const stepType = s.stepType as CertificationPathStepType;
            if (!ALLOWED_STEP_TYPES.includes(stepType)) {
              pathInvalid = true;
              break;
            }
            if (stepType === 'course') {
              const exists = await manager.findOne(Course, { where: { courseId: ref } });
              if (!exists) {
                summary.errors.push({
                  path: `${sb}.stepRef`,
                  message: `Course "${ref}" not found in catalog`,
                });
                summary.steps.skipped += 1;
                pathInvalid = true;
                break;
              }
              if (exists.certificationId != null && exists.certificationId !== cert.id) {
                summary.errors.push({
                  path: `${sb}.stepRef`,
                  message: `Course "${ref}" belongs to certification ${exists.certificationId}, not ${cert.id} (${cert.title})`,
                });
                summary.steps.skipped += 1;
                pathInvalid = true;
                break;
              }
            } else if (stepType === 'lab') {
              const exists = await manager.findOne(Lab, { where: { slug: ref } });
              if (!exists) {
                summary.errors.push({
                  path: `${sb}.stepRef`,
                  message: `Lab slug "${ref}" not found`,
                });
                summary.steps.skipped += 1;
                pathInvalid = true;
                break;
              }
            } else if (stepType === 'practice_exam') {
              const exists = await manager.findOne(PracticeExam, { where: [{ slug: ref }, { externalId: ref }] });
              if (!exists) {
                summary.errors.push({
                  path: `${sb}.stepRef`,
                  message: `Practice exam "${ref}" not found`,
                });
                summary.steps.skipped += 1;
                pathInvalid = true;
                break;
              }
            } else if (stepType === 'final_certificate') {
              const expectedExternalId = String(cert.externalId ?? '').trim();
              const expectedId = String(cert.id);
              if (ref !== expectedExternalId && ref !== expectedId) {
                summary.errors.push({
                  path: `${sb}.stepRef`,
                  message: `final_certificate stepRef must match certification externalId "${expectedExternalId}" or id "${expectedId}"`,
                });
                summary.steps.skipped += 1;
                pathInvalid = true;
                break;
              }
            }
            // assessment/quiz/final_certificate refs are free-form
            const stepTitle =
              String(s.title ?? s.skillGain ?? s.ctaLabel ?? ref).trim() || ref;
            validatedSteps.push({
              stepOrder: typeof s.stepOrder === 'number' ? s.stepOrder : si + 1,
              stepType,
              stepRef: ref,
              title: stepTitle,
              description: s.description ? String(s.description).trim() : undefined,
              required: s.required ?? true,
            });
          }
          if (pathInvalid) {
            summary.paths.skipped += 1;
            continue;
          }

          // Determine create vs update by existence of any prior path rows
          const existing = await manager.find(CertificationPath, {
            where: { certificationId: cert.id },
          });
          if (existing.length > 0) {
            summary.paths.updated += 1;
          } else {
            summary.paths.created += 1;
          }

          // Atomically replace the path
          await manager.delete(CertificationPath, { certificationId: cert.id });
          const sorted = validatedSteps.sort((a, b) => a.stepOrder - b.stepOrder);
          if (new Set(sorted.map((s) => s.stepOrder)).size !== sorted.length) {
            summary.paths.skipped += 1;
            summary.errors.push({
              path: `${pathPath}.steps`,
              message: 'Duplicate stepOrder detected; path skipped',
            });
            continue;
          }
          for (const [idx, step] of sorted.entries()) {
            const created = manager.create(CertificationPath, {
              certificationId: cert.id,
              stepOrder: idx + 1,
              stepType: step.stepType,
              stepRef: step.stepRef,
              title: step.title,
              description: step.description,
            });
            await manager.save(CertificationPath, created);
            summary.steps.created += 1;
          }
        }
        if (dryRun) throw new DryRunRollback();
      });
    } catch (err) {
      if (!(err instanceof DryRunRollback)) {
        if (err instanceof BadRequestException) throw err;
        throw err;
      }
    }
    this.logger.log(
      `cert-paths import: paths c/u/s=${summary.paths.created}/${summary.paths.updated}/${summary.paths.skipped}, steps created=${summary.steps.created}`,
    );
    return summary;
  }
}

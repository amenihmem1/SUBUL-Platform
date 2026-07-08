import { Injectable } from '@nestjs/common';
import { ContentIndexerService } from '../content-indexer/content-indexer.service';
import { CourseJsonImportService } from './course-json-import.service';
import { LabImportService } from './lab-import.service';
import { CertificationImportService } from './certification-import.service';
import { CertificationImportItemDto } from './dto/import-content.dto';
import { CertificationPathsImportService } from './certification-paths-import.service';
import { PracticeExamsService } from '../practice-exams/practice-exams.service';

@Injectable()
export class ContentImportService {
  constructor(
    private readonly courseJsonImportService: CourseJsonImportService,
    private readonly labImportService: LabImportService,
    private readonly certificationImportService: CertificationImportService,
    private readonly certificationPathsImportService: CertificationPathsImportService,
    private readonly practiceExamsService: PracticeExamsService,
    private readonly contentIndexerService: ContentIndexerService,
  ) {}

  /** Validate JSON shape only — no DB calls. Used by admin "Validate" action. */
  validateCoursesShape(payload: Record<string, unknown>) {
    return this.courseJsonImportService.validateShape(payload);
  }

  importCoursesJson(payload: Record<string, unknown>, dryRun = true) {
    return this.courseJsonImportService.importFromPayload(payload, dryRun);
  }

  async importLabsJson(payload: Array<Record<string, unknown>>, dryRun = true) {
    const result = await this.labImportService.importLabs(payload, dryRun);
    if (dryRun) {
      return { ...result, indexing: { status: 'pending' as const } };
    }
    return this.withIndexingResult(result);
  }

  /**
   * Accepts either the nested `{ certifications: [...] }` shape (same as
   * certif_courses.json) or a flat array of CertificationImportItemDto.
   * Nested shape is the preferred admin format because it carries modules,
   * lessons, quizzes and embedded course-labs alongside the certification.
   */
  async importCertificationsJson(
    payload: Record<string, unknown> | CertificationImportItemDto[],
    dryRun = true,
  ) {
    const isNested =
      payload &&
      !Array.isArray(payload) &&
      typeof payload === 'object' &&
      Array.isArray((payload as Record<string, unknown>).certifications);

    if (isNested) {
      // Route through the full courses importer so we get certs + courses +
      // modules + lessons + quizzes + course-labs created/updated counts and
      // path-precise validation errors in one place.
      return this.courseJsonImportService.importFromPayload(
        payload as Record<string, unknown>,
        dryRun,
      );
    }

    if (!Array.isArray(payload)) {
      throw new Error(
        'Certifications JSON must be either { "certifications": [...] } or a flat array of certification items.',
      );
    }

    const result = await this.certificationImportService.importCertifications(
      payload as CertificationImportItemDto[],
      dryRun,
    );
    if (dryRun) {
      return { ...result, indexing: { status: 'pending' as const } };
    }
    return this.withIndexingResult(result);
  }

  validateCertificationPathsShape(payload: unknown) {
    return this.certificationPathsImportService.validateShape(payload);
  }

  async importCertificationPathsJson(payload: unknown, dryRun = true) {
    const result = await this.certificationPathsImportService.importFromJson(payload, dryRun);
    if (dryRun) {
      return { ...result, indexing: { status: 'pending' as const } };
    }
    return this.withIndexingResult(result);
  }

  validatePracticeExamsShape(payload: unknown) {
    return this.practiceExamsService.validateShape(payload);
  }

  async importPracticeExamsJson(payload: Array<Record<string, unknown>>, dryRun = true) {
    const result = await this.practiceExamsService.importFromJson(payload, dryRun);
    if (dryRun) {
      return { ...result, indexing: { status: 'pending' as const } };
    }
    return this.withIndexingResult(result);
  }

  private async withIndexingResult<T extends object>(result: T) {
    try {
      const sync = await this.contentIndexerService.syncAll(false);
      return { ...result, indexing: { status: 'completed' as const, details: sync } };
    } catch (error) {
      return {
        ...result,
        indexing: {
          status: 'failed' as const,
          details: error instanceof Error ? error.message : 'Unknown indexing error',
        },
      };
    }
  }
}

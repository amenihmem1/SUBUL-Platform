import { Injectable } from '@nestjs/common';
import {
  CertifCoursesImportService,
  CertifCoursesImportSummary,
} from '../certifications/certif-courses-import.service';
import { ContentIndexerService } from '../content-indexer/content-indexer.service';

export interface CoursesImportResponse {
  dryRun: boolean;
  import: CertifCoursesImportSummary;
  indexing: { status: 'pending' | 'completed' | 'failed'; details?: unknown };
}

@Injectable()
export class CourseJsonImportService {
  constructor(
    private readonly certifCoursesImportService: CertifCoursesImportService,
    private readonly contentIndexerService: ContentIndexerService,
  ) {}

  /**
   * Validate JSON shape only (no DB calls). Used by the admin UI
   * to surface path-precise errors before sending the full import.
   */
  validateShape(payload: unknown) {
    return this.certifCoursesImportService.validatePayloadShape(payload);
  }

  async importFromPayload(
    payload: Record<string, unknown>,
    dryRun = true,
  ): Promise<CoursesImportResponse> {
    // Admin-triggered imports always run in admin_upsert mode so that content
    // created manually in the admin UI is overwritten on re-import instead of
    // being silently skipped because of a different `source` column value.
    const summary = await this.certifCoursesImportService.importFromPayload(
      payload as any,
      'admin_upsert',
      { dryRun },
    );

    if (dryRun) {
      return {
        dryRun: true,
        import: summary,
        indexing: { status: 'pending' },
      };
    }

    try {
      const indexing = await this.contentIndexerService.syncAll(false);
      return {
        dryRun: false,
        import: summary,
        indexing: { status: 'completed', details: indexing },
      };
    } catch (error) {
      return {
        dryRun: false,
        import: summary,
        indexing: {
          status: 'failed',
          details: error instanceof Error ? error.message : 'Unknown indexing error',
        },
      };
    }
  }
}

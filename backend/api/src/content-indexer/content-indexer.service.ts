import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Course } from '../courses/entities/course.entity';
import { CourseModule as CourseModuleEntity } from '../courses/entities/course-module.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Lab } from '../labs/entities/lab.entity';
import { Certification } from '../certifications/entities/certification.entity';
import { EmbeddingsService } from './embeddings.service';
import { IndexSchemaService } from './index-schema.service';
import { chunkText } from './chunker';

interface AzureSearchDoc {
  '@search.action': 'mergeOrUpload' | 'delete';
  id: string;
  course_id?: string;
  cloud_provider?: string;
  source_file?: string;
  texte?: string;
  vecteur?: number[];
  [k: string]: unknown;
}

export interface SyncSummary {
  indexed: number;
  courses: number;
  labs: number;
  certifications: number;
  skipped: boolean;
  reason?: string;
}

export interface IndexEntityResult {
  ok: boolean;
  scope: 'course' | 'lab' | 'certification';
  scopeKey: string;
  chunks: number;
  embedded: number;
  uploaded: number;
  deletedStale: number;
  durationMs: number;
  error?: string;
}

@Injectable()
export class ContentIndexerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContentIndexerService.name);
  private lastSyncAt: Date | null = null;
  private lastSyncSummary: SyncSummary | null = null;
  private lastErrors: Array<{
    scope: 'course' | 'lab' | 'certification';
    scopeKey: string;
    message: string;
    at: Date;
  }> = [];

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseModuleEntity)
    private readonly moduleRepository: Repository<CourseModuleEntity>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Lab)
    private readonly labRepository: Repository<Lab>,
    @InjectRepository(Certification)
    private readonly certificationRepository: Repository<Certification>,
    private readonly embeddings: EmbeddingsService,
    private readonly indexSchema: IndexSchemaService,
  ) {}

  // Mutex: prevent two syncAll jobs from running at the same time.
  private syncInProgress = false;

  // ─── Boot hook: index unindexed content in the background after startup ────

  onApplicationBootstrap(): void {
    if (!this.isAzureConfigured()) return;
    // Delay 30 s so the HTTP server is fully up before hammering the embed API.
    setTimeout(() => {
      this.syncAfterContentImport().catch((e) =>
        this.logger.error('Boot-time background indexing failed', e instanceof Error ? e.stack : String(e)),
      );
    }, 30_000);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async syncUnindexedContent(): Promise<SyncSummary> {
    return this.syncAll(false);
  }

  async syncAfterContentImport(): Promise<SyncSummary> {
    if (!this.isAzureConfigured()) {
      const requireIdx = process.env.REQUIRE_CONTENT_INDEXING === 'true';
      const msg =
        'Content imported but AI indexing skipped: Azure Search or Azure OpenAI env vars are missing.';
      this.logger.warn(msg);
      if (requireIdx) throw new Error(msg);
      return {
        indexed: 0,
        courses: 0,
        labs: 0,
        certifications: 0,
        skipped: true,
        reason: 'missing_azure_search',
      };
    }
    try {
      return await this.syncAll(false);
    } catch (e) {
      const requireIdx = process.env.REQUIRE_CONTENT_INDEXING === 'true';
      if (requireIdx) throw e;
      this.logger.warn(
        `Content imported but AI indexing failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return {
        indexed: 0,
        courses: 0,
        labs: 0,
        certifications: 0,
        skipped: true,
        reason: 'indexing_error',
      };
    }
  }

  async syncAll(force = false): Promise<SyncSummary> {
    if (this.syncInProgress) {
      this.logger.warn('[syncAll] Another sync is already running — skipping this request to prevent concurrent indexing.');
      return {
        indexed: 0,
        courses: 0,
        labs: 0,
        certifications: 0,
        skipped: true,
        reason: 'sync_already_running',
      };
    }
    this.syncInProgress = true;
    try {
      return await this._syncAll(force);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async _syncAll(force = false): Promise<SyncSummary> {
    if (!this.isAzureConfigured()) {
      const summary: SyncSummary = {
        indexed: 0,
        courses: 0,
        labs: 0,
        certifications: 0,
        skipped: true,
        reason: 'missing_azure_search',
      };
      this.lastSyncAt = new Date();
      this.lastSyncSummary = summary;
      return summary;
    }

    await this.indexSchema.ensureCourseIdField();

    const [coursesPending, labsPending, certsPending] = await Promise.all([
      this.getCoursesToIndex(force),
      this.getLabsToIndex(force),
      this.getCertificationsToIndex(force),
    ]);

    let totalDocs = 0;
    let okCourses = 0;
    let okLabs = 0;
    let okCerts = 0;

    // Small inter-entity pause to stay under Azure OpenAI S0 embedding rate limits.
    const INTER_ENTITY_DELAY_MS = 2000;

    for (const course of coursesPending) {
      const r = await this.indexCourseEntity(course).catch((e) => {
        this.recordError(
          'course',
          course.courseId,
          e instanceof Error ? e.message : String(e),
        );
        return null;
      });
      if (r?.ok) {
        okCourses++;
        totalDocs += r.uploaded;
      }
      await new Promise((res) => setTimeout(res, INTER_ENTITY_DELAY_MS));
    }
    for (const lab of labsPending) {
      const r = await this.indexLabEntity(lab).catch((e) => {
        this.recordError(
          'lab',
          lab.slug ?? String(lab.id),
          e instanceof Error ? e.message : String(e),
        );
        return null;
      });
      if (r?.ok) {
        okLabs++;
        totalDocs += r.uploaded;
      }
      await new Promise((res) => setTimeout(res, INTER_ENTITY_DELAY_MS));
    }
    for (const cert of certsPending) {
      const r = await this.indexCertificationEntity(cert).catch((e) => {
        this.recordError(
          'certification',
          String(cert.id),
          e instanceof Error ? e.message : String(e),
        );
        return null;
      });
      if (r?.ok) {
        okCerts++;
        totalDocs += r.uploaded;
      }
      await new Promise((res) => setTimeout(res, INTER_ENTITY_DELAY_MS));
    }

    const summary: SyncSummary = {
      indexed: totalDocs,
      courses: okCourses,
      labs: okLabs,
      certifications: okCerts,
      skipped: totalDocs === 0 && coursesPending.length === 0 && labsPending.length === 0 && certsPending.length === 0,
    };
    this.lastSyncAt = new Date();
    this.lastSyncSummary = summary;
    return summary;
  }

  @Cron('0 2 * * *')
  async scheduledSync(): Promise<void> {
    try {
      await this.syncAll(false);
    } catch (error) {
      this.logger.error(
        'Scheduled content indexer sync failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async getStatus() {
    const [pendingCourses, pendingLabs, pendingCertifications] = await Promise.all([
      this.getCoursesToIndex(false).then((r) => r.length),
      this.getLabsToIndex(false).then((r) => r.length),
      this.getCertificationsToIndex(false).then((r) => r.length),
    ]);
    return {
      lastSyncAt: this.lastSyncAt,
      lastSyncSummary: this.lastSyncSummary,
      pending: {
        courses: pendingCourses,
        labs: pendingLabs,
        certifications: pendingCertifications,
        total: pendingCourses + pendingLabs + pendingCertifications,
      },
      lastErrors: this.lastErrors.slice(-20),
      schema: this.indexSchema.getLastResult(),
      embeddingsConfigured: this.embeddings.isConfigured(),
    };
  }

  /** Per-entity status lists for the admin UI. */
  async getCoursesStatus() {
    const rows = await this.courseRepository.find({ order: { id: 'ASC' } });
    return rows.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      title: r.title,
      indexed: !!r.azureSearchIndexedAt,
      documentCount: r.azureSearchDocumentCount ?? 0,
      lastIndexedAt: r.azureSearchIndexedAt ?? null,
      lastError: r.azureSearchLastError ?? null,
      pending:
        !r.azureSearchIndexedAt ||
        (r.updatedAt && r.azureSearchIndexedAt && r.updatedAt > r.azureSearchIndexedAt),
    }));
  }

  async getLabsStatus() {
    const rows = await this.labRepository.find({ order: { id: 'ASC' } });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      indexed: !!r.azureSearchIndexedAt,
      documentCount: r.azureSearchDocumentCount ?? 0,
      lastIndexedAt: r.azureSearchIndexedAt ?? null,
      lastError: r.azureSearchLastError ?? null,
      pending:
        !r.azureSearchIndexedAt ||
        (r.updatedAt && r.azureSearchIndexedAt && r.updatedAt > r.azureSearchIndexedAt),
    }));
  }

  async getCertificationsStatus() {
    const rows = await this.certificationRepository.find({ order: { id: 'ASC' } });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      provider: r.provider,
      indexed: !!r.azureSearchIndexedAt,
      documentCount: r.azureSearchDocumentCount ?? 0,
      lastIndexedAt: r.azureSearchIndexedAt ?? null,
      lastError: r.azureSearchLastError ?? null,
      pending:
        !r.azureSearchIndexedAt ||
        (r.updatedAt && r.azureSearchIndexedAt && r.updatedAt > r.azureSearchIndexedAt),
    }));
  }

  async reindexCourse(courseId: string): Promise<IndexEntityResult> {
    const course = await this.courseRepository.findOne({ where: { courseId } });
    if (!course) {
      return this.failResult('course', courseId, 'course_not_found');
    }
    await this.indexSchema.ensureCourseIdField();
    return this.indexCourseEntity(course);
  }

  async reindexLab(slug: string): Promise<IndexEntityResult> {
    const lab = await this.labRepository.findOne({ where: { slug } });
    if (!lab) {
      return this.failResult('lab', slug, 'lab_not_found');
    }
    await this.indexSchema.ensureCourseIdField();
    return this.indexLabEntity(lab);
  }

  async reindexCertification(id: number): Promise<IndexEntityResult> {
    const cert = await this.certificationRepository.findOne({ where: { id } });
    if (!cert) {
      return this.failResult('certification', String(id), 'certification_not_found');
    }
    await this.indexSchema.ensureCourseIdField();
    return this.indexCertificationEntity(cert);
  }

  /**
   * Run the same Azure Search query the tutor uses, scoped to one entity, so the
   * admin can verify the tutor will actually find content.
   */
  async testRetrieval(
    scope: 'course' | 'lab' | 'certification',
    scopeKey: string,
    query?: string,
  ): Promise<{
    filterApplied: string | null;
    indexHealthy: boolean;
    totalReturned: number;
    results: Array<{ id: string; sourceFile?: string; score?: number; snippet: string }>;
    fallbackUsed: boolean;
  }> {
    if (!this.isAzureConfigured() || !this.embeddings.isConfigured()) {
      return {
        filterApplied: null,
        indexHealthy: false,
        totalReturned: 0,
        results: [],
        fallbackUsed: false,
      };
    }

    let resolvedScopeKey = scopeKey;
    let q = query?.trim() || '';
    if (!q) {
      if (scope === 'course') {
        const c = await this.courseRepository.findOne({
          where: { courseId: scopeKey },
        });
        q = c?.title ?? scopeKey;
      } else if (scope === 'lab') {
        const l = await this.labRepository.findOne({ where: { slug: scopeKey } });
        q = l?.title ?? scopeKey;
      } else {
        const id = Number(scopeKey);
        const c = Number.isFinite(id)
          ? await this.certificationRepository.findOne({ where: { id } })
          : null;
        q = c?.title ?? scopeKey;
        resolvedScopeKey = String(id);
      }
    }

    let filter: string | null = null;
    if (scope === 'course') {
      filter = `course_id eq '${this.escapeOData(resolvedScopeKey)}'`;
    } else if (scope === 'lab') {
      filter = `course_id eq '${this.escapeOData(resolvedScopeKey)}'`;
    } else if (scope === 'certification') {
      filter = `course_id eq '${this.escapeOData(`cert:${resolvedScopeKey}`)}'`;
    }

    const vector = await this.embeddings.embed(q);
    let results = await this.azureVectorSearch(vector, filter, 5);
    let fallbackUsed = false;
    if (!results.length && filter) {
      this.logger.warn(
        `[testRetrieval] no results for ${filter}; falling back to global search`,
      );
      results = await this.azureVectorSearch(vector, null, 5);
      fallbackUsed = true;
    }

    return {
      filterApplied: filter,
      indexHealthy: true,
      totalReturned: results.length,
      results: results.map((r) => ({
        id: r.id,
        sourceFile: typeof r.source_file === 'string' ? r.source_file : undefined,
        score: typeof r['@search.score'] === 'number' ? r['@search.score'] : undefined,
        snippet: String(r.texte ?? '').slice(0, 320),
      })),
      fallbackUsed,
    };
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private isAzureConfigured(): boolean {
    return Boolean(
      process.env.AZURE_SEARCH_ENDPOINT &&
        process.env.AZURE_SEARCH_API_KEY &&
        this.embeddings.isConfigured(),
    );
  }

  private async getCoursesToIndex(force: boolean): Promise<Course[]> {
    if (force) return this.courseRepository.find();
    return this.courseRepository
      .find({
        where: [
          { azureSearchIndexedAt: IsNull() },
          { updatedAt: MoreThan(new Date(0)) },
        ],
      })
      .then((rows) =>
        rows.filter(
          (r) =>
            !r.azureSearchIndexedAt ||
            (r.updatedAt && r.updatedAt > r.azureSearchIndexedAt),
        ),
      );
  }

  private async getLabsToIndex(force: boolean): Promise<Lab[]> {
    if (force) return this.labRepository.find();
    return this.labRepository
      .find({
        where: [
          { azureSearchIndexedAt: IsNull() },
          { updatedAt: MoreThan(new Date(0)) },
        ],
      })
      .then((rows) =>
        rows.filter(
          (r) =>
            !r.azureSearchIndexedAt ||
            (r.updatedAt && r.updatedAt > r.azureSearchIndexedAt),
        ),
      );
  }

  private async getCertificationsToIndex(force: boolean): Promise<Certification[]> {
    if (force) return this.certificationRepository.find();
    return this.certificationRepository
      .find({
        where: [
          { azureSearchIndexedAt: IsNull() },
          { updatedAt: MoreThan(new Date(0)) },
        ],
      })
      .then((rows) =>
        rows.filter(
          (r) =>
            !r.azureSearchIndexedAt ||
            (r.updatedAt && r.updatedAt > r.azureSearchIndexedAt),
        ),
      );
  }

  // ── Per-entity indexing ───────────────────────────────────────────────────

  private async indexCourseEntity(course: Course): Promise<IndexEntityResult> {
    const t0 = Date.now();
    const scopeKey = course.courseId;
    this.logger.log(
      `[indexCourse] start id=${course.id} courseId=${scopeKey} title="${course.title}"`,
    );

    try {
      const modules = await this.moduleRepository.find({
        where: { courseId: course.id },
        relations: ['lessons'],
        order: { moduleOrder: 'ASC' },
      });

      let lessonCount = 0;
      const chunkSpecs: Array<{ id: string; sourceFile: string; text: string }> = [];

      const summary = [
        course.title,
        course.description ?? '',
        ...(course.objectives ?? []),
      ]
        .filter(Boolean)
        .join('\n');
      if (summary.trim()) {
        chunkSpecs.push({
          id: `course-${scopeKey}-summary-0`,
          sourceFile: `db:courses:${scopeKey}`,
          text: summary,
        });
      }

      for (const mod of modules) {
        const lessons = (mod.lessons ?? []).slice().sort(
          (a, b) => a.lessonOrder - b.lessonOrder,
        );
        for (const lesson of lessons) {
          lessonCount++;
          const lessonText = [
            mod.title ? `Module: ${mod.title}` : '',
            lesson.title ? `Leçon: ${lesson.title}` : '',
            lesson.content ?? '',
            (lesson.bullets ?? []).join('\n'),
            (lesson.keyPoints ?? []).join('\n'),
            lesson.analogy ?? '',
          ]
            .filter(Boolean)
            .join('\n');
          const pieces = chunkText(lessonText);
          for (const c of pieces) {
            chunkSpecs.push({
              id: `course-${scopeKey}-lesson-${lesson.id}-${c.index}`,
              sourceFile: `db:lessons:${scopeKey}:${lesson.id}`,
              text: c.text,
            });
          }
        }
      }

      this.logger.log(
        `[indexCourse] courseId=${scopeKey} modules=${modules.length} lessons=${lessonCount} chunks=${chunkSpecs.length}`,
      );

      const deletedStale = await this.deleteStaleByCourseId(scopeKey);
      // Also clean up the legacy single-doc id from the old indexer.
      await this.pushDocuments([
        { '@search.action': 'delete', id: `course-${course.id}` },
      ]);

      if (chunkSpecs.length === 0) {
        await this.courseRepository.update(course.id, {
          azureSearchIndexedAt: new Date(),
          azureSearchDocumentCount: 0,
          azureSearchLastError: null,
        });
        this.logger.log(
          `[indexCourse] courseId=${scopeKey} done (no content) deletedStale=${deletedStale}`,
        );
        return {
          ok: true,
          scope: 'course',
          scopeKey,
          chunks: 0,
          embedded: 0,
          uploaded: 0,
          deletedStale,
          durationMs: Date.now() - t0,
        };
      }

      const vectors = await this.embeddings.embedBatch(chunkSpecs.map((s) => s.text));
      this.logger.log(
        `[indexCourse] courseId=${scopeKey} embedded=${vectors.length}`,
      );

      const docs: AzureSearchDoc[] = chunkSpecs.map((s, i) => ({
        '@search.action': 'mergeOrUpload',
        id: s.id,
        course_id: scopeKey,
        cloud_provider: this.normalizeProvider(course.courseId),
        source_file: s.sourceFile,
        texte: s.text,
        vecteur: vectors[i],
      }));

      const uploaded = await this.uploadInBatches(docs);
      this.logger.log(
        `[indexCourse] courseId=${scopeKey} uploaded=${uploaded} deletedStale=${deletedStale}`,
      );

      await this.courseRepository.update(course.id, {
        azureSearchIndexedAt: new Date(),
        azureSearchDocumentCount: uploaded,
        azureSearchLastError: null,
      });

      return {
        ok: true,
        scope: 'course',
        scopeKey,
        chunks: chunkSpecs.length,
        embedded: vectors.length,
        uploaded,
        deletedStale,
        durationMs: Date.now() - t0,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.courseRepository
        .update(course.id, { azureSearchLastError: message })
        .catch(() => undefined);
      this.recordError('course', scopeKey, message);
      this.logger.error(
        `[indexCourse] courseId=${scopeKey} FAILED: ${message}`,
        e instanceof Error ? e.stack : undefined,
      );
      return {
        ok: false,
        scope: 'course',
        scopeKey,
        chunks: 0,
        embedded: 0,
        uploaded: 0,
        deletedStale: 0,
        durationMs: Date.now() - t0,
        error: message,
      };
    }
  }

  private async indexLabEntity(lab: Lab): Promise<IndexEntityResult> {
    const t0 = Date.now();
    const scopeKey = lab.slug ?? `lab-${lab.id}`;
    this.logger.log(
      `[indexLab] start id=${lab.id} slug=${scopeKey} title="${lab.title ?? ''}"`,
    );

    try {
      const taskList = (lab.tasks ?? []).filter(Boolean);
      const stepLines: string[] = [];
      for (const step of lab.steps ?? []) {
        if (!step) continue;
        stepLines.push(
          [step.title, step.instruction, step.hint, step.validationNote]
            .filter(Boolean)
            .join('\n'),
        );
      }
      const fullText = [
        lab.title ? `Lab: ${lab.title}` : '',
        lab.description ?? '',
        taskList.length ? `Tâches:\n${taskList.join('\n')}` : '',
        stepLines.length ? `Étapes:\n${stepLines.join('\n\n')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');
      const chunks = chunkText(fullText);

      this.logger.log(
        `[indexLab] slug=${scopeKey} chunks=${chunks.length} tasks=${taskList.length}`,
      );

      const deletedStale = await this.deleteStaleByCourseId(scopeKey);
      await this.pushDocuments([
        { '@search.action': 'delete', id: `lab-${lab.id}` },
      ]);

      if (chunks.length === 0) {
        await this.labRepository.update(lab.id, {
          azureSearchIndexedAt: new Date(),
          azureSearchDocumentCount: 0,
          azureSearchLastError: null,
        });
        return {
          ok: true,
          scope: 'lab',
          scopeKey,
          chunks: 0,
          embedded: 0,
          uploaded: 0,
          deletedStale,
          durationMs: Date.now() - t0,
        };
      }

      const vectors = await this.embeddings.embedBatch(chunks.map((c) => c.text));
      const docs: AzureSearchDoc[] = chunks.map((c, i) => ({
        '@search.action': 'mergeOrUpload',
        id: `lab-${scopeKey}-${c.index}`,
        course_id: scopeKey,
        cloud_provider: this.normalizeProvider(lab.slug ?? lab.provider),
        source_file: `db:labs:${scopeKey}`,
        texte: c.text,
        vecteur: vectors[i],
      }));
      const uploaded = await this.uploadInBatches(docs);
      this.logger.log(
        `[indexLab] slug=${scopeKey} uploaded=${uploaded} deletedStale=${deletedStale}`,
      );

      await this.labRepository.update(lab.id, {
        azureSearchIndexedAt: new Date(),
        azureSearchDocumentCount: uploaded,
        azureSearchLastError: null,
      });

      return {
        ok: true,
        scope: 'lab',
        scopeKey,
        chunks: chunks.length,
        embedded: vectors.length,
        uploaded,
        deletedStale,
        durationMs: Date.now() - t0,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.labRepository
        .update(lab.id, { azureSearchLastError: message })
        .catch(() => undefined);
      this.recordError('lab', scopeKey, message);
      this.logger.error(
        `[indexLab] slug=${scopeKey} FAILED: ${message}`,
        e instanceof Error ? e.stack : undefined,
      );
      return {
        ok: false,
        scope: 'lab',
        scopeKey,
        chunks: 0,
        embedded: 0,
        uploaded: 0,
        deletedStale: 0,
        durationMs: Date.now() - t0,
        error: message,
      };
    }
  }

  private async indexCertificationEntity(
    cert: Certification,
  ): Promise<IndexEntityResult> {
    const t0 = Date.now();
    const scopeKey = `cert:${cert.id}`;
    this.logger.log(
      `[indexCertification] start id=${cert.id} title="${cert.title}"`,
    );

    try {
      const fullText = [
        cert.title ? `Certification: ${cert.title}` : '',
        cert.provider ? `Fournisseur: ${cert.provider}` : '',
        cert.examCode ? `Code examen: ${cert.examCode}` : '',
        cert.description ?? '',
        (cert.finalExamTips ?? []).join('\n'),
      ]
        .filter(Boolean)
        .join('\n');
      const chunks = chunkText(fullText);

      this.logger.log(
        `[indexCertification] id=${cert.id} chunks=${chunks.length}`,
      );

      const deletedStale = await this.deleteStaleByCourseId(scopeKey);
      await this.pushDocuments([
        { '@search.action': 'delete', id: `certification-${cert.id}` },
      ]);

      if (chunks.length === 0) {
        await this.certificationRepository.update(cert.id, {
          azureSearchIndexedAt: new Date(),
          azureSearchDocumentCount: 0,
          azureSearchLastError: null,
        });
        return {
          ok: true,
          scope: 'certification',
          scopeKey: String(cert.id),
          chunks: 0,
          embedded: 0,
          uploaded: 0,
          deletedStale,
          durationMs: Date.now() - t0,
        };
      }

      const vectors = await this.embeddings.embedBatch(chunks.map((c) => c.text));
      const docs: AzureSearchDoc[] = chunks.map((c, i) => ({
        '@search.action': 'mergeOrUpload',
        id: `cert-${cert.id}-${c.index}`,
        course_id: scopeKey,
        cloud_provider: this.normalizeProvider(cert.provider),
        source_file: `db:certifications:${cert.id}`,
        texte: c.text,
        vecteur: vectors[i],
      }));
      const uploaded = await this.uploadInBatches(docs);
      this.logger.log(
        `[indexCertification] id=${cert.id} uploaded=${uploaded} deletedStale=${deletedStale}`,
      );

      await this.certificationRepository.update(cert.id, {
        azureSearchIndexedAt: new Date(),
        azureSearchDocumentCount: uploaded,
        azureSearchLastError: null,
      });

      return {
        ok: true,
        scope: 'certification',
        scopeKey: String(cert.id),
        chunks: chunks.length,
        embedded: vectors.length,
        uploaded,
        deletedStale,
        durationMs: Date.now() - t0,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.certificationRepository
        .update(cert.id, { azureSearchLastError: message })
        .catch(() => undefined);
      this.recordError('certification', String(cert.id), message);
      this.logger.error(
        `[indexCertification] id=${cert.id} FAILED: ${message}`,
        e instanceof Error ? e.stack : undefined,
      );
      return {
        ok: false,
        scope: 'certification',
        scopeKey: String(cert.id),
        chunks: 0,
        embedded: 0,
        uploaded: 0,
        deletedStale: 0,
        durationMs: Date.now() - t0,
        error: message,
      };
    }
  }

  // ── Azure Search REST helpers ─────────────────────────────────────────────

  private getSearchBase(): { baseUrl: string; apiKey: string } | null {
    const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const apiKey = process.env.AZURE_SEARCH_API_KEY;
    const indexName =
      process.env.AZURE_SEARCH_INDEX_NAME || 'index-subul-semantic-v2';
    if (!endpoint || !apiKey) return null;
    return {
      baseUrl: `${endpoint.replace(/\/$/, '')}/indexes/${indexName}`,
      apiKey,
    };
  }

  private async deleteStaleByCourseId(courseIdValue: string): Promise<number> {
    const base = this.getSearchBase();
    if (!base) return 0;
    const ids: string[] = [];
    let skip = 0;
    const TOP = 1000;
    const filter = `course_id eq '${this.escapeOData(courseIdValue)}'`;

    while (true) {
      let res: Response;
      try {
        res = await fetch(
          `${base.baseUrl}/docs/search?api-version=2023-11-01`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': base.apiKey,
            },
            body: JSON.stringify({
              search: '*',
              filter,
              select: 'id',
              top: TOP,
              skip,
            }),
          },
        );
      } catch (e) {
        this.logger.warn(
          `[deleteStale] network error for ${courseIdValue}: ${e instanceof Error ? e.message : String(e)}`,
        );
        return ids.length;
      }
      if (!res.ok) {
        // Likely 400 because course_id isn't filterable yet (index ensure
        // hadn't run). Return and let upload proceed; legacy ids will be
        // overwritten on next sync.
        const body = await res.text();
        this.logger.warn(
          `[deleteStale] search returned ${res.status} for filter ${filter}: ${body}`,
        );
        return ids.length;
      }
      const json = (await res.json()) as { value?: Array<{ id: string }> };
      const batch = json.value ?? [];
      ids.push(...batch.map((b) => b.id));
      if (batch.length < TOP) break;
      skip += TOP;
      if (skip >= 100_000) break;
    }
    if (!ids.length) return 0;

    const deletes: AzureSearchDoc[] = ids.map((id) => ({
      '@search.action': 'delete',
      id,
    }));
    await this.uploadInBatches(deletes);
    return ids.length;
  }

  private async uploadInBatches(docs: AzureSearchDoc[]): Promise<number> {
    if (!docs.length) return 0;
    const BATCH = 100;
    let uploaded = 0;
    for (let i = 0; i < docs.length; i += BATCH) {
      const slice = docs.slice(i, i + BATCH);
      const ok = await this.pushDocuments(slice);
      if (ok) uploaded += slice.filter((d) => d['@search.action'] !== 'delete').length;
    }
    return uploaded;
  }

  private async pushDocuments(docs: AzureSearchDoc[]): Promise<boolean> {
    const base = this.getSearchBase();
    if (!base) {
      this.logger.warn(
        'Skipping content indexing: AZURE_SEARCH_ENDPOINT or AZURE_SEARCH_API_KEY missing.',
      );
      return false;
    }
    const url = `${base.baseUrl}/docs/index?api-version=2023-11-01`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': base.apiKey },
      body: JSON.stringify({ value: docs }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Azure Search indexing failed (${response.status}): ${body}`);
    }
    return true;
  }

  private async azureVectorSearch(
    vector: number[],
    filter: string | null,
    top: number,
  ): Promise<Array<Record<string, unknown> & { id: string }>> {
    const base = this.getSearchBase();
    if (!base) return [];
    const url = `${base.baseUrl}/docs/search?api-version=2023-11-01`;
    const body: Record<string, unknown> = {
      vectorQueries: [{ vector, k: top, fields: 'vecteur', kind: 'vector' }],
      select: 'id, source_file, texte, course_id',
      top,
    };
    if (filter) body.filter = filter;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': base.apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Azure Search vector search failed (${res.status}): ${errBody}`);
    }
    const json = (await res.json()) as { value?: Array<Record<string, unknown> & { id: string }> };
    return json.value ?? [];
  }

  // ── Misc helpers ──────────────────────────────────────────────────────────

  private normalizeProvider(raw?: string | null): 'AWS' | 'AZURE' {
    const v = (raw ?? '').toLowerCase();
    if (v.includes('aws') || v.includes('amazon')) return 'AWS';
    return 'AZURE';
  }

  private escapeOData(value: string): string {
    return value.replace(/'/g, "''");
  }

  private failResult(
    scope: 'course' | 'lab' | 'certification',
    scopeKey: string,
    message: string,
  ): IndexEntityResult {
    this.recordError(scope, scopeKey, message);
    return {
      ok: false,
      scope,
      scopeKey,
      chunks: 0,
      embedded: 0,
      uploaded: 0,
      deletedStale: 0,
      durationMs: 0,
      error: message,
    };
  }

  private recordError(
    scope: 'course' | 'lab' | 'certification',
    scopeKey: string,
    message: string,
  ) {
    this.lastErrors.push({ scope, scopeKey, message, at: new Date() });
    if (this.lastErrors.length > 100) {
      this.lastErrors = this.lastErrors.slice(-50);
    }
  }
}

import { api, API_PATHS } from '@/lib/api/client';

export interface ContentIndexerStatus {
  lastSyncAt: string | null;
  lastSyncSummary: {
    indexed: number;
    courses: number;
    labs: number;
    certifications: number;
    skipped: boolean;
  } | null;
  pending: {
    courses: number;
    labs: number;
    certifications: number;
    total: number;
  };
  lastErrors?: Array<{
    scope: 'course' | 'lab' | 'certification';
    scopeKey: string;
    message: string;
    at: string;
  }>;
  schema?: {
    checked: boolean;
    added: boolean;
    reason?: string;
    indexName: string;
  } | null;
  embeddingsConfigured?: boolean;
}

export interface CourseIndexStatus {
  id: number;
  courseId: string;
  title: string;
  indexed: boolean;
  documentCount: number;
  lastIndexedAt: string | null;
  lastError: string | null;
  pending: boolean;
}

export interface LabIndexStatus {
  id: number;
  slug: string;
  title: string;
  indexed: boolean;
  documentCount: number;
  lastIndexedAt: string | null;
  lastError: string | null;
  pending: boolean;
}

export interface CertificationIndexStatus {
  id: number;
  title: string;
  provider: string;
  indexed: boolean;
  documentCount: number;
  lastIndexedAt: string | null;
  lastError: string | null;
  pending: boolean;
}

export interface ReindexResult {
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

export interface RetrievalTestResult {
  filterApplied: string | null;
  indexHealthy: boolean;
  totalReturned: number;
  fallbackUsed: boolean;
  results: Array<{
    id: string;
    sourceFile?: string;
    score?: number;
    snippet: string;
  }>;
}

export const getContentIndexerStatus = () =>
  api
    .get<ContentIndexerStatus>(API_PATHS.admin('content-indexer/status'))
    .then((r) => r.data);

export const runContentIndexerSync = (force = false) =>
  api
    .post(API_PATHS.admin('content-indexer/sync'), { force })
    .then((r) => r.data);

export const getCoursesIndexStatus = () =>
  api
    .get<CourseIndexStatus[]>(API_PATHS.admin('content-indexer/courses-status'))
    .then((r) => r.data);

export const getLabsIndexStatus = () =>
  api
    .get<LabIndexStatus[]>(API_PATHS.admin('content-indexer/labs-status'))
    .then((r) => r.data);

export const getCertificationsIndexStatus = () =>
  api
    .get<CertificationIndexStatus[]>(
      API_PATHS.admin('content-indexer/certifications-status'),
    )
    .then((r) => r.data);

export const reindexCourse = (courseId: string) =>
  api
    .post<ReindexResult>(
      API_PATHS.admin(`content-indexer/reindex/course/${encodeURIComponent(courseId)}`),
    )
    .then((r) => r.data);

export const reindexLab = (slug: string) =>
  api
    .post<ReindexResult>(
      API_PATHS.admin(`content-indexer/reindex/lab/${encodeURIComponent(slug)}`),
    )
    .then((r) => r.data);

export const reindexCertification = (id: number) =>
  api
    .post<ReindexResult>(
      API_PATHS.admin(`content-indexer/reindex/certification/${id}`),
    )
    .then((r) => r.data);

export const testRetrievalCourse = (courseId: string, query?: string) =>
  api
    .post<RetrievalTestResult>(
      API_PATHS.admin(
        `content-indexer/test-retrieval/course/${encodeURIComponent(courseId)}`,
      ),
      { query },
    )
    .then((r) => r.data);

export const testRetrievalLab = (slug: string, query?: string) =>
  api
    .post<RetrievalTestResult>(
      API_PATHS.admin(
        `content-indexer/test-retrieval/lab/${encodeURIComponent(slug)}`,
      ),
      { query },
    )
    .then((r) => r.data);

export const testRetrievalCertification = (id: number, query?: string) =>
  api
    .post<RetrievalTestResult>(
      API_PATHS.admin(`content-indexer/test-retrieval/certification/${id}`),
      { query },
    )
    .then((r) => r.data);

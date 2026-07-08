import { api, API_PATHS } from '@/lib/api/client';

export interface AdminCourseListItem {
  id: number;
  courseId: string;
  title: string;
  description?: string;
  level?: string;
  certificationId?: number;
  track?: 'cloud' | 'cyber' | 'ai' | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCourseModule {
  id?: number;
  moduleOrder: number;
  title: string;
  icon?: string;
  quiz?: Record<string, unknown>[];
  lessons: { id?: number; lessonOrder: number; title: string; content?: string; bullets?: string[] }[];
  labs: {
    id?: number;
    labOrder: number;
    labId?: string;
    title: string;
    objective?: string;
    learningObjectives?: string[];
    evaluationCriteria?: string[];
    durationMinutes?: number;
    difficultyLevel?: string;
    prerequisites?: string[];
    resources?: Record<string, unknown>[];
  }[];
}

export interface AdminCourseDetail {
  id: number;
  courseId: string;
  title: string;
  description?: string;
  level?: string;
  certificationId?: number;
  modules: AdminCourseModule[];
}

export interface CreateCoursePayload {
  courseId: string;
  title: string;
  description?: string;
  level?: string;
  certificationId?: number;
  modules?: AdminCourseModule[];
}

export interface PaginatedCoursesResponse {
  data: AdminCourseListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContentImportResponse {
  dryRun: boolean;
  import?: Record<string, unknown>;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: Array<{ index: number; reason: string; slug?: string; externalId?: string }>;
  indexing?: { status: 'pending' | 'completed' | 'failed'; details?: unknown };
}

export const getAdminCourses = (certificationId?: number, options?: { page?: number; limit?: number }): Promise<PaginatedCoursesResponse> => {
  const params: Record<string, string | number> = {};
  if (certificationId != null) params.certificationId = certificationId;
  if (options?.page) params.page = options.page;
  if (options?.limit) params.limit = options.limit;
  return api.get<PaginatedCoursesResponse>(API_PATHS.admin('courses'), { params }).then((r) => r.data);
};

export const getAdminCourse = (id: number | string): Promise<AdminCourseDetail> =>
  api.get<AdminCourseDetail>(API_PATHS.admin(`courses/${id}`)).then((r) => r.data);

export const createAdminCourse = (payload: CreateCoursePayload): Promise<AdminCourseDetail> =>
  api.post<AdminCourseDetail>(API_PATHS.admin('courses'), payload).then((r) => r.data);

export const updateAdminCourse = (
  id: number | string,
  payload: Partial<CreateCoursePayload>
): Promise<AdminCourseDetail> =>
  api.patch<AdminCourseDetail>(API_PATHS.admin(`courses/${id}`), payload).then((r) => r.data);

export const deleteAdminCourse = (id: number | string): Promise<{ deleted: boolean }> =>
  api.delete<{ deleted: boolean }>(API_PATHS.admin(`courses/${id}`)).then((r) => r.data);

export const importCoursesJson = (
  payload: Record<string, unknown>,
  dryRun = true,
): Promise<ContentImportResponse> =>
  api
    .post<ContentImportResponse>(API_PATHS.admin('content/import/courses-json'), { payload, dryRun })
    .then((r) => r.data);

export interface ContentValidationResponse {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
}

/** Validate the JSON shape only — no DB calls. Backend mirrors the same checks. */
export const validateCoursesJson = (
  payload: Record<string, unknown>,
): Promise<ContentValidationResponse> =>
  api
    .post<ContentValidationResponse>(API_PATHS.admin('content/import/courses-json/validate'), {
      payload,
    })
    .then((r) => r.data);

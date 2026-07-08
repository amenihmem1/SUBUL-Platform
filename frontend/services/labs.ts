import { api, API_PATHS } from '@/lib/api/client';

export type LabProvider = 'aws' | 'azure' | 'gcp' | 'nvidia';
export type LabDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type LabStatus = 'draft' | 'published' | 'archived';

export interface LabStep {
  title: string;
  instruction: string;
  hint?: string;
  validationNote?: string;
  estimatedMinutes?: number;
}

export interface PostLabQuizItem {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export type LabChapter = {
  title: string;
  estimatedMinutes: number;
  stepRange: [number, number];
};

export type LabMetadata = {
  level?: string;
  levelLabel?: string;
  index?: number;
  totalInLevel?: number;
  prevSlug?: string;
  nextSlug?: string;
  providerLoginUrl?: string;
  logo?: string;
  tags?: string[];
  learningObjectives?: string[];
  prerequisites?: string[];
  scenario?: string;
  costWarning?: string;
  sandboxUrl?: string;
  cleanupSteps?: string[];
  chapters?: LabChapter[];
  postLabQuiz?: PostLabQuizItem[];
  careerConnection?: string;
  certificationExternalId?: string;
  track?: string;
  environment?: string;
  domainAlignment?: string;
  sequence?: number;
};

export interface LabDto {
  id: number;
  slug: string;
  title: string | null;
  description: string | null;
  provider: LabProvider | null;
  difficulty: LabDifficulty | null;
  estimatedTime: string | null;
  estimatedDurationMinutes: number | null;
  moduleTitle: string | null;
  tasks: string[];
  steps: LabStep[] | null;
  metadata: LabMetadata | null;
  track: 'cloud' | 'cyber' | 'ai' | null;
  status: LabStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LabProgressDto {
  id: number;
  userId: number;
  labId: number;
  completedTasks: number[];
  isCompleted: boolean;
  startedAt: string | null;
  completedAt: string | null;
  notes: {
    taskNotes?: Record<number, string>;
    generalNotes?: string;
    quizScore?: number;
    quizTotal?: number;
    quizCompletedAt?: string;
  } | null;
  timeSpent: number;
  createdAt: string;
  updatedAt: string;
  lab?: LabDto;
}

export interface LabStatDto {
  labId: number;
  slug: string;
  title: string | null;
  totalStarts: number;
  totalCompletions: number;
  avgTimeSpent: number;
  completionRate: number;
}

export const getLabs = (track?: string): Promise<LabDto[]> =>
  api.get<LabDto[]>(API_PATHS.labs(), { params: track ? { track } : undefined }).then((r) => r.data);

export type LearnerLabsQuery = {
  fullCatalog?: boolean;
  track?: string;
};

/** Scoped labs for current learner (GET /api/learner/labs). */
export const getLearnerLabs = (opts?: LearnerLabsQuery): Promise<LabDto[]> => {
  const params: Record<string, string> = {};
  if (opts?.fullCatalog) params.fullCatalog = 'true';
  if (opts?.track) params.track = opts.track;
  return api
    .get<LabDto[]>(API_PATHS.learner('labs'), {
      params: Object.keys(params).length ? params : undefined,
    })
    .then((r) => r.data);
};

export const getLabBySlug = (slug: string, locale?: string): Promise<LabDto> =>
  api.get<LabDto>(API_PATHS.labs(slug), { params: locale ? { locale } : undefined }).then((r) => r.data);

export const getMyLabsProgress = (): Promise<LabProgressDto[]> =>
  api.get<LabProgressDto[]>(API_PATHS.labs('my/progress')).then((r) => r.data);

export const getLabProgress = (slug: string): Promise<LabProgressDto> =>
  api.get<LabProgressDto>(API_PATHS.labs(`${slug}/progress`)).then((r) => r.data);

export const updateLabProgress = (
  slug: string,
  data: {
    completedTasks: number[];
    timeSpent: number;
    isCompleted?: boolean;
    notes?: LabProgressDto['notes'];
  },
): Promise<LabProgressDto> =>
  api.post<LabProgressDto>(API_PATHS.labs(`${slug}/progress`), data).then((r) => r.data);

export const startLab = (slug: string): Promise<LabProgressDto> =>
  api.post<LabProgressDto>(API_PATHS.labs(`${slug}/start`), {}).then((r) => r.data);

// ─── Admin ───────────────────────────────────────────────────────────────────
export const getAdminLabs = (): Promise<LabDto[]> =>
  api.get<LabDto[]>(API_PATHS.labs('admin')).then((r) => r.data);

export const getLabStats = (): Promise<LabStatDto[]> =>
  api.get<LabStatDto[]>(API_PATHS.labs('stats')).then((r) => r.data);

export type CreateOrUpdateLabInput = Partial<
  Pick<
    LabDto,
    | 'slug'
    | 'title'
    | 'description'
    | 'provider'
    | 'difficulty'
    | 'estimatedTime'
    | 'estimatedDurationMinutes'
    | 'moduleTitle'
    | 'tasks'
    | 'steps'
    | 'metadata'
    | 'status'
    | 'track'
  >
>;

export const createLab = (data: CreateOrUpdateLabInput): Promise<LabDto> =>
  api.post<LabDto>(API_PATHS.labs(), data).then((r) => r.data);

export const updateLab = (slug: string, data: CreateOrUpdateLabInput): Promise<LabDto> =>
  api.patch<LabDto>(API_PATHS.labs(slug), data).then((r) => r.data);

export const deleteLab = (slug: string): Promise<{ message: string }> =>
  api.delete<{ message: string }>(API_PATHS.labs(slug)).then((r) => r.data);

export interface PaginatedAdminLabsResponse {
  data: LabDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getAdminContentLabs = (params?: { page?: number; limit?: number; search?: string }) =>
  api
    .get<PaginatedAdminLabsResponse>(API_PATHS.admin('content/labs'), { params })
    .then((r) => r.data);

export const createAdminContentLab = (data: CreateOrUpdateLabInput): Promise<LabDto> =>
  api.post<LabDto>(API_PATHS.admin('content/labs'), data).then((r) => r.data);

export const updateAdminContentLab = (slug: string, data: CreateOrUpdateLabInput): Promise<LabDto> =>
  api.patch<LabDto>(API_PATHS.admin(`content/labs/${slug}`), data).then((r) => r.data);

export const deleteAdminContentLab = (slug: string): Promise<{ deleted: boolean; slug: string }> =>
  api.delete<{ deleted: boolean; slug: string }>(API_PATHS.admin(`content/labs/${slug}`)).then((r) => r.data);

export const importLabsJson = (payload: Array<Record<string, unknown>>, dryRun = true) =>
  api
    .post(API_PATHS.admin('content/import/labs-json'), { payload, dryRun })
    .then((r) => r.data);

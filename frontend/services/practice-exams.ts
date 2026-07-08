import { api, API_PATHS } from '@/lib/api/client';

export interface PracticeExamQuestionInput {
  externalId?: string;
  questionOrder?: number;
  prompt: string;
  options: Array<{ id: string; text: string }> | string[];
  correct: string[];
  explanation?: string;
  domain?: string;
  difficulty?: string;
}

export interface PracticeExamItem {
  slug: string;
  title: string;
  description?: string | null;
  certificationId?: number | null;
  durationMinutes?: number;
  passingScore?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
  externalId?: string;
  questions?: PracticeExamQuestionInput[];
}

export const getAdminPracticeExams = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'draft' | 'published' | 'archived';
  certificationId?: number;
}) => api.get(API_PATHS.admin('content/practice-exams'), { params }).then((r) => r.data);

export const createAdminPracticeExam = (payload: PracticeExamItem) =>
  api.post(API_PATHS.admin('content/practice-exams'), payload).then((r) => r.data);

export const updateAdminPracticeExam = (slug: string, payload: Partial<PracticeExamItem>) =>
  api.patch(API_PATHS.admin(`content/practice-exams/${slug}`), payload).then((r) => r.data);

export const deleteAdminPracticeExam = (slug: string) =>
  api.delete(API_PATHS.admin(`content/practice-exams/${slug}`)).then((r) => r.data);

export const importPracticeExamsJson = (payload: Array<Record<string, unknown>>, dryRun = true) =>
  api.post(API_PATHS.admin('content/import/practice-exams-json'), { payload, dryRun }).then((r) => r.data);

export const listLearnerPracticeExams = () => api.get('/api/practice-exams').then((r) => r.data);
export const getLearnerPracticeExamSession = (slug: string, locale?: string) =>
  api.get(`/api/practice-exams/${slug}/session`, { params: locale ? { locale } : undefined }).then((r) => r.data);
export const submitLearnerPracticeExam = (
  slug: string,
  payload: { answers: Record<string, string | string[]>; timeSpent?: string },
) => api.post(`/api/practice-exams/${slug}/submit`, payload).then((r) => r.data);
export const getLearnerPracticeExamAttempts = (slug: string) =>
  api.get(`/api/practice-exams/${slug}/attempts`).then((r) => r.data);

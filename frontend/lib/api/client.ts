/**
 * Central API - axios instance and path constants.
 * All NestJS requests use this. No proxy, no rewrites.
 */
import axiosInstance from './axios';

export { getBackendUrl } from './axios';

/** Named + default export for `import api from '…'` and `import { api } from '…'`. */
export const api = axiosInstance;
export default axiosInstance;

/** Paths used by frontend - NestJS routes */
export const API_PATHS = {
  goals: (p?: string) => (p ? `/api/goals/${p}` : '/api/goals'),
  users: (p?: string) => (p ? `/api/users/${p}` : '/api/users'),
  admin: (p?: string) => (p ? `/api/admin/${p}` : '/api/admin'),
  courses: (p?: string) => (p ? `/api/courses/${p}` : '/api/courses'),
  roadmap: (p?: string) => (p ? `/api/roadmap/${p}` : '/api/roadmap'),
  quizResults: (p?: string) =>
    p ? `/api/quiz-results/${p}` : '/api/quiz-results',
  quiz: (p?: string) => (p ? `/api/quiz/${p}` : '/api/quiz'),
  auth: (p?: string) => (p ? `/api/auth/${p}` : '/api/auth'),
  cv: (p?: string) => (p ? `/api/cv/${p}` : '/api/cv'),
  learnerEmploi: (p?: string) => (p ? `/api/learner-emploi/${p}` : '/api/learner-emploi'),
  
  cloudTutor: (p?: string) => (p ? `/api/cloud-tutor/${p}` : '/api/cloud-tutor'),
  coach: (p?: string) => (p ? `/api/coach/${p}` : '/api/coach'),
  learner: (p?: string) => (p ? `/api/learner/${p}` : '/api/learner'),
  exams: (p?: string) => (p ? `/api/exams/${p}` : '/api/exams'),
  feedback: (p?: string) => (p ? `/api/admin/feedback/${p}` : '/api/admin/feedback'),
  transactions: (p?: string) => (p ? `/api/admin/transactions/${p}` : '/api/admin/transactions'),
  companies: (p?: string) => (p ? `/api/admin/companies/${p}` : '/api/admin/companies'),
  employer: (p?: string) => (p ? `/api/employer/${p}` : '/api/employer'),
  jobs: (p?: string) => (p ? `/api/jobs/${p}` : '/api/jobs'),
  labs: (p?: string) => (p ? `/api/labs/${p}` : '/api/labs'),
  notifications: (p?: string) => (p ? `/api/notifications/${p}` : '/api/notifications'),
  university: (p?: string) => (p ? `/api/university/${p}` : '/api/university'),
  payments: (p?: string) => (p ? `/api/payments/${p}` : '/api/payments'),
  subscriptions: (p?: string) => (p ? `/api/subscriptions/${p}` : '/api/subscriptions'),
  sync: (p?: string) => (p ? `/api/users/sync/${p}` : '/api/users/sync'),
  agents: (p?: string) => (p ? `/api/${p}` : '/api'),
  errors: () => '/api/errors',
} as const;

/** Thin wrapper for backwards compatibility - prefer api.get/post directly */
export const apiClient = {
  get: <T>(path: string, config?: Parameters<typeof api.get>[1]) =>
    api.get<T>(path, config).then((r) => r.data),
  post: <T>(path: string, data?: unknown, config?: Parameters<typeof api.post>[2]) =>
    api.post<T>(path, data, config).then((r) => r.data),
  patch: <T>(path: string, data?: unknown, config?: Parameters<typeof api.patch>[2]) =>
    api.patch<T>(path, data, config).then((r) => r.data),
  put: <T>(path: string, data?: unknown, config?: Parameters<typeof api.put>[2]) =>
    api.put<T>(path, data, config).then((r) => r.data),
  delete: <T>(path: string, config?: Parameters<typeof api.delete>[1]) =>
    api.delete<T>(path, config).then((r) => r.data),
};

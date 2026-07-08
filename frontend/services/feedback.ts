import { api, API_PATHS } from '@/lib/api/client';

export interface Feedback {
  id: number;
  user: string;
  email: string;
  type: string;
  subject: string;
  message: string;
  rating: number;
  status: string;
  response?: string | null;
  createdAt: string;
}

export interface FeedbackStats {
  total: number;
  pending: number;
  avgRating: number;
  resolved: number;
}

const base = () => API_PATHS.feedback();

export const getFeedbacks = (params?: {
  status?: string;
  type?: string;
  search?: string;
}): Promise<Feedback[]> => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.search) searchParams.set('search', params.search);
  const qs = searchParams.toString();
  const url = base().endsWith('/') ? base().slice(0, -1) : base();
  return api.get<Feedback[]>(qs ? `${url}?${qs}` : url).then((r) => r.data);
};

export const getFeedbackStats = (): Promise<FeedbackStats> =>
  api.get<FeedbackStats>(`${base()}/stats`).then((r) => r.data);

export const getFeedback = (id: number): Promise<Feedback> =>
  api.get<Feedback>(`${base()}/${id}`).then((r) => r.data);

export const updateFeedback = (
  id: number,
  data: { status?: string; response?: string },
): Promise<Feedback> =>
  api.patch<Feedback>(`${base()}/${id}`, data).then((r) => r.data);

export const deleteFeedback = (id: number): Promise<void> =>
  api.delete(`${base()}/${id}`).then(() => {});
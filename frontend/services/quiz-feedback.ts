import { api } from '@/lib/api/client';

export type FeedbackReason = 'off_topic' | 'wrong_answer' | 'unclear' | 'too_hard' | 'not_in_course' | 'other';

export interface ReportQuestionPayload {
  courseId?: string;
  moduleTitle?: string;
  questionText: string;
  questionType?: string;
  correctAnswer?: string;
  reason: FeedbackReason;
  comment?: string;
}

export async function reportQuizQuestion(payload: ReportQuestionPayload): Promise<void> {
  await api.post('/api/quiz-feedback', payload);
}

// Admin
export interface QuizFeedbackRecord {
  id: number;
  userId: number | null;
  courseId: string | null;
  moduleTitle: string | null;
  questionText: string;
  reason: FeedbackReason;
  comment: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
}

export async function getAdminQuizFeedback(status?: string, courseId?: string): Promise<QuizFeedbackRecord[]> {
  const res = await api.get<QuizFeedbackRecord[]>('/api/admin/quiz-feedback', {
    params: { ...(status ? { status } : {}), ...(courseId ? { courseId } : {}) },
  });
  return res.data;
}

export async function getAdminQuizFeedbackStats() {
  const res = await api.get('/api/admin/quiz-feedback/stats');
  return res.data;
}

export async function updateFeedbackStatus(id: number, status: string): Promise<void> {
  await api.patch(`/api/admin/quiz-feedback/${id}/status`, { status });
}

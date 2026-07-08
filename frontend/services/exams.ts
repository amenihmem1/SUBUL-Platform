import { api, API_PATHS } from '@/lib/api/client';

export interface UpcomingExamDto {
  id: number;
  title: string;
  course: string;
  date: string;
  duration: string;
  questions: number;
  passingScore: number;
  status: string;
  attempts: number;
  readiness: number;
}

export interface CompletedExamDto {
  id: number;
  title: string;
  course: string;
  date: string;
  score: number;
  status: string;
  attempts: number;
  timeSpent: string;
  streakBonus: boolean;
}

export interface ExamsResponse {
  upcoming: UpcomingExamDto[];
  completed: CompletedExamDto[];
  streak: number;
  stats: { upcoming: number; completed: number; passed: number; avgScore: number; total: number };
}

export interface ExamSessionQuestion {
  id: number;
  sortOrder: number;
  prompt: string;
  options: { id: string; text: string }[];
}

export interface ExamSessionResponse {
  exam: {
    id: number;
    title: string;
    course: string;
    duration: string;
    passingScore: number;
  };
  questions: ExamSessionQuestion[];
}

export interface SubmitExamResponse {
  score: number;
  status: string;
  streak: number;
  streakBonusApplied: boolean;
  attemptId: number;
}

const base = () => API_PATHS.exams();

export const getExams = (): Promise<ExamsResponse> =>
  api.get<ExamsResponse>(base()).then((r) => {
    const d = r.data;
    return {
      upcoming: Array.isArray(d?.upcoming) ? d.upcoming : [],
      completed: Array.isArray(d?.completed) ? d.completed : [],
      streak: typeof d?.streak === 'number' ? d.streak : 0,
      stats:
        d?.stats && typeof d.stats === 'object'
          ? {
              upcoming: typeof d.stats.upcoming === 'number' ? d.stats.upcoming : 0,
              completed: typeof d.stats.completed === 'number' ? d.stats.completed : 0,
              passed: typeof d.stats.passed === 'number' ? d.stats.passed : 0,
              avgScore: typeof d.stats.avgScore === 'number' ? d.stats.avgScore : 0,
              total: typeof d.stats.total === 'number' ? d.stats.total : 0,
            }
          : { upcoming: 0, completed: 0, passed: 0, avgScore: 0, total: 0 },
    };
  });

export const getStreak = (): Promise<{ streak: number }> =>
  api.get<{ streak: number }>(`${base()}/streak`).then((r) => r.data);

export const getExamSession = (examId: number): Promise<ExamSessionResponse> =>
  api.get<ExamSessionResponse>(`${base()}/${examId}/session`).then((r) => r.data);

export const submitExam = (
  examId: number,
  body: { answers: Record<string, string>; timeSpent?: string },
): Promise<SubmitExamResponse> =>
  api.post<SubmitExamResponse>(`${base()}/${examId}/submit`, body).then((r) => r.data);

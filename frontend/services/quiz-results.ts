import { api, API_PATHS } from '@/lib/api/client';

export interface AssessmentResult {
  id: number;
  userId: number;
  quizType: 'assessment' | 'level';
  domain: 'cloud' | 'cyber' | 'ai' | 'devops';
  scores: {
    cloudPercentage: number;
    cyberPercentage: number;
    aiPercentage: number;
    devopsPercentage?: number;
  };
  primaryProfile: string;
  hybridProfiles: string[];
  attemptNumber: number;
  isLatest: boolean;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizLevelResult {
  id: number;
  userId: number;
  domain: 'devops' | 'ai' | 'cyber';
  answers: Record<number, string>;
  questions: Array<{
    id: number;
    domain: string;
    question: string;
    difficulty: string;
    points: number;
    correct: boolean;
  }>;
  score: {
    score: number;
    total: number;
    percentage: number;
  };
  level: 'Débutant' | 'Intermédiaire' | 'Expert';
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizHistory {
  assessmentResults: AssessmentResult[];
  quizLevelResults: QuizLevelResult[];
}

// DTO interfaces matching backend
export interface CreateAssessmentResultDto {
  userId?: number;
  quizType?: 'assessment' | 'level';
  domain?: 'cloud' | 'cyber' | 'ai' | 'devops';
  scores?: {
    cloudPercentage: number;
    cyberPercentage: number;
    aiPercentage: number;
    devopsPercentage?: number;
  };
  primaryProfile?: string;
  hybridProfiles?: string[];
}

/** Level result payload. domain is devops|ai|cyber only; when profile is "cloud", send domain "devops". */
export interface CreateQuizLevelResultDto {
  userId?: number;
  domain?: 'devops' | 'ai' | 'cyber';
  answers?: Record<number, string>;
  questions?: Array<{
    id: number;
    domain: string;
    question: string;
    difficulty: string;
    points: number;
    correct: boolean;
  }>;
  score?: {
    score: number;
    total: number;
    percentage: number;
  };
  level?: 'Débutant' | 'Intermédiaire' | 'Expert';
}

const base = () => API_PATHS.quizResults();

export const saveAssessmentResult = (data: CreateAssessmentResultDto): Promise<AssessmentResult | null> =>
  api.post<AssessmentResult>(`${base()}/assessment`, data).then((r) => r.data)
    .catch((err) => {
      if (err.response?.status === 401) {
        console.warn('Authentication required for saving assessment results');
        return null;
      }
      console.error('Failed to save assessment result:', err);
      return null;
    });

export const getLatestAssessmentResult = (): Promise<AssessmentResult | null> =>
  api
    .get<AssessmentResult>(`${base()}/assessment/latest`)
    .then((r) => r.data)
    .catch((err) => {
      if (err.response?.status === 401) {
        console.warn('Authentication required for assessment results - user may not be logged in');
        return null;
      }
      console.error('Failed to fetch latest assessment result:', err);
      return null;
    });

export const getAssessmentHistory = (): Promise<AssessmentResult[]> =>
  api
    .get<AssessmentResult[]>(`${base()}/assessment/history`)
    .then((r) => r.data ?? [])
    .catch((err) => {
      console.error('Failed to fetch assessment history:', err);
      return [];
    });

export const getAssessmentAttemptsCount = (): Promise<number> =>
  api
    .get<{ attemptsCount: number }>(`${base()}/assessment/attempts-count`)
    .then((r) => r.data?.attemptsCount ?? 0)
    .catch((err) => {
      console.error('Failed to fetch assessment attempts count:', err);
      return 0;
    });

export const saveQuizLevelResult = (data: CreateQuizLevelResultDto): Promise<QuizLevelResult | null> =>
  api.post<QuizLevelResult>(`${base()}/level`, data).then((r) => r.data)
    .catch((err) => {
      if (err.response?.status === 401) {
        console.warn('Authentication required for saving quiz level results');
        return null;
      }
      console.error('Failed to save quiz level result:', err);
      return null;
    });

export const getLatestQuizLevelResult = (
  domain: string
): Promise<QuizLevelResult | null> =>
  api
    .get<QuizLevelResult>(`${base()}/level/latest`, { params: { domain } })
    .then((r) => r.data)
    .catch((err) => {
      if (err.response?.status === 401) {
        console.warn('Authentication required for quiz level results - user may not be logged in');
        return null;
      }
      console.error('Failed to fetch latest quiz level result:', err);
      return null;
    });

export const getQuizLevelHistory = (domain: string): Promise<QuizLevelResult[]> =>
  api
    .get<QuizLevelResult[]>(`${base()}/level/history`, { params: { domain } })
    .then((r) => r.data ?? [])
    .catch((err) => {
      console.error('Failed to fetch quiz level history:', err);
      return [];
    });

export const getQuizHistory = (): Promise<QuizHistory> =>
  api
    .get<QuizHistory>(`${base()}/history`)
    .then((r) => r.data ?? { assessmentResults: [], quizLevelResults: [] })
    .catch((err) => {
      console.error('Failed to fetch quiz history:', err);
      return { assessmentResults: [], quizLevelResults: [] };
    });

export const getPersonalizedRoadmap = (): Promise<any> =>
  api
    .get<any>(`${base()}/roadmap`)
    .then((r) => r.data ?? { modules: [], userProfile: null, totalProgress: 0 })
    .catch((err) => {
      console.error('Failed to fetch personalized roadmap:', err);
      return { modules: [], userProfile: null, totalProgress: 0 };
    });

/** Backwards-compatible object for consumers expecting quizResultsService */
export const quizResultsService = {
  saveAssessmentResult,
  getLatestAssessmentResult,
  getAssessmentHistory,
  getAssessmentAttemptsCount,
  saveQuizLevelResult,
  getLatestQuizLevelResult,
  getQuizLevelHistory,
  getQuizHistory,
  getPersonalizedRoadmap,
};

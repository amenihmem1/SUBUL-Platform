import { api, API_PATHS } from '@/lib/api/client';

export interface QuizGenerateRequest {
  sujet: string;
  nb_questions?: number;
  user_id?: string;
  session_id?: string;
  lang?: string;
  /** Lesson titles + key points from the completed module.
   *  When provided, the quiz agent uses this as direct context instead of RAG search,
   *  ensuring questions match exactly what the student just studied. */
  lesson_content?: string;
}

export interface QuizQuestion {
  id: number;
  type: 'qcm' | 'vrai_faux';
  question: string;
  options: Record<string, string>;
  bonne_reponse: string;
  explication_correcte: string;
}

export interface QuizGenerateResponse {
  statut: string;
  sujet: string;
  source_rag: string;
  questions: QuizQuestion[];
}

export interface QuizEvaluateRequest {
  question: QuizQuestion;
  reponse_apprenant: string;
  user_id?: string;
  session_id?: string;
  lang?: string;
}

export interface QuizEvaluateResponse {
  est_correct: boolean;
  reponse_apprenant: string;
  bonne_reponse: string;
  feedback: string;
  besoin_explication: boolean;
  explication_agent03: string | null;
}

export async function quizGenerate(body: QuizGenerateRequest): Promise<QuizGenerateResponse> {
  const { data } = await api.post<QuizGenerateResponse>(API_PATHS.quiz('generate'), body);
  return data;
}

export async function quizEvaluate(body: QuizEvaluateRequest): Promise<QuizEvaluateResponse> {
  const { data } = await api.post<QuizEvaluateResponse>(API_PATHS.quiz('evaluate'), body);
  return data;
}

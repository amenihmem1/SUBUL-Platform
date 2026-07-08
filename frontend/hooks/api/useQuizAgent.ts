import { useMutation } from '@tanstack/react-query';
import {
  quizGenerate,
  quizEvaluate,
  type QuizGenerateRequest,
  type QuizEvaluateRequest,
} from '@/services/quiz-agent';

export const quizAgentKeys = {
  all: ['quiz-agent'] as const,
};

export function useQuizGenerate() {
  return useMutation({
    mutationFn: (body: QuizGenerateRequest) => quizGenerate(body),
  });
}

export function useQuizEvaluate() {
  return useMutation({
    mutationFn: (body: QuizEvaluateRequest) => quizEvaluate(body),
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  saveAssessmentResult,
  getLatestAssessmentResult,
  getAssessmentHistory,
  getAssessmentAttemptsCount,
  saveQuizLevelResult,
  getLatestQuizLevelResult,
  getQuizLevelHistory,
  getQuizHistory,
} from '@/services/quiz-results';

export const quizResultsKeys = {
  all: ['quizResults'] as const,
  latestAssessment: () => [...quizResultsKeys.all, 'latestAssessment'] as const,
  assessmentHistory: () => [...quizResultsKeys.all, 'assessmentHistory'] as const,
  attemptsCount: () => [...quizResultsKeys.all, 'attemptsCount'] as const,
  levelLatest: (domain: string) =>
    [...quizResultsKeys.all, 'level', domain] as const,
  levelHistory: (domain: string) =>
    [...quizResultsKeys.all, 'levelHistory', domain] as const,
  history: () => [...quizResultsKeys.all, 'history'] as const,
};

export function useLatestAssessment() {
  return useQuery({
    queryKey: quizResultsKeys.latestAssessment(),
    queryFn: getLatestAssessmentResult,
    staleTime: 0, // Always consider data stale
  });
}

export function useAssessmentHistory() {
  return useQuery({
    queryKey: quizResultsKeys.assessmentHistory(),
    queryFn: getAssessmentHistory,
  });
}

export function useAssessmentAttemptsCount() {
  return useQuery({
    queryKey: quizResultsKeys.attemptsCount(),
    queryFn: getAssessmentAttemptsCount,
  });
}

export function useLatestQuizLevel(domain: string) {
  return useQuery({
    queryKey: quizResultsKeys.levelLatest(domain),
    queryFn: () => getLatestQuizLevelResult(domain),
    enabled: !!domain,
  });
}

export function useQuizLevelHistory(domain: string) {
  return useQuery({
    queryKey: quizResultsKeys.levelHistory(domain),
    queryFn: () => getQuizLevelHistory(domain),
    enabled: !!domain,
  });
}

export function useQuizHistory() {
  return useQuery({
    queryKey: quizResultsKeys.history(),
    queryFn: getQuizHistory,
  });
}

export function useSaveAssessmentResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAssessmentResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizResultsKeys.all });
    },
  });
}

export function useSaveQuizLevelResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveQuizLevelResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizResultsKeys.all });
    },
  });
}

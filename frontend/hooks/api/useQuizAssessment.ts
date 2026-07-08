import { useQuery } from '@tanstack/react-query';
import { getAssessmentQuestions } from '@/services/quiz-assessment';

export const quizAssessmentKeys = {
  all: ['quiz', 'assessment-questions'] as const,
  byProfile: (profile: string) => ['quiz', 'assessment-questions', profile] as const,
};

export function useQuizAssessmentQuestions(enabled = true, profile?: string) {
  return useQuery({
    queryKey: profile ? quizAssessmentKeys.byProfile(profile) : quizAssessmentKeys.all,
    queryFn: () => getAssessmentQuestions(profile!),
    enabled,
  });
}

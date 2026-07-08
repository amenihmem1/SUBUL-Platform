import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExams, getStreak, getExamSession, submitExam } from '@/services/exams';

export const examsKeys = {
  all: ['exams'] as const,
  streak: () => [...examsKeys.all, 'streak'] as const,
  session: (examId: number) => [...examsKeys.all, 'session', examId] as const,
};

export function useExams() {
  return useQuery({
    queryKey: examsKeys.all,
    queryFn: getExams,
  });
}

export function useExamsStreak() {
  return useQuery({
    queryKey: examsKeys.streak(),
    queryFn: getStreak,
  });
}

export function useExamSession(examId: number, enabled: boolean) {
  return useQuery({
    queryKey: examsKeys.session(examId),
    queryFn: () => getExamSession(examId),
    enabled: enabled && Number.isFinite(examId) && examId > 0,
  });
}

export function useSubmitExamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, answers, timeSpent }: { examId: number; answers: Record<string, string>; timeSpent?: string }) =>
      submitExam(examId, { answers, timeSpent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examsKeys.all });
    },
  });
}

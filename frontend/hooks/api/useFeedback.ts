import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFeedbacks,
  getFeedbackStats,
  updateFeedback,
  deleteFeedback,
  type Feedback,
} from '@/services/feedback';

export const feedbackKeys = {
  all: ['feedback'] as const,
  list: (filters?: { status?: string; type?: string; search?: string }) =>
    [...feedbackKeys.all, 'list', filters] as const,
  stats: () => [...feedbackKeys.all, 'stats'] as const,
};

export function useFeedbacks(filters?: { status?: string; type?: string; search?: string }) {
  return useQuery({
    queryKey: feedbackKeys.list(filters),
    queryFn: () => getFeedbacks(filters),
  });
}

export function useFeedbackStats() {
  return useQuery({
    queryKey: feedbackKeys.stats(),
    queryFn: getFeedbackStats,
  });
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status?: string; response?: string } }) =>
      updateFeedback(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
    },
  });
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
    },
  });
}

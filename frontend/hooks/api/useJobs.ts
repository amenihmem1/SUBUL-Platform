import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} from '@/services/jobs';
import type { JobDto } from '@/services/jobs';
export type { JobDto };

export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
};

export function useJobs(page?: number, limit?: number) {
  return useQuery({
    queryKey: [...jobKeys.lists(), { page, limit }],
    queryFn: () => getJobs(page, limit),
  });
}

export function useJob(id: string | null, enabled = true) {
  return useQuery({
    queryKey: jobKeys.detail(id!),
    queryFn: () => getJobById(id!),
    enabled: enabled && !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<JobDto>) => createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: ['employer'] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobDto> }) =>
      updateJob(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['employer'] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: ['employer'] });
    },
  });
}

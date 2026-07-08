import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminJobs,
  updateAdminJobStatus,
} from '@/services/adminJobs';

export const adminJobsKeys = {
  all: () => ['admin', 'jobs'] as const,
  list: (status?: string) => ['admin', 'jobs', status] as const,
};

export interface UseAdminJobsOptions {
  status?: string;
  page?: number;
  limit?: number;
}

export function useAdminJobs(options?: UseAdminJobsOptions) {
  const { status, page = 1, limit = 10 } = options ?? {};
  return useQuery({
    queryKey: [...adminJobsKeys.list(status), page, limit],
    queryFn: () => getAdminJobs({ status, page, limit }),
  });
}

export function useUpdateAdminJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateAdminJobStatus>[1] }) =>
      updateAdminJobStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminJobsKeys.all() });
    },
  });
}

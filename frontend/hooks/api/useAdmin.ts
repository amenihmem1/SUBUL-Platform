import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUsers,
  getAdminUser,
  getAdminStats,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  updateAdminUserStatus,
  approveAdminUser,
  updateAdminUserPassword,
  sendResetPasswordEmail,
  verifyAdminUserEmail,
} from '@/services/adminUsers';
import { getLearnerProgression } from '@/services/adminProgression';
import { getAnalyticsOverview } from '@/services/adminAnalytics';
import { getAuthStats } from '@/services/adminPlatform';

type AdminUsersListCache = {
  data: Array<{ id: number; status?: string; [key: string]: unknown }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type UsersSnapshot = Array<[readonly unknown[], AdminUsersListCache | undefined]>;

const updateUsersListCache = (
  previous: AdminUsersListCache | undefined,
  updater: (users: AdminUsersListCache['data']) => AdminUsersListCache['data'],
): AdminUsersListCache | undefined => {
  if (!previous || !Array.isArray(previous.data)) return previous;
  return {
    ...previous,
    data: updater(previous.data),
  };
};

export const adminKeys = {
  users: () => ['admin', 'users'] as const,
  usersList: (params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) =>
    [...adminKeys.users(), 'list', params ?? {}] as const,
  user: (id: number) => ['admin', 'users', id] as const,
  stats: () => ['admin', 'stats'] as const,
  progression: () => ['admin', 'progression'] as const,
  analyticsOverview: () => ['admin', 'analytics', 'overview'] as const,
  authStats: () => ['admin', 'auth-stats'] as const,
};

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: getAdminStats,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useAuthStats() {
  return useQuery({
    queryKey: adminKeys.authStats(),
    queryFn: getAuthStats,
    staleTime: 60_000,
  });
}

export function useAdminUsers(params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: adminKeys.usersList(params),
    queryFn: () => getAdminUsers(params),
  });
}

export function useAdminUser(id: number | undefined) {
  return useQuery({
    queryKey: id != null ? adminKeys.user(id) : (['admin', 'users', 'detail', 'disabled'] as const),
    queryFn: () => getAdminUser(id!),
    enabled: id != null && Number.isFinite(id),
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      queryClient.invalidateQueries({ queryKey: adminKeys.authStats() });
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { fullName?: string; email?: string; phone?: string; role?: string };
    }) => updateAdminUser(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.users() });
      const previousUsers = queryClient.getQueriesData<AdminUsersListCache>({ queryKey: adminKeys.users() });

      queryClient.setQueriesData<AdminUsersListCache>({ queryKey: adminKeys.users() }, (current) =>
        updateUsersListCache(current, (users) =>
          users.map((user) => (user.id === id ? { ...user, ...data } : user)),
        ),
      );

      return { previousUsers };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.user(variables.id) });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      queryClient.invalidateQueries({ queryKey: adminKeys.authStats() });
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminUser,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.users() });
      const previousUsers: UsersSnapshot = queryClient.getQueriesData<AdminUsersListCache>({
        queryKey: adminKeys.users(),
      });

      queryClient.setQueriesData<AdminUsersListCache>({ queryKey: adminKeys.users() }, (current) => {
        const next = updateUsersListCache(current, (users) => users.filter((user) => user.id !== id));
        if (!next) return current;
        const total = Math.max(0, (next.total ?? 0) - 1);
        return {
          ...next,
          total,
          totalPages: Math.max(1, Math.ceil(total / Math.max(1, next.limit || 1))),
        };
      });

      return { previousUsers };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      queryClient.invalidateQueries({ queryKey: adminKeys.authStats() });
    },
  });
}

export function useUpdateAdminUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateAdminUserStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.users() });
      const previousUsers: UsersSnapshot = queryClient.getQueriesData<AdminUsersListCache>({
        queryKey: adminKeys.users(),
      });

      queryClient.setQueriesData<AdminUsersListCache>({ queryKey: adminKeys.users() }, (current) =>
        updateUsersListCache(current, (users) =>
          users.map((user) => (user.id === id ? { ...user, status } : user)),
        ),
      );

      return { previousUsers };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      queryClient.invalidateQueries({ queryKey: adminKeys.authStats() });
    },
  });
}

export function useApproveAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      queryClient.invalidateQueries({ queryKey: adminKeys.authStats() });
    },
  });
}

export function useChangeUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      updateAdminUserPassword(id, password),
  });
}

export function useSendResetPasswordEmail() {
  return useMutation({
    mutationFn: (id: number) => sendResetPasswordEmail(id),
  });
}

export function useVerifyAdminUserEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => verifyAdminUserEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

export function useLearnerProgression() {
  return useQuery({
    queryKey: adminKeys.progression(),
    queryFn: getLearnerProgression,
  });
}

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: adminKeys.analyticsOverview(),
    queryFn: getAnalyticsOverview,
  });
}

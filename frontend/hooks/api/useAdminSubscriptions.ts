import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUserSubscriptions,
  assignUserSubscription,
  updateUserSubscription,
  getAdminPlans,
  type AdminManagedSubscriptionStatus,
  type AdminSubscriptionPlansScope,
} from '@/services/adminSubscriptions';

export type AdminUpdateUserSubscriptionPayload = {
  status?: AdminManagedSubscriptionStatus;
  planId?: string;
  periodStart?: string;
  periodEnd?: string;
};

export const adminSubscriptionKeys = {
  all:   ()           => ['admin', 'subscriptions'] as const,
  user:  (userId?: number) => [...adminSubscriptionKeys.all(), 'user', userId] as const,
  plans: (scope?: AdminSubscriptionPlansScope) =>
    ['admin', 'subscription-plans', scope ?? 'all'] as const,
};

export function useAdminUserSubscriptions(
  userId?: number,
  options?: { enabled?: boolean },
) {
  const extraEnabled = options?.enabled !== false;
  const canRun =
    extraEnabled &&
    (userId === undefined || Number.isFinite(userId));
  return useQuery({
    queryKey: adminSubscriptionKeys.user(userId),
    queryFn:  () => getAdminUserSubscriptions(userId),
    enabled:  canRun,
    staleTime: 0, // always re-fetch when invalidated
  });
}

export function useAdminPlans(scope?: AdminSubscriptionPlansScope) {
  return useQuery({
    queryKey: adminSubscriptionKeys.plans(scope),
    queryFn:  () => getAdminPlans(scope),
    staleTime: 60_000,
  });
}

export function useAssignUserSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignUserSubscription,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminSubscriptionKeys.all() });
      queryClient.invalidateQueries({ queryKey: adminSubscriptionKeys.user(variables.userId) });
    },
  });
}

/**
 * Pass the target userId so we can invalidate that user's subscription cache
 * immediately after a successful update, not just the global list.
 */
export function useUpdateUserSubscription(fallbackUserId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminUpdateUserSubscriptionPayload }) =>
      updateUserSubscription(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: adminSubscriptionKeys.all() });
      const uid = updated?.userId ?? fallbackUserId;
      if (uid != null) {
        queryClient.invalidateQueries({ queryKey: adminSubscriptionKeys.user(uid) });
      }
    },
  });
}

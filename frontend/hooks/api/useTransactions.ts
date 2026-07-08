import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminTransactions,
  fetchAdminTransactionStats,
  fetchAdminTransactionAnalytics,
  fetchAdminTransaction,
  refundAdminTransaction,
  type TransactionsListParams,
  type TransactionsAnalyticsParams,
} from '@/services/transactions';

export const adminTransactionsKeys = {
  all: ['admin-transactions'] as const,
  list: (filters: TransactionsListParams) => [...adminTransactionsKeys.all, 'list', filters] as const,
  stats: () => [...adminTransactionsKeys.all, 'stats'] as const,
  analytics: (p: TransactionsAnalyticsParams) => [...adminTransactionsKeys.all, 'analytics', p] as const,
  detail: (id: string) => [...adminTransactionsKeys.all, 'detail', id] as const,
};

export function useAdminTransactions(filters: TransactionsListParams) {
  return useQuery({
    queryKey: adminTransactionsKeys.list(filters),
    queryFn: () => fetchAdminTransactions(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAdminTransactionStats() {
  return useQuery({
    queryKey: adminTransactionsKeys.stats(),
    queryFn: fetchAdminTransactionStats,
    staleTime: 30_000,
  });
}

export function useAdminTransactionAnalytics(params: TransactionsAnalyticsParams) {
  return useQuery({
    queryKey: adminTransactionsKeys.analytics(params),
    queryFn: () => fetchAdminTransactionAnalytics(params),
    staleTime: 60_000,
  });
}

export function useAdminTransactionDetail(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: adminTransactionsKeys.detail(id ?? ''),
    queryFn: () => fetchAdminTransaction(id!),
    enabled: !!id && enabled,
  });
}

export function useRefundAdminTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refundAdminTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTransactionsKeys.all });
    },
  });
}

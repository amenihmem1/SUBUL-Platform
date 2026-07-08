import { useQuery } from '@tanstack/react-query';
import {
  adminListManualPayments,
  fetchAdminManualPaymentStats,
  type AdminManualPaymentStats,
  type ManualPaymentAdminSort,
} from '@/services/adminPlatform';

/** Prefix matches admin manual payment detail `invalidateQueries(['admin', 'manual-payments'])`. */
export const adminManualPaymentsKeys = {
  all: ['admin', 'manual-payments'] as const,
  list: (filters: Record<string, unknown>) => [...adminManualPaymentsKeys.all, 'list', filters] as const,
  stats: (filters: Record<string, unknown>) => [...adminManualPaymentsKeys.all, 'stats', filters] as const,
};

export function useAdminManualPaymentsList(
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    paymentMethod?: string;
    planSlug?: string;
    currency?: string;
    from?: string;
    to?: string;
    sort?: ManualPaymentAdminSort;
  },
  enabled: boolean,
) {
  return useQuery({
    queryKey: adminManualPaymentsKeys.list(filters),
    queryFn: () => adminListManualPayments(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useAdminManualPaymentStats(
  filters: {
    search?: string;
    status?: string;
    paymentMethod?: string;
    planSlug?: string;
    currency?: string;
    from?: string;
    to?: string;
    granularity?: 'day' | 'week' | 'month' | 'year';
  },
  enabled: boolean,
) {
  return useQuery({
    queryKey: adminManualPaymentsKeys.stats(filters),
    queryFn: (): Promise<AdminManualPaymentStats> => fetchAdminManualPaymentStats(filters),
    staleTime: 60_000,
    enabled,
  });
}

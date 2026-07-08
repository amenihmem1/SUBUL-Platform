import { api, API_PATHS } from '@/lib/api/client';

export type PaymentProvider = 'stripe' | 'flouci';
export type PaymentStatus =
  | 'pending'
  | 'initiated'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type AdminPlanCategory = 'standard' | 'premium' | 'free' | 'unknown';

export type AdminTxSort = 'created_desc' | 'created_asc' | 'amount_desc' | 'amount_asc';

export interface AdminTransaction {
  id: string;
  provider: PaymentProvider;
  providerReference: string | null;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  customerEmail: string | null;
  amountCents: number;
  currency: string;
  originalAmountCents: number;
  discountCents: number;
  status: PaymentStatus;
  billingCycle: string;
  planSlug: string;
  planDisplayLabel: string;
  planCategory: AdminPlanCategory;
  createdAt: string;
  paidAt: string | null;
  metadataPreview: string | null;
  subscriptionId: string | null;
  promoCode: string | null;
  countryCode: string | null;
}

export interface AdminTransactionDetail extends AdminTransaction {
  providerMetadata: unknown;
}

export interface AdminTransactionsPage {
  data: AdminTransaction[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminTransactionStats {
  revenueByCurrency: { currency: string; revenueCents: number; paidCount: number }[];
  paidCount: number;
  failedCount: number;
  pendingCount: number;
  cancelledCount: number;
  expiredCount: number;
  refundedCount: number;
  initiatedCount: number;
  stripePaidByCurrency: { currency: string; revenueCents: number }[];
  flouciPaidByCurrency: { currency: string; revenueCents: number }[];
  standardPaidCount: number;
  premiumPaidCount: number;
  freePaidCount: number;
  totalTransactions: number;
}

export interface AdminTransactionAnalytics {
  granularity: string;
  series: {
    bucket: string;
    revenueCents: number;
    paymentCount: number;
    successCount: number;
    failedCount: number;
    pendingCount: number;
  }[];
  statusDistribution: { status: string; count: number }[];
  revenueByProvider: { provider: string; revenueCents: number; count: number }[];
  revenueByPlanCategory: { planCategory: string; revenueCents: number; paymentCount: number }[];
  note: string;
}

export interface TransactionsListParams {
  page?: number;
  limit?: number;
  provider?: PaymentProvider;
  status?: PaymentStatus;
  planSlug?: string;
  plan?: AdminPlanCategory;
  billingCycle?: string;
  currency?: string;
  userId?: number;
  email?: string;
  search?: string;
  from?: string;
  to?: string;
  sort?: AdminTxSort;
}

export interface TransactionsAnalyticsParams {
  from?: string;
  to?: string;
  granularity?: 'day' | 'week' | 'month' | 'year';
  provider?: PaymentProvider;
  currency?: string;
  plan?: AdminPlanCategory;
}

const base = () => {
  const b = API_PATHS.transactions();
  return b.endsWith('/') ? b.slice(0, -1) : b;
};

function appendParams(sp: URLSearchParams, p: Record<string, string | number | undefined>) {
  Object.entries(p).forEach(([k, v]) => {
    if (v === undefined || v === '') return;
    sp.set(k, String(v));
  });
}

export async function fetchAdminTransactions(
  params?: TransactionsListParams,
): Promise<AdminTransactionsPage> {
  const sp = new URLSearchParams();
  appendParams(sp, {
    page: params?.page,
    limit: params?.limit,
    provider: params?.provider,
    status: params?.status,
    planSlug: params?.planSlug,
    plan: params?.plan,
    billingCycle: params?.billingCycle,
    currency: params?.currency,
    userId: params?.userId,
    email: params?.email,
    search: params?.search,
    from: params?.from,
    to: params?.to,
    sort: params?.sort,
  });
  const qs = sp.toString();
  const url = qs ? `${base()}?${qs}` : base();
  const { data } = await api.get<AdminTransactionsPage>(url);
  return data;
}

export async function fetchAdminTransactionStats(): Promise<AdminTransactionStats> {
  const { data } = await api.get<AdminTransactionStats>(`${base()}/stats`);
  return data;
}

export async function fetchAdminTransactionAnalytics(
  params?: TransactionsAnalyticsParams,
): Promise<AdminTransactionAnalytics> {
  const sp = new URLSearchParams();
  appendParams(sp, {
    from: params?.from,
    to: params?.to,
    granularity: params?.granularity,
    provider: params?.provider,
    currency: params?.currency,
    plan: params?.plan,
  });
  const qs = sp.toString();
  const url = qs ? `${base()}/analytics?${qs}` : `${base()}/analytics`;
  const { data } = await api.get<AdminTransactionAnalytics>(url);
  return data;
}

export async function fetchAdminTransaction(id: string): Promise<AdminTransactionDetail> {
  const { data } = await api.get<AdminTransactionDetail>(`${base()}/${id}`);
  return data;
}

export async function refundAdminTransaction(id: string): Promise<AdminTransaction> {
  const { data } = await api.post<AdminTransaction>(`${base()}/${id}/refund`);
  return data;
}

import { api, API_PATHS } from '@/lib/api/client';

export async function getAdminOverview() {
  const { data } = await api.get(API_PATHS.admin('overview'));
  return data;
}

export type AuthStatsResponse = {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  verificationRatePercent: number;
  activeSubscriptions: number;
  trialUsers: number;
  expiredSubscriptions: number;
  signupsOverTime: { date: string; count: number }[];
  verificationRateTrend: { date: string; ratePercent: number }[];
  passwordResetRequestsOverTime: { date: string; count: number }[];
  usersByRole: { role: string; count: number }[];
};

export async function getAuthStats(): Promise<AuthStatsResponse> {
  const { data } = await api.get<AuthStatsResponse>(API_PATHS.admin('auth-stats'));
  return data;
}

export async function getAdminEmployers(page = 1, limit = 20) {
  const { data } = await api.get(API_PATHS.admin('employers'), { params: { page, limit } });
  return data;
}

export async function createAdminEmployer(body: {
  email: string;
  password: string;
  fullName?: string;
  companyName?: string;
}) {
  const { data } = await api.post(API_PATHS.admin('employers'), body);
  return data;
}

export async function getAgentLimits() {
  const { data } = await api.get(API_PATHS.admin('settings/agent-limits'));
  return data as { default: number; perAgent: Record<string, number> };
}

export async function patchAgentLimits(body: { default: number; perAgent?: Record<string, number> }) {
  const { data } = await api.patch(API_PATHS.admin('settings/agent-limits'), body);
  return data;
}

export async function getAgentUsage(params?: { userId?: number; yearMonth?: string; agentKey?: string }) {
  const { data } = await api.get(API_PATHS.admin('agent-usage'), { params });
  return data;
}

export type AdminUniversityListItem = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  seatsTotal?: number;
  seatsUsed?: number;
  studentCount?: number;
  validUntil?: string | null;
};

/** Paginated admin list from `UniversityService.adminList` */
export async function listUniversities(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  const { data } = await api.get<{ data: AdminUniversityListItem[]; total: number; page: number; limit: number }>(
    '/api/admin/universities',
    { params: { limit: 500, page: 1, ...params } },
  );
  return { items: data?.data ?? [], total: data?.total ?? 0 };
}

/** Creates tenant + sends setup email to contact (no plaintext owner password). */
export async function createUniversity(body: {
  name: string;
  contactEmail: string;
  billingEmail?: string;
  contactName?: string;
  country?: string;
  website?: string;
}) {
  const { data } = await api.post('/api/admin/universities', body);
  return data;
}

export async function assignUniversityLicense(
  universityId: string,
  body: { planId: string; seatsTotal: number; validFrom?: string; validUntil?: string },
) {
  const { data } = await api.post(`/api/admin/universities/${universityId}/licenses`, body);
  return data;
}

export async function createUniversityStaff(
  universityId: string,
  body: { email: string; password: string; fullName?: string },
) {
  const { data } = await api.post(`/api/admin/universities/${universityId}/staff`, body);
  return data;
}

/** Read-only catalog of subscription plans (DB ids for license / assignment flows). */
export async function listSubscriptionPlans() {
  const { data } = await api.get('/api/admin/subscription-plans');
  return data;
}

export async function listUserSubscriptions(userId?: number) {
  const { data } = await api.get('/api/admin/user-subscriptions', {
    params: userId ? { userId } : {},
  });
  return data;
}

export async function assignUserSubscription(body: {
  userId: number;
  planId: string;
  status?: string;
}) {
  const { data } = await api.post('/api/admin/user-subscriptions', body);
  return data;
}

export type AdminPromoCode = {
  id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number | null;
  usedCount: number;
  perUserLimit?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
  currencyScope?: string | null;
  createdAt?: string;
};

export type PromoCodePayload = {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  perUserLimit?: number;
  startDate?: string;
  endDate?: string;
  active?: boolean;
  currencyScope?: string;
};

export async function listPromoCodes(params?: { page?: number; limit?: number }) {
  const { data } = await api.get<{ data: AdminPromoCode[]; total: number }>('/api/admin/promo-codes', { params });
  return data;
}

export async function getPromoCode(id: string) {
  const { data } = await api.get<AdminPromoCode>(`/api/admin/promo-codes/${id}`);
  return data;
}

export async function createPromoCode(body: PromoCodePayload) {
  const { data } = await api.post<AdminPromoCode>('/api/admin/promo-codes', body);
  return data;
}

export async function updatePromoCode(id: string, body: Partial<PromoCodePayload>) {
  const { data } = await api.patch<AdminPromoCode>(`/api/admin/promo-codes/${id}`, body);
  return data;
}

export async function deletePromoCode(id: string) {
  await api.delete(`/api/admin/promo-codes/${id}`);
}

export type QuoteRequestStatus = 'pending' | 'contacted' | 'closed';
export type QuotePlanType = 'universite' | 'entreprise';

export type QuoteRequestPayload = {
  name: string;
  email: string;
  phone?: string;
  organization: string;
  numberOfUsers: number;
  message?: string;
  planType: QuotePlanType;
};

export type QuoteRequestItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  organization: string;
  numberOfUsers: number;
  message?: string | null;
  planType: QuotePlanType;
  status: QuoteRequestStatus;
  leadScore?: number;
  leadTier?: 'high' | 'medium' | 'low';
  slaBreached?: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function createQuoteRequest(body: QuoteRequestPayload) {
  const { data } = await api.post<QuoteRequestItem>('/api/quote-requests', body);
  return data;
}

export async function listQuoteRequests(params?: { page?: number; limit?: number; status?: QuoteRequestStatus }) {
  const { data } = await api.get<{ data: QuoteRequestItem[]; total: number }>('/api/admin/quote-requests', { params });
  return data;
}

export async function getQuoteRequest(id: string) {
  const { data } = await api.get<QuoteRequestItem>(`/api/admin/quote-requests/${id}`);
  return data;
}

export async function updateQuoteRequestStatus(id: string, status: QuoteRequestStatus) {
  const { data } = await api.patch<QuoteRequestItem>(`/api/admin/quote-requests/${id}/status`, { status });
  return data;
}

export async function deleteQuoteRequest(id: string) {
  await api.delete(`/api/admin/quote-requests/${id}`);
}

// ─── Manual Payments (Admin) ─────────────────────────────────────────────────

import type { ManualPaymentRequest, ManualPaymentStatus } from './payments';
export type { ManualPaymentRequest, ManualPaymentStatus };

export type ManualPaymentAdminSort =
  | 'created_desc'
  | 'created_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'status_desc'
  | 'status_asc';

export interface AdminManualPaymentStats {
  summary: {
    totalValidatedRevenueByCurrency: Record<string, number>;
    totalManualPayments: number;
    validatedCount: number;
    pendingCount: number;
    rejectedCount: number;
    averageValidatedAmountByCurrency: Record<string, number>;
    validatedRevenueByMethod: {
      method: string;
      revenueByCurrency: Record<string, number>;
      validatedCount: number;
    }[];
  };
  revenueOverTime: {
    bucket: string;
    revenueCentsByCurrency: Record<string, number>;
    validatedCount: number;
  }[];
  statusDistribution: { category: string; count: number }[];
  methodDistribution: {
    method: string;
    totalCount: number;
    validatedCount: number;
    validatedRevenueByCurrency: Record<string, number>;
  }[];
  planRevenue: { planSlug: string; revenueByCurrency: Record<string, number> }[];
  planCounts: { planSlug: string; validatedCount: number }[];
  granularity: string;
  note: string;
}

export async function adminListManualPayments(params?: {
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
}): Promise<{ data: ManualPaymentRequest[]; total: number }> {
  const { data } = await api.get('/api/admin/manual-payments', { params });
  return data;
}

export async function fetchAdminManualPaymentStats(params?: {
  search?: string;
  status?: string;
  paymentMethod?: string;
  planSlug?: string;
  currency?: string;
  from?: string;
  to?: string;
  granularity?: 'day' | 'week' | 'month' | 'year';
}): Promise<AdminManualPaymentStats> {
  const { data } = await api.get<AdminManualPaymentStats>('/api/admin/manual-payments/stats', { params });
  return data;
}

export async function adminGetManualPayment(id: string): Promise<ManualPaymentRequest> {
  const { data } = await api.get<ManualPaymentRequest>(`/api/admin/manual-payments/${id}`);
  return data;
}

export async function adminApproveManualPayment(
  id: string,
  durationMonths: number,
  adminNotes?: string,
): Promise<ManualPaymentRequest> {
  const { data } = await api.patch<ManualPaymentRequest>(
    `/api/admin/manual-payments/${id}/approve`,
    { durationMonths, adminNotes },
  );
  return data;
}

export async function adminRejectManualPayment(
  id: string,
  adminNotes?: string,
): Promise<ManualPaymentRequest> {
  const { data } = await api.patch<ManualPaymentRequest>(
    `/api/admin/manual-payments/${id}/reject`,
    { adminNotes },
  );
  return data;
}

export async function adminRequestNewProof(
  id: string,
  notes?: string,
): Promise<ManualPaymentRequest> {
  const { data } = await api.patch<ManualPaymentRequest>(
    `/api/admin/manual-payments/${id}/request-proof`,
    { notes },
  );
  return data;
}

import { api } from '@/lib/api/client';

// ─── Core types ───────────────────────────────────────────────────────────────

export interface CommercialProfile {
  id: string;
  userId: number;
  preferredCurrency: string;
  status: 'active' | 'inactive';
  notes?: string;
  totalReferrals: number;
  createdAt: string;
  updatedAt: string;
  totalRevenueCents?: number;   // enriched by findAll
  user?: { id: number; email: string; fullName?: string; status: string };
}

export interface CommercialStats {
  totalCodes: number;
  totalReferrals: number;
  successfulConversions: number;
  totalRevenueCents: number;
  totalDiscountCents: number;
  conversionRate: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface TopEntry {
  id: string;
  label: string;
  uses: number;
  revenueCents: number;
}

export interface CommercialCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  usedCount: number;
  maxUses?: number;
  active: boolean;
  startDate?: string;
  endDate?: string;
  currencyScope?: string;
  commercialId?: string;
  createdAt: string;
  stats: {
    totalUses: number;
    conversions: number;
    discountCents: number;
    revenueCents: number;
  };
}

export interface CommercialReferral {
  id: string;
  promoCodeId: string;
  promoCode?: string;
  userId?: number;
  userEmail?: string; // masked by backend
  discountAppliedCents: number;
  originalAmountCents?: number;
  finalAmountCents?: number;
  currency?: string;
  paymentStatus?: string;
  createdAt: string;
}

export interface AdminOverview {
  totalCommercials: number;
  activeCommercials: number;
  totalReferrals: number;
  totalRevenueCents: number;
  totalDiscountCents: number;
  topCommercials: Array<{
    rank: number;
    id: string;
    fullName: string;
    email: string;
    totalReferrals: number;
    totalRevenueCents: number;
  }>;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmt(cents: number, currency = 'EUR'): string {
  const divisor = currency === 'TND' ? 1000 : 100;
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / divisor);
  } catch {
    return `${(cents / divisor).toFixed(2)} ${currency}`;
  }
}

export function fmtShort(cents: number, currency = 'EUR'): string {
  const divisor = currency === 'TND' ? 1000 : 100;
  const val = cents / divisor;
  const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
  return `${formatted} ${currency}`;
}

export function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`;
}

// ─── Commercial (self) API ────────────────────────────────────────────────────

export const getMyProfile = async (): Promise<CommercialProfile> =>
  (await api.get('/api/commercial/me')).data;

export const getMyStats = async (): Promise<CommercialStats> =>
  (await api.get('/api/commercial/stats')).data;

export const getMyCodes = async (): Promise<CommercialCode[]> =>
  (await api.get('/api/commercial/codes')).data;

export const getMyReferrals = async (
  page = 1, limit = 20, status?: string,
): Promise<{ data: CommercialReferral[]; total: number }> =>
  (await api.get('/api/commercial/referrals', { params: { page, limit, ...(status ? { status } : {}) } })).data;

// ─── Charts (commercial self) ─────────────────────────────────────────────────

export const getMyReferralsChart = async (
  period = 'day', range = 30,
): Promise<ChartDataPoint[]> =>
  (await api.get('/api/commercial/chart/referrals', { params: { period, range } })).data;

export const getMyRevenueChart = async (
  period = 'day', range = 30,
): Promise<ChartDataPoint[]> =>
  (await api.get('/api/commercial/chart/revenue', { params: { period, range } })).data;

// ─── Admin API ────────────────────────────────────────────────────────────────

export const getAdminOverview = async (): Promise<AdminOverview> =>
  (await api.get('/api/admin/commercials/overview')).data;

export const listCommercials = async (p = 1, l = 20) =>
  (await api.get('/api/admin/commercials', { params: { page: p, limit: l } })).data as { data: CommercialProfile[]; total: number };

export const getCommercial = async (id: string): Promise<CommercialProfile> =>
  (await api.get(`/api/admin/commercials/${id}`)).data;

export const getCommercialStats = async (id: string): Promise<CommercialStats> =>
  (await api.get(`/api/admin/commercials/${id}/stats`)).data;

export const getCommercialCodes = async (id: string): Promise<CommercialCode[]> =>
  (await api.get(`/api/admin/commercials/${id}/codes`)).data;

export const getCommercialReferrals = async (
  id: string, page = 1, limit = 20, status?: string,
): Promise<{ data: CommercialReferral[]; total: number }> =>
  (await api.get(`/api/admin/commercials/${id}/referrals`, { params: { page, limit, ...(status ? { status } : {}) } })).data;

export const createCommercial = async (body: {
  email: string; fullName: string; password: string;
  preferredCurrency?: string; notes?: string;
}): Promise<CommercialProfile> => (await api.post('/api/admin/commercials', body)).data;

export const updateCommercial = async (id: string, body: {
  fullName?: string; status?: string; preferredCurrency?: string; notes?: string;
}): Promise<CommercialProfile> => (await api.patch(`/api/admin/commercials/${id}`, body)).data;

export const deactivateCommercial = async (id: string): Promise<void> => {
  await api.delete(`/api/admin/commercials/${id}`);
};

// ─── Admin Charts API ─────────────────────────────────────────────────────────

export const getAdminReferralsChart = async (
  period = 'day', range = 30,
): Promise<ChartDataPoint[]> =>
  (await api.get('/api/admin/commercials/chart/referrals', { params: { period, range } })).data;

export const getAdminRevenueChart = async (
  period = 'day', range = 30,
): Promise<ChartDataPoint[]> =>
  (await api.get('/api/admin/commercials/chart/revenue', { params: { period, range } })).data;

export const getAdminTopCodes = async (limit = 5): Promise<TopEntry[]> =>
  (await api.get('/api/admin/commercials/chart/top-codes', { params: { limit } })).data;

export const getAdminTopCommercials = async (limit = 5): Promise<TopEntry[]> =>
  (await api.get('/api/admin/commercials/chart/top-commercials', { params: { limit } })).data;

export const getCommercialReferralsChart = async (
  id: string, period = 'day', range = 30,
): Promise<ChartDataPoint[]> =>
  (await api.get(`/api/admin/commercials/${id}/chart/referrals`, { params: { period, range } })).data;

export const getCommercialRevenueChart = async (
  id: string, period = 'day', range = 30,
): Promise<ChartDataPoint[]> =>
  (await api.get(`/api/admin/commercials/${id}/chart/revenue`, { params: { period, range } })).data;

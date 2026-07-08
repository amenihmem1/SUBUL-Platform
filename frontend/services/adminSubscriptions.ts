import { api } from '@/lib/api/client';

/** Subscription status values the admin API accepts (assign / patch). */
export type AdminManagedSubscriptionStatus = 'active' | 'expired';

export interface UserSubscriptionDto {
  id: string;
  userId: number;
  planId: string;
  status: string;
  isTrialUsed: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  plan?: {
    id: string;
    slug: string;
    name: string;
    themeColor?: string;
    type?: string;
  };
}

export interface SubscriptionPlanDto {
  id: string;
  slug: string;
  name: string;
  type?: string;
  themeColor?: string;
  isActive: boolean;
  description?: string;
  billingOptions?: {
    id: string;
    region: string;
    cycle: string;
    priceCents: number;
    currency: string;
    discountText?: string;
  }[];
}

const SUBS_BASE  = '/api/admin/user-subscriptions';
const PLANS_BASE = '/api/admin/subscription-plans';

// ── User Subscriptions ──────────────────────────────────────────────────────

export async function getAdminUserSubscriptions(userId?: number): Promise<UserSubscriptionDto[]> {
  const url = userId != null ? `${SUBS_BASE}?userId=${userId}` : SUBS_BASE;
  const { data } = await api.get<UserSubscriptionDto[]>(url);
  return Array.isArray(data) ? data : [];
}

export async function assignUserSubscription(body: {
  userId: number;
  planId: string;
  status?: AdminManagedSubscriptionStatus;
  periodStart?: string;
  periodEnd?: string;
}): Promise<UserSubscriptionDto> {
  const { data } = await api.post<UserSubscriptionDto>(SUBS_BASE, body);
  return data;
}

export async function updateUserSubscription(
  id: string,
  body: {
    status?: AdminManagedSubscriptionStatus;
    planId?: string;
    periodStart?: string;
    periodEnd?: string;
  },
): Promise<UserSubscriptionDto> {
  const { data } = await api.patch<UserSubscriptionDto>(`${SUBS_BASE}/${id}`, body);
  return data;
}

// ── Subscription Plans ──────────────────────────────────────────────────────

export type AdminSubscriptionPlansScope = 'learner-personal' | undefined;

export async function getAdminPlans(scope?: AdminSubscriptionPlansScope): Promise<SubscriptionPlanDto[]> {
  const url =
    scope === 'learner-personal' ? `${PLANS_BASE}?scope=${encodeURIComponent(scope)}` : PLANS_BASE;
  const { data } = await api.get<SubscriptionPlanDto[]>(url);
  return Array.isArray(data) ? data : [];
}

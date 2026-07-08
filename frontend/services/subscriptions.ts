import { api, API_PATHS } from '@/lib/api/client';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'none' | 'pending_payment';

export type SubscriptionKind =
  | 'free'
  | 'trial_active'
  | 'trial_expired'
  | 'paid_active'
  | 'paid_expired'
  | 'pending_payment'
  | 'cancelled'
  | 'institutional_active';

export type AccessSource = 'none' | 'personal' | 'institutional';

export type AccessRoleContext =
  | 'admin'
  | 'learner'
  | 'commercial'
  | 'university_staff'
  | 'university_student'
  | 'other';

export type PublicPlanSlug = 'free' | 'standard' | 'premium';

export interface PlanEntitlements {
  maxCourses: number;
  maxLabs: number;
  maxCertifications: number;
  maxJobOpportunities: number;
  cvBooster: boolean;
  prioritySupport: boolean;
  trialDurationHours?: number;
}

export interface ContentLimits {
  maxCourses: number;
  maxLabs: number;
  maxCertifications: number;
}

export interface SubscriptionAccessResponse {
  hasAccess: boolean;
  status: SubscriptionStatus;
  kind: SubscriptionKind;
  remainingDays: number;
  trialEndsAt: string | null;
  trialStartsAt: string | null;
  /** @deprecated Use trialHoursUsed */
  trialDaysUsed: number;
  /** @deprecated Use trialTotalHours */
  trialTotalDays: number;
  trialHoursUsed: number;
  trialTotalHours: number;
  trialHoursRemaining: number;
  periodStart: string | null;
  periodEnd: string | null;
  billingCycle: 'monthly' | 'quarterly' | 'semester' | 'annual' | null;
  planName: string | null;
  planSlug: string | null;
  paidPeriodProgress: number;
  contentLimits: ContentLimits;
  accessSource: AccessSource;
  roleContext: AccessRoleContext;
  effectivePlanSlug: PublicPlanSlug;
  entitlements: PlanEntitlements;
  premiumEquivalent: boolean;
  canUsePersonalSubscriptionFlow: boolean;
}

export async function getSubscriptionStatus(): Promise<SubscriptionAccessResponse> {
  const { data } = await api.get<SubscriptionAccessResponse>(API_PATHS.subscriptions('me/status'));
  return data;
}

export async function startFreeTrial(): Promise<SubscriptionAccessResponse & { subscriptionId?: string }> {
  const { data } = await api.post<SubscriptionAccessResponse & { subscriptionId?: string }>(
    API_PATHS.subscriptions('me/start-trial'),
  );
  return data;
}

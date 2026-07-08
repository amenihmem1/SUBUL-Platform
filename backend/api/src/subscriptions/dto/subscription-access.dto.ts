import { SubscriptionStatus } from '../entities/user-subscription.entity';
import { PlanEntitlements, PublicPlanSlug } from '../../config/plans';

export type SubscriptionKind =
  | 'free'
  | 'trial_active'
  | 'trial_expired'
  | 'paid_active'
  | 'paid_expired'
  | 'pending_payment'
  | 'cancelled'
  /** Active university seat (B2B2C); personal subscription may be absent or expired */
  | 'institutional_active';

export interface ContentLimits {
  /** Max accessible courses for this plan (-1 = unlimited) */
  maxCourses: number;
  /** Max accessible labs for this plan (-1 = unlimited) */
  maxLabs: number;
  /** Max accessible certifications for this plan (-1 = unlimited) */
  maxCertifications: number;
}

export const FREE_CONTENT_LIMITS: ContentLimits = { maxCourses: 1, maxLabs: 1, maxCertifications: 0 };
export const PAID_CONTENT_LIMITS: ContentLimits = { maxCourses: -1, maxLabs: -1, maxCertifications: -1 };

export type AccessSource = 'none' | 'personal' | 'institutional';
export type AccessRoleContext =
  | 'admin'
  | 'learner'
  | 'commercial'
  | 'university_staff'
  | 'university_student'
  | 'other';

export class SubscriptionAccessDto {
  hasAccess!: boolean;
  status!: SubscriptionStatus | 'none';
  kind!: SubscriptionKind;
  remainingDays!: number;
  trialEndsAt!: string | null;
  trialStartsAt!: string | null;
  /** @deprecated Use trialHoursUsed for 24h trial */
  trialDaysUsed!: number;
  /** @deprecated Use trialTotalHours for 24h trial */
  trialTotalDays!: number;
  /** Hours elapsed since trial start (0–trialTotalHours) */
  trialHoursUsed!: number;
  /** Total trial duration in hours */
  trialTotalHours!: number;
  /** Hours remaining in trial */
  trialHoursRemaining!: number;
  periodStart!: string | null;
  periodEnd!: string | null;
  billingCycle!: 'monthly' | 'quarterly' | 'semester' | 'annual' | null;
  planName!: string | null;
  planSlug!: string | null;
  /** 0–1: elapsed portion of current paid period (for progress bar) */
  paidPeriodProgress!: number;
  /** Content access limits for the current plan */
  contentLimits!: ContentLimits;
  /** Source of learner access: personal subscription/trial vs institutional seat */
  accessSource!: AccessSource;
  /** Coarse role context used by policy helpers and frontend UI decisions */
  roleContext!: AccessRoleContext;
  /** Effective public entitlement tier; institutional maps to premium */
  effectivePlanSlug!: PublicPlanSlug;
  /** Canonical feature entitlement envelope used by API guards/UI */
  entitlements!: PlanEntitlements;
  /** True for Premium or institutional premium-equivalent access */
  premiumEquivalent!: boolean;
  /** Whether personal learner subscription UI/actions should be visible */
  canUsePersonalSubscriptionFlow!: boolean;
}

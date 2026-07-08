import { PlanEntitlements, PUBLIC_PLANS, PublicPlanSlug } from '../config/plans';
import type { SubscriptionKind } from './dto/subscription-access.dto';

/**
 * Maps runtime subscription state to the public plan slug whose entitlements apply.
 * Institutional (B2B2C) students use Premium-equivalent learning entitlements.
 */
export function effectivePublicPlanSlug(kind: SubscriptionKind, planSlug: string | null | undefined): PublicPlanSlug {
  if (kind === 'institutional_active') return 'premium';
  const s = String(planSlug ?? '').trim().toLowerCase();
  if (kind === 'paid_active') {
    if (s === 'premium') return 'premium';
    if (s === 'standard') return 'standard';
  }
  return 'free';
}

export function entitlementsForSubscriptionState(
  kind: SubscriptionKind,
  planSlug: string | null | undefined,
): PlanEntitlements {
  return PUBLIC_PLANS[effectivePublicPlanSlug(kind, planSlug)].entitlements;
}

export function isPremiumEquivalentSlug(slug: PublicPlanSlug): boolean {
  return slug === 'premium';
}

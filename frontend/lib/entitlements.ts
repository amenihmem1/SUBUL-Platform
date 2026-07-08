import type { SubscriptionAccessResponse } from '@/services/subscriptions';

/** Server-driven: personal learner checkout / trials vs institution-managed access. */
export function isUniversitySubscriptionManaged(status: SubscriptionAccessResponse | null | undefined): boolean {
  return status?.accessSource === 'institutional' || status?.kind === 'institutional_active';
}

/** True when the user may use personal Standard/Premium checkout and trial APIs. */
export function shouldShowPersonalLearnerSubscriptionUi(status: SubscriptionAccessResponse | null | undefined): boolean {
  return status?.canUsePersonalSubscriptionFlow === true;
}

export function hasPremiumEquivalentFromStatus(status: SubscriptionAccessResponse | null | undefined): boolean {
  return status?.premiumEquivalent === true;
}

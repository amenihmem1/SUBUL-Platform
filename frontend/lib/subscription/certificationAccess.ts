/**
 * Product rule: learner certifications require Premium-tier access
 * (personal Premium or institutional premium-equivalent). Standard / Free do not unlock certifications.
 */
export const CERTIFICATIONS_UPGRADE_PLAN_SLUG = 'premium' as const;

export function certificationsUpgradeCheckoutHref(
  locale: string,
  cycle: 'monthly' | 'quarterly' | 'semester' | 'annual' = 'monthly',
): string {
  return `/${locale}/checkout?plan=${CERTIFICATIONS_UPGRADE_PLAN_SLUG}&cycle=${encodeURIComponent(cycle)}&source=certifications&mode=upgrade`;
}

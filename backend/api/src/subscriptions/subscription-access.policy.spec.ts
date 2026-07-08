import { effectivePublicPlanSlug, entitlementsForSubscriptionState, isPremiumEquivalentSlug } from './subscription-access.policy';

describe('subscription-access.policy', () => {
  it('maps institutional to premium entitlements', () => {
    expect(effectivePublicPlanSlug('institutional_active', 'institutional')).toBe('premium');
    const e = entitlementsForSubscriptionState('institutional_active', 'institutional');
    expect(e.maxCertifications).toBe(-1);
    expect(e.maxJobOpportunities).toBe(20);
  });

  it('maps paid standard vs premium', () => {
    expect(effectivePublicPlanSlug('paid_active', 'standard')).toBe('standard');
    expect(entitlementsForSubscriptionState('paid_active', 'standard').maxCertifications).toBe(0);
    expect(effectivePublicPlanSlug('paid_active', 'premium')).toBe('premium');
    expect(entitlementsForSubscriptionState('paid_active', 'premium').maxJobOpportunities).toBe(20);
  });

  it('flags premium slug', () => {
    expect(isPremiumEquivalentSlug('premium')).toBe(true);
    expect(isPremiumEquivalentSlug('standard')).toBe(false);
  });
});

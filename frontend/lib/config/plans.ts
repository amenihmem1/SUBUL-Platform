/**
 * Mirror of `backend/api/src/config/plans.ts` for UI copy + price fallbacks.
 * Keep slugs, entitlements, feature lines, and billing cents aligned with the backend.
 */

export type PublicPlanSlug = 'free' | 'standard' | 'premium';

export const PUBLIC_PLAN_SLUGS: PublicPlanSlug[] = ['free', 'standard', 'premium'];

export type BillingCycle = 'monthly' | 'quarterly' | 'semester' | 'annual';

export type PricingRegion = 'TN' | 'EU' | 'US' | 'DEFAULT';

export interface PlanFeatureLine {
  label: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanBillingOptionSeed {
  region: PricingRegion;
  cycle: BillingCycle;
  priceCents: number;
  currency: 'TND' | 'EUR' | 'USD';
  discountText?: string;
}

export interface PublicPlanUiConfig {
  slug: PublicPlanSlug;
  name: string;
  type: 'free' | 'standard' | 'premium';
  visibility: 'public';
  themeColor: string;
  badgeText?: string;
  sortOrder: number;
  description: string;
  featureLines: PlanFeatureLine[];
  billingOptions: PlanBillingOptionSeed[];
}

export const PUBLIC_PLANS: Record<PublicPlanSlug, PublicPlanUiConfig> = {
  free: {
    slug: 'free',
    name: 'Plan Gratuit',
    type: 'free',
    visibility: 'public',
    themeColor: 'emerald',
    sortOrder: 1,
    description: 'Découvrez la plateforme sans frais pendant 24 heures.',
    featureLines: [
      { label: '1 cours au choix', included: true },
      { label: '1 laboratoire pratique', included: true },
      { label: "Pas d'accès aux certifications", included: false },
      { label: "Pas d'opportunités d'emploi", included: false },
      { label: 'Support communautaire', included: true },
    ],
    billingOptions: [],
  },
  standard: {
    slug: 'standard',
    name: 'Plan Standard',
    type: 'standard',
    visibility: 'public',
    themeColor: 'violet',
    sortOrder: 2,
    description: 'Montez en compétences avec un catalogue complet et un suivi carrière.',
    featureLines: [
      { label: 'Accès à plusieurs cours', included: true, highlight: true },
      { label: 'Laboratoires pratiques inclus', included: true },
      { label: "Jusqu'à 5 opportunités d'emploi", included: true, highlight: true },
      { label: 'CV + LinkedIn booster', included: true },
      { label: "Pas d'accès aux certifications", included: false },
      { label: 'Support prioritaire', included: true },
    ],
    billingOptions: [
      { region: 'TN', cycle: 'monthly', priceCents: 49990, currency: 'TND' },
      { region: 'TN', cycle: 'quarterly', priceCents: 134970, currency: 'TND', discountText: '-10%' },
      { region: 'TN', cycle: 'annual', priceCents: 419880, currency: 'TND', discountText: '-30%' },
      { region: 'EU', cycle: 'monthly', priceCents: 4999, currency: 'EUR' },
      { region: 'EU', cycle: 'quarterly', priceCents: 13498, currency: 'EUR', discountText: '-10%' },
      { region: 'EU', cycle: 'annual', priceCents: 59988, currency: 'EUR' },
      { region: 'US', cycle: 'monthly', priceCents: 999, currency: 'USD' },
      { region: 'US', cycle: 'quarterly', priceCents: 2997, currency: 'USD' },
      { region: 'US', cycle: 'annual', priceCents: 11988, currency: 'USD' },
    ],
  },
  premium: {
    slug: 'premium',
    name: 'Plan Premium',
    type: 'premium',
    visibility: 'public',
    themeColor: 'fuchsia',
    sortOrder: 3,
    badgeText: 'Le plus populaire',
    description: 'Expérience complète: certifications, coaching carrière et support 24/7.',
    featureLines: [
      { label: 'Accès à tous les cours', included: true, highlight: true },
      { label: 'Laboratoires avancés illimités', included: true },
      { label: 'Accès complet aux certifications', included: true, highlight: true },
      { label: "Jusqu'à 20 opportunités d'emploi", included: true, highlight: true },
      { label: 'CV + LinkedIn booster avancé', included: true },
      { label: 'Coaching carrière & support 24/7', included: true },
    ],
    billingOptions: [
      { region: 'TN', cycle: 'monthly', priceCents: 79990, currency: 'TND' },
      { region: 'TN', cycle: 'quarterly', priceCents: 215990, currency: 'TND', discountText: '-10%' },
      { region: 'TN', cycle: 'annual', priceCents: 669990, currency: 'TND', discountText: '-30%' },
      { region: 'EU', cycle: 'monthly', priceCents: 7999, currency: 'EUR' },
      { region: 'EU', cycle: 'quarterly', priceCents: 21599, currency: 'EUR', discountText: '-10%' },
      { region: 'EU', cycle: 'annual', priceCents: 66999, currency: 'EUR', discountText: '-30%' },
      { region: 'US', cycle: 'monthly', priceCents: 1599, currency: 'USD' },
      { region: 'US', cycle: 'quarterly', priceCents: 4317, currency: 'USD', discountText: '-10%' },
      { region: 'US', cycle: 'annual', priceCents: 13432, currency: 'USD', discountText: '-30%' },
    ],
  },
};

export function isPublicPlanSlug(s: string | null | undefined): s is PublicPlanSlug {
  return s === 'free' || s === 'standard' || s === 'premium';
}

/** Config fallback for one region + cycle (when `getPricing` fails). */
export function pickConfigBillingOption(
  slug: PublicPlanSlug,
  region: string,
  cycle: BillingCycle,
): PlanBillingOptionSeed | undefined {
  if (slug === 'free') return undefined;
  const plan = PUBLIC_PLANS[slug];
  const c = cycle === 'semester' ? 'quarterly' : cycle;
  const r = region === 'TN' || region === 'EU' || region === 'US' ? region : 'EU';
  return (
    plan.billingOptions.find((o) => o.region === r && o.cycle === c) ||
    plan.billingOptions.find((o) => o.region === 'DEFAULT' && o.cycle === c) ||
    plan.billingOptions.find((o) => o.region === r)
  );
}

export function getPublicPlanDisplayName(slug: string | null | undefined, apiName?: string | null): string {
  if (!slug) return apiName?.trim() || '';
  const key = slug.toLowerCase();
  if (isPublicPlanSlug(key)) return PUBLIC_PLANS[key].name;
  return (apiName && apiName.trim()) || slug;
}

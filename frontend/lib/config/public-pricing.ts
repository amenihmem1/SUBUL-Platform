import type { BillingCycle } from '@/services/payments';

export type PricingRegion = 'TN' | 'EU' | 'US';
export type PublicMarketingPlanSlug = 'free' | 'standard' | 'premium' | 'university' | 'enterprise';
export type PublicCtaKind = 'trial' | 'checkout' | 'quote';

export interface PublicPlanFeature {
  label: string;
  included: boolean;
  highlight?: boolean;
}

export interface PublicPlanPrice {
  cycle: Exclude<BillingCycle, 'semester'>;
  amountCents: number;
  currency: 'TND' | 'EUR' | 'USD';
  discountText?: string;
  popular?: boolean;
}

export interface PublicMarketingPlan {
  slug: PublicMarketingPlanSlug;
  name: string;
  tagline: string;
  description: string;
  ctaLabel: string;
  ctaKind: PublicCtaKind;
  purchasable: boolean;
  featured?: boolean;
  badge?: string;
  features: PublicPlanFeature[];
  prices?: Record<PricingRegion, PublicPlanPrice[]>;
}

export const BILLING_SELECTOR_OPTIONS: ReadonlyArray<{
  cycle: Exclude<BillingCycle, 'semester'>;
  label: string;
  subtitle: string;
  badge?: string;
  popular?: boolean;
}> = [
  { cycle: 'monthly', label: 'Mensuel', subtitle: 'Flexibilité totale' },
  { cycle: 'quarterly', label: 'Trimestriel', subtitle: 'Économisez 10%', badge: '-10%' },
  { cycle: 'annual', label: 'Annuel', subtitle: 'Meilleure valeur', badge: '-30%', popular: true },
];

export const CORE_MARKETING_PLAN_ORDER: ReadonlyArray<PublicMarketingPlanSlug> = [
  'free',
  'standard',
  'premium',
];

export const INSTITUTIONAL_PLAN_ORDER: ReadonlyArray<PublicMarketingPlanSlug> = [
  'university',
  'enterprise',
];

export const PUBLIC_MARKETING_PLANS: Record<PublicMarketingPlanSlug, PublicMarketingPlan> = {
  free: {
    slug: 'free',
    name: 'Plan Gratuit',
    tagline: 'Essai découverte',
    description: 'Découvrez l’expérience SUBUL sans frais pendant 24 heures.',
    ctaLabel: 'Commencer gratuitement',
    ctaKind: 'trial',
    purchasable: true,
    features: [
      { label: '1 cours au choix', included: true },
      { label: '1 laboratoire pratique', included: true },
      { label: "Pas d'accès aux certifications", included: false },
      { label: "Pas d'opportunités d'emploi", included: false },
      { label: 'Support communautaire', included: true },
    ],
  },
  standard: {
    slug: 'standard',
    name: 'Plan Standard',
    tagline: 'Performance continue',
    description: 'Accélérez vos compétences avec un catalogue complet et un suivi carrière structuré.',
    ctaLabel: "S'abonner maintenant",
    ctaKind: 'checkout',
    purchasable: true,
    features: [
      { label: 'Accès à plusieurs cours', included: true, highlight: true },
      { label: 'Laboratoires pratiques inclus', included: true },
      { label: "Jusqu'à 5 opportunités d'emploi", included: true, highlight: true },
      { label: 'CV + LinkedIn booster', included: true },
      { label: "Pas d'accès aux certifications", included: false },
      { label: 'Support prioritaire', included: true },
    ],
    prices: {
      TN: [
        { cycle: 'monthly', amountCents: 49990, currency: 'TND' },
        { cycle: 'quarterly', amountCents: 134970, currency: 'TND', discountText: '-10%' },
        { cycle: 'annual', amountCents: 419880, currency: 'TND', discountText: '-30%' },
      ],
      EU: [
        { cycle: 'monthly', amountCents: 4999, currency: 'EUR' },
        { cycle: 'quarterly', amountCents: 13498, currency: 'EUR', discountText: '-10%' },
        { cycle: 'annual', amountCents: 41992, currency: 'EUR', discountText: '-30%' },
      ],
      US: [
        { cycle: 'monthly', amountCents: 999, currency: 'USD' },
        { cycle: 'quarterly', amountCents: 2697, currency: 'USD', discountText: '-10%' },
        { cycle: 'annual', amountCents: 8392, currency: 'USD', discountText: '-30%' },
      ],
    },
  },
  premium: {
    slug: 'premium',
    name: 'Plan Premium',
    tagline: 'Excellence complète',
    description: 'Certifications, coaching carrière premium et accompagnement prioritaire 24/7.',
    ctaLabel: "S'abonner maintenant",
    ctaKind: 'checkout',
    purchasable: true,
    featured: true,
    badge: 'Le plus populaire',
    features: [
      { label: 'Accès à tous les cours', included: true, highlight: true },
      { label: 'Laboratoires avancés illimités', included: true },
      { label: 'Accès complet aux certifications', included: true, highlight: true },
      { label: "Jusqu'à 20 opportunités d'emploi", included: true, highlight: true },
      { label: 'CV + LinkedIn booster avancé', included: true },
      { label: 'Coaching carrière & support 24/7', included: true },
    ],
    prices: {
      TN: [
        { cycle: 'monthly', amountCents: 79990, currency: 'TND' },
        { cycle: 'quarterly', amountCents: 215990, currency: 'TND', discountText: '-10%' },
        { cycle: 'annual', amountCents: 669990, currency: 'TND', discountText: '-30%', popular: true },
      ],
      EU: [
        { cycle: 'monthly', amountCents: 7999, currency: 'EUR' },
        { cycle: 'quarterly', amountCents: 21599, currency: 'EUR', discountText: '-10%' },
        { cycle: 'annual', amountCents: 67192, currency: 'EUR', discountText: '-30%', popular: true },
      ],
      US: [
        { cycle: 'monthly', amountCents: 1599, currency: 'USD' },
        { cycle: 'quarterly', amountCents: 4317, currency: 'USD', discountText: '-10%' },
        { cycle: 'annual', amountCents: 13432, currency: 'USD', discountText: '-30%', popular: true },
      ],
    },
  },
  university: {
    slug: 'university',
    name: 'Plan Universitaire',
    tagline: 'Campus & académies',
    description:
      'Licences académiques, gestion des promotions et parcours pédagogiques personnalisés.',
    ctaLabel: 'Demander un devis',
    ctaKind: 'quote',
    purchasable: false,
    features: [
      { label: 'Licences et cohortes multi-promotions', included: true, highlight: true },
      { label: 'Tableau de bord pédagogique centralisé', included: true },
      { label: 'Parcours cloud / IA / cyber adaptés aux cursus', included: true },
      { label: 'Accompagnement onboarding des équipes pédagogiques', included: true },
    ],
  },
  enterprise: {
    slug: 'enterprise',
    name: 'Entreprise sur devis',
    tagline: 'Scale entreprise',
    description: 'Formation à grande échelle, gouvernance avancée, reporting RH et accompagnement dédié.',
    ctaLabel: 'Demander un devis',
    ctaKind: 'quote',
    purchasable: false,
    features: [
      { label: 'Parcours équipes avec objectifs métiers', included: true, highlight: true },
      { label: 'Gestion des accès SSO et gouvernance', included: true },
      { label: 'Pilotage KPI talent et employabilité', included: true },
      { label: 'Customer Success dédié et support prioritaire', included: true },
    ],
  },
};

export function resolvePricingRegion(region?: string): PricingRegion {
  if (region === 'TN' || region === 'EU' || region === 'US') return region;
  return 'TN';
}

export function getPlanPrice(
  plan: PublicMarketingPlan,
  region: PricingRegion,
  cycle: Exclude<BillingCycle, 'semester'>,
): PublicPlanPrice | null {
  const rows = plan.prices?.[region] ?? plan.prices?.TN;
  if (!rows?.length) return null;
  return rows.find((entry) => entry.cycle === cycle) ?? null;
}

export function getMonthlyReferencePrice(
  plan: PublicMarketingPlan,
  region: PricingRegion,
): PublicPlanPrice | null {
  return getPlanPrice(plan, region, 'monthly');
}

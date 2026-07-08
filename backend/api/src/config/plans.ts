/**
 * Code-owned source of truth for the three public subscription plans.
 *
 * This config drives:
 *   - `SubscriptionsService.onModuleInit()` plan seeding
 *   - `SeedCorePricingPlans` migration
 *   - `PaymentsService.getPricingForIp()` fallback
 *
 * The frontend mirror at `frontend/lib/config/plans.ts` MUST stay in sync for
 * slug, type, name, and feature-line wording. Prices are owned by the backend.
 *
 * Pricing units:
 *   - TND plans use millimes (1 TND = 1000)
 *   - EUR / USD plans use cents (1 EUR = 100)
 */

import type { PlanType, PlanVisibility } from '../subscriptions/entities/subscription-plan.entity';
import type {
  PricingRegion,
  BillingCycle,
} from '../subscriptions/entities/plan-billing-option.entity';

export const PUBLIC_PLAN_SLUGS = ['free', 'standard', 'premium'] as const;
export type PublicPlanSlug = (typeof PUBLIC_PLAN_SLUGS)[number];

/** Entitlement numbers consumed by dashboard / guard code. `-1` = unlimited. */
export interface PlanEntitlements {
  maxCourses: number;
  maxLabs: number;
  maxCertifications: number;
  maxJobOpportunities: number;
  cvBooster: boolean;
  prioritySupport: boolean;
  trialDurationHours?: number;
}

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
  isActive?: boolean;
}

export interface PublicPlanConfig {
  slug: PublicPlanSlug;
  name: string;
  type: PlanType;
  visibility: PlanVisibility;
  themeColor: string;
  badgeText?: string;
  sortOrder: number;
  description: string;
  entitlements: PlanEntitlements;
  featureLines: PlanFeatureLine[];
  billingOptions: PlanBillingOptionSeed[];
}

export const PUBLIC_PLANS: Record<PublicPlanSlug, PublicPlanConfig> = {
  free: {
    slug: 'free',
    name: 'Plan Gratuit',
    type: 'free',
    visibility: 'public',
    themeColor: 'emerald',
    sortOrder: 1,
    description: 'Découvrez la plateforme sans frais pendant 24 heures.',
    entitlements: {
      maxCourses: 1,
      maxLabs: 1,
      maxCertifications: 0,
      maxJobOpportunities: 0,
      cvBooster: false,
      prioritySupport: false,
      trialDurationHours: 24,
    },
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
    entitlements: {
      maxCourses: -1,
      maxLabs: -1,
      maxCertifications: 0,
      maxJobOpportunities: 5,
      cvBooster: true,
      prioritySupport: false,
    },
    featureLines: [
      { label: 'Accès à plusieurs cours', included: true, highlight: true },
      { label: 'Laboratoires pratiques inclus', included: true },
      { label: "Jusqu'à 5 opportunités d'emploi", included: true, highlight: true },
      { label: 'CV + LinkedIn booster', included: true },
      { label: "Pas d'accès aux certifications", included: false },
      { label: 'Support prioritaire', included: true },
    ],
    billingOptions: [
      // Tunisia — Flouci (TND, millimes)
      { region: 'TN', cycle: 'monthly', priceCents: 49990, currency: 'TND', isActive: true },
      { region: 'TN', cycle: 'quarterly', priceCents: 134970, currency: 'TND', discountText: '-10%', isActive: true },
      { region: 'TN', cycle: 'annual', priceCents: 419880, currency: 'TND', discountText: '-30%', isActive: true },
      // Europe — Stripe (EUR, cents)
      { region: 'EU', cycle: 'monthly', priceCents: 4999, currency: 'EUR', isActive: true },
      { region: 'EU', cycle: 'quarterly', priceCents: 13498, currency: 'EUR', discountText: '-10%', isActive: true },
      { region: 'EU', cycle: 'annual', priceCents: 59988, currency: 'EUR', isActive: true },
      // United States / Global — Stripe (USD, cents)
      { region: 'US', cycle: 'monthly', priceCents: 999, currency: 'USD', isActive: true },
      { region: 'US', cycle: 'quarterly', priceCents: 2997, currency: 'USD', isActive: true },
      { region: 'US', cycle: 'annual', priceCents: 11988, currency: 'USD', isActive: true },
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
    entitlements: {
      maxCourses: -1,
      maxLabs: -1,
      maxCertifications: -1,
      maxJobOpportunities: 20,
      cvBooster: true,
      prioritySupport: true,
    },
    featureLines: [
      { label: 'Accès à tous les cours', included: true, highlight: true },
      { label: 'Laboratoires avancés illimités', included: true },
      { label: 'Accès complet aux certifications', included: true, highlight: true },
      { label: "Jusqu'à 20 opportunités d'emploi", included: true, highlight: true },
      { label: 'CV + LinkedIn booster avancé', included: true },
      { label: 'Coaching carrière & support 24/7', included: true },
    ],
    billingOptions: [
      // Tunisia
      { region: 'TN', cycle: 'monthly', priceCents: 79990, currency: 'TND', isActive: true },
      { region: 'TN', cycle: 'quarterly', priceCents: 215990, currency: 'TND', discountText: '-10%', isActive: true },
      { region: 'TN', cycle: 'annual', priceCents: 669990, currency: 'TND', discountText: '-30%', isActive: true },
      // Europe
      { region: 'EU', cycle: 'monthly', priceCents: 7999, currency: 'EUR', isActive: true },
      { region: 'EU', cycle: 'quarterly', priceCents: 21599, currency: 'EUR', discountText: '-10%', isActive: true },
      { region: 'EU', cycle: 'annual', priceCents: 66999, currency: 'EUR', discountText: '-30%', isActive: true },
      // US — priced in USD (not EU cent parity). Premium ≈ 1.6× Standard monthly, same -10% / -30% as EU.
      { region: 'US', cycle: 'monthly', priceCents: 1599, currency: 'USD', isActive: true },
      { region: 'US', cycle: 'quarterly', priceCents: 4317, currency: 'USD', discountText: '-10%', isActive: true },
      { region: 'US', cycle: 'annual', priceCents: 13432, currency: 'USD', discountText: '-30%', isActive: true },
    ],
  },
};

/** Free plan slug — referenced by trial activation (`startTrial`). */
export const FREE_PLAN_SLUG: PublicPlanSlug = 'free';

/** Legacy slug used before the free plan was renamed; used only by the migration. */
export const LEGACY_FREE_PLAN_SLUG = 'basic';

/** True if the slug corresponds to a plan this code owns end-to-end. */
export function isPublicPlanSlug(slug: string | null | undefined): slug is PublicPlanSlug {
  return !!slug && (PUBLIC_PLAN_SLUGS as readonly string[]).includes(slug);
}

const PRICING_REGIONS = ['TN', 'EU', 'US'] as const;
type PublicPricingRegion = (typeof PRICING_REGIONS)[number];

/**
 * Fallback cents when DB billing rows are missing (public pricing endpoint).
 * Mirrors `billingOptions` in this file.
 */
export function getPublicPlanPricingFallback(
  planSlug: PublicPlanSlug,
  region: PublicPricingRegion,
): { monthly: number; quarterly: number; annual: number; currency: string } | null {
  if (planSlug === 'free') return null;
  const plan = PUBLIC_PLANS[planSlug];
  const opts = plan.billingOptions.filter((o) => o.region === region && (o.isActive ?? true));
  if (!opts.length) return null;
  const monthly = opts.find((o) => o.cycle === 'monthly');
  const quarterly = opts.find((o) => o.cycle === 'quarterly' || o.cycle === 'semester');
  const annual = opts.find((o) => o.cycle === 'annual');
  if (!monthly) return null;
  return {
    monthly: monthly.priceCents,
    quarterly: quarterly?.priceCents ?? monthly.priceCents * 3,
    annual: annual?.priceCents ?? monthly.priceCents * 12,
    currency: monthly.currency,
  };
}

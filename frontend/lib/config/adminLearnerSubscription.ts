/**
 * Admin "Gérer l'abonnement" — personal learner plans only (mirror of backend
 * `config/admin-learner-subscription.ts` rules).
 */

import { PUBLIC_PLAN_SLUGS } from '@/lib/config/plans';

const SLUGS = new Set<string>(PUBLIC_PLAN_SLUGS);

const PERIOD_END_TOLERANCE_MS = 36 * 60 * 60 * 1000;

export function isLearnerPersonalAdminPlanSlug(slug?: string | null): boolean {
  if (slug == null || slug === '') return false;
  return SLUGS.has(slug.trim().toLowerCase());
}

export function isLearnerPersonalAdminPlan(plan?: { slug?: string; type?: string } | null): boolean {
  if (!plan) return false;
  if (isLearnerPersonalAdminPlanSlug(plan.slug)) return true;
  const t = (plan.type ?? '').toLowerCase();
  return t === 'free' || t === 'standard' || t === 'premium';
}

/** Duration chips for Plan Gratuit (24h from start). */
export const ADMIN_LEARNER_FREE_DURATION_PRESETS = [{ label: '24h', months: 0, days: 1 }] as const;

/** Duration chips for Standard / Premium — 1, 3, or 12 months only (no 6 months). */
export const ADMIN_LEARNER_PAID_DURATION_PRESETS = [
  { label: '1 Mois', months: 1, days: 0 },
  { label: '3 Mois', months: 3, days: 0 },
  { label: '1 An', months: 12, days: 0 },
] as const;

function expectedEndAfterMonths(start: Date, months: number): Date {
  const d = new Date(start.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Client-side check aligned with `assertAdminLearnerPaidPeriod` (tolerance for DST / date-only). */
export function isValidAdminLearnerPaidPeriod(start: Date, end: Date): boolean {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return false;
  }
  for (const m of [1, 3, 12] as const) {
    const expected = expectedEndAfterMonths(start, m);
    if (Math.abs(end.getTime() - expected.getTime()) <= PERIOD_END_TOLERANCE_MS) return true;
  }
  return false;
}

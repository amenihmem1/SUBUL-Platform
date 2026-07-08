import { BadRequestException } from '@nestjs/common';
import { PUBLIC_PLAN_SLUGS } from './plans';
import type { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';

const LEARNER_ADMIN_SLUGS = new Set<string>(PUBLIC_PLAN_SLUGS);

/** Allowed paid subscription lengths for admin learner assign/patch (calendar months from start). */
export const ADMIN_LEARNER_PAID_DURATION_MONTHS = [1, 3, 12] as const;

/** Match `expectedEndAfterMonths` within this window (DST / date-only payloads). */
const PERIOD_END_TOLERANCE_MS = 36 * 60 * 60 * 1000;

export function isLearnerPersonalAdminPlanSlug(slug: string | null | undefined): boolean {
  if (slug == null || slug === '') return false;
  return LEARNER_ADMIN_SLUGS.has(slug.trim().toLowerCase());
}

export function assertAdminLearnerPlanSlug(plan: SubscriptionPlan): void {
  const s = (plan.slug ?? '').trim().toLowerCase();
  if (!LEARNER_ADMIN_SLUGS.has(s)) {
    throw new BadRequestException(
      `Plan "${plan.slug}" cannot be used in the learner personal subscription admin flow. Only free, standard, and premium are allowed.`,
    );
  }
}

function expectedEndAfterMonths(start: Date, months: number): Date {
  const d = new Date(start.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Validates that `end` matches one of 1 / 3 / 12 calendar months after `start`
 * (within tolerance). Used for Standard/Premium admin assignments.
 */
export function assertAdminLearnerPaidPeriod(start: Date, end: Date): void {
  if (!(start instanceof Date) || !(end instanceof Date) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestException('Invalid subscription period dates.');
  }
  if (end.getTime() <= start.getTime()) {
    throw new BadRequestException('Subscription end date must be after start date.');
  }
  for (const m of ADMIN_LEARNER_PAID_DURATION_MONTHS) {
    const expected = expectedEndAfterMonths(start, m);
    if (Math.abs(end.getTime() - expected.getTime()) <= PERIOD_END_TOLERANCE_MS) {
      return;
    }
  }
  const approxDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  throw new BadRequestException(
    `Invalid paid subscription duration: must be exactly 1, 3, or 12 months from the start date (approximately ${approxDays} days given).`,
  );
}

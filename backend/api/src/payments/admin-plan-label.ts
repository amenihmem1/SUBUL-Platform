import { Logger } from '@nestjs/common';
import { isPublicPlanSlug, LEGACY_FREE_PLAN_SLUG, PUBLIC_PLANS } from '../config/plans';

const logger = new Logger('AdminPlanLabel');

export type ResolvedAdminPlanKey = 'standard' | 'premium' | 'free' | 'unknown';

/**
 * Single source for admin UI plan labels from `plan_slug` + `plan_name`.
 * Never throws; unknown slugs log once per row (with tx id when provided).
 */
export function resolveAdminPlanDisplayLabel(
  planSlug: string | null | undefined,
  planName: string | null | undefined,
  txId?: string,
): { label: string; key: ResolvedAdminPlanKey } {
  const raw = (planSlug ?? '').trim().toLowerCase();
  if (raw === LEGACY_FREE_PLAN_SLUG) {
    return { label: PUBLIC_PLANS.free.name, key: 'free' };
  }
  if (isPublicPlanSlug(raw)) {
    return { label: PUBLIC_PLANS[raw].name, key: raw };
  }
  const name = (planName ?? '').trim();
  const lower = name.toLowerCase();
  if (lower.includes('premium')) return { label: 'Premium', key: 'unknown' };
  if (lower.includes('standard')) return { label: 'Standard', key: 'unknown' };
  if (lower.includes('free') || lower.includes('gratuit')) {
    return { label: PUBLIC_PLANS.free.name, key: 'unknown' };
  }
  if (txId) {
    logger.warn(`[AdminTx] Unknown plan for tx=${txId} slug=${planSlug ?? ''} name=${planName ?? ''}`);
  }
  return { label: 'Unknown plan', key: 'unknown' };
}

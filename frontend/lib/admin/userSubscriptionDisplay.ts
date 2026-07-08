import type { UserSubscriptionDto } from '@/services/adminSubscriptions';

export type AdminSubscriptionUiStatus = 'active' | 'expired';

/**
 * Picks the canonical admin row for a learner: latest by `createdAt`, matching
 * `SubscriptionsService.getLatestSubscription`. Use this instead of
 * `subs.find(s => s.userId === id)` on globally-merged lists (ordering is not per-user).
 */
export function pickLatestUserSubscriptionForUser(
  subs: UserSubscriptionDto[] | undefined,
  userId: number,
): UserSubscriptionDto | undefined {
  if (!subs?.length) return undefined;
  const rows = subs.filter((s) => Number(s.userId) === Number(userId));
  if (!rows.length) return undefined;
  return [...rows].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (tb !== ta) return tb - ta;
    return String(b.id).localeCompare(String(a.id));
  })[0];
}

function parseEndDate(sub: UserSubscriptionDto): Date | null {
  const raw = sub.currentPeriodEnd || sub.trialEndDate;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseStartDate(sub: UserSubscriptionDto): Date | null {
  const raw = sub.currentPeriodStart || sub.trialStartDate;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** End date shown in admin UI (period end, else trial end). */
export function adminSubscriptionEndDate(sub: UserSubscriptionDto): string | null {
  return sub.currentPeriodEnd || sub.trialEndDate || null;
}

/**
 * Maps any DB subscription row to the two admin-facing states (active / expired).
 * Trial and other statuses use period / trial end vs now when possible.
 */
export function adminSubscriptionUiStatus(sub: UserSubscriptionDto): AdminSubscriptionUiStatus {
  const s = (sub.status || '').toLowerCase();
  const now = Date.now();
  const end = parseEndDate(sub);

  if (s === 'active') {
    if (end && end.getTime() < now) return 'expired';
    return 'active';
  }

  if (s === 'expired' || s === 'cancelled' || s === 'none') {
    return 'expired';
  }

  if (s === 'pending_payment') {
    return 'expired';
  }

  if (s === 'trial') {
    if (end && end.getTime() >= now) return 'active';
    if (!end) return 'active';
    return 'expired';
  }

  if (end) {
    return end.getTime() >= now ? 'active' : 'expired';
  }

  const start = parseStartDate(sub);
  if (start && start.getTime() > now) return 'active';

  return 'expired';
}

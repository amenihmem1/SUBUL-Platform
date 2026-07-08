'use client';

import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import type { SubscriptionAccessResponse } from '@/services/subscriptions';

export type PlanUsageState = 'normal' | 'near_limit' | 'expired';

export interface PlanUsageProgressProps {
  usedLabel: string;
  remainingLabel: string;
  percentage: number;
  helperText: string;
  status: PlanUsageState;
}

export function PlanUsageProgress({
  usedLabel,
  remainingLabel,
  percentage,
  helperText,
  status,
}: PlanUsageProgressProps) {
  const { t } = useTranslation();
  const clamped = Math.max(0, Math.min(100, percentage));
  const isNearLimit = status === 'near_limit';
  const isExpired = status === 'expired';

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">{t('planCard.planProgress')}</p>
        <div className="flex flex-wrap items-center gap-2">
          {isNearLimit && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              {t('planCard.expiringSoon')}
            </span>
          )}
          {isExpired && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              {t('planCard.statusExpired')}
            </span>
          )}
        </div>
      </div>

      <p className="mb-3 text-xs font-semibold text-slate-600">{usedLabel}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isExpired
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600'
                  : isNearLimit
                    ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600'
                    : 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
              )}
              style={{ width: `${clamped}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
            {clamped}%
          </span>
          <span className={cn('text-xs font-medium', isExpired ? 'text-rose-600' : 'text-slate-500')}>
            {remainingLabel}
          </span>
        </div>
      </div>

      <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
        <span>{helperText}</span>
      </p>
    </div>
  );
}

type TFn = (key: string, params?: Record<string, string | number>) => string;

const formatDateTime = (value: string | null, locale: string) => {
  if (!value) return '-';
  const d = new Date(value);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const daysBetween = (start: Date, end: Date) =>
  Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

export type DerivedPlanUsage = ReturnType<typeof derivePlanUsage>;

export function derivePlanUsage(
  subscription: SubscriptionAccessResponse | undefined,
  t: TFn,
  locale = 'fr',
) {
  const fallback = {
    planTitle: t('planCard.freeAccess'),
    planSubtitle: t('planCard.freeTagline'),
    startAtDisplay: '—',
    endAtDisplay: '—',
    planBadge: t('planCard.freePlan'),
    usage: {
      usedLabel: t('planCard.hoursUsed', { used: '0', total: '24' }),
      remainingLabel: t('planCard.hoursRemaining', { remaining: '24' }),
      percentage: 0,
      helperText: t('planCard.freeExpiringSoonHelper'),
      status: 'normal' as PlanUsageState,
    },
  };

  if (!subscription) return fallback;

  if (
    subscription.kind === 'trial_active' ||
    subscription.kind === 'free' ||
    subscription.kind === 'trial_expired'
  ) {
    const total = Math.max(1, subscription.trialTotalHours || 24);
    const used = Math.max(0, Math.min(total, subscription.trialHoursUsed || 0));
    const remaining = Math.max(0, subscription.trialHoursRemaining || total - used);
    const pct = Math.round((used / total) * 100);
    const status: PlanUsageState =
      subscription.kind === 'trial_expired' || remaining <= 0
        ? 'expired'
        : pct >= 75
          ? 'near_limit'
          : 'normal';
    const startF = formatDateTime(subscription.trialStartsAt, locale);
    const endF = formatDateTime(subscription.trialEndsAt, locale);

    return {
      planTitle: subscription.planName || t('planCard.freeAccess'),
      planSubtitle: t('planCard.freeTagline'),
      startAtDisplay: startF,
      endAtDisplay: endF,
      planBadge: t('planCard.planBadgeFreeFormat', { total: String(total) }),
      usage: {
        usedLabel: t('planCard.hoursUsed', { used: String(used), total: String(total) }),
        remainingLabel: t('planCard.hoursRemaining', { remaining: String(remaining) }),
        percentage: pct,
        helperText:
          status === 'expired'
            ? t('planCard.freeExpiredHelper')
            : t('planCard.freeExpiringSoonHelper'),
        status,
      },
    };
  }

  const start = subscription.periodStart ? new Date(subscription.periodStart) : new Date();
  const end = subscription.periodEnd ? new Date(subscription.periodEnd) : new Date();
  const now = new Date();
  const totalDays = Math.max(1, daysBetween(start, end));
  const usedDays = Math.min(totalDays, Math.max(0, daysBetween(start, now)));
  const remainingDays = Math.max(0, Math.ceil(daysBetween(now, end)));
  const usedDaysDisplay = Math.max(0, Math.floor(usedDays));
  const pct = Math.round((usedDays / totalDays) * 100);
  const status: PlanUsageState =
    remainingDays <= 0 ? 'expired' : pct >= 85 ? 'near_limit' : 'normal';
  const startF = formatDateTime(subscription.periodStart, locale);
  const endF = formatDateTime(subscription.periodEnd, locale);

  const cycleKey =
    subscription.billingCycle === 'monthly'
      ? 'planCard.cycleMonthly'
      : subscription.billingCycle === 'quarterly'
        ? 'planCard.cycleQuarterly'
        : subscription.billingCycle === 'annual'
          ? 'planCard.cycleAnnual'
          : subscription.billingCycle === 'semester'
            ? 'planCard.cycleSemester'
            : 'planCard.cyclePeriod';

  return {
    planTitle: subscription.planName || t('planCard.activePlan'),
    planSubtitle: t('planCard.activeSubscription'),
    startAtDisplay: startF,
    endAtDisplay: endF,
    planBadge: t('planCard.planBadgeFormat', {
      slug: subscription.planSlug ?? '',
      cycle: t(cycleKey),
    }),
    usage: {
      usedLabel: t('planCard.daysUsed', {
        used: String(usedDaysDisplay),
        total: String(Math.round(totalDays)),
      }),
      remainingLabel: t('planCard.daysRemaining', { remaining: String(remainingDays) }),
      percentage: pct,
      helperText:
        status === 'near_limit'
          ? t('planCard.nearLimitHelper')
          : t('planCard.activeHelper'),
      status,
    },
  };
}

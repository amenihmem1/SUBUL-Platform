'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { getSubscriptionStatus, type SubscriptionKind } from '@/services/subscriptions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getPublicPlanDisplayName } from '@/lib/config/plans';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

/** Subscription kinds rendered in this banner (free/trial use `TrialStatusCard`). */
type PaidBannerKind = Exclude<SubscriptionKind, 'free' | 'trial_active' | 'trial_expired'>;

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function billingLabel(
  cycle: string | null,
  t: (k: string) => string,
): string {
  if (cycle === 'monthly') return t('subscription.banner.billingMonthly');
  if (cycle === 'quarterly') return t('subscription.banner.billingQuarterly');
  if (cycle === 'annual') return t('subscription.banner.billingAnnual');
  return t('subscription.banner.billingStandard');
}

export function SubscriptionStatusBanner() {
  const { t } = useTranslation();
  const params = useParams();
  const locale = String(params?.locale || 'fr');

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="mb-4 h-24 animate-pulse rounded-2xl border border-slate-100 bg-white/80 shadow-sm" />
    );
  }

  // Delegate trial and free states to TrialStatusCard
  if (data.kind === 'trial_active' || data.kind === 'trial_expired' || data.kind === 'free') {
    return null;
  }

  if (data.kind === 'institutional_active') {
    return null;
  }

  const kind: PaidBannerKind = data.kind;
  const paidProgressPct = Math.min(100, Math.max(0, data.paidPeriodProgress * 100));
  const showUpgrade = kind === 'paid_expired';

  const slug = (data.planSlug ?? '').toLowerCase();
  const shouldSuggestPremiumUpgrade =
    kind === 'paid_active' && slug !== 'premium' && (slug === 'standard' || slug === '');

  const checkoutCycle =
    data.billingCycle === 'monthly' || data.billingCycle === 'quarterly' || data.billingCycle === 'annual'
      ? data.billingCycle
      : 'monthly';
  const premiumCheckoutHref = `/${locale}/checkout?plan=premium&cycle=${encodeURIComponent(checkoutCycle)}&mode=upgrade`;

  const variantStyles: Record<PaidBannerKind, string> = {
    paid_active: 'border-violet-200/80 bg-gradient-to-r from-violet-50/90 to-fuchsia-50/40',
    paid_expired: 'border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50/70',
    pending_payment: 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/70',
    cancelled: 'border-slate-300 bg-slate-50',
    institutional_active: 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/70',
  };

  const badgeVariant = (k: PaidBannerKind): 'purple' | 'orange' | 'teal' | 'gray' => {
    if (k === 'paid_active') return 'purple';
    if (k === 'paid_expired') return 'orange';
    if (k === 'pending_payment') return 'teal';
    return 'gray';
  };

  let title = '';
  let subtitle = '';

  switch (kind) {
    case 'paid_active': {
      const displayName = getPublicPlanDisplayName(data.planSlug, data.planName);
      const slugLow = (data.planSlug ?? '').toLowerCase();
      const cycleSuffix =
        slugLow === 'free'
          ? t('subscription.banner.billingFree24h')
          : billingLabel(data.billingCycle, t);
      title = displayName
        ? `${displayName} · ${cycleSuffix}`
        : t('subscription.banner.titlePaid');
      subtitle = t('subscription.banner.subtitlePaid', {
        remaining: String(data.remainingDays),
        end: formatDate(data.periodEnd, locale),
      });
      break;
    }
    case 'paid_expired':
      title = t('subscription.banner.titlePaidExpired');
      subtitle = t('subscription.banner.subtitlePaidExpired');
      break;
    case 'pending_payment':
      title = t('subscription.banner.titlePending');
      subtitle = t('subscription.banner.subtitlePending');
      break;
    case 'cancelled':
      title = t('subscription.banner.titleCancelled');
      subtitle = t('subscription.banner.subtitleCancelled');
      break;
    default: {
      const _exhaustive: never = kind;
      title = String(_exhaustive);
      subtitle = '';
    }
  }

  return (
    <div
      className={cn(
        'mb-4 overflow-hidden rounded-2xl border shadow-sm transition-shadow',
        variantStyles[kind],
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {kind === 'paid_active' && (
              <Badge variant={badgeVariant(kind)} className="gap-1">
                <Crown className="h-3 w-3" />
                {t('subscription.banner.badgePaid')}
              </Badge>
            )}
            {kind === 'paid_expired' && (
              <Badge variant="orange" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('subscription.banner.badgeExpired')}
              </Badge>
            )}
            {kind === 'pending_payment' && (
              <Badge variant="teal" className="gap-1">
                <Clock className="h-3 w-3" />
                {t('subscription.banner.badgePending')}
              </Badge>
            )}
            {kind === 'cancelled' && (
              <Badge variant="gray" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('subscription.banner.badgeCancelled')}
              </Badge>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{title}</h3>
            {subtitle ? <p className="mt-1 text-xs text-slate-600 sm:text-sm">{subtitle}</p> : null}
          </div>

          {kind === 'paid_active' && data.periodStart && data.periodEnd && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-violet-500" />
                  {t('subscription.banner.start')}: {formatDate(data.periodStart, locale)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-violet-500" />
                  {t('subscription.banner.end')}: {formatDate(data.periodEnd, locale)}
                </span>
              </div>
              <Progress value={paidProgressPct} className="h-2" indicatorClassName="from-violet-500 to-fuchsia-500" />
            </div>
          )}

          {kind === 'paid_active' && !data.periodStart && (
            <p className="flex items-center gap-1 text-xs text-slate-600">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {t('subscription.banner.activeOk')}
            </p>
          )}
        </div>

        {ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS && (showUpgrade || shouldSuggestPremiumUpgrade) && (
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {shouldSuggestPremiumUpgrade && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-xl border-violet-300 bg-white/90 font-semibold text-violet-800 shadow-sm hover:bg-violet-50"
              >
                <Link href={premiumCheckoutHref} className="inline-flex items-center gap-2">
                  {t('subscription.banner.upgradeToPremium')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {showUpgrade && (
              <Button
                asChild
                size="sm"
                className={cn(
                  'rounded-xl font-semibold shadow-md',
                  'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
                )}
              >
                <Link
                  href={`/${locale}/checkout?plan=${encodeURIComponent(
                    slug === 'premium' ? 'premium' : 'standard',
                  )}&cycle=monthly&mode=renew`}
                  className="inline-flex items-center gap-2"
                >
                  {t('subscription.banner.upgrade')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

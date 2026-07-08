'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Clock, Crown, Sparkles, Timer } from 'lucide-react';
import { getSubscriptionStatus, type SubscriptionKind } from '@/services/subscriptions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(
      locale === 'fr' ? 'fr-FR' : 'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    );
  } catch {
    return '—';
  }
}

export function TrialStatusCard() {
  const params = useParams();
  const locale = String(params?.locale || 'fr');
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (data && (data.kind === 'trial_expired' || data.kind === 'cancelled') && !data.hasAccess) {
      toast.error(t('subscription.trialExpiredToast'), {
        id: 'trial-expired-toast',
      });
    }
  }, [data, t]);

  if (isLoading || !data) {
    return (
      <div className="mb-6 h-32 animate-pulse rounded-2xl border border-slate-100 bg-white/60 shadow-sm" />
    );
  }

  const kind: SubscriptionKind = data.kind;

  if (kind === 'institutional_active') {
    return null;
  }

  if (kind === 'paid_active' || kind === 'paid_expired') {
    return null;
  }

  const isExpired = kind === 'trial_expired' || kind === 'cancelled';
  const totalHours = data.trialTotalHours || 24;
  const hoursUsed = data.trialHoursUsed || 0;
  const hoursRemaining = data.trialHoursRemaining || 0;
  const progressPct = Math.min(100, Math.max(0, (hoursUsed / totalHours) * 100));

  const startIso = data.trialStartsAt ?? data.periodStart ?? null;
  const endIso = data.trialEndsAt ?? data.periodEnd ?? null;
  const startStr = formatDateTime(startIso, locale);
  const endStr = formatDateTime(endIso, locale);

  const upgradeHref = `/${locale}/checkout?plan=premium&cycle=monthly&mode=upgrade&source=trial-card`;
  const viewPlansHref = `/${locale}/checkout?plan=standard&cycle=monthly&mode=upgrade&source=trial-card-view-plans`;
  const showPersonalUpgrade = data.canUsePersonalSubscriptionFlow === true;

  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 relative overflow-hidden rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 via-orange-50/60 to-amber-50/40 p-6 shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/40 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/20">
              <AlertTriangle className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="gap-1 text-xs font-bold px-2.5 py-0.5">
                  <Timer className="h-3 w-3" />
                  {t('subscription.expired')}
                </Badge>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t('subscription.freeAccessExpired')}
              </h3>
              <p className="text-sm text-slate-600">
                {t('subscription.upgradeToUnlock')}
              </p>
            </div>
          </div>
          {showPersonalUpgrade ? (
            <div className="flex w-full shrink-0 flex-col items-stretch gap-3 sm:w-auto sm:min-w-[280px]">
              <Button
                asChild
                className="h-12 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-5 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:from-red-700 hover:to-orange-700"
              >
                <Link href={upgradeHref}>
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Link
                href={viewPlansHref}
                className="text-center text-xs font-semibold text-slate-600 underline decoration-slate-400 underline-offset-2 hover:text-slate-900"
              >
                View plans
              </Link>
            </div>
          ) : null}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 relative overflow-hidden rounded-2xl border border-purple-200/60 bg-white shadow-lg"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-white to-pink-50/40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-purple-100/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Status info */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 bg-purple-100 border-purple-200 text-purple-700 font-bold px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              {t('subscription.freePlan')} — {t('subscription.banner.billingFree24h')}
            </Badge>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {hoursRemaining}h {t('subscription.remaining')}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
              {t('subscription.freeAccessTitle')}
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1.5">
              <p className="text-xs font-medium text-slate-500">
                <span className="text-slate-400">{t('subscription.start')}:</span> {startStr}
              </p>
              <span className="hidden sm:inline text-slate-300">&rarr;</span>
              <p className="text-xs font-medium text-slate-500">
                <span className="text-slate-400">{t('subscription.expiry')}:</span> {endStr}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Progress + CTA */}
        <div className="flex-1 w-full lg:max-w-sm space-y-4">
          <div className="space-y-3 bg-white/70 p-4 rounded-xl border border-slate-100 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>{hoursUsed}h / {totalHours}h {t('subscription.used')}</span>
              <span className="text-purple-700">{hoursRemaining}h {t('subscription.remaining')}</span>
            </div>
            <div className="h-3.5 w-full bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: mounted ? `${progressPct}%` : 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 rounded-full relative"
              >
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12" />
              </motion.div>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              {t('subscription.freeLimitsHint')}
            </p>
          </div>

          {showPersonalUpgrade && ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS ? (
            <div className="flex flex-col gap-2">
              <Button
                asChild
                className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-fuchsia-700"
              >
                <Link href={upgradeHref}>
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Link
                href={viewPlansHref}
                className="text-center text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-violet-700"
              >
                View plans
              </Link>
              <div className="grid grid-cols-1 gap-2 rounded-xl border border-violet-100 bg-violet-50/40 p-3 text-xs text-slate-700 sm:grid-cols-2">
                <p className="font-semibold">Limites Free</p>
                <p className="text-right text-slate-500">24h · 1 cours · 1 lab</p>
                <p>Certifications</p>
                <p className="text-right text-rose-600">Verrouillees</p>
                <p>Opportunites emploi</p>
                <p className="text-right text-amber-600">Limitees</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Prochaines actions recommandees</p>
                <p className="mt-1">Completer un cours, lancer un lab et explorer les offres emploi pour declencher la meilleure recommandation d'upgrade.</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

'use client';

import { CalendarDays, Users } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { SubscriptionAccessResponse } from '@/services/subscriptions';
import { PlanUsageProgress, type DerivedPlanUsage } from './PlanUsageProgress';

export function LearnerCurrentPlanCard({
  planUsage,
  subscriptionStatus,
  isFree,
}: {
  planUsage: DerivedPlanUsage;
  subscriptionStatus: SubscriptionAccessResponse | undefined;
  isFree: boolean;
}) {
  const { t } = useTranslation();

  const badge = (() => {
    if (!subscriptionStatus) return { label: '—', pillClass: 'bg-slate-100 text-slate-600' };
    switch (subscriptionStatus.kind) {
      case 'paid_active':
      case 'institutional_active':
        return { label: t('planCard.statusActive'), pillClass: 'bg-violet-100 text-violet-700' };
      case 'trial_active':
        return { label: t('planCard.statusTrial'), pillClass: 'bg-violet-100 text-violet-700' };
      case 'free':
        return { label: t('planCard.statusFree'), pillClass: 'bg-slate-100 text-slate-700' };
      case 'trial_expired':
      case 'paid_expired':
        return { label: t('planCard.statusExpired'), pillClass: 'bg-rose-100 text-rose-700' };
      case 'pending_payment':
        return { label: t('planCard.statusPending'), pillClass: 'bg-amber-100 text-amber-800' };
      case 'cancelled':
        return { label: t('planCard.statusCancelled'), pillClass: 'bg-slate-100 text-slate-600' };
      default:
        return { label: t('planCard.statusActive'), pillClass: 'bg-violet-100 text-violet-700' };
    }
  })();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">
          {t('planCard.currentPlan')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {planUsage.planTitle || (isFree ? t('planCard.freeAccess') : t('planCard.activePlan'))}
          </h2>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.pillClass}`}>
            {badge.label}
          </span>
        </div>
        <p className="text-sm text-slate-500">{planUsage.planSubtitle}</p>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-slate-200 border-y border-slate-100 sm:flex-row sm:divide-x sm:divide-y-0">
        <div className="flex flex-1 items-center gap-2 py-3 sm:px-4 sm:first:pl-0">
          <CalendarDays className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
          <span className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{t('planCard.startDate')}</span>{' '}
            {planUsage.startAtDisplay}
          </span>
        </div>
        <div className="flex flex-1 items-center gap-2 py-3 sm:px-4">
          <CalendarDays className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
          <span className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{t('planCard.endDate')}</span>{' '}
            {planUsage.endAtDisplay}
          </span>
        </div>
        <div className="flex flex-1 items-center py-3 sm:justify-center sm:px-4">
          <span className="rounded-full bg-violet-100 px-3 py-1 text-center text-[11px] font-bold text-violet-800">
            {planUsage.planBadge}
          </span>
        </div>
        <div className="flex flex-1 items-center gap-2 py-3 sm:px-4">
          <Users className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
          <span className="text-xs font-medium text-slate-600">{planUsage.usage.remainingLabel}</span>
        </div>
      </div>

      <PlanUsageProgress {...planUsage.usage} />
    </div>
  );
}

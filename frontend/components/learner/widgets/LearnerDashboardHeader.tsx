'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { CheckCircle2, BookOpen, Clock, Award, ArrowRight, Crown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/contexts/LanguageContext';
import { useLearnerDashboard } from '@/hooks/api/useLearnerDashboard';
import { useCurrentUser } from '@/hooks/api/useUsers';
import { useContentAccess } from '@/hooks/api/useContentAccess';
import { getSubscriptionStatus } from '@/services/subscriptions';
import { derivePlanUsage } from './PlanUsageProgress';
import { LearnerCurrentPlanCard } from './LearnerCurrentPlanCard';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

export function LearnerDashboardHeader() {
  const { t } = useTranslation();
  const { data } = useLearnerDashboard();
  const { data: currentUser } = useCurrentUser();
  const { data: contentAccess } = useContentAccess();
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    retry: false,
  });
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const s = data?.stats;
  const firstName =
    currentUser?.fullName?.split(' ')[0] ||
    currentUser?.email?.split('@')[0] ||
    '';

  const stats = [
    {
      icon: CheckCircle2,
      label: t('learnerDashboard.coursesCompleted'),
      value: String(s?.coursesCompleted ?? 0),
    },
    {
      icon: BookOpen,
      label: t('learnerDashboard.inProgress'),
      value: String(s?.inProgress ?? 0),
    },
    {
      icon: Clock,
      label: t('learnerDashboard.totalStudyTime'),
      value: s?.totalStudyTime ?? '0 h',
    },
    {
      icon: Award,
      label: t('learnerDashboard.certificates'),
      value: String(s?.certificatesCount ?? 0),
    },
  ];
  const planUsage = derivePlanUsage(subscriptionStatus, t, locale);
  const usagePct = planUsage.usage.percentage;
  const isFree = contentAccess?.isFree ?? true;
  const isPremium = subscriptionStatus?.effectivePlanSlug === 'premium';
  const isStandard = !isFree && !isPremium;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-100 bg-white p-3 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.35)]">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-xl border border-slate-100 bg-gradient-to-r from-white to-violet-50/50 p-5">
            <p className="text-xs text-slate-500">{t('learnerDashboard.greeting')}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{currentUser?.fullName || firstName}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('learnerDashboard.readyToContinue')}</p>
          </div>
          <div className="relative hidden overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 xl:block">
            <Image
              src="/student-illustration.jpeg"
              alt="Student learning illustration"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div className={`mt-3 grid grid-cols-1 gap-3 ${isPremium ? '' : 'xl:grid-cols-3'}`}>
          <div className={isPremium ? '' : 'xl:col-span-2'}>
            <LearnerCurrentPlanCard
              planUsage={planUsage}
              subscriptionStatus={subscriptionStatus}
              isFree={isFree}
            />
          </div>

          {ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS && isFree && (
            <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-white via-violet-50/40 to-fuchsia-50/30 p-4">
              <p className="text-sm font-bold text-slate-900">{t('learnerDashboard.unlockPotentialTitle')}</p>
              <p className="mt-1 text-xs text-slate-500">
                {t('learnerDashboard.unlockPotentialDescPre')}{' '}
                <span className="font-semibold text-violet-700">Standard</span>{' '}
                {t('learnerDashboard.unlockPotentialDescMid')}{' '}
                <span className="font-semibold text-fuchsia-700">Premium</span>{' '}
                {t('learnerDashboard.unlockPotentialDescPost')}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(t.raw('learnerDashboard.upgradeChips', { returnObjects: true }) as string[]).map((chip) => (
                  <span key={chip} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                    {chip}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <Button asChild className="h-8 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs text-white hover:from-violet-700 hover:to-fuchsia-700">
                  <Link href={`/${locale}/checkout?plan=standard&cycle=monthly&mode=upgrade&source=dashboard-hero-free`}>
                    <Crown className="mr-1.5 h-3.5 w-3.5" />
                    {t('learnerDashboard.upgradeToStandard')}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="h-7 w-full rounded-xl border border-violet-200 bg-transparent text-[11px] font-semibold text-violet-700 hover:bg-violet-50">
                  <Link href={`/${locale}/checkout?plan=premium&cycle=monthly&mode=upgrade&source=dashboard-hero-free-compare`}>
                    {t('learnerDashboard.compareStandardPremium')}
                  </Link>
                </Button>
              </div>
            </div>
          )}
          {ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS && isStandard && (
            <div className="rounded-xl border border-fuchsia-200 bg-gradient-to-br from-white via-fuchsia-50/40 to-violet-50 p-4">
              <p className="text-sm font-bold text-slate-900">{t('learnerDashboard.upgradeToPremium')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('learnerDashboard.premiumDesc')}</p>
              <Button asChild className="mt-3 h-9 w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-xs text-white hover:from-fuchsia-700 hover:to-violet-700">
                <Link href={`/${locale}/checkout?plan=premium&cycle=monthly&mode=upgrade&source=dashboard-hero-standard`}>
                  <Crown className="mr-1.5 h-3.5 w-3.5" />
                  {t('learnerDashboard.discoverPremium')}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="rounded-xl border border-violet-900/40 bg-gradient-to-r from-[#1f0d45] to-[#36107a] p-3.5 text-white"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <stat.icon className="h-3.5 w-3.5 text-violet-100" />
              </div>
              <p className="text-xl font-black tracking-tight">{stat.value}</p>
            </div>
            <p className="mt-2 text-[11px] text-violet-100/70">{stat.label}</p>
          </div>
        ))}
        <div className="rounded-xl border border-fuchsia-500/50 bg-gradient-to-r from-fuchsia-600 to-violet-700 p-3.5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fuchsia-100">{t('learnerDashboard.globalProgress')}</p>
            <TrendingUp className="h-3.5 w-3.5 text-fuchsia-100" />
          </div>
          <p className="mt-1 text-xl font-black">{usagePct}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-white/25">
            <div className="h-1.5 rounded-full bg-white" style={{ width: `${usagePct}%` }} />
          </div>
          <Link href={`/${locale}/dashboard/learner/cours`} className="mt-2 inline-flex items-center text-[11px] font-semibold text-white">
            {t('learnerDashboard.continue')} <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

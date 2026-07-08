'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Target, Share2, Headphones, BookOpen, ArrowUpRight, Crown, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSubscriptionStatus } from '@/services/subscriptions';
import { useContentAccess } from '@/hooks/api/useContentAccess';
import { useTranslation } from '@/contexts/LanguageContext';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

export function QuickActionsSection() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const { data: contentAccess } = useContentAccess();
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    staleTime: 30_000,
  });

  const isFree = contentAccess?.isFree ?? true;
  const isPremium = subscriptionStatus?.effectivePlanSlug === 'premium';

  const upgradeAction =
    !ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS || isPremium
      ? null
      : isFree
        ? {
            icon: Zap,
            label: t('quickActions.upgradeToStandard'),
            description: t('quickActions.moreCoursesLabs'),
            href: `/${locale}/checkout?plan=standard&cycle=monthly&source=quick-actions`,
            highlight: true,
          }
        : {
            icon: Crown,
            label: t('quickActions.upgradeToPremium'),
            description: t('quickActions.certsCoaching'),
            href: `/${locale}/checkout?plan=premium&cycle=monthly&source=quick-actions`,
            highlight: true,
          };

  const BASE_ACTIONS = [
    {
      icon: Target,
      label: t('quickActions.myGoals'),
      description: t('quickActions.createLearningGoal'),
      href: `/${locale}/dashboard/learner/goals`,
      highlight: false,
    },
    {
      icon: Share2,
      label: t('quickActions.referral'),
      description: t('quickActions.inviteAndEarn'),
      href: `/${locale}/dashboard/learner/referral`,
      highlight: false,
    },
    {
      icon: Headphones,
      label: t('quickActions.support'),
      description: t('quickActions.getHelp'),
      href: `/${locale}/dashboard/learner/emploi`,
      highlight: false,
    },
    {
      icon: BookOpen,
      label: t('quickActions.myCourses'),
      description: t('quickActions.browseCatalog'),
      href: `/${locale}/dashboard/learner/cours`,
      highlight: false,
    },
  ];

  const actions = upgradeAction ? [...BASE_ACTIONS, upgradeAction] : BASE_ACTIONS;

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t('quickActions.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('quickActions.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
        {actions.map((action, i) => (
          <Link
            key={i}
            href={action.href}
            className={`group relative flex min-h-[74px] flex-col justify-between gap-1.5 overflow-hidden rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
              action.highlight
                ? 'border-violet-300 bg-gradient-to-br from-violet-50 to-fuchsia-50/60 hover:border-violet-400'
                : 'border-slate-200 bg-slate-50/55 hover:border-violet-200 hover:bg-white'
            }`}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-50/0 to-rose-50/0 transition-all duration-200 group-hover:from-violet-50/60 group-hover:to-rose-50/30" />

            <div
              className={`relative flex h-7 w-7 items-center justify-center rounded-lg ring-1 transition-colors ${
                action.highlight
                  ? 'bg-violet-100 ring-violet-200 group-hover:bg-violet-200'
                  : 'bg-white ring-violet-100 group-hover:bg-violet-50'
              }`}
            >
              <action.icon className={`h-3.5 w-3.5 ${action.highlight ? 'text-violet-700' : 'text-violet-600'}`} />
            </div>

            <div className="relative">
              <p className={`text-xs font-semibold leading-tight ${action.highlight ? 'text-violet-800' : 'text-foreground'}`}>
                {action.label}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{action.description}</p>
            </div>

            <ArrowUpRight className="relative mt-auto h-3 w-3 self-end text-muted-foreground/30 transition-colors group-hover:text-violet-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}

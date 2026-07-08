'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSubscriptionStatus } from '@/services/subscriptions';
import { useContentAccess } from '@/hooks/api/useContentAccess';
import { derivePlanUsage } from './PlanUsageProgress';
import { LearnerCurrentPlanCard } from './LearnerCurrentPlanCard';
import { useTranslation } from '@/contexts/LanguageContext';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

export function LearnerPlanStatusBanner() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';
  const { data: contentAccess } = useContentAccess();
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    retry: false,
  });
  const planUsage = derivePlanUsage(subscriptionStatus, t, locale);
  const isPremium = subscriptionStatus?.effectivePlanSlug === 'premium';
  const isFree = contentAccess?.isFree ?? true;

  return (
    <section className="mb-4 rounded-2xl border border-violet-100 bg-white p-3 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.35)]">
      <div className={`grid grid-cols-1 gap-3 ${isPremium ? '' : 'xl:grid-cols-3'}`}>
        <div className={isPremium ? '' : 'xl:col-span-2'}>
          <LearnerCurrentPlanCard
            planUsage={planUsage}
            subscriptionStatus={subscriptionStatus}
            isFree={isFree}
          />
        </div>

        {ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS && !isPremium && (
          <div className="overflow-hidden rounded-xl border border-fuchsia-200 bg-gradient-to-br from-white via-fuchsia-50/40 to-violet-50">
            <div className="relative h-[112px] border-b border-violet-100/70">
              <Image
                src="/student-illustration.jpeg"
                alt="Student learning illustration"
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <p className="text-sm font-bold text-slate-900">{t('planCard.unlockPotential')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('planCard.upgradeDesc')}</p>
              <Link
                href={`/${locale}/checkout?plan=premium&cycle=monthly&mode=upgrade&source=plan-banner`}
                className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-xs font-bold text-white hover:from-fuchsia-700 hover:to-violet-700"
              >
                <Crown className="mr-1.5 h-3.5 w-3.5" />
                {t('planCard.discoverPlans')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

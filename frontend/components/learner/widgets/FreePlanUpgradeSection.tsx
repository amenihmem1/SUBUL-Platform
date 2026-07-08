'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Crown, Zap, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSubscriptionStatus } from '@/services/subscriptions';
import { useContentAccess } from '@/hooks/api/useContentAccess';
import { useTranslation } from '@/contexts/LanguageContext';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

export function FreePlanUpgradeSection() {
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

  if (!ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS || isPremium) return null;

  const standardFeatures = t.raw('upgrade.standardFeatures', { returnObjects: true }) as string[];
  const premiumFeatures  = t.raw('upgrade.premiumFeatures',  { returnObjects: true }) as string[];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('upgrade.recommendedForYou')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isFree ? t('upgrade.chooseFreeStep') : t('upgrade.toPremiumComplete')}
          </p>
        </div>
        <Link
          href={`/${locale}/checkout`}
          className="text-xs font-semibold text-violet-600 hover:text-violet-700"
        >
          {t('upgrade.viewAllPlans')}
        </Link>
      </div>

      {isFree ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* ── Standard — recommended next step ── */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-violet-400 bg-gradient-to-br from-[#2c0f6e] via-[#4a1a9e] to-[#6d28d9] p-5 text-white shadow-[0_20px_50px_-30px_rgba(76,29,149,0.7)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.08),transparent_60%)]" />
            <div className="relative">
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
                  <Zap className="h-3 w-3" />
                  {t('upgrade.recommendedToContinue')}
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tight">Standard</h3>
              <p className="mt-0.5 text-[13px] font-medium text-violet-200">{t('upgrade.standardSubtitle')}</p>
              <p className="mt-2 text-xs leading-relaxed text-violet-100/75">{t('upgrade.standardDesc')}</p>
              <ul className="mt-4 space-y-2">
                {standardFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-violet-100/90">
                    <Check className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/checkout?plan=standard&cycle=monthly&mode=upgrade&source=recommended-free-standard`}
                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-bold text-violet-700 transition-all hover:bg-violet-50"
              >
                {t('upgrade.chooseStandard')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* ── Premium — advanced option ── */}
          <div className="relative overflow-hidden rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-white via-fuchsia-50/40 to-violet-50/60 p-5 shadow-sm">
            <div className="relative">
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-100 px-3 py-1 text-[11px] font-bold text-fuchsia-700">
                  <Crown className="h-3 w-3" />
                  {t('upgrade.fullExperience')}
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900">Premium</h3>
              <p className="mt-0.5 text-[13px] font-medium text-slate-500">{t('upgrade.premiumSubtitle')}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{t('upgrade.premiumDesc')}</p>
              <ul className="mt-4 space-y-2">
                {premiumFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                    <Check className="h-3.5 w-3.5 shrink-0 text-fuchsia-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/checkout?plan=premium&cycle=monthly&mode=upgrade&source=recommended-free-premium`}
                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-xs font-bold text-white transition-all hover:from-fuchsia-700 hover:to-violet-700"
              >
                {t('upgrade.viewPremium')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Standard user → push Premium */
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-violet-200/70 bg-gradient-to-r from-[#2f0f74] via-[#5a21bf] to-[#9d34cf] p-4 shadow-[0_24px_55px_-40px_rgba(76,29,149,0.8)] md:grid-cols-3">
          <div className="rounded-xl bg-black/10 p-4 text-white md:col-span-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              <Crown className="h-3.5 w-3.5" />
              {t('upgrade.unlockAllCta')}
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-violet-100/95">
              {premiumFeatures.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-fuchsia-200" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-violet-300/40 bg-white/10 p-3">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22),transparent_65%)]" />
            <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 text-center">
              <Link
                href={`/${locale}/checkout?plan=premium&cycle=monthly&source=recommended-standard`}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 text-xs font-bold text-white hover:from-fuchsia-600 hover:to-violet-600"
              >
                {t('upgrade.discoverPremium')}
              </Link>
              <p className="text-[11px] text-violet-100">{t('upgrade.advancedBenefits')}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

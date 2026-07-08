'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Building2, Check, GraduationCap, Loader2, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { savePlanIntent } from '@/lib/plan-intent';
import {
  PUBLIC_MARKETING_PLANS,
  resolvePricingRegion,
  getPlanPrice,
  type PublicMarketingPlan,
} from '@/lib/config/public-pricing';
import { cn } from '@/lib/utils';
import { getSubscriptionStatus, type PublicPlanSlug } from '@/services/subscriptions';
import type { QuotePlanType } from '@/services/adminPlatform';
import { QuoteRequestModal } from '@/components/landing/QuoteRequestModal';

type ShowcaseBillingCycle = 'monthly' | 'quarterly' | 'annual';

type CorePlanSlug = 'free' | 'standard' | 'premium';

const formatPrice = (amountCents: number, currency: string): string => {
  const divider = currency === 'TND' ? 1000 : 100;
  const digits = currency === 'TND' ? 3 : 2;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amountCents / divider);
};

const PLANS: Array<PublicMarketingPlan> = [
  PUBLIC_MARKETING_PLANS.free,
  PUBLIC_MARKETING_PLANS.standard,
  PUBLIC_MARKETING_PLANS.premium,
];

function isCoreSlug(slug: string): slug is CorePlanSlug {
  return slug === 'free' || slug === 'standard' || slug === 'premium';
}

export default function PricingShowcaseSection() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const locale = String(params?.locale || 'fr');
  const [cycle, setCycle] = useState<ShowcaseBillingCycle>('monthly');
  const region = useMemo(() => resolvePricingRegion(), []);
  const { session } = useAuth();
  const isAuthenticated = Boolean(session?.user);

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quotePlanType, setQuotePlanType] = useState<QuotePlanType>('universite');

  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    staleTime: 30_000,
    enabled: isAuthenticated,
  });

  /** Logged-in user's effective plan once loaded; `null` = guest or still loading. */
  const userPlanSlug = useMemo((): PublicPlanSlug | null => {
    if (!isAuthenticated) return null;
    if (subscriptionLoading) return null;
    const slug = subscriptionStatus?.effectivePlanSlug;
    if (slug === 'standard' || slug === 'premium' || slug === 'free') return slug;
    return 'free';
  }, [isAuthenticated, subscriptionLoading, subscriptionStatus?.effectivePlanSlug]);

  const showSubscriptionSpinner = isAuthenticated && subscriptionLoading;

  const openQuote = (planType: QuotePlanType) => {
    setQuotePlanType(planType);
    setQuoteOpen(true);
  };

  const goCheckout = (planSlug: CorePlanSlug) => {
    savePlanIntent({ planId: planSlug, cycle, mode: 'upgrade', source: 'landing-pricing' });
    router.push(`/${locale}/checkout?cycle=${cycle}&plan=${planSlug}`);
  };

  const goFreeTrial = () => {
    router.push(
      `/${locale}/auth/register?startTrial=1&returnUrl=${encodeURIComponent(`/${locale}/dashboard/learner`)}`,
    );
  };

  return (
    <section id="tarifs" className="scroll-mt-20 bg-gradient-to-b from-white via-fuchsia-50/35 to-indigo-50/35 py-14 md:py-16">
      <QuoteRequestModal open={quoteOpen} onOpenChange={setQuoteOpen} planType={quotePlanType} />

      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            {t('homepage.pricingShowcase.titlePrefix')}{' '}
            <span className="bg-gradient-to-r from-fuchsia-600 to-violet-600 bg-clip-text text-transparent">
              {t('homepage.pricingShowcase.titleAccent')}
            </span>
          </h2>
          <p className="mt-3 text-sm text-slate-600 md:text-base">{t('homepage.pricingShowcase.subtitle')}</p>
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-lg flex-wrap justify-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm transition-shadow duration-300 hover:shadow-md sm:w-fit sm:max-w-none sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={cn(
              'min-h-[2.75rem] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 sm:flex-none sm:px-4 sm:text-sm',
              cycle === 'monthly' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t('homepage.pricingShowcase.billingMonthly')}
          </button>
          <button
            type="button"
            onClick={() => setCycle('quarterly')}
            className={cn(
              'min-h-[2.75rem] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 sm:flex-none sm:px-4 sm:text-sm',
              cycle === 'quarterly' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t('homepage.pricingShowcase.billingQuarterly')}{' '}
            <span
              className={cn(
                'ml-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] sm:ml-1 sm:px-2 sm:text-[11px]',
                cycle === 'quarterly' ? 'bg-emerald-500/25 text-emerald-100' : 'bg-emerald-100 text-emerald-700',
              )}
            >
              {t('homepage.pricingShowcase.quarterlyBadge')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCycle('annual')}
            className={cn(
              'min-h-[2.75rem] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 sm:flex-none sm:px-4 sm:text-sm',
              cycle === 'annual' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t('homepage.pricingShowcase.billingAnnual')}{' '}
            <span
              className={cn(
                'ml-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] sm:ml-1 sm:px-2 sm:text-[11px]',
                cycle === 'annual' ? 'bg-emerald-500/25 text-emerald-100' : 'bg-emerald-100 text-emerald-700',
              )}
            >
              {t('homepage.pricingShowcase.saveBadge')}
            </span>
          </button>
        </div>

        <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const slug = plan.slug;
            if (!isCoreSlug(slug)) return null;

            const price = slug === 'free' ? null : getPlanPrice(plan, region, cycle);
            const isPopular = slug === 'premium';
            const isDark = slug === 'premium';
            const isCurrentPlan =
              isAuthenticated &&
              !subscriptionLoading &&
              userPlanSlug !== null &&
              slug === userPlanSlug;

            const articleClass = cn(
              'relative rounded-3xl border p-6 transition-all duration-300 md:hover:-translate-y-1',
              isDark
                ? 'border-violet-400/35 bg-gradient-to-b from-[#21103d] to-[#12071f] text-white shadow-[0_35px_80px_-46px_rgba(109,40,217,0.7)] md:hover:shadow-[0_40px_90px_-40px_rgba(109,40,217,0.75)]'
                : 'border-slate-200 bg-white text-slate-900 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.35)] md:hover:shadow-[0_28px_50px_-32px_rgba(15,23,42,0.4)]',
              isCurrentPlan &&
                (isDark
                  ? 'ring-2 ring-fuchsia-400/70 ring-offset-2 ring-offset-fuchsia-50/30'
                  : 'ring-2 ring-violet-400/80 ring-offset-2 ring-offset-white'),
            );

            const renderCta = () => {
              if (showSubscriptionSpinner) {
                return (
                  <button
                    type="button"
                    disabled
                    className={cn(
                      'mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold opacity-70',
                      isDark ? 'bg-white/20 text-white' : 'border border-slate-200 bg-slate-50 text-slate-500',
                    )}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    …
                  </button>
                );
              }

              if (slug === 'free') {
                if (userPlanSlug === 'free') {
                  return (
                    <button
                      type="button"
                      disabled
                      className="mt-6 inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-500"
                    >
                      {t('homepage.pricingShowcase.cta.currentPlan')}
                    </button>
                  );
                }
                if (userPlanSlug === 'standard' || userPlanSlug === 'premium') {
                  return (
                    <button
                      type="button"
                      disabled
                      className="mt-6 inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400"
                    >
                      {t('homepage.pricingShowcase.cta.freeReservedNew')}
                    </button>
                  );
                }
                return (
                  <button
                    type="button"
                    onClick={goFreeTrial}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-fuchsia-300 hover:text-fuchsia-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    {t('homepage.pricingShowcase.cta.startFree')}
                  </button>
                );
              }

              if (slug === 'standard') {
                if (userPlanSlug === 'standard') {
                  return (
                    <button
                      type="button"
                      disabled
                      className="mt-6 inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-500"
                    >
                      {t('homepage.pricingShowcase.cta.currentPlan')}
                    </button>
                  );
                }
                if (userPlanSlug === 'premium') {
                  return (
                    <p className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-3 text-center text-xs font-medium leading-relaxed text-slate-600">
                      {t('homepage.pricingShowcase.standardIncludedInPremium')}
                    </p>
                  );
                }
                return (
                  <button
                    type="button"
                    onClick={() => goCheckout('standard')}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 text-sm font-bold text-white transition hover:from-fuchsia-700 hover:to-violet-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    {t('homepage.pricingShowcase.cta.choosePlan', { name: t(`homepage.pricingShowcase.plans.${slug}.name`) })}
                  </button>
                );
              }

              /* premium */
              if (userPlanSlug === 'premium') {
                return (
                  <button
                    type="button"
                    disabled
                    className="mt-6 inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 text-sm font-bold text-white/80"
                  >
                    {t('homepage.pricingShowcase.cta.currentPlan')}
                  </button>
                );
              }
              if (userPlanSlug === 'standard') {
                return (
                  <button
                    type="button"
                    onClick={() => goCheckout('premium')}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 text-sm font-bold text-white shadow-lg transition hover:from-fuchsia-700 hover:to-violet-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    {t('homepage.pricingShowcase.cta.upgradePremium')}
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => goCheckout('premium')}
                  className={cn(
                    'mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition',
                    isDark
                      ? 'bg-white text-violet-700 hover:bg-fuchsia-50'
                      : 'border border-slate-300 bg-white text-slate-800 hover:border-fuchsia-300 hover:text-fuchsia-700',
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  {t('homepage.pricingShowcase.cta.choosePlan', { name: t(`homepage.pricingShowcase.plans.${slug}.name`) })}
                </button>
              );
            };

            const planName = t(`homepage.pricingShowcase.plans.${slug}.name`);
            const planDesc = t(`homepage.pricingShowcase.plans.${slug}.description`);
            const planFeatures = t.raw(`homepage.pricingShowcase.plans.${slug}.features`, { returnObjects: true }) as string[];
            const translatedFeatures = Array.isArray(planFeatures) ? planFeatures : plan.features.map((f) => f.label);

            return (
              <article key={plan.slug} className={articleClass}>
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 z-[1] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-md">
                    {t('homepage.pricingShowcase.badges.popular')}
                  </span>
                )}
                {isCurrentPlan && (
                  <span
                    className={cn(
                      'absolute right-4 top-4 z-[1] max-w-[min(11rem,calc(100%-2rem))] rounded-full px-2.5 py-1 text-center text-[10px] font-bold leading-tight sm:text-[11px]',
                      isDark ? 'bg-fuchsia-500/30 text-fuchsia-100' : 'bg-violet-100 text-violet-800',
                    )}
                  >
                    {t('homepage.pricingShowcase.badges.current')}
                  </span>
                )}

                <p className={`text-sm font-semibold ${isDark ? 'text-fuchsia-200' : 'text-fuchsia-700'}`}>{planName}</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight">
                  {slug === 'free'
                    ? t('homepage.pricingShowcase.free')
                    : price
                    ? formatPrice(price.amountCents, price.currency)
                    : t('homepage.pricingShowcase.onRequest')}
                </h3>
                <p className={`mt-2 text-sm ${isDark ? 'text-fuchsia-100/80' : 'text-slate-600'}`}>{planDesc}</p>

                <ul className="mt-5 space-y-2.5 text-sm">
                  {translatedFeatures.slice(0, 6).map((label, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full ${isDark ? 'bg-fuchsia-500/40' : 'bg-fuchsia-100'}`}
                      >
                        <Check className={`h-2.5 w-2.5 ${isDark ? 'text-white' : 'text-fuchsia-700'}`} />
                      </span>
                      <span className={isDark ? 'text-fuchsia-100/90' : 'text-slate-700'}>{label}</span>
                    </li>
                  ))}
                </ul>

                {renderCta()}
              </article>
            );
          })}
        </div>

        {/* Organisation */}
        <div className="mx-auto mt-16 max-w-4xl">
          <h3 className="text-center text-xl font-black tracking-tight text-slate-900 md:text-2xl">
            {t('homepage.pricingShowcase.org.title')}
          </h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-100 to-violet-100 text-2xl" aria-hidden>
                <GraduationCap className="h-6 w-6 text-violet-700" />
              </div>
              <h4 className="mt-4 text-lg font-bold text-slate-900">{t('homepage.pricingShowcase.org.universityTitle')}</h4>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {t('homepage.pricingShowcase.org.universityDesc')}
              </p>
              <button
                type="button"
                onClick={() => openQuote('universite')}
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 text-sm font-bold text-white transition hover:from-fuchsia-700 hover:to-violet-700"
              >
                {t('homepage.pricingShowcase.org.universityCta')}
              </button>
            </article>

            <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-violet-100 text-2xl" aria-hidden>
                <Building2 className="h-6 w-6 text-violet-700" />
              </div>
              <h4 className="mt-4 text-lg font-bold text-slate-900">{t('homepage.pricingShowcase.org.enterpriseTitle')}</h4>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {t('homepage.pricingShowcase.org.enterpriseDesc')}
              </p>
              <button
                type="button"
                onClick={() => openQuote('entreprise')}
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl border-2 border-violet-200 bg-white px-4 text-sm font-bold text-violet-800 transition hover:border-violet-400 hover:bg-violet-50"
              >
                {t('homepage.pricingShowcase.org.enterpriseCta')}
              </button>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

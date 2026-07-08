'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Check,
  Crown,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { Spinner } from '@/components/ui/loading';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { type BillingCycle } from '@/services/payments';
import { getSubscriptionStatus, startFreeTrial, type SubscriptionAccessResponse } from '@/services/subscriptions';
import { savePlanIntent } from '@/lib/plan-intent';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { QuoteRequestModal } from './QuoteRequestModal';
import { BillingCycleCards } from '@/components/subscription/BillingCycleCards';
import { cn } from '@/lib/utils';
import { isPersonalLearnerSubscriptionPricingContext, isStaffOrPartnerPublicPricingRole } from '@/lib/roles';
import PricingPartnersSection from './PricingPartnersSection';
import { trackEvent } from '@/lib/analytics/events';
import {
  BILLING_SELECTOR_OPTIONS,
  CORE_MARKETING_PLAN_ORDER,
  getMonthlyReferencePrice,
  getPlanPrice,
  INSTITUTIONAL_PLAN_ORDER,
  PUBLIC_MARKETING_PLANS,
  resolvePricingRegion,
  type PublicMarketingPlan,
} from '@/lib/config/public-pricing';

type QuotePlanType = 'universite' | 'entreprise';
type SupportedCycle = Exclude<BillingCycle, 'semester'>;
type PlanVariant = 'free' | 'standard' | 'premium';

const TIER_RANK: Record<string, number> = { free: 0, standard: 1, premium: 2 };
const CYCLE_SUFFIX: Record<SupportedCycle, string> = {
  monthly: '/mois',
  quarterly: '/trim.',
  annual: '/an',
};
const CYCLE_MONTHS: Record<SupportedCycle, number> = { monthly: 1, quarterly: 3, annual: 12 };
const PLAN_ICON: Record<PlanVariant, ReactNode> = {
  free: <Sparkles className="h-5 w-5" />,
  standard: <Rocket className="h-5 w-5" />,
  premium: <Crown className="h-5 w-5" />,
};

interface DisplayCorePlan {
  config: PublicMarketingPlan;
  variant: PlanVariant;
  priceLabel: string;
  priceSuffix: string;
  strikeLabel?: string;
  discountText?: string;
  isCurrent: boolean;
  ctaLabel: string;
  ctaDisabled: boolean;
}

const formatPrice = (amountCents: number, currency: string): string => {
  const divider = currency === 'TND' ? 1000 : 100;
  const value = amountCents / divider;
  const digits = currency === 'TND' ? 3 : 2;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
};

function getVariantFromSlug(slug: string): PlanVariant {
  if (slug === 'free') return 'free';
  if (slug === 'standard') return 'standard';
  return 'premium';
}

function CorePricingCard({
  plan,
  index,
  loadingPlanId,
  onAction,
}: {
  plan: DisplayCorePlan;
  index: number;
  loadingPlanId: string | null;
  onAction: (plan: PublicMarketingPlan) => void;
}) {
  const isPremium = plan.variant === 'premium';
  const isStandard = plan.variant === 'standard';
  const isFree = plan.variant === 'free';
  const isLoading = loadingPlanId === plan.config.slug;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={{ y: -5, scale: 1.008 }}
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-[24px] border p-5 md:p-6',
        isPremium
          ? 'border-fuchsia-500/40 bg-gradient-to-b from-[#17032a] via-[#2e0752] to-[#130420] shadow-[0_30px_90px_-45px_rgba(192,38,211,0.75)]'
          : isStandard
          ? 'border-fuchsia-200/80 bg-white shadow-[0_24px_70px_-52px_rgba(15,23,42,0.55)]'
          : 'border-slate-200/80 bg-slate-50/70',
        plan.isCurrent && 'ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-white',
      )}
    >
      {isPremium && (
        <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          Le plus populaire
        </span>
      )}

      <div className={cn('flex items-start justify-between', isPremium && 'pt-4')}>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl',
              isPremium
                ? 'bg-white/10 text-fuchsia-100 ring-1 ring-fuchsia-300/25'
                : 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100',
            )}
          >
            {PLAN_ICON[plan.variant]}
          </span>
          <div>
            <h3 className={cn('text-lg font-extrabold', isPremium ? 'text-white' : 'text-slate-900')}>
              {plan.config.name}
            </h3>
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.12em]',
                isPremium ? 'text-fuchsia-200/80' : 'text-fuchsia-600',
              )}
            >
              {plan.config.tagline}
            </p>
          </div>
        </div>

        {plan.isCurrent && (
          <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Plan actuel
          </span>
        )}
      </div>

      <p className={cn('mt-4 min-h-[40px] text-sm leading-relaxed', isPremium ? 'text-fuchsia-100/85' : 'text-slate-500')}>
        {plan.config.description}
      </p>

      <div
        className={cn(
          'mt-5 rounded-2xl border p-3.5',
          isPremium ? 'border-white/10 bg-white/5' : 'border-slate-200/90 bg-gradient-to-b from-white to-slate-50',
        )}
      >
        {plan.strikeLabel && (
          <div className="mb-2 flex items-center gap-2">
            <span className={cn('text-sm line-through', isPremium ? 'text-fuchsia-200/40' : 'text-slate-400')}>
              {plan.strikeLabel}
            </span>
            {plan.discountText && (
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', isPremium ? 'bg-rose-500/30 text-rose-100' : 'bg-fuchsia-100 text-fuchsia-700')}>
                {plan.discountText}
              </span>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <span
            className={cn(
              'text-[1.75rem] font-black tracking-tight sm:text-[2.05rem]',
              isPremium
                ? 'text-white'
                : isFree
                ? 'text-slate-800'
                : 'bg-gradient-to-r from-rose-600 to-fuchsia-600 bg-clip-text text-transparent',
            )}
          >
            {plan.priceLabel}
          </span>
          {plan.priceSuffix && (
            <span className={cn('pb-1 text-sm font-semibold', isPremium ? 'text-fuchsia-200/80' : 'text-slate-500')}>
              {plan.priceSuffix}
            </span>
          )}
        </div>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {plan.config.features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full',
                feature.included
                  ? isPremium
                    ? 'bg-gradient-to-br from-rose-500 to-fuchsia-500'
                    : 'bg-gradient-to-br from-rose-500 to-fuchsia-600'
                  : isPremium
                  ? 'bg-white/10 text-fuchsia-200/50'
                  : 'bg-slate-100 text-slate-400',
              )}
            >
              {feature.included ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>
            <span
              className={cn(
                feature.included
                  ? isPremium
                    ? 'text-fuchsia-100/90'
                    : feature.highlight
                    ? 'font-semibold text-slate-900'
                    : 'text-slate-700'
                  : isPremium
                  ? 'text-fuchsia-200/45 line-through'
                  : 'text-slate-400 line-through',
              )}
            >
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onAction(plan.config)}
        disabled={isLoading || plan.ctaDisabled}
        className={cn(
          'mt-6 rounded-2xl px-4 py-3 text-sm font-bold transition-all',
          plan.ctaDisabled
            ? plan.isCurrent
              ? 'cursor-not-allowed border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400'
            : isPremium
            ? 'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/40 hover:shadow-xl'
            : isFree
            ? 'border border-slate-300 bg-white text-slate-700 hover:border-fuchsia-300 hover:text-fuchsia-700'
            : 'bg-slate-900 text-white hover:bg-slate-800',
        )}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner size="sm" />
          </span>
        ) : (
          plan.ctaLabel
        )}
      </button>

      {!plan.ctaDisabled && isPremium && (
        <p className="mt-3 text-center text-[11px] text-fuchsia-100/70">Annulez à tout moment · Sans engagement</p>
      )}
      {!plan.ctaDisabled && isFree && (
        <p className="mt-3 text-center text-[11px] text-slate-400">Aucune carte bancaire requise</p>
      )}
    </motion.article>
  );
}

function InstitutionalCard({
  plan,
  index,
  onQuote,
}: {
  plan: PublicMarketingPlan;
  index: number;
  onQuote: (type: QuotePlanType) => void;
}) {
  const isUniversity = plan.slug === 'university';
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_60px_-46px_rgba(15,23,42,0.55)] backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl', isUniversity ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-700')}>
          {isUniversity ? <Building2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-lg font-extrabold text-slate-900">{plan.name}</h4>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-600">{plan.tagline}</p>
          <p className="mt-3 text-sm text-slate-500">{plan.description}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {plan.features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-fuchsia-500" />
            <span className={feature.highlight ? 'font-semibold text-slate-800' : ''}>{feature.label}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onQuote(isUniversity ? 'universite' : 'entreprise')}
        className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
      >
        Demander un devis
      </button>
    </motion.article>
  );
}

export default function PricingSection() {
  useLanguage();
  const router = useRouter();
  const params = useParams();
  const locale = String(params?.locale || 'en');
  const { session } = useAuth();
  const [billingCycle, setBillingCycle] = useState<SupportedCycle>('monthly');
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quotePlan, setQuotePlan] = useState<QuotePlanType>('universite');
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: myStatus } = useQuery<SubscriptionAccessResponse>({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    enabled: !!session?.user,
    staleTime: 30_000,
    retry: false,
  });

  const currentPlanSlug = useMemo<string>(() => {
    if (!isPersonalLearnerSubscriptionPricingContext(myStatus?.roleContext)) return '';
    const s = myStatus?.planSlug?.toLowerCase() ?? '';
    if (s) return s;
    if (myStatus?.kind === 'free' || myStatus?.kind === 'trial_active') return 'free';
    return '';
  }, [myStatus]);

  const region = useMemo(() => resolvePricingRegion(session?.user?.countryCode as string | undefined), [session?.user]);

  const corePlans = useMemo<DisplayCorePlan[]>(() => {
    return CORE_MARKETING_PLAN_ORDER.map((slug) => {
      const config = PUBLIC_MARKETING_PLANS[slug];
      const variant = getVariantFromSlug(config.slug);
      const currentRank = currentPlanSlug ? TIER_RANK[currentPlanSlug] ?? -1 : -1;
      const thisRank = TIER_RANK[config.slug] ?? 99;
      const isCurrent = currentPlanSlug === config.slug;

      let priceLabel = config.slug === 'free' ? 'Gratuit' : 'Sur devis';
      let priceSuffix = '';
      let strikeLabel: string | undefined;
      let discountText: string | undefined;

      const currentPrice = getPlanPrice(config, region, billingCycle);
      const monthlyReference = getMonthlyReferencePrice(config, region);
      if (currentPrice) {
        priceLabel = formatPrice(currentPrice.amountCents, currentPrice.currency);
        priceSuffix = CYCLE_SUFFIX[billingCycle];
        if (billingCycle !== 'monthly' && monthlyReference) {
          const expected = monthlyReference.amountCents * CYCLE_MONTHS[billingCycle];
          if (expected > currentPrice.amountCents) {
            strikeLabel = formatPrice(expected, currentPrice.currency);
            discountText = currentPrice.discountText;
          }
        }
      }

      let ctaLabel = config.ctaLabel;
      let ctaDisabled = false;
      if (!session?.user) {
        ctaLabel = config.ctaKind === 'quote' ? 'Demander un devis' : config.ctaLabel;
      } else if (myStatus?.kind === 'institutional_active') {
        ctaLabel = myStatus.planName ? `Accès fourni par ${myStatus.planName}` : 'Accès institutionnel actif';
        ctaDisabled = true;
      } else if (isStaffOrPartnerPublicPricingRole(myStatus?.roleContext)) {
        ctaLabel = config.ctaKind === 'quote' ? 'Demander un devis' : 'Offre réservée aux comptes apprenant';
        ctaDisabled = config.ctaKind !== 'quote';
      } else if (isCurrent) {
        ctaLabel = 'Plan actuel';
        ctaDisabled = true;
      } else if (currentRank >= 0 && thisRank >= 0 && thisRank < currentRank) {
        ctaLabel = 'Plan inférieur';
        ctaDisabled = true;
      } else if (config.slug === 'standard') {
        ctaLabel = 'Passer au Standard';
      } else if (config.slug === 'premium') {
        ctaLabel = 'Passer au Premium';
      }

      return {
        config,
        variant,
        priceLabel,
        priceSuffix,
        strikeLabel,
        discountText,
        isCurrent,
        ctaLabel,
        ctaDisabled,
      };
    });
  }, [billingCycle, currentPlanSlug, myStatus?.kind, myStatus?.planName, myStatus?.roleContext, region, session?.user]);

  const institutionPlans = useMemo(() => {
    return INSTITUTIONAL_PLAN_ORDER.map((slug) => PUBLIC_MARKETING_PLANS[slug]);
  }, []);

  const cycleMeta = useMemo(() => {
    return Object.fromEntries(
      BILLING_SELECTOR_OPTIONS.map((option) => [
        option.cycle,
        { badge: option.badge, popular: option.popular, subtitle: option.subtitle },
      ]),
    ) as Record<BillingCycle, { badge?: string; popular?: boolean; subtitle?: string }>;
  }, []);

  const standardMonthly = getPlanPrice(PUBLIC_MARKETING_PLANS.standard, region, 'monthly');

  const handleCorePlanAction = async (plan: PublicMarketingPlan) => {
    trackEvent('landing_pricing_cta_click', {
      plan: plan.slug,
      cycle: billingCycle,
      ctaKind: plan.ctaKind,
      authenticated: Boolean(session?.user),
    });

    if (plan.slug === 'free') {
      if (!session?.user) {
        router.push(`/${locale}/auth/register?startTrial=1&returnUrl=${encodeURIComponent(`/${locale}/dashboard/learner`)}`);
        return;
      }
      setLoadingPlanId(plan.slug);
      try {
        await startFreeTrial();
        await queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
        toast.success('Essai gratuit activé.');
        router.push(`/${locale}/dashboard/learner`);
      } catch (error: any) {
        if (error?.response?.status === 409) {
          toast.error('Votre essai est terminé, veuillez choisir une offre.');
        } else {
          toast.error("Impossible d'activer ce plan.");
        }
      } finally {
        setLoadingPlanId(null);
      }
      return;
    }

    if (plan.slug === 'standard' || plan.slug === 'premium') {
      savePlanIntent({ planId: plan.slug, cycle: billingCycle, mode: 'upgrade', source: 'landing-pricing' });
      const checkoutPath = `/${locale}/checkout?cycle=${encodeURIComponent(billingCycle)}&plan=${encodeURIComponent(plan.slug)}`;
      if (!session?.user) {
        router.push(`/${locale}/auth/register?returnUrl=${encodeURIComponent(checkoutPath)}`);
        return;
      }
      router.push(checkoutPath);
      return;
    }

    setQuotePlan(plan.slug === 'university' ? 'universite' : 'entreprise');
    setQuoteOpen(true);
  };

  const openQuote = (type: QuotePlanType) => {
    trackEvent('landing_pricing_cta_click', {
      plan: type === 'universite' ? 'university' : 'enterprise',
      cycle: billingCycle,
      ctaKind: 'quote',
      authenticated: Boolean(session?.user),
    });
    setQuotePlan(type);
    setQuoteOpen(true);
  };

  return (
    <section
      id="tarifs"
      className="relative scroll-mt-20 overflow-hidden py-16 md:py-20"
      style={{ background: 'linear-gradient(160deg, #fff3f8 0%, #fdf5ff 28%, #f6f1ff 62%, #fef8ff 100%)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-44 -top-40 h-[540px] w-[540px] rounded-full bg-fuchsia-200/30 blur-[125px]" />
        <div className="absolute -left-52 bottom-0 h-[480px] w-[480px] rounded-full bg-rose-200/25 blur-[118px]" />
      </div>

      <div className="container relative z-10">
        <motion.div
          className="mx-auto mb-10 max-w-3xl text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-fuchsia-700">
            <Star className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
            Tarifs transparents
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
            Choisissez <span className="bg-gradient-to-r from-rose-500 to-violet-600 bg-clip-text text-transparent">votre formule</span>
          </h2>
          <p className="mt-3 text-sm text-slate-500 md:text-base">
            Une expérience premium, des tarifs lisibles et une trajectoire claire de l&apos;individuel à l&apos;institutionnel.
          </p>
        </motion.div>

        <motion.div
          className="mb-7"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12, duration: 0.45 }}
        >
          <BillingCycleCards
            selectedCycle={billingCycle}
            onSelect={(cycle) => setBillingCycle((cycle === 'semester' ? 'quarterly' : cycle) as SupportedCycle)}
            pricingLoading={false}
            pricingError={false}
            currency={standardMonthly?.currency || 'TND'}
            prices={undefined}
            divisor={(standardMonthly?.currency || 'TND') === 'TND' ? 1000 : 100}
            variant="compact"
            showPrices={false}
            cycleMeta={cycleMeta}
            premium
          />
          <p className="mx-auto mt-2.5 max-w-2xl text-center text-[11px] text-slate-500 md:text-xs">
            Le changement de période met à jour instantanément les tarifs <span className="font-semibold text-slate-700">Standard</span> et <span className="font-semibold text-slate-700">Premium</span>, sans latence visuelle ni état cassé.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {corePlans.map((plan, index) => (
            <CorePricingCard key={plan.config.slug} plan={plan} index={index} loadingPlanId={loadingPlanId} onAction={handleCorePlanAction} />
          ))}
        </div>

        <div className="mt-9 rounded-[28px] border border-white/70 bg-gradient-to-br from-white/80 to-slate-50/75 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-6">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">Offres institutionnelles</h3>
            <p className="mt-2 text-sm text-slate-500">
              Pour les établissements et organisations qui veulent industrialiser la montée en compétences.
            </p>
          </div>
          <div className="mt-5 grid gap-3.5 md:grid-cols-2">
            {institutionPlans.map((plan, index) => (
              <InstitutionalCard key={plan.slug} plan={plan} index={index} onQuote={openQuote} />
            ))}
          </div>
        </div>

        <PricingPartnersSection />

        <p className="mt-7 text-center text-xs text-slate-400">Paiements sécurisés · Sans engagement · Annulation facile</p>
      </div>

      <QuoteRequestModal open={quoteOpen} onOpenChange={setQuoteOpen} planType={quotePlan} />
    </section>
  );
}

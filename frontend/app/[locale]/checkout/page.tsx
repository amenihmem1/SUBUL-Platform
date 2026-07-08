'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  getPricing,
  startCheckout,
  validatePromoCode,
  createManualPaymentRequest,
  type BillingCycle,
  type CheckoutMode,
} from '@/services/payments';
import { getSubscriptionStatus } from '@/services/subscriptions';
import { cn } from '@/lib/utils';
import { PUBLIC_PLANS, getPublicPlanDisplayName, isPublicPlanSlug, pickConfigBillingOption } from '@/lib/config/plans';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/contexts/LanguageContext';
import { BillingCycleCards, BILLING_CYCLE_OPTIONS, CYCLE_SUFFIX } from '@/components/subscription/BillingCycleCards';
import { touchPlanIntent, loadPlanIntent, savePlanIntent } from '@/lib/plan-intent';
import { trackEvent } from '@/lib/analytics/events';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Brain,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Crown,
  FileText,
  Globe,
  Layers,
  Lock,
  Mail,
  Rocket,
  Smartphone,
  Sparkles,
  Tag,
  Trophy,
  User,
  Zap,
} from 'lucide-react';

function sanitizeCheckoutPlanSlug(raw: string | null | undefined): 'standard' | 'premium' {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === 'standard' || s === 'premium') return s;
  return 'standard';
}

const VALID_BILLING_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'semester', 'annual'];

function buildCheckoutHref(args: {
  locale: string;
  plan: 'standard' | 'premium';
  cycle: string;
  mode?: string;
  source?: string;
}): string {
  const p = new URLSearchParams();
  p.set('plan', args.plan);
  p.set('cycle', args.cycle);
  if (args.mode) p.set('mode', args.mode);
  if (args.source) p.set('source', args.source);
  return `/${args.locale}/checkout?${p.toString()}`;
}

function isExplicitPaidPlanQuery(raw: string | null | undefined): raw is 'standard' | 'premium' {
  const s = (raw ?? '').trim().toLowerCase();
  return s === 'standard' || s === 'premium';
}

const CHECKOUT_FEATURE_ICONS = [BookOpen, Brain, Layers, Trophy, Globe, Zap];

// ─── Stripe form ──────────────────────────────────────────────────────────────

function StripeForm({ transactionId, locale, onBack }: { transactionId: string; locale: string; onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [elementError, setElementError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !elementReady) return;
    setLoading(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/${locale}/payment/success?tx=${transactionId}&provider=stripe`,
        },
      });
      if (error) {
        toast.error(error.message || 'Paiement échoué. Veuillez réessayer.');
        setLoading(false);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erreur inattendue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {elementError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-700">Le formulaire de paiement n'a pas pu se charger.</p>
          <p className="mt-1 text-xs text-red-500">{elementError}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Retour et réessayer
          </button>
        </div>
      ) : (
        <>
          <PaymentElement
            options={{ layout: 'tabs' }}
            onReady={() => setElementReady(true)}
            onLoadError={(e: { error?: { message?: string } }) => {
              setElementError(e.error?.message || 'Impossible de charger le formulaire Stripe.');
            }}
          />
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
            <button
              type="submit"
              disabled={!stripe || !elements || !elementReady || loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Traitement…
                </>
              ) : !elementReady ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Initialisation…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Finaliser le paiement
                </>
              )}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function StripeCheckoutStep({
  clientSecret, publishableKey, transactionId, locale, onBack,
}: { clientSecret: string; publishableKey: string; transactionId: string; locale: string; onBack: () => void }) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Détails de paiement</h2>
        <p className="mt-1 text-sm text-slate-500">Vos données sont chiffrées et sécurisées par Stripe.</p>
      </div>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: { colorPrimary: '#7c3aed', borderRadius: '12px', fontFamily: 'Inter, system-ui, sans-serif' },
          },
        }}
      >
        <StripeForm transactionId={transactionId} locale={locale} onBack={onBack} />
      </Elements>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = String(params?.locale || 'en');
  const { session, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const initialCycle = (searchParams?.get('cycle') as BillingCycle) || 'monthly';
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const planQs = searchParams?.get('plan') || searchParams?.get('planSlug') || '';
  const sourceQsRaw = (searchParams?.get('source') || '').trim();
  const sourceQs = sourceQsRaw.toLowerCase();
  const modeQs = (searchParams?.get('mode') || '').trim().toLowerCase();
  const cycleFromUrl = searchParams?.get('cycle') ?? '';
  const checkoutApiMode: CheckoutMode | undefined =
    modeQs === 'renew' ? 'renew' : modeQs === 'upgrade' ? 'upgrade' : undefined;
  const [checkoutPlanSlug, setCheckoutPlanSlug] = useState<'standard' | 'premium'>(() => {
    if (sourceQs === 'certifications') return 'premium';
    return sanitizeCheckoutPlanSlug(planQs);
  });

  /**
   * Certifications upgrade must land on Premium (Standard/Free do not unlock certifications).
   * Otherwise: trust `plan` / `planSlug`, then saved plan intent, then default to Standard.
   */
  useEffect(() => {
    if (sourceQs === 'certifications') {
      setCheckoutPlanSlug('premium');
      savePlanIntent({ planId: 'premium', cycle, mode: 'upgrade', source: sourceQsRaw || 'certifications' });
      return;
    }
    if (isExplicitPaidPlanQuery(planQs)) {
      setCheckoutPlanSlug(planQs.trim().toLowerCase() as 'standard' | 'premium');
      return;
    }
    if (typeof window !== 'undefined') {
      const intent = loadPlanIntent();
      setCheckoutPlanSlug(sanitizeCheckoutPlanSlug(intent?.planId));
      return;
    }
    setCheckoutPlanSlug(sanitizeCheckoutPlanSlug(undefined));
  }, [planQs, sourceQs, cycle]);

  /** Keep billing cycle aligned when the URL query changes (e.g. shared link, browser navigation). */
  useEffect(() => {
    if (!cycleFromUrl) return;
    const c = cycleFromUrl.toLowerCase() as BillingCycle;
    if (VALID_BILLING_CYCLES.includes(c)) setCycle(c);
  }, [cycleFromUrl]);

  const [paying, setPaying] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountCents: number; message: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [stripeCheckout, setStripeCheckout] = useState<{ clientSecret: string; publishableKey: string; transactionId: string } | null>(null);
  const [manualMethod, setManualMethod] = useState<'bank_transfer' | 'd17' | null>(null);
  const [checkoutTracked, setCheckoutTracked] = useState(false);

  useEffect(() => {
    if (checkoutTracked) return;
    if (!session?.user?.id) return;
    setCheckoutTracked(true);
    trackEvent('checkout_viewed', {
      plan: checkoutPlanSlug,
      cycle,
      mode: checkoutApiMode ?? 'purchase',
      source: sourceQs || 'direct',
    });
  }, [checkoutTracked, checkoutApiMode, checkoutPlanSlug, cycle, session?.user?.id, sourceQs]);

  const {
    data: pricing,
    isPending: pricingPending,
    isError: pricingQueryError,
  } = useQuery({
    queryKey: ['public-pricing', checkoutPlanSlug],
    queryFn: () => getPricing(checkoutPlanSlug),
    retry: false,
  });

  const { data: subscriptionStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    enabled: !!session?.user,
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (authLoading || !session?.user || !subscriptionStatus) return;
    if (subscriptionStatus.kind === 'institutional_active') {
      toast.info(
        subscriptionStatus.planName
          ? `Vous avez un accès actif via ${subscriptionStatus.planName}.`
          : 'Vous avez un accès institutionnel actif.',
      );
      router.replace(`/${locale}/dashboard/learner`);
    }
  }, [authLoading, session?.user, subscriptionStatus, locale, router]);

  /**
   * Learners on paid Standard must not checkout Standard again without `mode=renew` (upgrade → Premium).
   * Paid Premium with an accidental Standard target is corrected to Premium renewal.
   */
  useEffect(() => {
    if (authLoading || !session?.user || !subscriptionStatus) return;
    if (subscriptionStatus.kind !== 'paid_active') return;

    const current = (subscriptionStatus.planSlug || '').toLowerCase();
    const mode = modeQs;

    if (current === 'premium') {
      if (checkoutPlanSlug === 'standard') {
        setCheckoutPlanSlug('premium');
        savePlanIntent({ planId: 'premium', cycle, mode: 'renew', source: sourceQsRaw || 'checkout' });
        router.replace(
          buildCheckoutHref({
            locale,
            plan: 'premium',
            cycle,
            mode: 'renew',
            source: sourceQsRaw || undefined,
          }),
        );
      }
      return;
    }

    if (current !== 'standard') return;

    const explicitStandardRenew =
      isExplicitPaidPlanQuery(planQs) && planQs === 'standard' && mode === 'renew';
    if (explicitStandardRenew && checkoutPlanSlug === 'standard') return;

    if (checkoutPlanSlug === 'standard' && mode !== 'renew') {
      setCheckoutPlanSlug('premium');
      savePlanIntent({ planId: 'premium', cycle, mode: 'upgrade', source: sourceQsRaw || 'checkout' });
      router.replace(
        buildCheckoutHref({
          locale,
          plan: 'premium',
          cycle,
          mode: 'upgrade',
          source: sourceQsRaw || undefined,
        }),
      );
    }
  }, [
    authLoading,
    session?.user,
    subscriptionStatus,
    checkoutPlanSlug,
    cycle,
    locale,
    router,
    planQs,
    modeQs,
    sourceQsRaw,
  ]);

  const isFreeTier = useMemo(() => {
    if (!subscriptionStatus) return false;
    const slug = subscriptionStatus.planSlug?.toLowerCase() ?? '';
    if (slug === 'free' || slug === 'basic') return true;
    return subscriptionStatus.kind === 'free' || subscriptionStatus.kind === 'trial_active';
  }, [subscriptionStatus]);

  const paidActiveContext = useMemo(() => {
    if (!subscriptionStatus || subscriptionStatus.kind !== 'paid_active') return null;
    const cur = (subscriptionStatus.planSlug || '').toLowerCase();
    if (cur !== 'standard' && cur !== 'premium') return null;
    return { currentSlug: cur as 'standard' | 'premium' };
  }, [subscriptionStatus]);

  const premiumRenewalBlocked =
    subscriptionStatus?.kind === 'paid_active' &&
    (subscriptionStatus.planSlug || '').toLowerCase() === 'premium' &&
    checkoutPlanSlug === 'premium' &&
    modeQs !== 'renew';

  const showPlanTransitionCard = paidActiveContext && !premiumRenewalBlocked;

  const pageTitle = useMemo(() => {
    if (paidActiveContext?.currentSlug === 'standard' && checkoutPlanSlug === 'premium' && modeQs !== 'renew') {
      return t('checkoutPage.titleUpgradeToPremium');
    }
    if (paidActiveContext?.currentSlug === 'standard' && checkoutPlanSlug === 'standard' && modeQs === 'renew') {
      return t('checkoutPage.titleRenewStandard');
    }
    if (paidActiveContext?.currentSlug === 'premium' && checkoutPlanSlug === 'premium' && modeQs === 'renew') {
      return t('checkoutPage.titleRenewPremium');
    }
    return t('checkoutPage.titleDefault');
  }, [paidActiveContext, checkoutPlanSlug, modeQs, t]);

  const pageSubtitle = useMemo(() => {
    if (premiumRenewalBlocked) return t('checkoutPage.subtitlePremiumRenewalRequired');
    if (paidActiveContext?.currentSlug === 'standard' && checkoutPlanSlug === 'premium' && modeQs !== 'renew') {
      return t('checkoutPage.subtitleUpgrade');
    }
    return t('checkoutPage.subtitleDefault');
  }, [paidActiveContext, checkoutPlanSlug, modeQs, premiumRenewalBlocked, t]);

  const selectCheckoutPlan = (slug: 'standard' | 'premium') => {
    setCheckoutPlanSlug(slug);
    savePlanIntent({ planId: slug, cycle, mode: checkoutApiMode ?? 'upgrade', source: sourceQsRaw || 'checkout' });
    router.replace(
      buildCheckoutHref({
        locale,
        plan: slug,
        cycle,
        source: sourceQsRaw || undefined,
      }),
    );
  };

  useEffect(() => {
    if (!isFreeTier || !session?.user) return;
    savePlanIntent({
      planId: checkoutPlanSlug,
      cycle,
      mode: checkoutApiMode ?? 'upgrade',
      source: sourceQsRaw || 'checkout',
    });
  }, [cycle, checkoutPlanSlug, isFreeTier, session?.user]);

  const checkoutFeatureRows = useMemo(() => {
    const slug = isPublicPlanSlug(checkoutPlanSlug) ? checkoutPlanSlug : 'standard';
    return PUBLIC_PLANS[slug].featureLines
      .filter((l) => l.included)
      .slice(0, 6)
      .map((line, i) => ({
        icon: CHECKOUT_FEATURE_ICONS[i % CHECKOUT_FEATURE_ICONS.length],
        text: line.label,
      }));
  }, [checkoutPlanSlug]);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      const checkoutPath = buildCheckoutHref({
        locale,
        plan: checkoutPlanSlug,
        cycle,
        mode: modeQs === 'renew' || modeQs === 'upgrade' ? modeQs : undefined,
        source: sourceQsRaw || undefined,
      });
      const returnUrl = encodeURIComponent(checkoutPath);
      router.replace(`/${locale}/auth/login?returnUrl=${returnUrl}`);
      return;
    }
    touchPlanIntent();
  }, [authLoading, checkoutPlanSlug, cycle, locale, router, session?.user, modeQs, sourceQsRaw]);

  // Reset promo when cycle changes
  useEffect(() => { setPromoApplied(null); setPromoInput(''); }, [cycle]);

  const pricingRegion =
    pricing?.region === 'TN' || pricing?.region === 'EU' || pricing?.region === 'US'
      ? pricing.region
      : 'EU';
  const configSlug = isPublicPlanSlug(checkoutPlanSlug) ? checkoutPlanSlug : 'standard';
  const fallbackOpt = pickConfigBillingOption(configSlug, pricingRegion, cycle);
  const effectiveCurrency = pricing?.currency ?? fallbackOpt?.currency ?? 'EUR';
  const divisor = effectiveCurrency === 'TND' ? 1000 : 100;
  const apiCents = pricing?.prices?.[cycle];
  const rawAmount =
    typeof apiCents === 'number' && apiCents > 0 ? apiCents : fallbackOpt?.priceCents ?? 0;
  const isBackendPriceFallback =
    pricingQueryError ||
    typeof apiCents !== 'number' ||
    apiCents <= 0 ||
    pricing?.metadata?.source === 'code_fallback';
  const discountCents = promoApplied?.discountCents ?? 0;
  const finalAmount = Math.max(0, rawAmount - discountCents);
  const savings = rawAmount - finalAmount;
  const canPay = rawAmount > 0;

  const cyclePricesForPicker = useMemo(() => {
    const backendCycles = pricing?.cycles;
    if (backendCycles?.monthly?.amountCents && backendCycles?.quarterly?.amountCents && backendCycles?.annual?.amountCents) {
      return {
        monthly: backendCycles.monthly.amountCents,
        quarterly: backendCycles.quarterly.amountCents,
        semester: backendCycles.quarterly.amountCents,
        annual: backendCycles.annual.amountCents,
      };
    }
    const m = pickConfigBillingOption(configSlug, pricingRegion, 'monthly');
    const q = pickConfigBillingOption(configSlug, pricingRegion, 'quarterly');
    const a = pickConfigBillingOption(configSlug, pricingRegion, 'annual');
    return {
      monthly: m?.priceCents ?? 0,
      quarterly: q?.priceCents ?? 0,
      semester: q?.priceCents ?? 0,
      annual: a?.priceCents ?? 0,
    };
  }, [configSlug, pricingRegion, pricing?.cycles]);

  const formatPrice = (cents: number) =>
    `${(cents / divisor).toFixed(2)} ${effectiveCurrency}`;

  const setCycleFromPicker = (newCycle: BillingCycle) => {
    setCycle(newCycle);
    router.replace(
      buildCheckoutHref({
        locale,
        plan: checkoutPlanSlug,
        cycle: newCycle,
        mode: modeQs === 'renew' || modeQs === 'upgrade' ? modeQs : undefined,
        source: sourceQsRaw || undefined,
      }),
    );
  };

  const onApplyPromo = async () => {
    if (!promoInput.trim() || !effectiveCurrency || !rawAmount) return;
    setPromoLoading(true);
    try {
      const res = await validatePromoCode(
        promoInput.trim().toUpperCase(),
        effectiveCurrency,
        rawAmount,
        checkoutPlanSlug,
      );
      setPromoApplied({ code: promoInput.trim().toUpperCase(), discountCents: res.discountCents, message: res.message });
      toast.success(res.message || 'Code promo appliqué !');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Code invalide.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
      setPromoApplied(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const onPay = async () => {
    if (!rawAmount) return;

    if (premiumRenewalBlocked) {
      toast.error(t('checkoutPage.premiumRenewalToast'));
      return;
    }

    // Manual payment flow
    if (manualMethod) {
      trackEvent('payment_initiated', {
        provider: manualMethod,
        plan: checkoutPlanSlug,
        cycle,
        amountCents: finalAmount,
        currency: effectiveCurrency ?? 'TND',
      });
      setPaying(true);
      try {
        const req = await createManualPaymentRequest({
          paymentMethod: manualMethod,
          planSlug: checkoutPlanSlug,
          billingCycle: cycle,
          amountCents: finalAmount,
          currency: effectiveCurrency ?? 'TND',
          ...(checkoutApiMode ? { checkoutMode: checkoutApiMode } : {}),
        });
        router.push(`/${locale}/checkout/manual-payment/${req.id}`);
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Erreur lors de la création de la demande.';
        toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
        setPaying(false);
      }
      return;
    }

    // Online payment flow (unchanged)
    trackEvent('payment_initiated', {
      provider: 'online',
      plan: checkoutPlanSlug,
      cycle,
      amountCents: finalAmount,
      currency: effectiveCurrency ?? 'TND',
    });
    setPaying(true);
    try {
      const result = await startCheckout(
        cycle,
        promoApplied?.code,
        locale,
        checkoutPlanSlug,
        checkoutApiMode,
      );
      if (result.provider === 'flouci' && result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      if (result.provider === 'stripe' && result.clientSecret && result.publishableKey) {
        setStripeCheckout({ clientSecret: result.clientSecret, publishableKey: result.publishableKey, transactionId: result.transactionId });
        return;
      }
      toast.error('Impossible d\'initialiser le paiement.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erreur de paiement.';
      trackEvent('payment_failed', {
        provider: 'online',
        plan: checkoutPlanSlug,
        cycle,
        reason: Array.isArray(msg) ? msg.join(', ') : String(msg),
      });
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setPaying(false);
    }
  };

  // ── Stripe card collection step ──────────────────────────────────────────
  if (stripeCheckout) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] px-4 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600">
              <Lock className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Paiement 100% sécurisé</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100">
            <StripeCheckoutStep {...stripeCheckout} locale={locale} onBack={() => setStripeCheckout(null)} />
          </div>
          <TrustBar />
        </div>
      </div>
    );
  }

  // ── Main checkout layout ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f6f7fb]">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </button>
          <div className="flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5">
            <Lock className="h-3.5 w-3.5 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700">Paiement sécurisé</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">

        {/* ── Back Button ─────────────────────────────────────────────────── */}
        <div className="mb-3" />

        {/* ── Page title ──────────────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              <Sparkles className="h-3.5 w-3.5" /> {PUBLIC_PLANS[configSlug].name}
            </span>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
              {pageTitle}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{pageSubtitle}</p>
          </motion.div>
        </div>

        {premiumRenewalBlocked && (
          <div className="mb-8 mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-sm">
            <p className="font-medium">{t('checkoutPage.premiumRenewalRequired')}</p>
            <button
              type="button"
              onClick={() =>
                router.replace(
                  buildCheckoutHref({
                    locale,
                    plan: 'premium',
                    cycle,
                    mode: 'renew',
                    source: sourceQsRaw || undefined,
                  }),
                )
              }
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-violet-700"
            >
              {t('checkoutPage.enableRenewal')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {showPlanTransitionCard && subscriptionStatus && (
          <div className="mb-10 mx-auto max-w-3xl rounded-2xl border border-violet-200/70 bg-white p-5 shadow-sm">
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
              <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t('checkoutPage.currentPlan')}
                </p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {getPublicPlanDisplayName(paidActiveContext.currentSlug, subscriptionStatus.planName)}
                </p>
              </div>
              <ChevronRight className="mx-auto hidden h-6 w-6 shrink-0 text-violet-400 sm:block" aria-hidden />
              <div className="flex-1 rounded-xl border border-violet-300 bg-violet-50/90 px-4 py-3 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800">
                  {modeQs === 'renew' ? t('checkoutPage.targetRenew') : t('checkoutPage.newPlan')}
                </p>
                <p className="mt-1 text-base font-bold text-violet-950">{PUBLIC_PLANS[configSlug].name}</p>
                {modeQs === 'renew' ? (
                  <p className="mt-1 text-xs text-violet-900/90">{t('checkoutPage.flowRenew')}</p>
                ) : paidActiveContext.currentSlug === 'standard' && checkoutPlanSlug === 'premium' ? (
                  <p className="mt-1 text-xs text-violet-900/90">{t('checkoutPage.flowUpgrade')}</p>
                ) : null}
              </div>
            </div>
            {paidActiveContext.currentSlug === 'standard' &&
              checkoutPlanSlug === 'premium' &&
              modeQs === 'upgrade' && (
                <div className="mt-4 border-t border-violet-100 pt-3 text-center">
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-600 underline decoration-slate-400 underline-offset-2 hover:text-violet-800"
                    onClick={() =>
                      router.replace(
                        buildCheckoutHref({
                          locale,
                          plan: 'standard',
                          cycle,
                          mode: 'renew',
                          source: sourceQsRaw || undefined,
                        }),
                      )
                    }
                  >
                    {t('checkoutPage.preferRenewStandard')}
                  </button>
                </div>
              )}
          </div>
        )}

        {/* ── Free / trial: pick Standard vs Premium before billing cycle ───── */}
        {isFreeTier && (
          <section className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
              0 — Choisissez votre formule
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(['standard', 'premium'] as const).map((slug) => {
                const cfg = PUBLIC_PLANS[slug];
                const selected = checkoutPlanSlug === slug;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => selectCheckoutPlan(slug)}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-all',
                      selected
                        ? 'border-violet-300 bg-violet-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-violet-200',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                          selected ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {slug === 'premium' ? (
                          <Crown className="h-5 w-5" />
                        ) : (
                          <Rocket className="h-5 w-5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">{cfg.name}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{cfg.description}</p>
                      </div>
                      {selected ? (
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-violet-600" aria-hidden />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Plan selector (shared with landing pricing) ─────────────────── */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            1 — Choisissez votre période
          </h2>
          <BillingCycleCards
            selectedCycle={cycle}
            onSelect={setCycleFromPicker}
            pricingLoading={pricingPending}
            pricingError={pricingQueryError}
            currency={effectiveCurrency}
            prices={pricing?.prices ?? cyclePricesForPicker}
            divisor={divisor}
          />
          {isBackendPriceFallback && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
              Affichage sécurisé: nous appliquons un tarif vérifié pour garantir la cohérence du montant au paiement.
            </p>
          )}
        </section>

        {/* ── Two-column grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* ─── LEFT: Details + Promo + Payment ─────────────────────────── */}
          <div className="space-y-5 lg:col-span-3">

            {/* Account info */}
            <motion.section
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-400">
                2 — Vos informations
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  icon={<User className="h-4 w-4" />}
                  label="Nom complet"
                  value={session?.user?.fullName || ''}
                  readOnly
                  placeholder="Nom complet"
                />
                <InputField
                  icon={<Mail className="h-4 w-4" />}
                  label="Adresse e-mail"
                  value={session?.user?.email || ''}
                  readOnly
                  placeholder="email@exemple.com"
                />
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    <FileText className="mr-1 inline h-3.5 w-3.5" />
                    Notes (optionnel)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informations supplémentaires…"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                <BadgeCheck className="h-3.5 w-3.5 text-violet-500" />
                Informations récupérées depuis votre compte.
              </p>
            </motion.section>

            {/* Promo code */}
            <motion.section
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.17 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
                3 — Code promo
              </h2>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && onApplyPromo()}
                    placeholder="WELCOME10"
                    disabled={!!promoApplied}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm font-semibold uppercase tracking-widest text-slate-800 placeholder-slate-400 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
                  />
                </div>
                {promoApplied ? (
                  <button
                    type="button"
                    onClick={() => { setPromoApplied(null); setPromoInput(''); }}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Retirer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onApplyPromo}
                    disabled={!promoInput.trim() || promoLoading}
                    className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:from-fuchsia-700 hover:to-violet-700 disabled:opacity-50"
                  >
                    {promoLoading ? '…' : 'Appliquer'}
                  </button>
                )}
              </div>
              <AnimatePresence>
                {promoApplied && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{promoApplied.message || `Code ${promoApplied.code} appliqué — -${formatPrice(promoApplied.discountCents)}`}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Payment method */}
            <motion.section
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.24 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
                4 — Méthode de paiement
              </h2>

              {pricingPending ? (
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              ) : (
                <div className="space-y-3">
                  {/* ── Online payment (auto-detected) ── */}
                  <button
                    type="button"
                    onClick={() => setManualMethod(null)}
                    className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                      manualMethod === null
                        ? pricing?.provider === 'flouci'
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-violet-400 bg-violet-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                      {pricing?.provider === 'flouci' ? (
                        <Image src="/flouci.png" alt="Flouci" width={40} height={40} className="h-9 w-auto object-contain" />
                      ) : (
                        <CreditCard className="h-6 w-6 text-violet-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm">
                        {pricing?.provider === 'flouci' ? 'Flouci' : 'Paiement par carte'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {pricing?.provider === 'flouci'
                          ? 'Carte bancaire, e-dinar, Sobflous — paiement immédiat'
                          : 'Visa, Mastercard, Amex — paiement immédiat'}
                      </p>
                    </div>
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      manualMethod === null
                        ? pricing?.provider === 'flouci' ? 'border-orange-500 bg-orange-500' : 'border-violet-600 bg-violet-600'
                        : 'border-slate-300'
                    }`}>
                      {manualMethod === null && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>

                  {/* ── Virement bancaire ── */}
                  <button
                    type="button"
                    onClick={() => setManualMethod('bank_transfer')}
                    className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                      manualMethod === 'bank_transfer'
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm">Virement bancaire</p>
                      <p className="text-xs text-slate-500 mt-0.5">Virement depuis votre banque — validation sous 24-48h</p>
                    </div>
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      manualMethod === 'bank_transfer' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                    }`}>
                      {manualMethod === 'bank_transfer' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>

                  {/* ── D17 ── */}
                  <button
                    type="button"
                    onClick={() => setManualMethod('d17')}
                    className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                      manualMethod === 'd17'
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                      <Smartphone className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm">Paiement D17</p>
                      <p className="text-xs text-slate-500 mt-0.5">Portefeuille mobile D17 (Tunisie) — validation sous 24-48h</p>
                    </div>
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      manualMethod === 'd17' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                    }`}>
                      {manualMethod === 'd17' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>

                  {manualMethod && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      ⏱ Le paiement manuel nécessite une validation manuelle par notre équipe (24-48h ouvrées).
                      Votre accès sera activé dès approbation.
                    </div>
                  )}
                </div>
              )}

              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                Vos données de paiement sont chiffrées et ne sont jamais stockées sur nos serveurs.
              </p>
            </motion.section>
          </div>

          {/* ─── RIGHT: Sticky summary ───────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">

              {/* Summary card */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {/* Card header */}
                <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Récapitulatif</p>
                  <p className="mt-1 text-2xl font-black text-white">{PUBLIC_PLANS[configSlug].name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                      {BILLING_CYCLE_OPTIONS.find((c) => c.id === cycle)?.label}
                    </span>
                    {BILLING_CYCLE_OPTIONS.find((c) => c.id === cycle)?.badge && (
                      <span className="rounded-full bg-emerald-400/30 px-2.5 py-0.5 text-xs font-bold text-emerald-200">
                        {BILLING_CYCLE_OPTIONS.find((c) => c.id === cycle)?.badge}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* Price breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Sous-total</span>
                      <span className="font-medium">{pricingPending ? '…' : formatPrice(rawAmount)}</span>
                    </div>
                    <AnimatePresence>
                      {savings > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex justify-between text-emerald-600"
                        >
                          <span>
                            Remise{promoApplied ? ` (${promoApplied.code})` : ''}
                          </span>
                          <span className="font-semibold">-{formatPrice(savings)}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="border-t border-slate-100 pt-2" />
                    <div className="flex items-end justify-between">
                      <span className="font-semibold text-slate-900">Total</span>
                      <div className="text-right">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={finalAmount}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="text-3xl font-extrabold text-fuchsia-700"
                          >
                            {pricingPending ? '…' : formatPrice(finalAmount)}
                          </motion.span>
                        </AnimatePresence>
                        <p className="text-xs text-slate-400">{CYCLE_SUFFIX[cycle]}</p>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Inclus dans le plan</p>
                    {checkoutFeatureRows.map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-violet-100">
                          <Icon className="h-2.5 w-2.5 text-violet-600" />
                        </div>
                        <span className="text-xs text-slate-600">{text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Add-ons (design prep) */}
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Extensions a venir</p>
                    <div className="flex flex-wrap gap-2">
                      {['Coaching 1:1', 'Pack certification', 'Team analytics'].map((addon) => (
                        <span
                          key={addon}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                        >
                          {addon}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <motion.button
                    type="button"
                    onClick={onPay}
                    disabled={paying || !canPay || premiumRenewalBlocked}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-200 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {paying ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Traitement en cours…
                        </>
                      ) : manualMethod === 'bank_transfer' ? (
                        <>
                          <Building2 className="h-4 w-4" />
                          Voir les instructions de virement
                        </>
                      ) : manualMethod === 'd17' ? (
                        <>
                          <Smartphone className="h-4 w-4" />
                          Voir les instructions D17
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Payer maintenant
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}

                    </span>
                  </motion.button>

                  <p className="text-center text-xs text-slate-400">
                    En cliquant, vous acceptez nos{' '}
                    <span className="cursor-pointer underline underline-offset-2">Conditions d'utilisation</span>
                  </p>
                </div>
              </motion.div>

              {/* Trust bar */}
              <TrustBar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function InputField({
  icon,
  label,
  value,
  placeholder,
  readOnly,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  readOnly: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input
          type="text"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
            readOnly ? 'cursor-default bg-slate-50 text-slate-500' : 'bg-white'
          }`}
        />
      </div>
    </div>
  );
}

function TrustBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-sm">
      <span className="flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-emerald-500" /> SSL / TLS 256-bit
      </span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="flex items-center gap-1.5">
        <BadgeCheck className="h-3.5 w-3.5 text-blue-500" /> Données chiffrées
      </span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" /> Aucun stockage de carte
      </span>
    </div>
  );
}

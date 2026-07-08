'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { loadPlanIntent } from '@/lib/plan-intent';
import { trackEvent } from '@/lib/analytics/events';

type TxStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'not_found' | 'loading';

const MAX_POLLS = 15;
const POLL_MS = 3000;
const VERIFY_AFTER_POLLS = 2;

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = String(params?.locale || 'en');

  const tx = searchParams?.get('tx');
  const provider = searchParams?.get('provider') ?? 'stripe';
  const redirectStatus = searchParams?.get('redirect_status');

  const [status, setStatus] = useState<TxStatus>('loading');
  const trackedStatusRef = useRef<TxStatus | null>(null);

  // Refs keep values stable across Strict Mode double-invocation
  const attemptsRef = useRef(0);
  const verifiedRef = useRef(false);
  const redirectedRef = useRef(false);   // prevent double-redirect
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);        // flipped false on cleanup

  const goToDashboard = (delay = 2000) => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    timerRef.current = setTimeout(() => {
      router.replace(`/${locale}/dashboard/learner`);
    }, delay);
  };

  const retryCheckoutHref = (() => {
    const intent = loadPlanIntent();
    const plan = intent?.planId || 'standard';
    const cycle = intent?.cycle || 'monthly';
    const modePart = intent?.mode ? `&mode=${encodeURIComponent(intent.mode)}` : '';
    const sourcePart = intent?.source ? `&source=${encodeURIComponent(intent.source)}` : '';
    return `/${locale}/checkout?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle)}${modePart}${sourcePart}`;
  })();

  const waitForSubscriptionActivation = async (): Promise<boolean> => {
    const expectedPlan = loadPlanIntent()?.planId;
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i += 1) {
      try {
        const { data } = await api.get<{ kind?: string; planSlug?: string | null }>('/api/subscriptions/me/status');
        if (data?.kind === 'paid_active') {
          if (!expectedPlan || !data.planSlug) return true;
          if (String(data.planSlug).toLowerCase() === String(expectedPlan).toLowerCase()) return true;
        }
      } catch {
        // keep polling
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return false;
  };

  useEffect(() => {
    if (!tx) { setStatus('not_found'); return; }

    activeRef.current = true;

    const fetchStatus = async (): Promise<TxStatus> => {
      try {
        const { data } = await api.get(`/api/payments/transaction/${tx}`);
        return (data?.status as TxStatus) ?? 'pending';
      } catch { return 'pending'; }
    };

    const stripeVerify = async (): Promise<TxStatus> => {
      if (verifiedRef.current) return 'pending';
      verifiedRef.current = true;
      try {
        const { data } = await api.post(`/api/payments/transaction/${tx}/stripe-verify`);
        return (data?.status as TxStatus) ?? 'pending';
      } catch { return 'pending'; }
    };

    // ── Fast path: Stripe already confirmed client-side ──────────────────
    if (provider === 'stripe' && redirectStatus === 'succeeded') {
      setStatus('paid');
      // Fire verify in background (ensures fulfillment even if webhook was slow)
      stripeVerify().catch(() => {});
      waitForSubscriptionActivation().finally(() => goToDashboard(2500));
      return () => {
        activeRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    // ── Polling path (Flouci / no redirect_status) ────────────────────────
    const poll = async () => {
      if (!activeRef.current) return;

      attemptsRef.current += 1;
      let s = await fetchStatus();

      if (!activeRef.current) return;

      // Nudge backend after N pending polls for Stripe
      if (s === 'pending' && provider === 'stripe' && attemptsRef.current >= VERIFY_AFTER_POLLS) {
        s = await stripeVerify();
      }

      if (!activeRef.current) return;

      if (s === 'paid') {
        setStatus('paid');
        waitForSubscriptionActivation().finally(() => goToDashboard(2500));
        return;
      }

      if (s === 'failed' || s === 'cancelled' || s === 'not_found') {
        setStatus(s);
        return;
      }

      setStatus('pending');

      if (attemptsRef.current < MAX_POLLS) {
        timerRef.current = setTimeout(poll, POLL_MS);
      }
      // After MAX_POLLS, the render falls through to the "payment received" timeout state
    };

    poll();

    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx]);

  useEffect(() => {
    if (trackedStatusRef.current === status) return;
    trackedStatusRef.current = status;

    if (status === 'paid') {
      trackEvent('payment_succeeded', { provider, tx });
    } else if (status === 'failed' || status === 'cancelled') {
      trackEvent('payment_failed', { provider, tx, reason: status });
    }
  }, [provider, status, tx]);

  // ── Loading / polling spinner ─────────────────────────────────────────
  if (status === 'loading' || status === 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-violet-50 px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-violet-100 shadow-lg shadow-violet-200">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Confirmation en cours…</h1>
          <p className="mt-2 max-w-xs text-sm text-slate-500">
            Nous vérifions votre paiement. Cela prend quelques secondes.
          </p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full bg-violet-400"
              style={{ animation: `blink 1.2s ${i * 0.2}s infinite ease-in-out` }} />
          ))}
        </div>
        <style>{`@keyframes blink{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────
  if (status === 'paid') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-emerald-50 px-4">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-emerald-100 shadow-xl shadow-emerald-200">
          <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-25" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Paiement confirmé !
          </h1>
          <p className="mt-3 max-w-sm text-base text-slate-500">
            Votre abonnement Premium est maintenant actif.
            Vous allez être redirigé vers votre dashboard dans quelques secondes…
          </p>
          {tx && <p className="mt-3 rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-400 inline-block">Réf. : {tx}</p>}
        </div>
        <button
          onClick={() => { redirectedRef.current = true; router.replace(`/${locale}/dashboard/learner`); }}
          className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-fuchsia-700 hover:-translate-y-0.5"
        >
          Aller au dashboard →
        </button>
      </div>
    );
  }

  // ── Failed / cancelled ───────────────────────────────────────────────
  if (status === 'failed' || status === 'cancelled') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-red-50 px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100 shadow-lg shadow-red-200">
          <XCircle className="h-12 w-12 text-red-600" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Paiement échoué</h1>
          <p className="mt-2 text-sm text-slate-500">
            Votre paiement n&apos;a pas pu être traité. Veuillez réessayer.
          </p>
        </div>
        <button
          onClick={() => router.replace(retryCheckoutHref)}
          className="rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // ── Timeout fallback ─────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-amber-50 px-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 shadow-lg shadow-amber-200">
        <CheckCircle2 className="h-12 w-12 text-amber-600" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Paiement reçu</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Votre paiement a bien été reçu. Votre abonnement sera activé dans quelques instants.
        </p>
        {tx && <p className="mt-2 text-xs text-slate-400">Réf. : {tx}</p>}
      </div>
      <button
        onClick={() => router.replace(`/${locale}/dashboard/learner`)}
        className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-fuchsia-700"
      >
        Aller au dashboard
      </button>
    </div>
  );
}

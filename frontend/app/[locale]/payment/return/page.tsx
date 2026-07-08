'use client';

/**
 * /[locale]/payment/return — Flouci payment verification hub
 *
 * ┌─ STATE MACHINE ──────────────────────────────────────────────────────┐
 * │                                                                      │
 * │  verifying ──(paid)──────────────────────────────────► paid          │
 * │            ──(cancelled × 2 confirms)────────────────► cancelled    │
 * │            ──(failed × 2 confirms)───────────────────► failed       │
 * │            ──(Phase 1 timeout → pending UI)──┐                      │
 * │                                              │ still polling        │
 * │            ──(Phase 2 timeout)───────────────► expired              │
 * │                                                                      │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * PHASE 1  (first ~45 s)
 *   Fast polling every 3 s, shows "Vérification" spinner.
 *   Reconcile called on attempt 1, then every 3rd attempt.
 *
 * PHASE 2  (next ~10 min)
 *   Slow polling every 10 s, shows "Paiement en attente" with elapsed clock.
 *   Reconcile re-armed every 6th attempt (≈ every 60 s).
 *   If payment succeeds → immediately shows success.
 *   If payment stays pending after 10 min → calls /expire-flouci → expired.
 *
 * FAILURE GRACE WINDOW
 *   cancelled/failed need 2 consecutive confirmations (5 s apart) before
 *   showing the error UI, giving Flouci's webhook time to flip status to paid.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { api } from '@/lib/api/client';
import { loadPlanIntent } from '@/lib/plan-intent';
import { trackEvent } from '@/lib/analytics/events';

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_DELAY_MS       = 2_000;  // let Flouci settle before first verify
const P1_POLL_MS             = 3_000;  // Phase 1 interval
const P1_MAX_POLLS           = 15;     // Phase 1 ends after 15 × 3 s ≈ 45 s
const P2_POLL_MS             = 10_000; // Phase 2 interval
const P2_MAX_POLLS           = 60;     // Phase 2 ends after 60 × 10 s ≈ 10 min
const FAIL_CONFIRM_DELAY_MS  = 5_000;  // gap between failure confirmations
const FAIL_CONFIRMATIONS     = 2;      // consecutive non-success checks before final
const AUTO_REDIRECT_MS       = 3_000;  // delay before dashboard redirect on success

// ─── Types ────────────────────────────────────────────────────────────────────

type UIState = 'verifying' | 'paid' | 'pending' | 'expired' | 'failed' | 'cancelled' | 'no_tx';

interface ReconcileResult { status: string; providerRawStatus?: string }
interface TxStatusResult  { status: string; updatedAt?: string; providerDebug?: { rawStatus?: string } }

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentReturnPage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const locale    = String(params?.locale || 'en');
  const tx        = searchParams?.get('tx')         ?? '';
  const provider  = searchParams?.get('provider')   ?? 'flouci';
  const paymentId = searchParams?.get('payment_id') ?? '';

  const [uiState,        setUiState]        = useState<UIState>('verifying');
  const [providerStatus, setProviderStatus] = useState('');
  const [elapsedSec,     setElapsedSec]     = useState(0);
  const [recheckLoading, setRecheckLoading] = useState(false);

  // ── Stable refs (survive renders, don't trigger re-renders) ──────────────
  const activeRef       = useRef(true);
  const phaseRef        = useRef<1 | 2>(1);
  const p1AttemptsRef   = useRef(0);
  const p2AttemptsRef   = useRef(0);
  const reconciledRef   = useRef(false);
  const failConfirmsRef = useRef(0);
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef    = useRef(Date.now());
  const trackedUiRef    = useRef<UIState | null>(null);

  const retryCheckoutHref = (() => {
    const intent = loadPlanIntent();
    const plan = intent?.planId || 'standard';
    const cycle = intent?.cycle || 'monthly';
    const modePart = intent?.mode ? `&mode=${encodeURIComponent(intent.mode)}` : '';
    const sourcePart = intent?.source ? `&source=${encodeURIComponent(intent.source)}` : '';
    return `/${locale}/checkout?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle)}${modePart}${sourcePart}`;
  })();

  const waitForSubscriptionActivation = async (): Promise<void> => {
    const expectedPlan = loadPlanIntent()?.planId;
    for (let i = 0; i < 10; i += 1) {
      try {
        const { data } = await api.get<{ kind?: string; planSlug?: string | null }>('/api/subscriptions/me/status');
        if (data?.kind === 'paid_active') {
          if (!expectedPlan || !data.planSlug || String(data.planSlug).toLowerCase() === String(expectedPlan).toLowerCase()) {
            return;
          }
        }
      } catch {
        // keep polling
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  };

  const clearTimer = () => {
    if (timerRef.current)  { clearTimeout(timerRef.current);  timerRef.current  = null; }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
  };

  const redirectToDashboard = () => {
    clearTimer();
    timerRef.current = setTimeout(async () => {
      await waitForSubscriptionActivation();
      router.replace(`/${locale}/dashboard/learner`);
    }, AUTO_REDIRECT_MS);
  };

  // ── API helpers ───────────────────────────────────────────────────────────

  const fetchStatus = async (): Promise<string> => {
    try {
      const { data } = await api.get<TxStatusResult>(`/api/payments/transaction/${tx}`);
      if (data?.providerDebug?.rawStatus) setProviderStatus(data.providerDebug.rawStatus);
      return data?.status ?? 'pending';
    } catch { return 'pending'; }
  };

  const triggerReconcile = async (): Promise<ReconcileResult | null> => {
    if (reconciledRef.current) return null;
    reconciledRef.current = true;
    try {
      const qs = paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : '';
      const { data } = await api.post<ReconcileResult>(
        `/api/payments/transaction/${tx}/reconcile-flouci${qs}`,
      );
      if (data?.providerRawStatus) setProviderStatus(data.providerRawStatus);
      return data;
    } catch (err: any) {
      if (err?.response?.status !== 401) reconciledRef.current = false;
      return null;
    }
  };

  const triggerExpiry = async (): Promise<string> => {
    try {
      const { data } = await api.post<ReconcileResult>(
        `/api/payments/transaction/${tx}/expire-flouci`,
      );
      return data?.status ?? 'expired';
    } catch { return 'expired'; }
  };

  // ── Core poll logic ───────────────────────────────────────────────────────

  const handleStatus = useCallback(async (s: string): Promise<boolean> => {
    if (!activeRef.current) return true;

    if (s === 'paid') {
      setUiState('paid');
      redirectToDashboard();
      return true; // stop polling
    }

    if (s === 'expired') { setUiState('expired'); return true; }

    if (s === 'failed' || s === 'cancelled') {
      failConfirmsRef.current += 1;
      if (failConfirmsRef.current >= FAIL_CONFIRMATIONS) {
        setUiState(s as UIState);
        return true; // stop polling
      }
      // Grace window — keep verifying state, schedule one more check
      setUiState('verifying');
      timerRef.current = setTimeout(pollPhase1, FAIL_CONFIRM_DELAY_MS);
      return true; // pause normal loop
    }

    failConfirmsRef.current = 0;
    return false; // still pending — continue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollPhase1 = async (): Promise<void> => {
    if (!activeRef.current) return;
    p1AttemptsRef.current += 1;

    // Re-arm reconcile on attempt 1, then every 3rd
    if (p1AttemptsRef.current === 1 || p1AttemptsRef.current % 3 === 0) {
      reconciledRef.current = false;
    }

    const reconcileResult = await triggerReconcile();
    let s: string;
    if (reconcileResult) {
      s = reconcileResult.status ?? 'pending';
    } else {
      s = await fetchStatus();
    }
    if (!activeRef.current) return;

    const done = await handleStatus(s);
    if (done) return;

    if (p1AttemptsRef.current >= P1_MAX_POLLS) {
      // Phase 1 exhausted → switch to Phase 2 slow polling
      setUiState('pending');
      phaseRef.current = 2;
      startPhase2();
      return;
    }

    timerRef.current = setTimeout(pollPhase1, P1_POLL_MS);
  };

  const startPhase2 = (): void => {
    // Start elapsed-seconds counter
    startTimeRef.current = Date.now();
    elapsedRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1_000);
    timerRef.current = setTimeout(pollPhase2, P2_POLL_MS);
  };

  const pollPhase2 = async (): Promise<void> => {
    if (!activeRef.current) return;
    p2AttemptsRef.current += 1;

    // Re-arm reconcile every 6 polls ≈ every 60 s
    if (p2AttemptsRef.current % 6 === 0) reconciledRef.current = false;

    const reconcileResult = await triggerReconcile();
    let s: string;
    if (reconcileResult) {
      s = reconcileResult.status ?? 'pending';
    } else {
      s = await fetchStatus();
    }
    if (!activeRef.current) return;

    const done = await handleStatus(s);
    if (done) return;

    if (p2AttemptsRef.current >= P2_MAX_POLLS) {
      // Full timeout — expire then show expired UI
      const finalStatus = await triggerExpiry();
      setUiState(finalStatus === 'paid' ? 'paid' : 'expired');
      if (finalStatus === 'paid') redirectToDashboard();
      return;
    }

    timerRef.current = setTimeout(pollPhase2, P2_POLL_MS);
  };

  // ── Boot ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!tx || provider !== 'flouci') { setUiState('no_tx'); return; }

    activeRef.current = true;
    timerRef.current  = setTimeout(pollPhase1, INITIAL_DELAY_MS);

    return () => { activeRef.current = false; clearTimer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx]);

  useEffect(() => {
    if (trackedUiRef.current === uiState) return;
    trackedUiRef.current = uiState;

    if (uiState === 'paid') {
      trackEvent('payment_succeeded', { provider, tx });
    } else if (uiState === 'failed' || uiState === 'cancelled' || uiState === 'expired') {
      trackEvent('payment_failed', { provider, tx, reason: uiState });
    }
  }, [provider, tx, uiState]);

  // ── Manual recheck ────────────────────────────────────────────────────────

  const handleRecheck = async () => {
    clearTimer();
    setRecheckLoading(true);
    setUiState('verifying');
    reconciledRef.current = false;
    failConfirmsRef.current = 0;
    phaseRef.current = 1;
    p1AttemptsRef.current = 0;
    p2AttemptsRef.current = 0;
    activeRef.current = true;
    await pollPhase1();
    setRecheckLoading(false);
  };

  // ── Elapsed time helper ───────────────────────────────────────────────────

  const elapsedLabel = elapsedSec < 60
    ? `${elapsedSec}s`
    : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // ── Verifying spinner ────────────────────────────────────────────────────
  if (uiState === 'verifying') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-violet-50 px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-violet-100 shadow-lg shadow-violet-200">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Vérification du paiement…</h1>
          <p className="mt-2 max-w-xs text-sm text-slate-500">
            Nous confirmons votre paiement auprès de Flouci. Merci de patienter.
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

  // ── Success ───────────────────────────────────────────────────────────────
  if (uiState === 'paid') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-emerald-50 px-4">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-emerald-100 shadow-xl shadow-emerald-200">
          <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-25" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Paiement confirmé !</h1>
          <p className="mt-3 max-w-sm text-base text-slate-500">
            Votre abonnement Premium est maintenant actif. Redirection dans quelques secondes…
          </p>
          {tx && <p className="mt-3 inline-block rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-400">Réf. : {tx}</p>}
        </div>
        <button
          onClick={() => router.replace(`/${locale}/dashboard/learner`)}
          className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-fuchsia-700 hover:-translate-y-0.5"
        >
          Aller au dashboard →
        </button>
      </div>
    );
  }

  // ── Pending / waiting (Phase 2 active) ───────────────────────────────────
  if (uiState === 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-amber-50 px-4">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 shadow-lg shadow-amber-200">
          <Clock className="h-12 w-12 text-amber-600" />
          {/* Slow pulse ring to indicate background polling is active */}
          <span className="absolute inset-0 animate-ping rounded-full bg-amber-200 opacity-20"
            style={{ animationDuration: '2s' }} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Paiement en attente de confirmation</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Votre paiement est en cours de traitement par Flouci.
            Nous vérifions automatiquement toutes les 10 secondes.
          </p>
          {tx && <p className="mt-1 text-xs text-slate-400">Réf. : {tx}</p>}
          {elapsedSec > 0 && (
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              En attente depuis {elapsedLabel}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleRecheck}
            disabled={recheckLoading}
            className="flex items-center gap-2 rounded-2xl border border-violet-200 bg-white px-8 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
          >
            {recheckLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Vérification…</>
              : <><RefreshCw className="h-4 w-4" /> Vérifier maintenant</>}
          </button>
          <button
            onClick={() => router.replace(`/${locale}/dashboard/learner`)}
            className="rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            Aller au dashboard
          </button>
        </div>
        <p className="max-w-xs text-center text-xs text-slate-400">
          Si votre abonnement n&apos;est pas activé dans 10 minutes, contactez le support avec la référence.
        </p>
      </div>
    );
  }

  // ── Expired (no response after 10 min) ───────────────────────────────────
  if (uiState === 'expired') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-slate-50 px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 shadow-lg shadow-slate-200">
          <Clock className="h-12 w-12 text-slate-400" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Session expirée</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Votre session de paiement a expiré sans confirmation de Flouci.
            Si votre banque a été débitée, contactez le support avec la référence ci-dessous.
          </p>
          {tx && <p className="mt-2 text-xs font-mono text-slate-400">{tx}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleRecheck}
            disabled={recheckLoading}
            className="flex items-center gap-2 rounded-2xl border border-violet-200 bg-white px-8 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
          >
            {recheckLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Vérification…</>
              : <><RefreshCw className="h-4 w-4" /> Vérifier quand même</>}
          </button>
          <button
            onClick={() => router.replace(retryCheckoutHref)}
            className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-fuchsia-700"
          >
            Réessayer le paiement
          </button>
        </div>
      </div>
    );
  }

  // ── Cancelled (user-aborted or session stopped) ───────────────────────────
  if (uiState === 'cancelled') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-slate-50 px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 shadow-lg shadow-slate-200">
          <XCircle className="h-12 w-12 text-slate-500" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Paiement annulé</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Votre paiement a été annulé ou la session a expiré. Aucun montant n&apos;a été débité.
          </p>
          {tx && <p className="mt-2 text-xs text-slate-400">Réf. : {tx}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.replace(retryCheckoutHref)}
            className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-fuchsia-700"
          >
            Retourner au checkout
          </button>
          <button
            onClick={handleRecheck}
            disabled={recheckLoading}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {recheckLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Vérification…</>
              : <><RefreshCw className="h-4 w-4" /> Vérifier quand même</>}
          </button>
        </div>
      </div>
    );
  }

  // ── Failed (card declined / bank rejection) ───────────────────────────────
  if (uiState === 'failed') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-red-50 px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100 shadow-lg shadow-red-200">
          <XCircle className="h-12 w-12 text-red-600" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Paiement refusé</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Votre carte ou votre banque a refusé le paiement. Aucun montant n&apos;a été débité.
            Vérifiez les détails de votre carte ou essayez un autre moyen de paiement.
          </p>
          {tx && <p className="mt-2 text-xs text-slate-400">Réf. : {tx}</p>}
          {providerStatus && <p className="mt-1 text-xs text-slate-300">Code : {providerStatus}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.replace(retryCheckoutHref)}
            className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-fuchsia-700"
          >
            Réessayer le paiement
          </button>
          <button
            onClick={handleRecheck}
            disabled={recheckLoading}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {recheckLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Vérification…</>
              : <><RefreshCw className="h-4 w-4" /> Vérifier quand même</>}
          </button>
        </div>
      </div>
    );
  }

  // ── No transaction ────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <p className="text-slate-500">Aucune transaction trouvée.</p>
      <button
        onClick={() => router.replace(retryCheckoutHref)}
        className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
      >
        Retourner au checkout
      </button>
    </div>
  );
}

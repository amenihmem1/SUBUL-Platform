'use client';

/**
 * /[locale]/payment/cancel
 *
 * Shown when the user explicitly cancels (e.g. presses "Back" on Flouci's
 * hosted page, or Stripe cancels). If a Flouci `tx` + `payment_id` are
 * present (legacy links or old fail_link), we still attempt a quick
 * reconcile and redirect to /payment/return for the full verification flow.
 */

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { loadPlanIntent } from '@/lib/plan-intent';
import { trackEvent } from '@/lib/analytics/events';

export default function PaymentCancelPage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const locale       = String(params?.locale || 'en');

  const tx        = searchParams?.get('tx');
  const provider  = searchParams?.get('provider');
  const paymentId = searchParams?.get('payment_id');

  const retryCheckoutHref = (() => {
    const intent = loadPlanIntent();
    const plan = intent?.planId || 'standard';
    const cycle = intent?.cycle || 'monthly';
    const modePart = intent?.mode ? `&mode=${encodeURIComponent(intent.mode)}` : '';
    const sourcePart = intent?.source ? `&source=${encodeURIComponent(intent.source)}` : '';
    return `/${locale}/checkout?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle)}${modePart}${sourcePart}`;
  })();

  useEffect(() => {
    trackEvent('payment_failed', { provider: provider || 'unknown', tx: tx || null, reason: 'cancelled' });
  }, [provider, tx]);

  // If we have a Flouci tx, send user to the full verification flow instead
  // (handles the case where old fail_link bookmarks land here)
  useEffect(() => {
    if (!tx || provider !== 'flouci') return;
    const pid = paymentId ? `&payment_id=${encodeURIComponent(paymentId)}` : '';
    router.replace(`/${locale}/payment/return?tx=${tx}&provider=flouci${pid}`);
  }, [locale, paymentId, provider, router, tx]);

  // If redirecting, show a brief loading state
  if (tx && provider === 'flouci') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">Vérification du paiement…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-white to-slate-50 px-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 shadow-lg shadow-slate-200">
        <XCircle className="h-12 w-12 text-slate-500" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Paiement annulé</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Vous avez annulé le paiement. Aucun montant n&apos;a été débité.
          Vous pouvez réessayer à tout moment.
        </p>
      </div>
      <button
        onClick={() => router.replace(retryCheckoutHref)}
        className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-fuchsia-700"
      >
        Retourner au checkout
      </button>
    </div>
  );
}

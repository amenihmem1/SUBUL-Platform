'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { getMyManualPayments, type ManualPaymentRequest, type ManualPaymentStatus } from '@/services/payments';
import { getSubscriptionStatus } from '@/services/subscriptions';
import Link from 'next/link';
import {
  Building2, Smartphone, CheckCircle2, Clock, XCircle,
  Upload, AlertCircle, Plus, ExternalLink,
} from 'lucide-react';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_DISPLAY: Record<ManualPaymentStatus, { label: string; icon: React.ElementType; cls: string }> = {
  pending:        { label: 'En attente',       icon: Clock,        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  proof_uploaded: { label: 'Preuve envoyée',   icon: Upload,       cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  pending_review: { label: 'En validation',    icon: Clock,        cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  approved:       { label: 'Validé',           icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:       { label: 'Refusé',           icon: XCircle,      cls: 'bg-red-50 text-red-700 border-red-200' },
};

function StatusBadge({ status }: { status: ManualPaymentStatus }) {
  const { label, icon: Icon, cls } = STATUS_DISPLAY[status] ?? STATUS_DISPLAY.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function MethodBadge({ method }: { method: ManualPaymentRequest['paymentMethod'] }) {
  const isBank = method === 'bank_transfer';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      isBank
        ? 'bg-blue-50 text-blue-700'
        : 'bg-emerald-50 text-emerald-700'
    }`}>
      {isBank ? <Building2 className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
      {isBank ? 'Virement bancaire' : 'D17'}
    </span>
  );
}

function RequestCard({ req, locale }: { req: ManualPaymentRequest; locale: string }) {
  const divisor = req.currency === 'TND' ? 1000 : 100;
  const amountFmt = `${(req.amountCents / divisor).toFixed(2)} ${req.currency}`;
  const date = new Date(req.createdAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="rounded-2xl border bg-card shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden">
      {/* Card header bar */}
      <div className={`h-1 w-full ${
        req.status === 'approved' ? 'bg-emerald-500'
        : req.status === 'rejected' ? 'bg-red-400'
        : req.status === 'pending_review' || req.status === 'proof_uploaded' ? 'bg-violet-500'
        : 'bg-amber-400'
      }`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold text-foreground">{req.planName}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{req.orderId}</p>
          </div>
          <StatusBadge status={req.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Montant</p>
            <p className="font-bold">{amountFmt}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Durée</p>
            <p className="font-medium">
              {req.billingCycle === 'monthly' ? '1 mois'
                : req.billingCycle === 'quarterly' ? '3 mois'
                : req.billingCycle === 'annual' ? '12 mois'
                : req.billingCycle}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Méthode</p>
            <MethodBadge method={req.paymentMethod} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Créé le</p>
            <p className="font-medium">{date}</p>
          </div>
        </div>

        {/* Proof status */}
        <div className={`rounded-lg px-3 py-2 text-xs mb-4 ${
          req.proofFileUrl
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {req.proofFileUrl
            ? `✓ Preuve envoyée${req.proofFileName ? ` — ${req.proofFileName}` : ''}`
            : '⏳ Preuve de paiement non encore envoyée'}
        </div>

        {/* Admin notes (rejection reason) */}
        {req.adminNotes && req.status === 'rejected' && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 mb-4">
            <span className="font-semibold">Motif : </span>{req.adminNotes}
          </div>
        )}

        {/* Action */}
        <Link
          href={`/${locale}/checkout/manual-payment/${req.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          {req.status === 'approved'
            ? 'Voir les détails'
            : req.proofFileUrl
              ? 'Voir les instructions'
              : 'Envoyer la preuve'}
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ locale, showCreateCta }: { locale: string; showCreateCta: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C4DFF]/10 to-[#C2185B]/10 flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-7 h-7 text-[#7C4DFF]" />
      </div>
      <h3 className="text-base font-semibold mb-1">
        {showCreateCta ? 'Aucune demande de paiement' : 'Aucune demande enregistrée'}
      </h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5">
        {showCreateCta
          ? "Vous n'avez pas encore de demande de paiement manuel. Choisissez un plan et sélectionnez virement ou D17 à la caisse."
          : "Vous n'avez aucune demande de paiement manuel à afficher. Votre abonnement actif est géré hors virement manuel ; cette page sert au suivi de vos demandes passées ou en cours."}
      </p>
      {showCreateCta && ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS && (
        <Link
          href={`/${locale}/checkout?plan=standard&cycle=monthly`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white text-sm font-semibold shadow-md hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Choisir un plan
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentRequestsPage() {
  const params = useParams();
  const locale = String(params?.locale ?? 'en');

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['manual-payments-my'],
    queryFn: getMyManualPayments,
    staleTime: 30_000,
  });

  const { data: subscriptionStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    staleTime: 30_000,
    retry: false,
  });

  /**
   * Hide "new manual payment" / checkout entry when the learner already has a paid personal plan
   * or institutional access — page becomes tracking/history only.
   * Free & trial users keep access and can still open checkout to start a manual flow.
   */
  const showCreateManualPaymentCta = useMemo(() => {
    const sub = subscriptionStatus;
    if (!sub) return true;
    if (sub.kind === 'institutional_active') return false;
    if (sub.kind === 'paid_active') {
      const slug = (sub.planSlug ?? '').trim().toLowerCase();
      if (slug === 'standard' || slug === 'premium') return false;
    }
    return true;
  }, [subscriptionStatus]);

  const pending = requests?.filter(r => ['pending', 'proof_uploaded', 'pending_review'].includes(r.status)) ?? [];
  const resolved = requests?.filter(r => ['approved', 'rejected'].includes(r.status)) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paiements manuels</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {showCreateManualPaymentCta
              ? 'Suivez vos demandes de paiement par virement ou D17.'
              : 'Historique et suivi de vos demandes de paiement manuel.'}
          </p>
        </div>
        {showCreateManualPaymentCta && ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS && (
          <Link
            href={`/${locale}/checkout?plan=standard&cycle=monthly`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white text-sm font-semibold shadow-md hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nouveau
          </Link>
        )}
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-[#7C4DFF]/20 bg-[#7C4DFF]/5 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#7C4DFF] flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-[#7C4DFF]">
            {showCreateManualPaymentCta ? 'Comment ça fonctionne' : 'Suivi des paiements'}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {showCreateManualPaymentCta
              ? 'Effectuez votre virement ou paiement D17, uploadez votre preuve, puis notre équipe validera votre abonnement sous 24-48h ouvrées.'
              : "Les nouvelles demandes manuelles ne sont pas nécessaires tant que votre abonnement payant est actif. Retrouvez ici l'état de vos demandes déjà créées et les preuves transmises."}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl border bg-card h-60 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Erreur lors du chargement. Veuillez réessayer.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && requests?.length === 0 && (
        <EmptyState locale={locale} showCreateCta={showCreateManualPaymentCta} />
      )}

      {/* Active requests */}
      {!isLoading && pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            En cours ({pending.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pending.map(req => (
              <RequestCard key={req.id} req={req} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Resolved */}
      {!isLoading && resolved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Historique ({resolved.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {resolved.map(req => (
              <RequestCard key={req.id} req={req} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

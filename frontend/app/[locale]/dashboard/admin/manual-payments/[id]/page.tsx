'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminGetManualPayment, adminApproveManualPayment,
  adminRejectManualPayment, adminRequestNewProof,
} from '@/services/adminPlatform';
import type { ManualPaymentStatus } from '@/services/payments';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Smartphone, CheckCircle2, Clock,
  XCircle, Upload, ExternalLink, AlertCircle, FileText,
  User, Calendar, CreditCard, RefreshCw, Eye,
} from 'lucide-react';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<ManualPaymentStatus, { label: string; cls: string; icon: React.ElementType }> = {
  pending:        { label: 'En attente de paiement', cls: 'bg-amber-50 text-amber-700 border-amber-200',     icon: Clock },
  proof_uploaded: { label: 'Preuve envoyée',          cls: 'bg-blue-50 text-blue-700 border-blue-200',       icon: Upload },
  pending_review: { label: 'En cours de validation',  cls: 'bg-violet-50 text-violet-700 border-violet-200', icon: Clock },
  approved:       { label: 'Paiement validé',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected:       { label: 'Paiement refusé',          cls: 'bg-red-50 text-red-700 border-red-200',           icon: XCircle },
};

function StatusBadge({ status }: { status: ManualPaymentStatus }) {
  const { label, cls, icon: Icon } = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

// ─── Proof preview ────────────────────────────────────────────────────────────

function ProofPreview({ url, fileName }: { url: string; fileName: string | null }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const isPdf =
    (fileName?.toLowerCase().endsWith('.pdf') ?? false) ||
    url.toLowerCase().includes('.pdf');

  return (
    <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#7C4DFF]" />
          <h3 className="text-sm font-semibold">Preuve de paiement</h3>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-[#7C4DFF] hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir
        </a>
      </div>
      <div className="p-4">
        {isPdf ? (
          <div className="rounded-xl bg-muted flex flex-col items-center justify-center py-8 gap-3">
            <FileText className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{fileName ?? 'preuve.pdf'}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C4DFF] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Eye className="w-4 h-4" />
              Ouvrir le PDF
            </a>
          </div>
        ) : loadFailed ? (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-amber-800">Impossible de charger l'aperçu</p>
            <p className="text-xs text-amber-700 mt-1">
              Le fichier existe peut-etre encore, ouvrez-le directement dans un nouvel onglet.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold hover:bg-amber-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir le fichier
            </a>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden bg-muted">
            <img
              src={url}
              alt="Preuve de paiement"
              className="w-full max-h-80 object-contain"
              onError={() => setLoadFailed(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Approve dialog ───────────────────────────────────────────────────────────

function ApproveDialog({
  billingCycle,
  onApprove,
  onCancel,
  isPending,
}: {
  billingCycle: string;
  onApprove: (months: number, notes: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const defaultMonths = billingCycle === 'monthly' ? 1 : billingCycle === 'quarterly' ? 3 : billingCycle === 'annual' ? 12 : 1;
  const [months, setMonths] = useState(defaultMonths);
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border shadow-xl p-6 max-w-sm w-full">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-center mb-1">Valider le paiement</h3>
        <p className="text-sm text-muted-foreground text-center mb-5">
          Cela activera l'abonnement pour cet utilisateur.
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Durée de l'abonnement (mois)
            </label>
            <input
              type="number"
              min={1}
              max={36}
              value={months}
              onChange={e => setMonths(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/30 focus:border-[#7C4DFF]"
            />
            <p className="text-xs text-muted-foreground mt-1">Suggestion : {defaultMonths} mois (selon le cycle sélectionné)</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes admin (optionnel)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex : Paiement confirmé via relevé bancaire"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/30 focus:border-[#7C4DFF]"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors">
            Annuler
          </button>
          <button
            onClick={() => onApprove(months, notes)}
            disabled={isPending}
            className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Validation…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject dialog ────────────────────────────────────────────────────────────

function RejectDialog({
  onReject,
  onCancel,
  isPending,
}: {
  onReject: (notes: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border shadow-xl p-6 max-w-sm w-full">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-base font-semibold text-center mb-1">Refuser le paiement</h3>
        <p className="text-sm text-muted-foreground text-center mb-5">
          L'utilisateur sera notifié et pourra soumettre une nouvelle preuve.
        </p>
        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block">Motif du refus (optionnel)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex : La preuve est illisible, veuillez renvoyer."
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors">
            Annuler
          </button>
          <button
            onClick={() => onReject(notes)}
            disabled={isPending}
            className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Refus…' : 'Refuser'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminManualPaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = String(params?.locale ?? 'en');
  const id = String(params?.id ?? '');
  const qc = useQueryClient();

  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const { data: req, isLoading } = useQuery({
    queryKey: ['admin', 'manual-payment', id],
    queryFn: () => adminGetManualPayment(id),
    staleTime: 20_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'manual-payment', id] });
    qc.invalidateQueries({ queryKey: ['admin', 'manual-payments'] });
  };

  const approveMut = useMutation({
    mutationFn: ({ months, notes }: { months: number; notes: string }) =>
      adminApproveManualPayment(id, months, notes || undefined),
    onSuccess: () => { invalidate(); setShowApprove(false); },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Erreur lors de la validation.');
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ notes }: { notes: string }) =>
      adminRejectManualPayment(id, notes || undefined),
    onSuccess: () => { invalidate(); setShowReject(false); },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Erreur lors du refus.');
    },
  });

  const requestProofMut = useMutation({
    mutationFn: () => adminRequestNewProof(id),
    onSuccess: () => { invalidate(); },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#7C4DFF] border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold">Demande introuvable</p>
        <Link href={`/${locale}/dashboard/admin/manual-payments`} className="text-sm text-[#7C4DFF] underline mt-2 inline-block">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const divisor = req.currency === 'TND' ? 1000 : 100;
  const amountFmt = `${(req.amountCents / divisor).toFixed(2)} ${req.currency}`;
  const isBankTransfer = req.paymentMethod === 'bank_transfer';
  const isActionable = ['pending', 'proof_uploaded', 'pending_review', 'rejected'].includes(req.status);
  const canApprove = req.status !== 'approved';
  const canReject = req.status !== 'approved';

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Dialogs */}
      {showApprove && (
        <ApproveDialog
          billingCycle={req.billingCycle}
          onApprove={(months, notes) => approveMut.mutate({ months, notes })}
          onCancel={() => setShowApprove(false)}
          isPending={approveMut.isPending}
        />
      )}
      {showReject && (
        <RejectDialog
          onReject={(notes) => rejectMut.mutate({ notes })}
          onCancel={() => setShowReject(false)}
          isPending={rejectMut.isPending}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/dashboard/admin/manual-payments`}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Paiement {req.orderId}</h1>
            <StatusBadge status={req.status} />
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Créé le {new Date(req.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Approved notice */}
      {req.status === 'approved' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Paiement validé</p>
            <p className="text-xs text-emerald-700">
              Abonnement activé le {req.approvedAt ? new Date(req.approvedAt).toLocaleDateString('fr-FR') : '—'}
              {req.selectedDurationMonths ? ` pour ${req.selectedDurationMonths} mois` : ''}.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

        {/* Left: details + proof */}
        <div className="space-y-5">

          {/* User + payment info */}
          <div className="rounded-2xl border bg-card shadow-card p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#7C4DFF]" />
              Informations
            </h2>
            <div className="space-y-0">
              <InfoRow label="Utilisateur" value={req.userFullName ?? '—'} />
              <InfoRow label="Email" value={req.userEmail ?? '—'} />
              <InfoRow label="Référence" value={<span className="font-mono">{req.orderId}</span>} />
              <InfoRow label="Plan" value={req.planName} />
              <InfoRow label="Durée" value={
                req.billingCycle === 'monthly' ? '1 mois'
                : req.billingCycle === 'quarterly' ? '3 mois'
                : req.billingCycle === 'annual' ? '12 mois'
                : req.billingCycle
              } />
              <InfoRow label="Montant" value={<span className="font-bold text-[#7C4DFF]">{amountFmt}</span>} />
              <InfoRow label="Méthode" value={
                <span className="flex items-center gap-1.5">
                  {isBankTransfer
                    ? <><Building2 className="w-4 h-4 text-blue-500" /> Virement bancaire</>
                    : <><Smartphone className="w-4 h-4 text-emerald-500" /> D17</>
                  }
                </span>
              } />
              {req.adminNotes && (
                <InfoRow label="Notes admin" value={<span className="text-muted-foreground italic">{req.adminNotes}</span>} />
              )}
            </div>
          </div>

          {/* Proof preview */}
          {req.proofFileUrl ? (
            <ProofPreview url={req.proofFileUrl} fileName={req.proofFileName} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Aucune preuve envoyée</p>
              <p className="text-xs text-muted-foreground mt-0.5">L'utilisateur n'a pas encore uploadé de preuve de paiement.</p>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="space-y-4">

          {/* Action buttons */}
          {isActionable && (
            <div className="rounded-2xl border bg-card shadow-card p-5 space-y-3">
              <h3 className="text-sm font-semibold">Actions</h3>

              {canApprove && (
                <button
                  onClick={() => setShowApprove(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Valider le paiement
                </button>
              )}

              {canReject && (
                <button
                  onClick={() => setShowReject(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Refuser le paiement
                </button>
              )}

              {req.proofFileUrl && canReject && (
                <button
                  onClick={() => requestProofMut.mutate()}
                  disabled={requestProofMut.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors text-muted-foreground"
                >
                  <RefreshCw className="w-4 h-4" />
                  Demander une nouvelle preuve
                </button>
              )}
            </div>
          )}

          {/* Status timeline */}
          <div className="rounded-2xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold mb-4">Statut</h3>
            <div className="space-y-3">
              {[
                { label: 'Demande créée',    done: true },
                { label: 'Paiement effectué', done: req.status !== 'pending' },
                { label: 'Preuve reçue',     done: !!req.proofFileUrl },
                { label: 'Validé',           done: req.status === 'approved' },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done ? 'bg-emerald-500' : 'bg-muted'
                  }`}>
                    {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-xs ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Proof file info */}
          {req.proofFileUrl && (
            <div className="rounded-xl border bg-card p-4 text-xs space-y-1">
              <p className="font-medium">Fichier uploadé</p>
              <p className="text-muted-foreground">{req.proofFileName ?? 'fichier'}</p>
              <a
                href={req.proofFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#7C4DFF] hover:underline mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                Télécharger
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

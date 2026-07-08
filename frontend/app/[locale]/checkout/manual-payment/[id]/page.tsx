'use client';

import { useCallback, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyManualPaymentById, uploadManualPaymentProof,
  type ManualPaymentRequest, type ManualPaymentStatus,
} from '@/services/payments';
import Link from 'next/link';
import {
  Building2, Smartphone, Copy, Check, CheckCircle2, Clock,
  XCircle, Upload, FileText, ArrowLeft, Lock, AlertCircle,
  MessageCircle, ExternalLink,
} from 'lucide-react';
import { BANK_PAYMENT_INFO } from '@/lib/payments/bank-payment-info';

const D17_NUMBER = '55668141';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<ManualPaymentStatus, { label: string; icon: React.ElementType; cls: string }> = {
  pending:        { label: 'En attente de paiement', icon: Clock,         cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  proof_uploaded: { label: 'Preuve envoyée',          icon: Upload,        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  pending_review: { label: 'En cours de validation',  icon: Clock,         cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  approved:       { label: 'Paiement validé ✓',       icon: CheckCircle2,  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:       { label: 'Paiement refusé',          icon: XCircle,       cls: 'bg-red-50 text-red-700 border-red-200' },
};

function StatusBadge({ status }: { status: ManualPaymentStatus }) {
  const { label, icon: Icon, cls } = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-colors flex-shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copié !' : (label ?? 'Copier')}
    </button>
  );
}

// ─── Bank transfer instructions ───────────────────────────────────────────────

function BankTransferInstructions({ orderId, amountFmt }: { orderId: string; amountFmt: string }) {
  return (
    <div className="space-y-4">
      {/* Info notice */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
        <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Instructions de virement</p>
          <p>Effectuez un virement bancaire du montant exact vers le compte ci-dessous. Indiquez obligatoirement votre <strong>référence de commande</strong> dans le libellé du virement.</p>
        </div>
      </div>

      {/* IBAN block */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3">
          <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Coordonnées bancaires</p>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: 'Titulaire du compte', value: BANK_PAYMENT_INFO.titulaireDuCompte },
            { label: 'Domiciliation', value: BANK_PAYMENT_INFO.domiciliation },
            { label: 'Banque', value: BANK_PAYMENT_INFO.banque },
            { label: 'Agence', value: BANK_PAYMENT_INFO.agence },
            { label: 'N° Compte', value: BANK_PAYMENT_INFO.numeroCompte },
            { label: 'Clé RIB', value: BANK_PAYMENT_INFO.cleRib },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 min-w-[128px] shrink-0">{label}</span>
              <span className="font-mono text-sm font-semibold text-slate-800 flex-1 text-right sm:text-left break-all">{value}</span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 min-w-[128px] shrink-0">RIB complet</span>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end sm:justify-start">
                <span className="font-mono text-sm font-bold text-slate-900 break-all text-right sm:text-left">{BANK_PAYMENT_INFO.ribComplet}</span>
                <CopyButton value={BANK_PAYMENT_INFO.ribComplet} label="RIB" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 min-w-[128px] shrink-0">IBAN</span>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end sm:justify-start">
                <span className="font-mono text-sm font-bold text-slate-900 break-all text-right sm:text-left">{BANK_PAYMENT_INFO.iban}</span>
                <CopyButton value={BANK_PAYMENT_INFO.iban} label="IBAN" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Amount + reference */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500 mb-1">Montant exact à virer</p>
          <p className="text-xl font-extrabold text-slate-900">{amountFmt}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs text-violet-600 mb-1">Référence à indiquer</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold text-violet-900 font-mono">{orderId}</p>
            <CopyButton value={orderId} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Mentionnez obligatoirement la référence <strong>{orderId}</strong> dans le motif ou libellé du virement.</span>
      </div>
    </div>
  );
}

// ─── D17 instructions ────────────────────────────────────────────────────────

function D17Instructions({ orderId, amountFmt }: { orderId: string; amountFmt: string }) {
  return (
    <div className="space-y-4">
      {/* Info notice */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
        <Smartphone className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-800">
          <p className="font-semibold mb-1">Instructions D17</p>
          <p>Envoyez le montant exact depuis votre portefeuille D17 vers le numéro ci-dessous. Ajoutez votre référence de commande dans le commentaire si possible.</p>
        </div>
      </div>

      {/* D17 Number block */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3">
          <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Numéro D17 destinataire</p>
        </div>
        <div className="p-6 text-center">
          <p className="text-4xl font-extrabold tracking-[0.15em] text-slate-900 font-mono mb-3">{D17_NUMBER}</p>
          <CopyButton value={D17_NUMBER} label="Copier le numéro" />
        </div>
      </div>

      {/* Amount + reference */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500 mb-1">Montant exact</p>
          <p className="text-xl font-extrabold text-slate-900">{amountFmt}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs text-violet-600 mb-1">Référence</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold text-violet-900 font-mono">{orderId}</p>
            <CopyButton value={orderId} />
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-700">
        <p className="font-semibold text-slate-800">Comment envoyer via D17 :</p>
        <ol className="list-decimal ml-4 space-y-1 text-sm text-slate-600">
          <li>Ouvrez votre application D17 ou *117#</li>
          <li>Choisissez <strong>Transfert</strong> ou <strong>Envoyer de l'argent</strong></li>
          <li>Entrez le numéro : <span className="font-mono font-bold">{D17_NUMBER}</span></li>
          <li>Entrez le montant exact : <strong>{amountFmt}</strong></li>
          <li>Dans le commentaire, indiquez : <span className="font-mono font-bold">{orderId}</span></li>
          <li>Confirmez et envoyez</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Proof upload ─────────────────────────────────────────────────────────────

function ProofUploadSection({
  request,
  onUploaded,
}: {
  request: ManualPaymentRequest;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const alreadyHasProof = !!request.proofFileUrl;

  const handleFile = (f: File) => {
    setError('');
    if (f.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 5 Mo).');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(f.type)) {
      setError('Format non accepté. Utilisez JPG, PNG ou PDF.');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await uploadManualPaymentProof(request.id, file);
      setUploaded(true);
      onUploaded();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erreur lors de l\'envoi. Veuillez réessayer.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setUploading(false);
    }
  };

  if (uploaded || (alreadyHasProof && !file)) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-semibold text-emerald-800">Preuve envoyée avec succès</p>
        <p className="text-sm text-emerald-600 mt-1">
          {alreadyHasProof ? `Fichier : ${request.proofFileName ?? 'preuve_paiement'}` : 'Notre équipe va vérifier votre paiement sous 24-48h.'}
        </p>
        {alreadyHasProof && (
          <button
            onClick={() => { setFile(null); setUploaded(false); }}
            className="mt-3 text-xs text-emerald-700 underline"
          >
            Remplacer la preuve
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          file
            ? 'border-violet-400 bg-violet-50'
            : 'border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />
        {file ? (
          <div>
            <FileText className="w-10 h-10 text-violet-500 mx-auto mb-2" />
            <p className="font-semibold text-violet-800 text-sm">{file.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(0)} Ko</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="mt-2 text-xs text-slate-500 underline"
            >
              Supprimer
            </button>
          </div>
        ) : (
          <div>
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">Déposez votre preuve ici</p>
            <p className="text-xs text-slate-400 mt-1">ou cliquez pour sélectionner un fichier</p>
            <p className="text-xs text-slate-400 mt-2">JPG, PNG ou PDF — max 5 Mo</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!file || uploading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white font-semibold text-sm shadow-md hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {uploading ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Envoi en cours…
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Envoyer la preuve de paiement
          </>
        )}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManualPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const locale = String(params?.locale ?? 'en');
  const requestId = String(params?.id ?? '');
  const qc = useQueryClient();

  const { data: request, isLoading, error } = useQuery({
    queryKey: ['manual-payment', requestId],
    queryFn: () => getMyManualPaymentById(requestId),
    staleTime: 30_000,
    retry: 1,
  });

  const onUploaded = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['manual-payment', requestId] });
    qc.invalidateQueries({ queryKey: ['manual-payments-my'] });
  }, [qc, requestId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#7C4DFF] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">Demande introuvable</h2>
          <p className="text-sm text-slate-500 mb-4">Cette demande de paiement n'existe pas ou ne vous appartient pas.</p>
          <Link href={`/${locale}/checkout?plan=standard&cycle=monthly`} className="text-violet-600 underline text-sm">
            Retour au checkout
          </Link>
        </div>
      </div>
    );
  }

  const divisor = request.currency === 'TND' ? 1000 : 100;
  const amountFmt = `${(request.amountCents / divisor).toFixed(2)} ${request.currency}`;
  const isBankTransfer = request.paymentMethod === 'bank_transfer';
  const isApproved = request.status === 'approved';
  const isRejected = request.status === 'rejected';

  return (
    <div className="min-h-screen bg-[#F7F8FC]">

      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C4DFF] to-[#C2185B] flex items-center justify-center shadow-sm">
              <span className="text-white font-extrabold text-lg leading-none">S</span>
            </div>
            <span className="font-bold text-slate-800 text-base tracking-wide">SUBUL</span>
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Paiement sécurisé</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">

        {/* Back */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/${locale}/dashboard/learner`)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Terminer plus tard
          </button>
        </div>

        {/* Approved state */}
        {isApproved && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-emerald-800 mb-1">Paiement validé !</h2>
            <p className="text-sm text-emerald-700 mb-4">Votre abonnement <strong>{request.planName}</strong> est maintenant actif.</p>
            <Link
              href={`/${locale}/dashboard/learner`}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
            >
              Accéder à mon espace <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Rejected state */}
        {isRejected && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 mb-0.5">Paiement non validé</p>
                {request.adminNotes && (
                  <p className="text-sm text-red-700">{request.adminNotes}</p>
                )}
                <p className="text-sm text-red-600 mt-1">Vous pouvez soumettre une nouvelle preuve ci-dessous ou contacter le support.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* Left: instructions */}
          <div className="space-y-6">

            {/* Title + status */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {isBankTransfer ? (
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-emerald-600" />
                      </div>
                    )}
                    <h1 className="text-xl font-bold text-slate-900">
                      {isBankTransfer ? 'Virement bancaire' : 'Paiement via D17'}
                    </h1>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              </div>

              {isBankTransfer ? (
                <BankTransferInstructions orderId={request.orderId} amountFmt={amountFmt} />
              ) : (
                <D17Instructions orderId={request.orderId} amountFmt={amountFmt} />
              )}
            </div>

            {/* Proof upload */}
            {!isApproved && (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 mb-1">
                  Envoyer la preuve de paiement
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Capture d'écran, reçu PDF ou photo du justificatif de virement (JPG, PNG, PDF — max 5 Mo)
                </p>
                <ProofUploadSection request={request} onUploaded={onUploaded} />
              </div>
            )}
          </div>

          {/* Right: summary */}
          <div>
            <div className="sticky top-6 space-y-4">

              {/* Order summary */}
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] px-5 py-4">
                  <p className="text-xs text-white/70 font-medium uppercase tracking-wider">Récapitulatif</p>
                  <p className="text-white font-bold mt-0.5">{request.planName}</p>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Référence</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">{request.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Durée</span>
                    <span className="font-medium">
                      {request.billingCycle === 'monthly' ? '1 mois'
                        : request.billingCycle === 'quarterly' ? '3 mois'
                        : request.billingCycle === 'annual' ? '12 mois'
                        : request.billingCycle}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Méthode</span>
                    <span className="font-medium">{isBankTransfer ? 'Virement' : 'D17'}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                    <span className="font-semibold text-slate-900">Total à payer</span>
                    <span className="text-xl font-extrabold text-slate-900">{amountFmt}</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Étapes</p>
                <div className="space-y-3">
                  {[
                    { label: 'Demande créée', done: true },
                    { label: 'Paiement effectué', done: ['proof_uploaded', 'pending_review', 'approved'].includes(request.status) },
                    { label: 'Preuve envoyée', done: ['proof_uploaded', 'pending_review', 'approved'].includes(request.status) },
                    { label: 'Validation admin', done: request.status === 'approved' },
                    { label: 'Accès activé', done: request.status === 'approved' },
                  ].map(({ label, done }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        done ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}>
                        {done && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs ${done ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Help */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500 mb-2">Un problème avec votre paiement ?</p>
                <a
                  href="mailto:support@subul.io"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Contacter le support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

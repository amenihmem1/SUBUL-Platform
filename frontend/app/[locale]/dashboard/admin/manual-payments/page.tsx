'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  adminListManualPayments,
  type ManualPaymentRequest,
} from '@/services/adminPlatform';
import Link from 'next/link';
import {
  Search, Filter, Building2, Smartphone,
  CheckCircle2, Clock, XCircle, Upload,
  ChevronLeft, ChevronRight, ExternalLink, Plus,
} from 'lucide-react';
import type { ManualPaymentStatus } from '@/services/payments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<ManualPaymentStatus, { label: string; cls: string; icon: React.ElementType }> = {
  pending:        { label: 'En attente',       cls: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock },
  proof_uploaded: { label: 'Preuve envoyée',   cls: 'bg-blue-50 text-blue-700 border-blue-200',     icon: Upload },
  pending_review: { label: 'En validation',    cls: 'bg-violet-50 text-violet-700 border-violet-200', icon: Clock },
  approved:       { label: 'Validé',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected:       { label: 'Refusé',           cls: 'bg-red-50 text-red-700 border-red-200',         icon: XCircle },
};

function StatusBadge({ status }: { status: ManualPaymentStatus }) {
  const { label, cls, icon: Icon } = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function MethodIcon({ method }: { method: ManualPaymentRequest['paymentMethod'] }) {
  return method === 'bank_transfer'
    ? <Building2 className="w-4 h-4 text-blue-500" />
    : <Smartphone className="w-4 h-4 text-emerald-500" />;
}

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ['', 'pending', 'proof_uploaded', 'pending_review', 'approved', 'rejected'] as const;
const STATUS_LABELS: Record<string, string> = {
  '': 'Tous',
  pending: 'En attente',
  proof_uploaded: 'Preuve envoyée',
  pending_review: 'En validation',
  approved: 'Validé',
  rejected: 'Refusé',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminManualPaymentsPage() {
  const params = useParams();
  const locale = String(params?.locale ?? 'en');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Debounce search
  const onSearchChange = (v: string) => {
    setSearch(v);
    clearTimeout((window as any).__mpSearchTimer);
    (window as any).__mpSearchTimer = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 350);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'manual-payments', page, debouncedSearch, status, paymentMethod],
    queryFn: () => adminListManualPayments({ page, limit: PAGE_SIZE, search: debouncedSearch || undefined, status: status || undefined, paymentMethod: paymentMethod || undefined }),
    staleTime: 20_000,
    placeholderData: prev => prev,
  });

  const requests = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fmtAmount = (cents: number, cur: string) => {
    const d = cur === 'TND' ? 1000 : 100;
    return `${(cents / d).toFixed(2)} ${cur}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paiements manuels</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total > 0 ? `${total} demandes au total` : 'Gérez les virements et paiements D17.'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Nom, email ou référence…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/30 focus:border-[#7C4DFF] transition-colors"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                status === s
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Method filter */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {(['', 'bank_transfer', 'd17'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setPaymentMethod(m); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                paymentMethod === m
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'bank_transfer' && <Building2 className="w-3 h-3" />}
              {m === 'd17' && <Smartphone className="w-3 h-3" />}
              {m === '' ? 'Tous' : m === 'bank_transfer' ? 'Virement' : 'D17'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Aucune demande</h3>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch || status || paymentMethod
                ? 'Aucun résultat pour ces filtres.'
                : 'Les paiements manuels apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 bg-muted/40 border-b border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Méthode</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Utilisateur</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Plan</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Montant</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Preuve</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Statut</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</p>
            </div>

            <div className="divide-y divide-border/50">
              {requests.map(req => (
                <div
                  key={req.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  {/* Method icon */}
                  <div>
                    <MethodIcon method={req.paymentMethod} />
                  </div>

                  {/* User info */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{req.userFullName ?? '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{req.userEmail ?? '—'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{req.orderId}</p>
                  </div>

                  {/* Plan */}
                  <p className="text-sm text-right">{req.planName}</p>

                  {/* Amount */}
                  <p className="text-sm font-semibold tabular-nums text-right">
                    {fmtAmount(req.amountCents, req.currency)}
                  </p>

                  {/* Proof */}
                  <div className="flex justify-end">
                    {req.proofFileUrl ? (
                      <a
                        href={req.proofFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Voir
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex justify-end">
                    <StatusBadge status={req.status} />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Link
                      href={`/${locale}/dashboard/admin/manual-payments/${req.id}`}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Gérer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} / {totalPages} · {total} au total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-card text-sm font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-card text-sm font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

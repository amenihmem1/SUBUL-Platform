'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminGetReferralStats, adminListReferrals, adminListRewards,
  adminListPayoutRequests,
  adminGetPayoutRequest,
  adminGetTopReferrers, adminApprovePayoutRequest, adminRejectPayoutRequest,
  adminMarkPaidPayoutRequest, adminFlagFraud, adminRejectReferral, adminRecomputeAll,
} from '@/services/referrals';
import { cn } from '@/lib/utils';
import {
  Users, Gift, CheckCircle2, Clock, RefreshCw, Search,
  Banknote, X, Check, Flag, Ban, ChevronRight, AlertTriangle,
  Trophy, TrendingUp, MoreVertical,
} from 'lucide-react';
import { LoadingRow, PageLoader } from '@/components/ui/loading';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('fr-TN', { dateStyle: 'short' }).format(new Date(d));
}
function fmtDT(millimes: number) {
  return (millimes / 1000).toFixed(3) + ' DT';
}

const R_STATUS: Record<string, { label: string; cls: string }> = {
  pending:        { label: 'En attente',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  email_verified: { label: 'Email vérifié', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  qualified:      { label: 'Qualifié',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rewarded:       { label: 'Récompensé',    cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  rejected:       { label: 'Rejeté',        cls: 'bg-red-50 text-red-700 border-red-200' },
  fraud:          { label: 'Fraude',        cls: 'bg-red-50 text-red-700 border-red-200' },
};

const RW_STATUS: Record<string, { label: string; cls: string }> = {
  locked:         { label: 'Bloqué',              cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_payout: { label: 'Paiement demandé',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved:       { label: 'Approuvé',            cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  paid:           { label: 'Payé',                cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:       { label: 'Rejeté',              cls: 'bg-red-50 text-red-700 border-red-200' },
};

function Badge({ status, map }: { status: string; map: typeof R_STATUS }) {
  const cfg = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  title, desc, confirmLabel, danger = false, requireNote = false, notePlaceholder,
  onConfirm, onCancel,
}: {
  title: string; desc: string; confirmLabel: string; danger?: boolean; requireNote?: boolean;
  notePlaceholder?: string; onConfirm: (note: string) => void; onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>
        {requireNote && (
          <div className="px-6 pb-4">
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholder ?? 'Note obligatoire...'}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        )}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={requireNote && !note.trim()}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40',
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-violet-600 hover:bg-violet-700',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestDetailsModal({
  data,
  onClose,
}: {
  data: { request: any; items: Array<{ referralRewardId: string; amountCents: number; rewardBlock: number | null }> };
  onClose: () => void;
}) {
  const r = data.request;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Détails de la demande</h3>
            <p className="text-xs text-gray-400 mt-0.5">{r.id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Utilisateur</p>
              <p className="font-semibold text-gray-900">{r.email}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Montant</p>
              <p className="font-black text-gray-900">{fmtDT(r.total_amount_cents)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Récompenses</p>
              <span className="text-xs text-gray-400">{data.items.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {data.items.map((it) => (
                <div key={it.referralRewardId} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {it.rewardBlock ? `Bloc #${it.rewardBlock}` : 'Récompense'}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{it.referralRewardId}</p>
                  </div>
                  <div className="font-bold text-gray-900">{fmtDT(it.amountCents)}</div>
                </div>
              ))}
            </div>
          </div>

          {r.payout_method && (
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">
                {r.payout_method === 'bank' ? 'Virement bancaire' : 'D17'}
              </p>
              {r.payout_details?.iban && <p className="text-xs font-mono text-blue-600">{r.payout_details.iban}</p>}
              {r.payout_details?.holderName && <p className="text-xs text-blue-600">{r.payout_details.holderName}</p>}
              {r.payout_details?.phone && <p className="text-xs font-mono text-blue-600">{r.payout_details.phone}</p>}
            </div>
          )}
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Action Menu ──────────────────────────────────────────────────────────────

function ActionMenu({ items }: { items: { label: string; icon: any; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="h-4 w-4 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-48 overflow-hidden">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => { item.onClick(); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left',
                  item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

type Tab = 'rewards' | 'referrals' | 'top';

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminReferralsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('rewards');
  const [dialog, setDialog] = useState<{ type: string; id: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  // Referrals filters
  const [rStatus, setRStatus] = useState('all');
  const [rSearch, setRSearch] = useState('');
  const [rPage, setRPage] = useState(1);

  // Rewards filters
  const [rwStatus, setRwStatus] = useState('all');
  const [prStatus, setPrStatus] = useState('all');

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-ref-stats'] });
    qc.invalidateQueries({ queryKey: ['admin-refs'] });
    qc.invalidateQueries({ queryKey: ['admin-rw'] });
    qc.invalidateQueries({ queryKey: ['admin-pr'] });
    qc.invalidateQueries({ queryKey: ['admin-pr-details'] });
    qc.invalidateQueries({ queryKey: ['admin-top'] });
  };

  const invalidatePayoutRequest = (id: string) => {
    qc.invalidateQueries({ queryKey: ['admin-ref-stats'] });
    qc.invalidateQueries({ queryKey: ['admin-pr'] });
    qc.invalidateQueries({ queryKey: ['admin-pr-details', id] });
    // If a details modal is open for a different id, it can remain.
    // If it's open for this id, it will refetch immediately.
  };

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['admin-ref-stats'],
    queryFn: adminGetReferralStats,
    staleTime: 30_000,
  });

  const { data: rwData, isLoading: rwLoading } = useQuery({
    queryKey: ['admin-rw', rwStatus],
    queryFn: () => adminListRewards({ status: rwStatus, page: 1, limit: 50 }),
    enabled: tab === 'rewards',
    staleTime: 15_000,
  });

  const { data: prData, isLoading: prLoading } = useQuery({
    queryKey: ['admin-pr', prStatus],
    queryFn: () => adminListPayoutRequests({ status: prStatus, page: 1, limit: 50 }),
    enabled: tab === 'rewards',
    staleTime: 15_000,
  });

  const { data: prDetails } = useQuery({
    queryKey: ['admin-pr-details', detailsId],
    queryFn: () => adminGetPayoutRequest(String(detailsId)),
    enabled: !!detailsId,
    staleTime: 0,
  });

  const { data: refData, isLoading: refLoading } = useQuery({
    queryKey: ['admin-refs', rStatus, rSearch, rPage],
    queryFn: () => adminListReferrals({ status: rStatus, search: rSearch, page: rPage, limit: 20 }),
    enabled: tab === 'referrals',
    staleTime: 15_000,
  });

  const { data: topData } = useQuery({
    queryKey: ['admin-top'],
    queryFn: () => adminGetTopReferrers(20),
    enabled: tab === 'top',
    staleTime: 60_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const approveMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminApprovePayoutRequest(id, note),
    onSuccess: (_data, vars) => { invalidatePayoutRequest(vars.id); showToast('Demande approuvée.'); setDialog(null); },
    onError: (e: any) => showToast(e?.response?.data?.message || 'Erreur', false),
  });
  const rejectRwMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => adminRejectPayoutRequest(id, note),
    onSuccess: (_data, vars) => { invalidatePayoutRequest(vars.id); showToast('Demande rejetée.'); setDialog(null); },
    onError: (e: any) => showToast(e?.response?.data?.message || 'Erreur', false),
  });
  const markPaidMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminMarkPaidPayoutRequest(id, note),
    onSuccess: (_data, vars) => { invalidatePayoutRequest(vars.id); showToast('Marqué comme payé ✓'); setDialog(null); },
    onError: (e: any) => showToast(e?.response?.data?.message || 'Erreur', false),
  });
  const flagMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => adminFlagFraud(id, ['admin_manual'], note),
    onSuccess: () => { invalidate(); showToast('Signalé comme fraude.'); setDialog(null); },
    onError: (e: any) => showToast(e?.response?.data?.message || 'Erreur', false),
  });
  const rejectRefMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => adminRejectReferral(id, note),
    onSuccess: () => { invalidate(); showToast('Parrainage rejeté.'); setDialog(null); },
    onError: (e: any) => showToast(e?.response?.data?.message || 'Erreur', false),
  });
  const recomputeMut = useMutation({
    mutationFn: adminRecomputeAll,
    onSuccess: (r) => { invalidate(); showToast(`Recompute: ${r.fixed} correction(s)`); },
  });

  const handleDialogConfirm = (note: string) => {
    if (!dialog) return;
    if (dialog.type === 'approve')       approveMut.mutate({ id: dialog.id, note });
    if (dialog.type === 'reject-rw')     rejectRwMut.mutate({ id: dialog.id, note });
    if (dialog.type === 'mark-paid')     markPaidMut.mutate({ id: dialog.id, note });
    if (dialog.type === 'flag-fraud')    flagMut.mutate({ id: dialog.id, note });
    if (dialog.type === 'reject-ref')    rejectRefMut.mutate({ id: dialog.id, note });
  };

  const DIALOGS: Record<string, any> = {
    'approve':     { title: 'Approuver la demande', desc: 'Confirmez l\'approbation de la demande de paiement.', confirmLabel: 'Approuver', requireNote: false },
    'reject-rw':   { title: 'Rejeter la demande', desc: 'La demande sera rejetée et les récompenses seront libérées.', confirmLabel: 'Rejeter', danger: true, requireNote: true, notePlaceholder: 'Raison du rejet...' },
    'mark-paid':   { title: 'Confirmer le paiement', desc: 'Confirmez que le paiement a bien été effectué.', confirmLabel: 'Confirmer le paiement' },
    'flag-fraud':  { title: 'Signaler comme fraude', desc: 'Ce parrainage sera marqué frauduleux.', confirmLabel: 'Signaler', danger: true, requireNote: true, notePlaceholder: 'Raison de la fraude...' },
    'reject-ref':  { title: 'Rejeter le parrainage', desc: 'Ce parrainage sera rejeté et exclu du comptage.', confirmLabel: 'Rejeter', danger: true, requireNote: true, notePlaceholder: 'Raison...' },
  };

  const tabs: { id: Tab; label: string; icon: any; urgent?: number }[] = [
    { id: 'rewards', label: 'Récompenses', icon: Gift, urgent: stats?.pendingPayouts },
    { id: 'referrals', label: 'Parrainages', icon: Users },
    { id: 'top', label: 'Top Parrains', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border bg-white',
          toast.ok ? 'text-emerald-800 border-emerald-200' : 'text-red-700 border-red-200',
        )}>
          {toast.ok ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-red-500" />}
          {toast.msg}
        </div>
      )}

      {/* Confirm Modal */}
      {dialog && DIALOGS[dialog.type] && (
        <ConfirmModal
          {...DIALOGS[dialog.type]}
          onConfirm={handleDialogConfirm}
          onCancel={() => setDialog(null)}
        />
      )}

      {detailsId && prDetails && (
        <RequestDetailsModal data={prDetails} onClose={() => setDetailsId(null)} />
      )}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Programme de parrainage</h1>
            <p className="text-sm text-gray-400 mt-0.5">Gestion des filleuls, récompenses et paiements</p>
          </div>
          <button
            onClick={() => recomputeMut.mutate()}
            disabled={recomputeMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4', recomputeMut.isPending && 'animate-spin')} />
            Recomputer
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total parrainages', value: stats.totalReferrals, sub: `${stats.qualifiedReferrals} qualifiés`, icon: Users, color: 'from-violet-500 to-violet-600' },
              { label: 'Frauduleux', value: stats.fraudReferrals, sub: 'à examiner', icon: AlertTriangle, color: 'from-red-400 to-red-500' },
              { label: 'Paiements en attente', value: stats.pendingPayouts + stats.approvedPayouts, sub: `${stats.approvedPayouts} approuvés`, icon: Clock, color: 'from-amber-400 to-amber-500', urgent: (stats.pendingPayouts + stats.approvedPayouts) > 0 },
              { label: 'Total payé', value: fmtDT(stats.totalPaid), sub: 'en récompenses', icon: Banknote, color: 'from-emerald-500 to-emerald-600' },
            ].map((s) => (
              <div key={s.label} className={cn('bg-white rounded-2xl border shadow-sm p-5', (s as any).urgent ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100')}>
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br', s.color)}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-2xl font-black text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
                <div className="text-xs font-semibold text-gray-600 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                tab === t.id ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.urgent && t.urgent > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {t.urgent}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: REWARDS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'rewards' && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-medium">Filtrer :</span>
              {['all', 'submitted', 'under_review', 'approved', 'paid', 'rejected', 'cancelled'].map((s) => (
                <button
                  key={s}
                  onClick={() => setPrStatus(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    prStatus === s
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white',
                  )}
                >
                  {s === 'all' ? 'Tous' : s}
                </button>
              ))}
            </div>

            {/* Cards grid */}
            {prLoading ? (
              <PageLoader className="py-12" />
            ) : !prData?.data.length ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
                <Gift className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Aucune demande</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {prData.data.map((r: any) => (
                  <div key={r.id} className={cn(
                    'bg-white rounded-2xl border shadow-sm overflow-hidden',
                    r.status === 'submitted' ? 'border-blue-300 ring-2 ring-blue-50' : r.status === 'approved' ? 'border-violet-300 ring-2 ring-violet-50' : 'border-gray-100',
                  )}>
                    {/* Status bar */}
                    <div className={cn('h-1', {
                      'bg-blue-500': r.status === 'submitted',
                      'bg-amber-400': r.status === 'under_review',
                      'bg-violet-500': r.status === 'approved',
                      'bg-emerald-500': r.status === 'paid',
                      'bg-red-400': r.status === 'rejected',
                    })} />

                    <div className="p-5">
                      {/* User + amount */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-bold text-gray-900">{r.email}</p>
                          {r.fullname && r.fullname !== r.email && (
                            <p className="text-xs text-gray-400 mt-0.5">{r.fullname}</p>
                          )}
                          {r.phone && <p className="text-xs text-gray-400">{r.phone}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-black text-gray-900">{fmtDT(r.total_amount_cents)}</div>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-50 text-gray-700 border-gray-200">
                            {r.status}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                          <p className="text-gray-400 mb-0.5">Récompenses</p>
                          <p className="font-bold text-gray-800">{r.reward_count}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                          <p className="text-gray-400 mb-0.5">Soumis le</p>
                          <p className="font-bold text-gray-800">{fmt(r.submitted_at || r.created_at)}</p>
                        </div>
                      </div>

                      {/* Payout method */}
                      {r.payout_method && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                          <p className="text-xs font-semibold text-blue-700 mb-1">
                            {r.payout_method === 'bank' ? 'Virement bancaire' : 'D17'}
                          </p>
                          {r.payout_details?.iban && (
                            <p className="text-xs font-mono text-blue-600">{r.payout_details.iban}</p>
                          )}
                          {r.payout_details?.holderName && (
                            <p className="text-xs text-blue-600">{r.payout_details.holderName}</p>
                          )}
                          {r.payout_details?.phone && (
                            <p className="text-xs font-mono text-blue-600">{r.payout_details.phone}</p>
                          )}
                        </div>
                      )}

                      {r.admin_notes && (
                        <p className="mb-3 text-xs text-gray-400 italic">{r.admin_notes}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDetailsId(r.id)}
                          className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                        >
                          Détails
                        </button>
                        {['submitted', 'under_review'].includes(r.status) && (
                          <button
                            onClick={() => setDialog({ type: 'approve', id: r.id })}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            Approuver
                          </button>
                        )}
                        {r.status === 'approved' && (
                          <button
                            onClick={() => setDialog({ type: 'mark-paid', id: r.id })}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition-colors"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#c2185b)' }}
                          >
                            <Banknote className="h-4 w-4" />
                            Confirmer virement
                          </button>
                        )}
                        {r.status === 'paid' && (
                          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">
                            <CheckCircle2 className="h-4 w-4" />
                            Payé le {fmt(r.paid_at)}
                          </div>
                        )}
                        {!['paid', 'rejected', 'cancelled'].includes(r.status) && (
                          <button
                            onClick={() => setDialog({ type: 'reject-rw', id: r.id })}
                            className="p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                            title="Rejeter"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: REFERRALS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'referrals' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input
                  value={rSearch}
                  onChange={(e) => { setRSearch(e.target.value); setRPage(1); }}
                  placeholder="Rechercher email ou code..."
                  className="pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <select
                value={rStatus}
                onChange={(e) => { setRStatus(e.target.value); setRPage(1); }}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(R_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Parrain', 'Filleul', 'Code', 'Statut', 'Inscrit', 'Qualifié', 'Fraude', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {refLoading ? (
                    <LoadingRow colSpan={8} />
                  ) : !refData?.data.length ? (
                    <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-400">Aucun résultat</td></tr>
                  ) : refData.data.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-800 text-xs">{r.referrer_email}</p>
                        {r.referrer_name && <p className="text-gray-400 text-xs">{r.referrer_name}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-800 text-xs">{r.referred_email}</p>
                        {r.referred_name && <p className="text-gray-400 text-xs">{r.referred_name}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <code className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r.referral_code_used}</code>
                      </td>
                      <td className="px-4 py-3.5"><Badge status={r.status} map={R_STATUS} /></td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">{fmt(r.signup_at || r.created_at)}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">{fmt(r.qualified_at)}</td>
                      <td className="px-4 py-3.5">
                        {r.fraud_flags?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.fraud_flags.map((f: string) => (
                              <span key={f} className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded border border-red-200">{f}</span>
                            ))}
                          </div>
                        ) : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {!['fraud', 'rejected', 'rewarded'].includes(r.status) && (
                          <ActionMenu items={[
                            { label: 'Signaler fraude', icon: Flag, onClick: () => setDialog({ type: 'flag-fraud', id: r.id }), danger: true },
                            { label: 'Rejeter', icon: Ban, onClick: () => setDialog({ type: 'reject-ref', id: r.id }), danger: true },
                          ]} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {refData && refData.total > 20 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">{refData.total} résultats</span>
                <div className="flex gap-2">
                  <button onClick={() => setRPage(p => Math.max(1, p - 1))} disabled={rPage === 1}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-gray-50">
                    ← Précédent
                  </button>
                  <span className="px-3 py-1.5 text-xs text-gray-500">Page {rPage}</span>
                  <button onClick={() => setRPage(p => p + 1)} disabled={rPage * 20 >= refData.total}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-gray-50">
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: TOP REFERRERS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'top' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-bold text-gray-800">Classement des meilleurs parrains</p>
            </div>
            {!topData ? (
              <PageLoader className="py-12" />
            ) : (
              <div className="divide-y divide-gray-50">
                {topData.map((r: any, i: number) => (
                  <div key={r.user_id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'h-9 w-9 rounded-full flex items-center justify-center text-sm font-black shrink-0',
                        i === 0 ? 'bg-amber-100 text-amber-700 text-lg' : i === 1 ? 'bg-gray-100 text-gray-500' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400 text-xs',
                      )}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{r.fullname || r.email}</p>
                        <p className="text-xs text-gray-400">{r.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-center shrink-0">
                      <div>
                        <div className="text-sm font-bold text-gray-700">{r.total_invited}</div>
                        <div className="text-[10px] text-gray-400">invités</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-emerald-600">{r.qualified}</div>
                        <div className="text-[10px] text-gray-400">qualifiés</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-violet-600">{r.rewarded}</div>
                        <div className="text-[10px] text-gray-400">récompensés</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getMyReferrals, fmt,
  type CommercialReferral,
} from '@/services/commercials';
import {
  Users, CheckCircle2, Clock, XCircle,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function PaymentStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    paid:      { label: 'Paid',      icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
    pending:   { label: 'Pending',   icon: Clock,        cls: 'bg-amber-500/10  text-amber-600  border-amber-200'  },
    failed:    { label: 'Failed',    icon: XCircle,      cls: 'bg-red-500/10    text-red-600    border-red-200'    },
    cancelled: { label: 'Cancelled', icon: XCircle,      cls: 'bg-slate-200/60  text-slate-500  border-slate-200' },
  };
  const { label, icon: Icon, cls } = map[status ?? ''] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
        <Users className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold mb-1">
        {filtered ? 'No referrals match this filter' : 'No referrals yet'}
      </h3>
      <p className="text-muted-foreground text-sm max-w-xs mx-auto">
        {filtered
          ? 'Try a different status filter to see more results.'
          : 'Referrals appear here when someone uses your promo code and completes a purchase.'}
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: '',          label: 'All' },
  { value: 'paid',      label: 'Paid' },
  { value: 'pending',   label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function ReferralsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['commercial', 'referrals', page, status],
    queryFn: () => getMyReferrals(page, PAGE_SIZE, status || undefined),
    staleTime: 30_000,
    placeholderData: prev => prev,
  });

  const referrals = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Referrals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total > 0 ? `${total} total referrals` : 'Track everyone who used your codes.'}
          </p>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatus(opt.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  status === opt.value
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      {total > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card shadow-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="font-bold tabular-nums">
                {referrals.filter(r => r.paymentStatus === 'paid').length}
                <span className="text-xs font-normal text-muted-foreground ml-1">this page</span>
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-card shadow-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-bold tabular-nums">
                {referrals.filter(r => r.paymentStatus === 'pending').length}
                <span className="text-xs font-normal text-muted-foreground ml-1">this page</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="h-4 rounded bg-muted animate-pulse w-32" />
                <div className="h-4 rounded bg-muted animate-pulse w-20 ml-auto" />
                <div className="h-4 rounded bg-muted animate-pulse w-24" />
              </div>
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-8">
            <EmptyState filtered={!!status} />
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-muted/40 border-b border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Referral</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Code</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Discount</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Status</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Date</p>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/50">
              {referrals.map((ref) => {
                const cur = ref.currency ?? 'EUR';
                return (
                  <div
                    key={ref.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    {/* User email */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ref.userEmail ?? '—'}</p>
                    </div>

                    {/* Promo code */}
                    <p className="text-xs font-mono font-bold text-[#7C4DFF] text-right">
                      {ref.promoCode ?? ref.promoCodeId.slice(0, 8)}
                    </p>

                    {/* Discount */}
                    <p className="text-sm tabular-nums text-right text-muted-foreground">
                      {fmt(ref.discountAppliedCents, cur)}
                    </p>

                    {/* Payment status */}
                    <div className="flex justify-end">
                      <PaymentStatusBadge status={ref.paymentStatus} />
                    </div>

                    {/* Date */}
                    <p className="text-xs text-muted-foreground text-right whitespace-nowrap">
                      {new Date(ref.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-card text-sm font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-card text-sm font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

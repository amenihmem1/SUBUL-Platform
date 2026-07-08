'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  getAdminOverview, listCommercials, deactivateCommercial,
  getAdminReferralsChart, getAdminRevenueChart, getAdminTopCodes, getAdminTopCommercials,
  fmt, fmtShort, type CommercialProfile, type AdminOverview, type ChartDataPoint, type TopEntry,
} from '@/services/commercials';
import {
  Users, DollarSign, TrendingUp, TicketPercent,
  Plus, ChevronRight, ChevronLeft, Trophy,
  CheckCircle2, XCircle, Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
  BarChart, Bar, Cell,
} from 'recharts';

// ─── Overview cards ────────────────────────────────────────────────────────────

function OverviewCard({
  label, value, sub, icon: Icon, variant = 'default',
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType;
  variant?: 'violet' | 'emerald' | 'amber' | 'default';
}) {
  const iconBg = {
    violet:  'bg-[#7C4DFF]/10 text-[#7C4DFF]',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    amber:   'bg-amber-500/10 text-amber-600',
    default: 'bg-muted text-muted-foreground',
  }[variant];

  return (
    <div className="rounded-xl border bg-card shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Period switcher ───────────────────────────────────────────────────────────

type Period = 'day' | 'month' | 'year';
const PERIOD_OPTIONS: { value: Period; label: string; range: number }[] = [
  { value: 'day',   label: '30d', range: 30 },
  { value: 'month', label: '3m',  range: 3  },
  { value: 'year',  label: '1y',  range: 12 },
];

function PeriodSwitcher({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-0.5">
      {PERIOD_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Admin Charts ──────────────────────────────────────────────────────────────

function AdminCharts() {
  const [refPeriod, setRefPeriod] = useState<Period>('day');
  const [revPeriod, setRevPeriod] = useState<Period>('day');

  const refRange = PERIOD_OPTIONS.find(p => p.value === refPeriod)?.range ?? 30;
  const revRange = PERIOD_OPTIONS.find(p => p.value === revPeriod)?.range ?? 30;

  const { data: referralsData = [] } = useQuery<ChartDataPoint[]>({
    queryKey: ['admin-chart-referrals', refPeriod, refRange],
    queryFn: () => getAdminReferralsChart(refPeriod, refRange),
  });

  const { data: revenueData = [] } = useQuery<ChartDataPoint[]>({
    queryKey: ['admin-chart-revenue', revPeriod, revRange],
    queryFn: () => getAdminRevenueChart(revPeriod, revRange),
  });

  const { data: topCodes = [] } = useQuery<TopEntry[]>({
    queryKey: ['admin-chart-top-codes'],
    queryFn: () => getAdminTopCodes(5),
  });

  const { data: topCommercials = [] } = useQuery<TopEntry[]>({
    queryKey: ['admin-chart-top-commercials'],
    queryFn: () => getAdminTopCommercials(5),
  });

  return (
    <div className="space-y-6">
      {/* Time series charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referrals chart */}
        <div className="rounded-2xl border bg-card shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              Referrals Over Time
            </h3>
            <PeriodSwitcher value={refPeriod} onChange={setRefPeriod} />
          </div>
          {referralsData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={referralsData}>
                <defs>
                  <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={32} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fill="url(#refGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue chart */}
        <div className="rounded-2xl border bg-card shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Revenue Over Time
            </h3>
            <PeriodSwitcher value={revPeriod} onChange={setRevPeriod} />
          </div>
          {revenueData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={32} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                  formatter={(val: unknown) => [fmtShort(val as number), 'Revenue']}
                />
                <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top codes */}
        {topCodes.length > 0 && (
          <div className="rounded-2xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <TicketPercent className="w-4 h-4 text-amber-500" />
              Top Promo Codes
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topCodes} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} width={70} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                  formatter={(val: unknown, name: unknown) => [val as number, (name as string) === 'uses' ? 'Uses' : 'Revenue']}
                />
                <Bar dataKey="uses" radius={[0, 4, 4, 0]} fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top commercials */}
        {topCommercials.length > 0 && (
          <div className="rounded-2xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top Commercials by Referrals
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topCommercials} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                  formatter={(val: unknown) => [val as number, 'Referrals']}
                />
                <Bar dataKey="uses" radius={[0, 4, 4, 0]}>
                  {topCommercials.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#F97316' : '#8B5CF6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
      isActive
        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
        : 'bg-slate-200/60 text-slate-500 border-slate-200'
    }`}>
      {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function AdminCommercialsPage() {
  const params = useParams();
  const locale = String(params?.locale ?? 'en');
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['admin', 'commercials', 'overview'],
    queryFn: getAdminOverview,
    staleTime: 60_000,
  });

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['admin', 'commercials', 'list', page],
    queryFn: () => listCommercials(page, PAGE_SIZE),
    staleTime: 30_000,
    placeholderData: prev => prev,
  });

  const deactivateMut = useMutation({
    mutationFn: deactivateCommercial,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'commercials'] });
      setDeactivatingId(null);
    },
  });

  const commercials: CommercialProfile[] = list?.data ?? [];
  const total = list?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commercials</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your affiliate partners and track referral performance.
          </p>
        </div>
        <Link
          href={`/${locale}/dashboard/admin/commercials/new`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white text-sm font-semibold shadow-md hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Commercial
        </Link>
      </div>

      {/* Overview */}
      {ovLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
        </div>
      )}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <OverviewCard
            label="Total Commercials"
            value={String(overview.totalCommercials)}
            sub={`${overview.activeCommercials} active`}
            icon={Users}
            variant="violet"
          />
          <OverviewCard
            label="Total Referrals"
            value={String(overview.totalReferrals)}
            icon={TicketPercent}
            variant="amber"
          />
          <OverviewCard
            label="Total Revenue"
            value={fmtShort(overview.totalRevenueCents)}
            sub="from promo codes"
            icon={DollarSign}
            variant="emerald"
          />
          <OverviewCard
            label="Discount Given"
            value={fmtShort(overview.totalDiscountCents)}
            sub="all time"
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Charts */}
      {overview && <AdminCharts />}

      {/* Commercials table */}
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
          {listLoading ? (
            <div className="divide-y divide-border/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : commercials.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No commercials yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first affiliate partner to get started.
              </p>
              <Link
                href={`/${locale}/dashboard/admin/commercials/new`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C4DFF] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Add Commercial
              </Link>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-muted/40 border-b border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Partner</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Referrals</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Currency</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Status</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</p>
              </div>

              <div className="divide-y divide-border/50">
                {commercials.map(c => {
                  const initials = (c.user?.fullName ?? c.user?.email ?? '?')
                    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

                  return (
                    <div
                      key={c.id}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-muted/30 transition-colors"
                    >
                      {/* Partner info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C4DFF] to-[#C2185B] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {c.user?.fullName ?? '—'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{c.user?.email}</p>
                        </div>
                      </div>

                      {/* Referrals */}
                      <p className="text-sm font-semibold text-[#7C4DFF] tabular-nums text-right">
                        {c.totalReferrals.toLocaleString()}
                      </p>

                      {/* Currency */}
                      <p className="text-sm text-muted-foreground text-right">{c.preferredCurrency}</p>

                      {/* Status */}
                      <div className="flex justify-end">
                        <StatusBadge status={c.status} />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/${locale}/dashboard/admin/commercials/${c.id}`}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="View details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        {c.status === 'active' && (
                          <button
                            onClick={() => setDeactivatingId(c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-card text-sm font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deactivate confirm dialog */}
      {deactivatingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border shadow-xl p-6 max-w-sm w-full">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-center mb-1">Deactivate commercial?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5">
              This will mark the account as inactive. Existing codes and referrals are preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeactivatingId(null)}
                className="flex-1 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deactivateMut.mutate(deactivatingId)}
                disabled={deactivateMut.isPending}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deactivateMut.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

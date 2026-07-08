'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCommercial, getCommercialStats, getCommercialCodes,
  getCommercialReferrals, getCommercialReferralsChart, getCommercialRevenueChart,
  updateCommercial,
  fmt, fmtShort, type CommercialProfile, type CommercialStats,
  type CommercialCode, type CommercialReferral, type ChartDataPoint,
} from '@/services/commercials';
import { useToast } from '@/components/ui';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, TrendingUp, Users, DollarSign, CheckCircle2,
  TicketPercent, Loader2, Edit2, Save, X, XCircle, Clock,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${accent ? 'border-[#7C4DFF]/20 bg-[#7C4DFF]/5' : 'bg-card'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${accent ? 'text-[#7C4DFF]' : 'text-muted-foreground'}`} />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-[#7C4DFF] text-white' : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );
}

type Period = 'day' | 'month' | 'year';
const PERIOD_OPTIONS: { value: Period; label: string; range: number }[] = [
  { value: 'day',   label: '30d', range: 30 },
  { value: 'month', label: '3m',  range: 3  },
  { value: 'year',  label: '1y',  range: 12 },
];

function ChartCard({ title, data, color, period, onPeriodChange, formatter }: {
  title: string; data: ChartDataPoint[]; color: string; period: Period;
  onPeriodChange: (p: Period) => void; formatter?: (val: number) => string;
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onPeriodChange(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                period === opt.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`cg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={36} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
              formatter={(val: unknown) => { const n = val as number; return [formatter ? formatter(n) : n.toLocaleString(), title]; }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#cg-${color.replace('#', '')})`} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCommercialDetailPage() {
  const params = useParams();
  const id = String(params?.id);
  const locale = String(params?.locale || 'en');
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'codes' | 'referrals'>('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ status: string; notes: string }>({ status: 'active', notes: '' });
  const [refPeriod, setRefPeriod] = useState<Period>('day');
  const [revPeriod, setRevPeriod] = useState<Period>('day');

  const { data: profile, isLoading } = useQuery<CommercialProfile>({
    queryKey: ['admin-commercial', id],
    queryFn: () => getCommercial(id),
  });

  const { data: stats } = useQuery<CommercialStats>({
    queryKey: ['admin-commercial-stats', id],
    queryFn: () => getCommercialStats(id),
  });

  const { data: codes = [] } = useQuery<CommercialCode[]>({
    queryKey: ['admin-commercial-codes', id],
    queryFn: () => getCommercialCodes(id),
    enabled: tab === 'codes',
  });

  const { data: referralsData } = useQuery<{ data: CommercialReferral[]; total: number }>({
    queryKey: ['admin-commercial-referrals', id],
    queryFn: () => getCommercialReferrals(id, 1, 50),
    enabled: tab === 'referrals',
  });

  const refRange = PERIOD_OPTIONS.find(p => p.value === refPeriod)?.range ?? 30;
  const revRange = PERIOD_OPTIONS.find(p => p.value === revPeriod)?.range ?? 30;

  const { data: refChartData = [] } = useQuery<ChartDataPoint[]>({
    queryKey: ['admin-commercial-chart-ref', id, refPeriod, refRange],
    queryFn: () => getCommercialReferralsChart(id, refPeriod, refRange),
    enabled: tab === 'overview',
  });

  const { data: revChartData = [] } = useQuery<ChartDataPoint[]>({
    queryKey: ['admin-commercial-chart-rev', id, revPeriod, revRange],
    queryFn: () => getCommercialRevenueChart(id, revPeriod, revRange),
    enabled: tab === 'overview',
  });

  const updateMutation = useMutation({
    mutationFn: (body: { status?: string; notes?: string }) => updateCommercial(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commercial', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commercials'] });
      showToast('Commercial updated.', 'success');
      setEditing(false);
    },
    onError: (e: any) => showToast(e?.response?.data?.message || 'Update failed.', 'error'),
  });

  if (isLoading) return <div className="h-40 flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="p-6 text-muted-foreground">Commercial not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${locale}/dashboard/admin/commercials`}><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{profile.user?.fullName ?? `Commercial #${profile.userId}`}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              profile.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {profile.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {profile.user?.email} · {profile.totalReferrals} referrals
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing(!editing);
            setEditForm({ status: profile.status, notes: profile.notes || '' });
          }}
        >
          {editing ? <><X className="w-3.5 h-3.5 mr-1" /> Cancel</> : <><Edit2 className="w-3.5 h-3.5 mr-1" /> Edit</>}
        </Button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-sm">Edit Commercial Settings</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                value={editForm.status}
                onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none bg-background"
                rows={2}
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <Button size="sm" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate(editForm)}>
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Changes
          </Button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Referrals"
            value={String(stats.totalReferrals)}
            icon={Users}
          />
          <StatCard
            label="Revenue Generated"
            value={fmtShort(stats.totalRevenueCents)}
            sub="from promo codes"
            icon={DollarSign}
            accent
          />
          <StatCard
            label="Discount Given"
            value={fmtShort(stats.totalDiscountCents)}
            sub="all time"
            icon={TicketPercent}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-3">
        {(['overview', 'codes', 'referrals'] as const).map(t => (
          <Tab key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={tab === t} onClick={() => setTab(t)} />
        ))}
      </div>

      {/* Tab: Overview (charts + info) */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard
              title="Referrals Over Time"
              data={refChartData}
              color="#8B5CF6"
              period={refPeriod}
              onPeriodChange={setRefPeriod}
            />
            <ChartCard
              title="Revenue Generated"
              data={revChartData}
              color="#10B981"
              period={revPeriod}
              onPeriodChange={setRevPeriod}
              formatter={val => fmtShort(val)}
            />
          </div>

          <div className="rounded-xl border bg-card shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-sm">Commercial Info</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Full Name</p><p className="font-medium">{profile.user?.fullName}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{profile.user?.email}</p></div>
              <div><p className="text-xs text-muted-foreground">Preferred Currency</p><p className="font-medium">{profile.preferredCurrency}</p></div>
              <div><p className="text-xs text-muted-foreground">Member since</p><p className="font-medium">{new Date(profile.createdAt).toLocaleDateString()}</p></div>
              {profile.notes && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p className="font-medium">{profile.notes}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Codes */}
      {tab === 'codes' && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Code</th>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Discount</th>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Uses</th>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Revenue</th>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 ? (
                <tr><td className="p-6 text-muted-foreground" colSpan={5}>No codes assigned.</td></tr>
              ) : codes.map(c => (
                <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-[#7C4DFF]">{c.code}</td>
                  <td className="p-3">{c.discountType === 'percentage' ? `${c.discountValue}%` : fmt(c.discountValue * 100)}</td>
                  <td className="p-3 tabular-nums">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                  <td className="p-3 tabular-nums">{fmtShort(c.stats.revenueCents)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Referrals */}
      {tab === 'referrals' && (
        <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Code</th>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">User</th>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Discount</th>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {(referralsData?.data ?? []).length === 0 ? (
                <tr><td className="p-6 text-muted-foreground" colSpan={6}>No referrals yet.</td></tr>
              ) : (referralsData?.data ?? []).map(r => {
                const statusCfg: Record<string, { cls: string; icon: React.ElementType }> = {
                  paid:      { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
                  pending:   { cls: 'bg-amber-100 text-amber-700',     icon: Clock },
                  failed:    { cls: 'bg-red-100 text-red-700',         icon: XCircle },
                  cancelled: { cls: 'bg-slate-100 text-slate-500',     icon: XCircle },
                };
                const { cls, icon: StatusIcon } = statusCfg[r.paymentStatus ?? ''] ?? statusCfg.pending;
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-[#7C4DFF] text-xs font-bold">{r.promoCode ?? '—'}</td>
                    <td className="p-3 text-muted-foreground max-w-[140px] truncate">{r.userEmail ?? `#${r.userId}`}</td>
                    <td className="p-3 text-red-600 text-xs">-{fmt(r.discountAppliedCents, r.currency)}</td>
                    <td className="p-3 text-xs tabular-nums">{r.finalAmountCents != null ? fmt(r.finalAmountCents, r.currency) : '—'}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                        <StatusIcon className="w-3 h-3" />
                        {r.paymentStatus ?? '—'}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

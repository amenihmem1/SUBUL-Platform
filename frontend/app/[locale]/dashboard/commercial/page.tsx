'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  getMyStats, getMyCodes, getMyReferrals, getMyReferralsChart, getMyRevenueChart,
  fmt, fmtShort, type CommercialStats, type CommercialReferral, type CommercialCode, type ChartDataPoint,
} from '@/services/commercials';
import { useAuth } from '@/hooks/useAuth';
import {
  TrendingUp, Users, TicketPercent,
  Copy, Check, Share2, ChevronRight, ArrowUpRight,
  Clock, XCircle, Mail, MessageCircle, CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = 'slate' }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color?: 'slate' | 'violet' | 'emerald' | 'amber';
}) {
  const colors = {
    slate:   'bg-slate-100 text-slate-500',
    violet:  'bg-violet-100 text-violet-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber:   'bg-amber-100 text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CodeShareWidget({ codes }: { codes: CommercialCode[] }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const params = useParams();
  const locale = String(params?.locale || 'en');

  const activeCode = codes.find(c => c.active) ?? codes[0];
  if (!activeCode) return null;

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/checkout?promo=${activeCode.code}`
    : '';

  const discount = activeCode.discountType === 'percentage'
    ? `${activeCode.discountValue}% off`
    : fmt(activeCode.discountValue * 100, activeCode.currencyScope ?? 'EUR');

  const copy = (text: string, which: 'code' | 'link') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const waMsg = encodeURIComponent(`Use my promo code ${activeCode.code} to get ${discount} on Subul Platform! ${shareUrl}`);
  const emailSubject = encodeURIComponent('Exclusive discount on Subul Platform');
  const emailBody = encodeURIComponent(`Hi,\n\nI wanted to share an exclusive discount with you.\nUse promo code: ${activeCode.code} to get ${discount}.\n\nSign up here: ${shareUrl}\n\nBest,`);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-violet-50 rounded-lg">
          <Share2 className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Share Your Code</h3>
          <p className="text-xs text-slate-400">Your clients get {discount}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl px-5 py-3.5 text-center">
          <p className="text-2xl font-bold tracking-[0.2em] text-violet-700 font-mono select-all">{activeCode.code}</p>
          <p className="text-xs text-violet-400 mt-0.5">{discount} for your clients</p>
        </div>
        <button
          onClick={() => copy(activeCode.code, 'code')}
          className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
            copied === 'code'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          {copied === 'code' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          <span className="text-xs">{copied === 'code' ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      <div>
        <p className="text-xs text-slate-400 font-medium mb-2">Share link with promo pre-applied</p>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <p className="text-xs text-slate-500 flex-1 truncate font-mono">{shareUrl}</p>
          <button onClick={() => copy(shareUrl, 'link')} className="shrink-0 text-slate-400 hover:text-violet-600 transition-colors">
            {copied === 'link' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a href={`https://wa.me/?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </a>
        <a href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Mail className="w-4 h-4" /> Email
        </a>
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status?: string }) {
  const cfg: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    paid:      { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2, label: 'Paid' },
    pending:   { cls: 'bg-amber-50 text-amber-700 border-amber-100',       icon: Clock,        label: 'Pending' },
    failed:    { cls: 'bg-red-50 text-red-700 border-red-100',             icon: XCircle,      label: 'Failed' },
    cancelled: { cls: 'bg-slate-50 text-slate-500 border-slate-200',       icon: XCircle,      label: 'Cancelled' },
  };
  const { cls, icon: Icon, label } = cfg[status ?? ''] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

function RecentReferrals({ referrals }: { referrals: CommercialReferral[] }) {
  if (referrals.length === 0) return (
    <div className="text-center py-10 text-slate-400">
      <Users className="w-8 h-8 mx-auto mb-2 text-slate-200" />
      <p className="text-sm">No referrals yet. Share your code to start tracking conversions!</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="pb-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Code</th>
            <th className="pb-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Client</th>
            <th className="pb-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Amount</th>
            <th className="pb-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
            <th className="pb-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {referrals.map(r => (
            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="py-3 pr-3">
                <span className="font-mono font-bold text-violet-600 text-xs bg-violet-50 px-2 py-1 rounded">
                  {r.promoCode ?? '—'}
                </span>
              </td>
              <td className="py-3 pr-3 text-slate-500 text-xs">{r.userEmail ?? '—'}</td>
              <td className="py-3 pr-3 text-right text-xs text-slate-600">
                {r.finalAmountCents != null ? fmt(r.finalAmountCents, r.currency) : '—'}
              </td>
              <td className="py-3 pr-3 text-right"><PaymentStatusBadge status={r.paymentStatus} /></td>
              <td className="py-3 text-right text-xs text-slate-400">
                {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Period = 'day' | 'month' | 'year';
const PERIOD_OPTIONS: { value: Period; label: string; range: number }[] = [
  { value: 'day',   label: '30d',  range: 30 },
  { value: 'month', label: '3m',   range: 3 },
  { value: 'year',  label: '1y',   range: 12 },
];

function ChartCard({ title, data, color, prefix = '', period, onPeriodChange }: {
  title: string; data: ChartDataPoint[]; color: string; prefix?: string;
  period: Period; onPeriodChange: (p: Period) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onPeriodChange(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                period === opt.value
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-slate-300 text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={36} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
              formatter={(val: unknown) => { const n = val as number; return [`${prefix}${n.toLocaleString()}`, title]; }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${color.replace('#', '')})`} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommercialOverviewPage() {
  const { session } = useAuth();
  const params = useParams();
  const locale = String(params?.locale || 'en');
  const [refPeriod, setRefPeriod] = useState<Period>('day');
  const [revPeriod, setRevPeriod] = useState<Period>('day');

  const { data: stats, isLoading: statsLoading } = useQuery<CommercialStats>({
    queryKey: ['commercial-stats'],
    queryFn: getMyStats,
  });

  const { data: codes = [] } = useQuery<CommercialCode[]>({
    queryKey: ['commercial-codes'],
    queryFn: getMyCodes,
  });

  const { data: referralsData } = useQuery({
    queryKey: ['commercial-referrals', 1, 'recent'],
    queryFn: () => getMyReferrals(1, 6),
  });

  const refRange = PERIOD_OPTIONS.find(p => p.value === refPeriod)?.range ?? 30;
  const revRange = PERIOD_OPTIONS.find(p => p.value === revPeriod)?.range ?? 30;

  const { data: referralsChartData = [] } = useQuery<ChartDataPoint[]>({
    queryKey: ['commercial-chart-referrals', refPeriod, refRange],
    queryFn: () => getMyReferralsChart(refPeriod, refRange),
  });

  const { data: revenueChartData = [] } = useQuery<ChartDataPoint[]>({
    queryKey: ['commercial-chart-revenue', revPeriod, revRange],
    queryFn: () => getMyRevenueChart(revPeriod, revRange),
  });

  const referrals = referralsData?.data ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back{session?.user?.fullName ? `, ${session.user.fullName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-sm text-slate-500 mt-1">Here's how your referrals are performing.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: stats + charts + recent referrals */}
        <div className="lg:col-span-2 space-y-5">

          {/* Stats */}
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Total Referrals"
                value={String(stats.totalReferrals)}
                icon={Users}
                color="violet"
              />
              <StatCard
                label="Revenue Generated"
                value={fmtShort(stats.totalRevenueCents)}
                sub={`${fmtShort(stats.totalDiscountCents)} discount given`}
                icon={TrendingUp}
                color="emerald"
              />
            </div>
          ) : null}

          {/* Charts */}
          <ChartCard
            title="Referrals Over Time"
            data={referralsChartData}
            color="#8B5CF6"
            period={refPeriod}
            onPeriodChange={setRefPeriod}
          />
          <ChartCard
            title="Revenue Generated"
            data={revenueChartData}
            color="#10B981"
            period={revPeriod}
            onPeriodChange={setRevPeriod}
          />

          {/* Recent referrals */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-800">Recent Referrals</h2>
              <Link
                href={`/${locale}/dashboard/commercial/referrals`}
                className="text-xs text-violet-600 hover:underline flex items-center gap-1 font-medium"
              >
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <RecentReferrals referrals={referrals} />
          </div>
        </div>

        {/* Right column: share widget + quick links */}
        <div className="space-y-5">
          {codes.length > 0 ? (
            <CodeShareWidget codes={codes} />
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <TicketPercent className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No promo codes yet</p>
              <p className="text-xs text-slate-400 mt-1">Contact your admin to get codes assigned to your account.</p>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-1">
            {[
              { label: 'My Promo Codes', href: `/${locale}/dashboard/commercial/codes`, icon: TicketPercent },
              { label: 'All Referrals', href: `/${locale}/dashboard/commercial/referrals`, icon: Users },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <item.icon className="w-4 h-4 text-slate-400 group-hover:text-violet-500 transition-colors" />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 font-medium">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

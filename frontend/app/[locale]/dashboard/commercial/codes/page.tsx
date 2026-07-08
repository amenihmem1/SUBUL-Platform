'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getMyCodes, fmt,
  type CommercialCode,
} from '@/services/commercials';
import {
  TicketPercent, Copy, Check, TrendingUp, Users,
  DollarSign, Calendar, Zap, ChevronDown, ChevronUp,
  ArrowUpRight,
} from 'lucide-react';

// ─── Code card ─────────────────────────────────────────────────────────────────

function CodeCard({ code }: { code: CommercialCode }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const usagePct = code.maxUses ? Math.round((code.usedCount / code.maxUses) * 100) : null;
  const discountLabel = code.discountType === 'percentage'
    ? `${code.discountValue}% off`
    : `${code.discountValue} off`;
  const cur = code.currencyScope ?? 'EUR';

  const now = new Date();
  const isExpired = code.endDate ? new Date(code.endDate) < now : false;
  const isActive = code.active && !isExpired;

  return (
    <div className={`rounded-2xl border bg-card shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden ${
      !isActive ? 'opacity-60' : ''
    }`}>
      {/* Header */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Code display */}
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-gradient-to-r from-[#7C4DFF]/10 to-[#C2185B]/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <TicketPercent className="w-4 h-4 text-[#7C4DFF] flex-shrink-0" />
                <span className="font-mono text-sm font-bold tracking-[0.15em] text-[#7C4DFF]">
                  {code.code}
                </span>
              </div>
              <button
                onClick={copy}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Copy code"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#7C4DFF]/10 text-[#7C4DFF]">
                <Zap className="w-3 h-3" />
                {discountLabel}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : isExpired
                    ? 'bg-red-500/10 text-red-600'
                    : 'bg-slate-200/60 text-slate-500'
              }`}>
                {isActive ? 'Active' : isExpired ? 'Expired' : 'Inactive'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground mt-0.5"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-border/50">
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Users className="w-3 h-3" />
            <span className="text-xs">Uses</span>
          </div>
          <p className="text-lg font-bold tabular-nums">{code.stats.totalUses}</p>
          {code.maxUses && (
            <p className="text-xs text-muted-foreground">/ {code.maxUses}</p>
          )}
        </div>
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs">Conversions</span>
          </div>
          <p className="text-lg font-bold tabular-nums text-emerald-600">{code.stats.conversions}</p>
        </div>
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <DollarSign className="w-3 h-3" />
            <span className="text-xs">Revenue</span>
          </div>
          <p className="text-lg font-bold tabular-nums text-[#7C4DFF]">
            {fmt(code.stats.revenueCents, cur)}
          </p>
        </div>
      </div>

      {/* Usage bar */}
      {usagePct !== null && (
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Usage limit</span>
            <span className="font-medium">{code.usedCount} / {code.maxUses} ({usagePct}%)</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] transition-all duration-500"
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/50 p-5 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Revenue Generated</p>
              <p className="font-semibold">{fmt(code.stats.revenueCents, cur)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Total Discount Given</p>
              <p className="font-semibold">{fmt(code.stats.discountCents, cur)}</p>
            </div>
            {code.startDate && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Start Date</p>
                <p className="font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {new Date(code.startDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {code.endDate && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">End Date</p>
                <p className={`font-semibold flex items-center gap-1 ${isExpired ? 'text-red-500' : ''}`}>
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {new Date(code.endDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {code.currencyScope && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Currency Scope</p>
                <p className="font-semibold">{code.currencyScope}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Created</p>
              <p className="font-semibold">{new Date(code.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C4DFF]/10 to-[#C2185B]/10 flex items-center justify-center mx-auto mb-4">
        <TicketPercent className="w-7 h-7 text-[#7C4DFF]" />
      </div>
      <h3 className="text-base font-semibold mb-1">No promo codes yet</h3>
      <p className="text-muted-foreground text-sm max-w-xs mx-auto">
        Your promo codes will appear here once an admin assigns them to your account.
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CodesPage() {
  const { data: codes, isLoading } = useQuery({
    queryKey: ['commercial', 'codes'],
    queryFn: getMyCodes,
    staleTime: 30_000,
  });

  const activeCodes = codes?.filter(c => c.active) ?? [];
  const inactiveCodes = codes?.filter(c => !c.active) ?? [];

  const totalRevenue = codes?.reduce((sum, c) => sum + c.stats.revenueCents, 0) ?? 0;
  const totalConversions = codes?.reduce((sum, c) => sum + c.stats.conversions, 0) ?? 0;
  const totalUses = codes?.reduce((sum, c) => sum + c.stats.totalUses, 0) ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Promo Codes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Share these codes with your network to track referrals and conversions.
        </p>
      </div>

      {/* Summary strip */}
      {codes && codes.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Uses', value: String(totalUses), icon: Users, color: 'text-slate-600' },
            { label: 'Conversions', value: String(totalConversions), icon: TrendingUp, color: 'text-emerald-600' },
            { label: 'Revenue Generated', value: fmt(totalRevenue, 'EUR'), icon: DollarSign, color: 'text-[#7C4DFF]' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border bg-card shadow-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold tabular-nums truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl border bg-card h-52 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && codes?.length === 0 && <EmptyState />}

      {/* Active codes */}
      {!isLoading && activeCodes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active ({activeCodes.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeCodes.map(code => (
              <CodeCard key={code.id} code={code} />
            ))}
          </div>
        </section>
      )}

      {/* Inactive / expired codes */}
      {!isLoading && inactiveCodes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Inactive / Expired ({inactiveCodes.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {inactiveCodes.map(code => (
              <CodeCard key={code.id} code={code} />
            ))}
          </div>
        </section>
      )}

      {/* Tip banner */}
      {!isLoading && codes && codes.length > 0 && (
        <div className="rounded-xl border border-[#7C4DFF]/20 bg-[#7C4DFF]/5 p-4 flex items-start gap-3">
          <ArrowUpRight className="w-5 h-5 text-[#7C4DFF] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#7C4DFF]">Maximize your conversions</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share your code on LinkedIn, WhatsApp groups, and tech communities.
              Codes with a fixed end date create urgency and boost conversion rates.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

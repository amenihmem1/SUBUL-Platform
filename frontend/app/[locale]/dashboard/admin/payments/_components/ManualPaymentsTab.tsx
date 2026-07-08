'use client';

import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  DollarSign,
  CreditCard,
  Clock,
  BarChart3,
  CheckCircle2,
  XCircle,
  Building2,
  Smartphone,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { formatFromMinorUnits } from '@/lib/money';
import { AdminPaymentKpiCard } from '@/components/admin/payments/AdminPaymentKpiCard';
import {
  useAdminManualPaymentsList,
  useAdminManualPaymentStats,
} from '@/hooks/api/useAdminManualPayments';
import type {
  ManualPaymentRequest,
  ManualPaymentStatus,
  ManualPaymentAdminSort,
} from '@/services/adminPlatform';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const MANUAL_STATUS_MAP: Record<ManualPaymentStatus, { label: string; cls: string }> = {
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  proof_uploaded: { label: 'Preuve envoyée', cls: 'bg-blue-100 text-blue-700' },
  pending_review: { label: 'En validation', cls: 'bg-violet-100 text-violet-700' },
  approved: { label: 'Validé', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Refusé', cls: 'bg-red-100 text-red-700' },
};

function methodLabel(method: string): string {
  if (method === 'bank_transfer') return 'Virement';
  if (method === 'd17') return 'D17';
  return method;
}

function statusCategoryLabelFr(cat: string): string {
  if (cat === 'pending') return 'En attente';
  if (cat === 'validated') return 'Validé';
  if (cat === 'rejected') return 'Refusé / rejeté';
  return cat;
}

function collectCurrenciesFromRevenueSeries(
  series: { revenueCentsByCurrency: Record<string, number> }[],
): string[] {
  const s = new Set<string>();
  for (const row of series) {
    Object.keys(row.revenueCentsByCurrency || {}).forEach((c) => s.add(c));
  }
  return [...s].sort();
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 p-6 animate-pulse bg-slate-50 h-[140px]" />
      ))}
    </div>
  );
}

function ChartSkeleton({ h = 280 }: { h?: number }) {
  return (
    <div
      className="bg-white rounded-xl border p-4 shadow-sm animate-pulse bg-slate-50"
      style={{ minHeight: h }}
    />
  );
}

export interface ManualPaymentsTabProps {
  locale: string;
  dateFrom: string;
  dateTo: string;
  granularity: 'day' | 'week' | 'month' | 'year';
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  setGranularity: (v: 'day' | 'week' | 'month' | 'year') => void;
  page: number;
  setPage: (p: number) => void;
  search: string;
  setSearch: (s: string) => void;
  status: string;
  setStatus: (s: string) => void;
  paymentMethod: string;
  setPaymentMethod: (s: string) => void;
  planSlug: string;
  setPlanSlug: (s: string) => void;
  filterCurrency: string;
  setFilterCurrency: (s: string) => void;
  sort: ManualPaymentAdminSort;
  setSort: (s: ManualPaymentAdminSort) => void;
  itemsPerPage: number;
}

export function ManualPaymentsTab(props: ManualPaymentsTabProps) {
  const { t } = useTranslation();
  const {
    locale,
    dateFrom,
    dateTo,
    granularity,
    setDateFrom,
    setDateTo,
    setGranularity,
    page,
    setPage,
    search,
    setSearch,
    status,
    setStatus,
    paymentMethod,
    setPaymentMethod,
    planSlug,
    setPlanSlug,
    filterCurrency,
    setFilterCurrency,
    sort,
    setSort,
    itemsPerPage,
  } = props;

  const [showFilters, setShowFilters] = useState(false);

  const listFilters = useMemo(
    () => ({
      page,
      limit: itemsPerPage,
      search: search.trim() || undefined,
      status: status || undefined,
      paymentMethod: paymentMethod || undefined,
      planSlug: planSlug || undefined,
      currency: filterCurrency.trim() || undefined,
      from: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
      to: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
      sort,
    }),
    [
      page,
      itemsPerPage,
      search,
      status,
      paymentMethod,
      planSlug,
      filterCurrency,
      dateFrom,
      dateTo,
      sort,
    ],
  );

  const statsFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      paymentMethod: paymentMethod || undefined,
      planSlug: planSlug || undefined,
      currency: filterCurrency.trim() || undefined,
      from: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
      to: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
      granularity,
    }),
    [search, status, paymentMethod, planSlug, filterCurrency, dateFrom, dateTo, granularity],
  );

  const {
    data: pageData,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
    isFetching: listFetching,
  } = useAdminManualPaymentsList(listFilters, true);

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
    isFetching: statsFetching,
  } = useAdminManualPaymentStats(statsFilters, true);

  const rows = pageData?.data ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  const refreshAll = useCallback(() => {
    refetchList();
    refetchStats();
  }, [refetchList, refetchStats]);

  const validatedRevenueDisplay = useMemo(() => {
    const entries = Object.entries(stats?.summary.totalValidatedRevenueByCurrency ?? {});
    if (entries.length === 0) return '—';
    return entries
      .map(([cur, cents]) => `${formatFromMinorUnits(cents, cur)}`)
      .join(' · ');
  }, [stats?.summary.totalValidatedRevenueByCurrency]);

  const avgValidatedDisplay = useMemo(() => {
    const entries = Object.entries(stats?.summary.averageValidatedAmountByCurrency ?? {});
    if (entries.length === 0) return '—';
    return entries
      .map(([cur, cents]) => `${formatFromMinorUnits(cents, cur)}`)
      .join(' · ');
  }, [stats?.summary.averageValidatedAmountByCurrency]);

  const methodRevenueCards = useMemo(() => {
    return (stats?.summary.validatedRevenueByMethod ?? []).filter(
      (m) => Object.keys(m.revenueByCurrency).length > 0 || m.validatedCount > 0,
    );
  }, [stats?.summary.validatedRevenueByMethod]);

  const revenueTimeByCurrency = useMemo(() => {
    const series = stats?.revenueOverTime ?? [];
    const curs = collectCurrenciesFromRevenueSeries(series);
    const byCur: Record<string, { bucketShort: string; revenueCents: number; validatedCount: number }[]> = {};
    for (const c of curs) byCur[c] = [];
    for (const row of series) {
      const label = row.bucket ? new Date(row.bucket).toLocaleDateString() : '';
      for (const c of curs) {
        byCur[c].push({
          bucketShort: label,
          revenueCents: row.revenueCentsByCurrency[c] ?? 0,
          validatedCount: row.validatedCount,
        });
      }
    }
    return { currencies: curs, byCur };
  }, [stats?.revenueOverTime]);

  const statusPieData = useMemo(() => {
    return (stats?.statusDistribution ?? []).map((d) => ({
      name: statusCategoryLabelFr(d.category),
      count: d.count,
      key: d.category,
    }));
  }, [stats?.statusDistribution]);

  const methodBarData = useMemo(() => {
    return (stats?.methodDistribution ?? []).map((d) => ({
      name: methodLabel(d.method),
      totalCount: d.totalCount,
      validatedCount: d.validatedCount,
    }));
  }, [stats?.methodDistribution]);

  const planChartCurrencies = useMemo(() => {
    const s = new Set<string>();
    for (const p of stats?.planRevenue ?? []) {
      Object.keys(p.revenueByCurrency).forEach((c) => s.add(c));
    }
    return [...s].sort();
  }, [stats?.planRevenue]);

  const planRevenueWide = useMemo(() => {
    return (stats?.planRevenue ?? []).map((p) => {
      const row: Record<string, string | number> = { plan: p.planSlug };
      for (const c of planChartCurrencies) {
        row[c] = p.revenueByCurrency[c] ?? 0;
      }
      return row;
    });
  }, [stats?.planRevenue, planChartCurrencies]);

  const exportCsv = useCallback(() => {
    const header = [
      'orderId',
      'userEmail',
      'userFullName',
      'planSlug',
      'paymentMethod',
      'amountCents',
      'currency',
      'status',
      'createdAt',
    ];
    const lines = rows.map((r) =>
      [
        r.orderId,
        r.userEmail ?? '',
        r.userFullName ?? '',
        r.planSlug,
        r.paymentMethod,
        r.amountCents,
        r.currency,
        r.status,
        r.createdAt,
      ].join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manual_payment_requests.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  const listOrStatsError = listError || statsError;
  const showStatsSkeleton = statsLoading && !stats;
  const showListSkeleton = listLoading && !pageData;

  return (
    <div className="space-y-6">
      {listOrStatsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm flex flex-wrap justify-between gap-4 items-center">
          <span>Impossible de charger les paiements manuels ou les statistiques.</span>
          <Button size="sm" variant="outline" onClick={() => refreshAll()}>
            Réessayer
          </Button>
        </div>
      )}

      {showStatsSkeleton ? (
        <KpiSkeleton />
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AdminPaymentKpiCard
            index={0}
            label="Revenus validés (par devise)"
            value={validatedRevenueDisplay}
            sub="Uniquement statut validé — ne pas additionner les devises."
            icon={DollarSign}
            color="bg-green-50 text-green-700"
            trend="up"
          />
          <AdminPaymentKpiCard
            index={1}
            label="Total demandes"
            value={String(stats?.summary.totalManualPayments ?? 0)}
            sub="Tous statuts, période et filtres appliqués."
            icon={CreditCard}
            color="bg-primary/10 text-primary"
            trend="up"
          />
          <AdminPaymentKpiCard
            index={2}
            label="Paiements validés"
            value={String(stats?.summary.validatedCount ?? 0)}
            sub="Comptage des demandes approuvées."
            icon={CheckCircle2}
            color="bg-emerald-50 text-emerald-700"
            trend="up"
          />
          <AdminPaymentKpiCard
            index={3}
            label="En attente"
            value={String(stats?.summary.pendingCount ?? 0)}
            sub="En attente, preuve, ou en cours de validation."
            icon={Clock}
            color="bg-amber-50 text-amber-700"
            trend="down"
          />
          <AdminPaymentKpiCard
            index={4}
            label="Refusés / rejetés"
            value={String(stats?.summary.rejectedCount ?? 0)}
            sub="Non comptés comme revenu."
            icon={XCircle}
            color="bg-red-50 text-red-700"
            trend="down"
          />
          <AdminPaymentKpiCard
            index={5}
            label="Montant moyen (validé)"
            value={avgValidatedDisplay}
            sub="Moyenne par devise, paiements validés uniquement."
            icon={BarChart3}
            color="bg-violet-50 text-violet-700"
            trend="up"
          />
          <AdminPaymentKpiCard
            index={6}
            label="Méthodes (validés)"
            value={
              (stats?.summary.validatedRevenueByMethod ?? [])
                .map((m) => `${methodLabel(m.method)} (${m.validatedCount})`)
                .join(' · ') || '—'
            }
            sub="Volume validé par canal (détail des montants sous les cartes)."
            icon={Building2}
            color="bg-sky-50 text-sky-700"
            trend="up"
          />
        </motion.div>
      )}

      {!showStatsSkeleton && stats && methodRevenueCards.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {methodRevenueCards.map((m) => (
            <div key={m.method} className="rounded-xl border bg-white p-4">
              <p className="text-slate-500 font-medium flex items-center gap-2">
                {m.method === 'bank_transfer' ? (
                  <Building2 className="w-4 h-4 text-blue-600" />
                ) : (
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                )}
                {methodLabel(m.method)} — revenus validés
              </p>
              <ul className="mt-2 space-y-1">
                {Object.entries(m.revenueByCurrency).map(([cur, cents]) => (
                  <li key={cur} className="flex justify-between">
                    <span>{cur}</span>
                    <span className="font-semibold">{formatFromMinorUnits(cents, cur)}</span>
                  </li>
                ))}
                {!Object.keys(m.revenueByCurrency).length && (
                  <li className="text-slate-400">Aucun revenu validé sur la période</li>
                )}
              </ul>
              <p className="text-xs text-slate-400 mt-2">{m.validatedCount} paiement(s) validé(s)</p>
            </div>
          ))}
        </div>
      )}

      {showStatsSkeleton ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border p-4 shadow-sm min-h-[280px]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-slate-800">Revenus validés dans le temps</h3>
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as typeof granularity)}
                className="text-xs border rounded-md px-2 py-1"
              >
                <option value="day">Jour</option>
                <option value="week">Semaine</option>
                <option value="month">Mois</option>
                <option value="year">Année</option>
              </select>
            </div>
            {stats?.note && <p className="text-xs text-amber-700 mb-2">{stats.note}</p>}
            {revenueTimeByCurrency.currencies.length === 0 ? (
              <p className="text-sm text-slate-400 py-16 text-center">Aucun revenu validé sur cette période.</p>
            ) : revenueTimeByCurrency.currencies.length === 1 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTimeByCurrency.byCur[revenueTimeByCurrency.currencies[0]]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucketShort" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [
                        formatFromMinorUnits(Number(value ?? 0), revenueTimeByCurrency.currencies[0]),
                        'Revenu',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenueCents"
                      stroke="#6366f1"
                      fill="#6366f133"
                      name="Revenu validé"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-xs text-slate-500">
                  Plusieurs devises : un graphique par devise (revenus validés).
                </p>
                {revenueTimeByCurrency.currencies.map((cur, idx) => (
                  <div key={cur} className="h-[200px]">
                    <p className="text-xs font-medium text-slate-600 mb-1">{cur}</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTimeByCurrency.byCur[cur]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bucketShort" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value) => [formatFromMinorUnits(Number(value ?? 0), cur), 'Revenu']}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenueCents"
                          stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                          fill={`${CHART_COLORS[idx % CHART_COLORS.length]}33`}
                          name={cur}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-4 shadow-sm min-h-[280px]">
            <h3 className="font-semibold text-slate-800 mb-2">Statuts (agrégés)</h3>
            {statusPieData.length === 0 ? (
              <p className="text-sm text-slate-400 py-16 text-center">Aucune donnée pour cette période.</p>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={72}
                      label={false}
                    >
                      {statusPieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-4 shadow-sm min-h-[280px]">
            <h3 className="font-semibold text-slate-800 mb-2">Méthodes</h3>
            <p className="text-xs text-slate-500 mb-2">Nombre de demandes par méthode (tous statuts).</p>
            {methodBarData.length === 0 ? (
              <p className="text-sm text-slate-400 py-16 text-center">Aucune donnée.</p>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={methodBarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="totalCount" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total" />
                    <Bar dataKey="validatedCount" fill="#22c55e" radius={[4, 4, 0, 0]} name="Validés" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-4 shadow-sm min-h-[280px] lg:col-span-2">
            <h3 className="font-semibold text-slate-800 mb-2">Plans — revenus validés</h3>
            <p className="text-xs text-slate-500 mb-2">
              Un groupe de barres par plan ; chaque devise reste séparée (unités mineures).
            </p>
            {planRevenueWide.length === 0 ? (
              <p className="text-sm text-slate-400 py-16 text-center">Aucun revenu validé par plan.</p>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planRevenueWide}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name) => [
                        formatFromMinorUnits(Number(value ?? 0), String(name)),
                        String(name),
                      ]}
                    />
                    {planChartCurrencies.map((c, idx) => (
                      <Bar
                        key={c}
                        dataKey={c}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        radius={[2, 2, 0, 0]}
                        name={c}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {planChartCurrencies.length > 1 && (
              <p className="text-xs text-amber-700 mt-2">
                Plusieurs devises : valeurs affichées séparément par barre.
              </p>
            )}
            <div className="mt-4 grid sm:grid-cols-2 gap-2 text-xs">
              {(stats?.planRevenue ?? []).map((p) => (
                <div key={p.planSlug} className="rounded-lg border border-slate-100 p-2 bg-slate-50/80">
                  <p className="font-semibold text-slate-700">{p.planSlug}</p>
                  <ul className="mt-1 space-y-0.5">
                    {Object.entries(p.revenueByCurrency).map(([cur, cents]) => (
                      <li key={cur} className="flex justify-between gap-2">
                        <span>{cur}</span>
                        <span>{formatFromMinorUnits(cents, cur)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 shadow-sm min-h-[280px]">
            <h3 className="font-semibold text-slate-800 mb-2">Plans — volume validé</h3>
            <p className="text-xs text-slate-500 mb-2">Nombre de paiements validés par plan.</p>
            {(stats?.planCounts ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 py-16 text-center">Aucune donnée.</p>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.planCounts ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="planSlug" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="validatedCount" fill="#22c55e" radius={[4, 4, 0, 0]} name="Validés" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par email, nom, référence…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-2 py-2 text-sm"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-2 py-2 text-sm"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ManualPaymentAdminSort)}
            className="border rounded-lg px-2 py-2 text-sm"
          >
            <option value="created_desc">Date ↓</option>
            <option value="created_asc">Date ↑</option>
            <option value="amount_desc">Montant ↓</option>
            <option value="amount_asc">Montant ↑</option>
            <option value="status_desc">Statut ↓</option>
            <option value="status_asc">Statut ↑</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" /> {t('payments.filters')}
            </Button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-20 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t('payments.status')}</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                    className="w-full border rounded-lg px-2 py-2 text-sm"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="proof_uploaded">Preuve envoyée</option>
                    <option value="pending_review">En validation</option>
                    <option value="approved">Validé</option>
                    <option value="rejected">Refusé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Méthode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setPage(1);
                    }}
                    className="w-full border rounded-lg px-2 py-2 text-sm"
                  >
                    <option value="">Toutes</option>
                    <option value="bank_transfer">Virement</option>
                    <option value="d17">D17</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Plan</label>
                  <select
                    value={planSlug}
                    onChange={(e) => {
                      setPlanSlug(e.target.value);
                      setPage(1);
                    }}
                    className="w-full border rounded-lg px-2 py-2 text-sm"
                  >
                    <option value="">Tous</option>
                    <option value="standard">standard</option>
                    <option value="premium">premium</option>
                    <option value="free">free</option>
                    <option value="university">university</option>
                    <option value="enterprise">enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Devise</label>
                  <input
                    value={filterCurrency}
                    onChange={(e) => {
                      setFilterCurrency(e.target.value.toUpperCase());
                      setPage(1);
                    }}
                    placeholder="TND, EUR…"
                    className="w-full border rounded-lg px-2 py-2 text-sm"
                  />
                </div>
                <Button size="sm" className="w-full" onClick={() => setShowFilters(false)}>
                  {t('common.apply')}
                </Button>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => refreshAll()} disabled={listFetching || statsFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${listFetching || statsFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="w-4 h-4 mr-2" /> {t('payments.export')}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-4 font-medium text-slate-600">Référence</th>
                <th className="text-left p-4 font-medium text-slate-600">Utilisateur</th>
                <th className="text-left p-4 font-medium text-slate-600">Plan</th>
                <th className="text-left p-4 font-medium text-slate-600">Méthode</th>
                <th className="text-left p-4 font-medium text-slate-600">Montant</th>
                <th className="text-left p-4 font-medium text-slate-600">Statut</th>
                <th className="text-left p-4 font-medium text-slate-600">Date</th>
                <th className="text-left p-4 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {showListSkeleton ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <div className="space-y-2 animate-pulse">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-10 bg-slate-100 rounded" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Aucun paiement manuel ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                rows.map((req: ManualPaymentRequest) => {
                  const divisor = req.currency === 'TND' ? 1000 : 100;
                  const amt = `${(req.amountCents / divisor).toFixed(2)} ${req.currency}`;
                  const { label, cls } = MANUAL_STATUS_MAP[req.status] ?? MANUAL_STATUS_MAP.pending;
                  return (
                    <tr
                      key={req.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 font-mono text-xs text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">{req.orderId}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-900">{req.userFullName ?? '—'}</p>
                        <p className="text-xs text-slate-500">{req.userEmail ?? '—'}</p>
                      </td>
                      <td className="p-4 text-slate-700">{req.planName}</td>
                      <td className="p-4">
                        {req.paymentMethod === 'bank_transfer' ? (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Building2 className="w-4 h-4" />
                            Virement
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <Smartphone className="w-4 h-4" />
                            D17
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{amt}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/${locale}/dashboard/admin/manual-payments/${req.id}`}
                          className="flex items-center gap-1 text-violet-600 hover:text-violet-800 text-xs font-medium"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Détails
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, total)} / {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Clock,
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
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { TransactionDetailsModal } from '@/components/modals/Admin/Payments/TransactionDetailsModal';
import { RefundConfirmModal } from '@/components/modals/Admin/Payments/RefundConfirmModal';
import { getAdminUiSettings } from '@/lib/adminUiSettings';
import { formatFromMinorUnits } from '@/lib/money';
import {
  useAdminTransactions,
  useAdminTransactionStats,
  useAdminTransactionAnalytics,
  useAdminTransactionDetail,
  useRefundAdminTransaction,
} from '@/hooks/api/useTransactions';
import type { AdminTxSort, PaymentStatus } from '@/services/transactions';
import type { ManualPaymentAdminSort } from '@/services/adminPlatform';
import { ManualPaymentsTab } from './_components/ManualPaymentsTab';

const ITEMS_PER_PAGE = 20;

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function statusBadge(status: PaymentStatus): { cls: string; label: string } {
  const map: Record<string, { cls: string; label: string }> = {
    paid: { cls: 'bg-emerald-100 text-emerald-800', label: 'paid' },
    pending: { cls: 'bg-amber-100 text-amber-800', label: 'pending' },
    initiated: { cls: 'bg-amber-100 text-amber-900', label: 'initiated' },
    failed: { cls: 'bg-red-100 text-red-800', label: 'failed' },
    cancelled: { cls: 'bg-slate-100 text-slate-700', label: 'cancelled' },
    expired: { cls: 'bg-slate-100 text-slate-600', label: 'expired' },
    refunded: { cls: 'bg-violet-100 text-violet-800', label: 'refunded' },
  };
  return map[status] ?? { cls: 'bg-slate-100 text-slate-700', label: status };
}

export default function PaymentsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const locale = String(params?.locale ?? 'en');
  const adminCurrency = getAdminUiSettings().paymentCurrency || 'EUR';

  const [activeTab, setActiveTab] = useState<'online' | 'manual'>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [sort, setSort] = useState<AdminTxSort>('created_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month' | 'year'>('day');

  const listParams = useMemo(
    () => ({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: searchQuery.trim() || undefined,
      status: (filterStatus !== 'all' ? filterStatus : undefined) as PaymentStatus | undefined,
      provider: (filterProvider !== 'all' ? filterProvider : undefined) as 'stripe' | 'flouci' | undefined,
      plan: (filterPlan !== 'all' ? filterPlan : undefined) as 'standard' | 'premium' | 'free' | 'unknown' | undefined,
      currency: filterCurrency.trim() || undefined,
      from: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
      to: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
      sort,
    }),
    [
      currentPage,
      searchQuery,
      filterStatus,
      filterProvider,
      filterPlan,
      filterCurrency,
      dateFrom,
      dateTo,
      sort,
    ],
  );

  const { data: pageData, isLoading, isError, refetch, isFetching } = useAdminTransactions(listParams);
  const { data: statsData } = useAdminTransactionStats();
  const analyticsParams = useMemo(
    () => ({
      from: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
      to: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
      granularity,
      provider: (filterProvider !== 'all' ? filterProvider : undefined) as 'stripe' | 'flouci' | undefined,
      currency: filterCurrency.trim() || undefined,
      plan: (filterPlan !== 'all' ? filterPlan : undefined) as 'standard' | 'premium' | 'free' | 'unknown' | undefined,
    }),
    [dateFrom, dateTo, granularity, filterProvider, filterCurrency, filterPlan],
  );
  const { data: analytics } = useAdminTransactionAnalytics(analyticsParams);
  const { data: detailTx } = useAdminTransactionDetail(selectedTxId, showViewModal && !!selectedTxId);
  const refundMutation = useRefundAdminTransaction();

  const rows = pageData?.data ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const revenueLines = statsData?.revenueByCurrency ?? [];
  const primaryRevenueLabel =
    revenueLines.length > 0
      ? revenueLines.map((r) => `${formatFromMinorUnits(r.revenueCents, r.currency)} (${r.paidCount})`).join(' · ')
      : formatFromMinorUnits(0, adminCurrency);

  const statsCards = [
    {
      label: t('payments.monthlyRevenue'),
      value: primaryRevenueLabel,
      sub: 'Totaux payés par devise (ne pas additionner des devises différentes).',
      icon: DollarSign,
      color: 'bg-green-50 text-green-700',
      change: '',
      trend: 'up' as const,
    },
    {
      label: t('payments.transactions'),
      value: String(statsData?.totalTransactions ?? 0),
      sub: `${statsData?.paidCount ?? 0} payées`,
      icon: CreditCard,
      color: 'bg-primary/10 text-primary',
      change: '',
      trend: 'up' as const,
    },
    {
      label: t('payments.pending'),
      value: String(statsData?.pendingCount ?? 0),
      sub: `+${statsData?.initiatedCount ?? 0} initiées`,
      icon: Clock,
      color: 'bg-amber-50 text-amber-700',
      change: '',
      trend: 'down' as const,
    },
    {
      label: t('payments.refunds'),
      value: String(statsData?.refundedCount ?? 0),
      sub: `${statsData?.failedCount ?? 0} échouées`,
      icon: RefreshCw,
      color: 'bg-red-50 text-red-700',
      change: '',
      trend: 'down' as const,
    },
  ];

  const chartSeries = useMemo(
    () =>
      (analytics?.series ?? []).map((s) => ({
        ...s,
        bucketShort: s.bucket ? new Date(s.bucket).toLocaleDateString() : '',
      })),
    [analytics?.series],
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const exportCsv = useCallback(() => {
    const header = [
      'id',
      'provider',
      'status',
      'amountCents',
      'currency',
      'plan',
      'userEmail',
      'createdAt',
    ];
    const lines = rows.map((r) =>
      [
        r.id,
        r.provider,
        r.status,
        r.amountCents,
        r.currency,
        r.planDisplayLabel,
        r.userEmail ?? r.customerEmail ?? '',
        r.createdAt,
      ].join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  const handleRefund = async () => {
    if (!selectedTxId) return;
    try {
      await refundMutation.mutateAsync(selectedTxId);
      setShowRefundModal(false);
      setSelectedTxId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedRow = rows.find((r) => r.id === selectedTxId) ?? null;

  const modalTransaction = useMemo(() => {
    if (!selectedTxId || !showViewModal) return null;
    if (detailTx) return detailTx;
    const r = rows.find((x) => x.id === selectedTxId);
    if (r) return { ...r, providerMetadata: undefined as unknown };
    return null;
  }, [selectedTxId, showViewModal, detailTx, rows]);

  const [manualPage, setManualPage] = useState(1);
  const [manualSearch, setManualSearch] = useState('');
  const [manualStatus, setManualStatus] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState('');
  const [manualPlanSlug, setManualPlanSlug] = useState('');
  const [manualCurrency, setManualCurrency] = useState('');
  const [manualSort, setManualSort] = useState<ManualPaymentAdminSort>('created_desc');

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paiements</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeTab === 'online'
              ? 'Transactions Stripe et Flouci (source: payment_transactions)'
              : 'Paiements manuels — virement & D17 (source: manual_payment_requests)'}
          </p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(['online', 'manual'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'online' ? 'Paiements en ligne' : 'Paiements manuels'}
          </button>
        ))}
      </div>

      {activeTab === 'manual' && (
        <ManualPaymentsTab
          locale={locale}
          dateFrom={dateFrom}
          dateTo={dateTo}
          granularity={granularity}
          setDateFrom={(v) => {
            setDateFrom(v);
            setManualPage(1);
          }}
          setDateTo={(v) => {
            setDateTo(v);
            setManualPage(1);
          }}
          setGranularity={setGranularity}
          page={manualPage}
          setPage={setManualPage}
          search={manualSearch}
          setSearch={setManualSearch}
          status={manualStatus}
          setStatus={setManualStatus}
          paymentMethod={manualPaymentMethod}
          setPaymentMethod={setManualPaymentMethod}
          planSlug={manualPlanSlug}
          setPlanSlug={setManualPlanSlug}
          filterCurrency={manualCurrency}
          setFilterCurrency={setManualCurrency}
          sort={manualSort}
          setSort={setManualSort}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}

      {activeTab === 'online' && (
        <>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {statsCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600'
                    }`}
                  >
                    {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-foreground break-words">{stat.value}</h3>
                <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
                {stat.sub && <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>}
              </motion.div>
            ))}
          </motion.div>

          {statsData && (
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border bg-white p-4">
                <p className="text-slate-500 font-medium">Stripe (payé)</p>
                <ul className="mt-2 space-y-1">
                  {(statsData.stripePaidByCurrency ?? []).map((r) => (
                    <li key={`s-${r.currency}`} className="flex justify-between">
                      <span>{r.currency}</span>
                      <span className="font-semibold">{formatFromMinorUnits(r.revenueCents, r.currency)}</span>
                    </li>
                  ))}
                  {!statsData.stripePaidByCurrency?.length && <li className="text-slate-400">—</li>}
                </ul>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-slate-500 font-medium">Flouci (payé)</p>
                <ul className="mt-2 space-y-1">
                  {(statsData.flouciPaidByCurrency ?? []).map((r) => (
                    <li key={`f-${r.currency}`} className="flex justify-between">
                      <span>{r.currency}</span>
                      <span className="font-semibold">{formatFromMinorUnits(r.revenueCents, r.currency)}</span>
                    </li>
                  ))}
                  {!statsData.flouciPaidByCurrency?.length && <li className="text-slate-400">—</li>}
                </ul>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-slate-500 font-medium">Plans (transactions payées)</p>
                <p className="mt-2">
                  Standard: <strong>{statsData.standardPaidCount}</strong> · Premium:{' '}
                  <strong>{statsData.premiumPaidCount}</strong> · Free: <strong>{statsData.freePaidCount}</strong>
                </p>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border p-4 shadow-sm min-h-[280px]">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-slate-800">Revenus (bucket)</h3>
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
              {analytics?.note && <p className="text-xs text-amber-700 mb-2">{analytics.note}</p>}
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucketShort" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${Number(value)} (minor units)`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenueCents" stroke="#6366f1" fill="#6366f133" name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm min-h-[280px]">
              <h3 className="font-semibold text-slate-800 mb-2">Statuts (période)</h3>
              <div className="h-[220px] flex gap-4">
                <div className="flex-1 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.statusDistribution ?? []}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={false}
                      >
                        {(analytics?.statusDistribution ?? []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.revenueByProvider ?? []} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="provider" width={48} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => [`${Number(value)}`, 'Revenue (minor)']} />
                      <Bar dataKey="revenueCents" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm min-h-[280px]">
              <h3 className="font-semibold text-slate-800 mb-2">Plans (revenu payé)</h3>
              <p className="text-xs text-slate-500 mb-2">Répartition par catégorie de plan sur la période (filtres appliqués).</p>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.revenueByPlanCategory ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="planCategory" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${Number(value)} (minor units)`, 'Revenue']} />
                    <Bar dataKey="revenueCents" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('payments.searchPlaceholder') as string}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="border rounded-lg px-2 py-2 text-sm"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="border rounded-lg px-2 py-2 text-sm"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as AdminTxSort)}
                className="border rounded-lg px-2 py-2 text-sm"
              >
                <option value="created_desc">Date ↓</option>
                <option value="created_asc">Date ↑</option>
                <option value="amount_desc">Montant ↓</option>
                <option value="amount_asc">Montant ↑</option>
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
                        value={filterStatus}
                        onChange={(e) => {
                          setFilterStatus(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full border rounded-lg px-2 py-2 text-sm"
                      >
                        <option value="all">{t('common.all')}</option>
                        <option value="paid">paid</option>
                        <option value="pending">pending</option>
                        <option value="initiated">initiated</option>
                        <option value="failed">failed</option>
                        <option value="refunded">refunded</option>
                        <option value="cancelled">cancelled</option>
                        <option value="expired">expired</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Provider</label>
                      <select
                        value={filterProvider}
                        onChange={(e) => {
                          setFilterProvider(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full border rounded-lg px-2 py-2 text-sm"
                      >
                        <option value="all">{t('common.all')}</option>
                        <option value="stripe">Stripe</option>
                        <option value="flouci">Flouci</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Plan (slug)</label>
                      <select
                        value={filterPlan}
                        onChange={(e) => {
                          setFilterPlan(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full border rounded-lg px-2 py-2 text-sm"
                      >
                        <option value="all">{t('common.all')}</option>
                        <option value="standard">standard</option>
                        <option value="premium">premium</option>
                        <option value="free">free</option>
                        <option value="unknown">unknown</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Devise (code)</label>
                      <input
                        value={filterCurrency}
                        onChange={(e) => {
                          setFilterCurrency(e.target.value.toUpperCase());
                          setCurrentPage(1);
                        }}
                        placeholder="EUR, TND…"
                        className="w-full border rounded-lg px-2 py-2 text-sm"
                      />
                    </div>
                    <Button size="sm" className="w-full" onClick={() => setShowFilters(false)}>
                      {t('common.apply')}
                    </Button>
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button variant="outline" onClick={exportCsv}>
                <Download className="w-4 h-4 mr-2" /> {t('payments.export')}
              </Button>
            </div>
          </div>

          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm flex justify-between gap-4">
              <span>Impossible de charger les transactions.</span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 font-medium text-slate-600">Réf.</th>
                    <th className="text-left p-4 font-medium text-slate-600">{t('payments.user')}</th>
                    <th className="text-left p-4 font-medium text-slate-600">Plan</th>
                    <th className="text-left p-4 font-medium text-slate-600">Provider</th>
                    <th className="text-left p-4 font-medium text-slate-600">{t('payments.amount')}</th>
                    <th className="text-left p-4 font-medium text-slate-600">{t('payments.status')}</th>
                    <th className="text-left p-4 font-medium text-slate-600">{t('payments.date')}</th>
                    <th className="text-left p-4 font-medium text-slate-600">{t('payments.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Aucune transaction ne correspond aux filtres.
                      </td>
                    </tr>
                  ) : (
                    rows.map((txn) => {
                      const { cls, label } = statusBadge(txn.status);
                      const displayUser = txn.userName || txn.userEmail || txn.customerEmail || '—';
                      const canRefund = txn.provider === 'stripe' && txn.status === 'paid';
                      return (
                        <tr
                          key={txn.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                        >
                          <td
                            className="p-4 font-mono text-xs text-slate-500 max-w-[140px] truncate"
                            title={txn.providerReference ?? txn.id}
                          >
                            {txn.providerReference ?? txn.id.slice(0, 8)}
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-slate-900">{displayUser}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">
                              {txn.userEmail || txn.customerEmail}
                            </p>
                          </td>
                          <td className="p-4 text-slate-700">
                            <div>{txn.planDisplayLabel}</div>
                            <div className="text-xs text-slate-400">{txn.billingCycle}</div>
                          </td>
                          <td className="p-4 capitalize text-slate-700">{txn.provider}</td>
                          <td className="p-4 font-semibold text-slate-900">
                            {formatFromMinorUnits(txn.amountCents, txn.currency)}
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary" className={cls}>
                              {label}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs text-slate-600 whitespace-nowrap">
                            {txn.createdAt ? new Date(txn.createdAt).toLocaleString() : '—'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTxId(txn.id);
                                  setShowViewModal(true);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg"
                                title="Détails"
                              >
                                <Eye className="w-4 h-4 text-slate-600" />
                              </button>
                              {canRefund && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTxId(txn.id);
                                    setShowRefundModal(true);
                                  }}
                                  className="p-2 hover:bg-amber-100 rounded-lg"
                                  title="Rembourser (Stripe)"
                                >
                                  <RefreshCw className="w-4 h-4 text-amber-600" />
                                </button>
                              )}
                            </div>
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
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)} / {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {showViewModal && modalTransaction && (
            <TransactionDetailsModal
              isOpen={showViewModal}
              onClose={() => {
                setShowViewModal(false);
                setSelectedTxId(null);
              }}
              transaction={modalTransaction}
            />
          )}

          {showRefundModal && selectedRow && (
            <RefundConfirmModal
              isOpen={showRefundModal}
              onClose={() => {
                setShowRefundModal(false);
                setSelectedTxId(null);
              }}
              onConfirm={handleRefund}
              amountCents={selectedRow.amountCents}
              currency={selectedRow.currency}
              userLabel={selectedRow.userName || selectedRow.userEmail || selectedRow.customerEmail || '—'}
              isPending={refundMutation.isPending}
            />
          )}

        </>
      )}
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useAdminStats, useAdminUsers, useChangeUserPassword, useAnalyticsOverview } from '@/hooks/api/useAdmin';
import { getAdminOverview } from '@/services/adminPlatform';
import { useCertifications } from '@/hooks/api/useCertifications';
import { useAdminTransactionStats, useAdminTransactions } from '@/hooks/api/useTransactions';
import { formatFromMinorUnits } from '@/lib/money';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  Eye,
  Edit2,
  Key,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { AdminAuthInsights } from '@/components/admin/AdminAuthInsights';

const ChangePasswordModal = dynamic(() => import('@/components/modals/Admin/users/ChangePasswordModal'), { ssr: false });

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const DonutChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  const safeTotal = total || 1;
  const radius = 60;
  const strokeWidth = 20;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const segments = useMemo(() => {
    let cumulative = 0;
    return data.map((item) => {
      const percentage = (item.value / safeTotal) * 100;
      const segmentLength = (percentage / 100) * circumference;
      const strokeDashoffset = -(cumulative / 100) * circumference;
      // eslint-disable-next-line react-hooks/immutability
      cumulative += percentage;
      const safeOffset = Number.isFinite(strokeDashoffset) ? strokeDashoffset : 0;
      return { segmentLength, safeOffset, cumulative };
    });
  }, [data, safeTotal, circumference]);

  return (
    <div className="flex items-center gap-8">
      <div className="w-40 h-40 relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {data.map((item, index) => {
            const seg = segments[index];

            return (
              <motion.circle
                key={index}
                cx="80"
                cy="80"
                r={normalizedRadius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.segmentLength}
                strokeDashoffset={seg.safeOffset}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: seg.segmentLength }}
                transition={{ duration: 1, delay: index * 0.2 }}
              />
            );
          })}
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <motion.div
            className="text-2xl font-extrabold text-foreground"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {total}
          </motion.div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {data.map((item, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-semibold text-foreground ml-auto">{item.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SparklineChart = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 40;
  const width = 100;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5 }}
        style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
      />
    </svg>
  );
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const changePassword = useChangeUserPassword();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState({ name: '', id: 0 });
  const [balanceTab, setBalanceTab] = useState<'revenue' | 'expenditure'>('revenue');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('week');

  const { data: adminStats } = useAdminStats();
  const { data: adminUsersList } = useAdminUsers();
  const { data: certificationsList } = useCertifications();
  const { data: overview } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: getAdminOverview,
  });
  const { data: analyticsOverview } = useAnalyticsOverview();
  const { data: transactionStats } = useAdminTransactionStats();
  const { data: transactionsPage } = useAdminTransactions({ page: 1, limit: 25 });

  const totalUsers = (adminStats?.totalUsers ?? 0) > 0
    ? (adminStats?.totalUsers ?? 0)
    : (adminUsersList?.total ?? 0);
  const certCount = Array.isArray(certificationsList) ? certificationsList.length : 0;
  const primaryRev = transactionStats?.revenueByCurrency?.[0];
  const monthlyRevenueLabel = primaryRev
    ? formatFromMinorUnits(primaryRev.revenueCents, primaryRev.currency)
    : adminStats?.monthlyRevenue != null
      ? String(adminStats.monthlyRevenue)
      : formatFromMinorUnits(0, 'EUR');
  const revenueNum = primaryRev
    ? primaryRev.revenueCents / (primaryRev.currency.toUpperCase() === 'TND' ? 1000 : 100)
    : parseFloat(String(adminStats?.monthlyRevenue ?? '0')) || 0;

  // Derived analytics data
  const revenueDataValues = analyticsOverview?.revenueData?.map(d => d.value) ?? [];
  const revenueChangePercent = revenueDataValues.length >= 2
    ? ((revenueDataValues[revenueDataValues.length - 1] - revenueDataValues[revenueDataValues.length - 2]) / revenueDataValues[revenueDataValues.length - 2]) * 100
    : 0;
  const revenueSparklineData = revenueDataValues.length >= 3
    ? revenueDataValues.slice(-3)
    : revenueDataValues.length > 0
      ? Array(3).fill(revenueDataValues[revenueDataValues.length - 1])
      : [0, 0, 0];

  const transactionList = transactionsPage?.data ?? [];
  const orderCounts = {
    completed: transactionStats?.paidCount ?? transactionList.filter((t) => t.status === 'paid').length,
    pending: transactionStats?.pendingCount ?? transactionList.filter((t) => t.status === 'pending' || t.status === 'initiated').length,
    cancelled: transactionStats?.failedCount ?? transactionList.filter((t) => t.status === 'failed').length,
    inProgress: transactionStats?.refundedCount ?? transactionList.filter((t) => t.status === 'refunded').length,
  };

  const breakdownTotals: Record<string, number> = { Standard: 0, Premium: 0, Autres: 0 };
  transactionList.forEach((t) => {
    const cat =
      t.planCategory === 'standard'
        ? 'Standard'
        : t.planCategory === 'premium'
          ? 'Premium'
          : 'Autres';
    breakdownTotals[cat] += t.amountCents;
  });
  const breakdownItems = [
    { label: 'Standard', value: breakdownTotals.Standard / 100, trend: 'up' as const },
    { label: 'Premium', value: breakdownTotals.Premium / 100, trend: 'up' as const },
    { label: 'Autres', value: breakdownTotals.Autres / 100, trend: 'down' as const },
  ];

  const stats = [
    {
      title: t('adminDashboard.totalUsers'),
      value: String(totalUsers),
      change: '',
      isPositive: true,
      icon: <Users className="w-6 h-6" />,
      gradient: 'purple',
      sparklineData: [totalUsers, totalUsers, totalUsers],
      color: '#8b5cf6'
    },
    {
      title: t('adminDashboard.activecertifications'),
      value: String(certCount),
      change: '',
      isPositive: true,
      icon: <BookOpen className="w-6 h-6" />,
      gradient: 'blue',
      sparklineData: [certCount, certCount, certCount],
      color: '#3b82f6'
    },
    {
      title: t('adminDashboard.monthlyRevenue'),
      value: monthlyRevenueLabel,
      change: `${revenueChangePercent >= 0 ? '+' : ''}${revenueChangePercent.toFixed(1)}%`,
      isPositive: revenueChangePercent >= 0,
      icon: <CreditCard className="w-6 h-6" />,
      gradient: 'green',
      sparklineData: revenueSparklineData,
      color: '#10b981'
    },
  ];

  // Balance / order data from transactions API
  const balanceTotal = revenueNum;
  const balanceData = {
    total: balanceTab === 'revenue' ? balanceTotal : 0,
    change: revenueChangePercent,
    breakdown: breakdownItems,
  };
  const orderData = [
    { label: String(t('adminDashboard.completed')), value: orderCounts.completed, color: '#10b981' },
    { label: String(t('adminDashboard.pending')), value: orderCounts.pending, color: '#f59e0b' },
    { label: String(t('adminDashboard.cancelled')), value: orderCounts.cancelled, color: '#ef4444' },
    { label: String(t('payments.statusRefunded')), value: orderCounts.inProgress, color: '#8b5cf6' },
  ];

  const recentUsers = ((adminUsersList?.data ?? []) as {
    id: number;
    name?: string;
    fullName?: string;
    email?: string;
    role?: string;
    status?: string;
    avatar?: string;
  }[])
    .slice(0, 5)
    .map((u) => ({
    id: u.id,
    name: u.name || u.fullName || u.email || `#${u.id}`,
    email: u.email || '',
    role: u.role || 'learner',
    status: u.status || 'active',
    avatar: u.avatar || (u.name || u.fullName || u.email || '?').slice(0, 2).toUpperCase(),
  }));

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay > 0) return `${diffDay}${String(t('common.daysAbbr'))}`;
    if (diffHour > 0) return `${diffHour}${String(t('common.hoursAbbr'))}`;
    if (diffMin > 0) return `${diffMin}${String(t('common.minutesAbbr'))}`;
    return String(t('common.justNow'));
  };

  const recentTransactions = transactionList
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentActivity = recentTransactions.map((t) => {
    let icon = CheckCircle2;
    let color = 'green';
    if (t.status === 'pending' || t.status === 'initiated') {
      icon = AlertCircle;
      color = 'blue';
    } else if (t.status === 'failed' || t.status === 'cancelled' || t.status === 'expired') {
      icon = AlertCircle;
      color = 'pink';
    } else if (t.status === 'refunded') {
      icon = CheckCircle2;
      color = 'purple';
    }
    return {
      user: t.userName || t.userEmail || t.customerEmail || `#${t.userId ?? '?'}`,
      action: t.provider,
      item: `${t.planDisplayLabel} · ${t.billingCycle}`,
      time: getRelativeTime(t.createdAt),
      icon,
      color,
    };
  });

  const quickActions = [
    { title: t('adminDashboard.addNewUser'), icon: <Plus size={20} />, color: 'blue', onClick: () => router.push(`/${locale}/dashboard/admin/users/new`) },
    { title: t('adminDashboard.createcertification'), icon: <BookOpen size={20} />, color: 'green', onClick: () => router.push(`/${locale}/dashboard/admin/certifications/new`) },
    { title: t('adminDashboard.generateReport'), icon: <Download size={20} />, color: 'purple', onClick: () => {} },
    { title: t('adminDashboard.viewAnalytics'), icon: <TrendingUp size={20} />, color: 'orange', onClick: () => router.push(`/${locale}/dashboard/admin/analytics`) },
  ];

  const handleChangePassword = (userId: number, userName: string) => {
    setSelectedUserForPassword({ id: userId, name: userName });
    setShowChangePasswordModal(true);
  };

  return (
    <div className="min-h-screen bg-muted/30 text-foreground w-full space-y-6 p-1">
      <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <AdminAuthInsights />
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Universités</p>
            <p className="text-2xl font-bold">{(overview as { universitiesCount?: number }).universitiesCount ?? 0}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Abonnements actifs</p>
            <p className="text-2xl font-bold">{(overview as { activeSubscriptions?: number }).activeSubscriptions ?? 0}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">En attente (users)</p>
            <p className="text-2xl font-bold">{(overview as { pendingUsers?: number }).pendingUsers ?? 0}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Top usage agents ({(overview as { agentUsageMonth?: string }).agentUsageMonth})</p>
            <p className="text-sm text-muted-foreground truncate">
              {Array.isArray((overview as { topAgentUsage?: { email?: string; count?: number }[] }).topAgentUsage) &&
                (overview as { topAgentUsage: { email?: string; count?: number }[] }).topAgentUsage[0] &&
                `${(overview as { topAgentUsage: { email?: string; count?: number }[] }).topAgentUsage[0].email} (${(overview as { topAgentUsage: { email?: string; count?: number }[] }).topAgentUsage[0].count})`}
            </p>
          </div>
        </div>
      )}

      <motion.div
        className="bg-card rounded-2xl p-8 border border-border shadow-md relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-slate-500 text-sm mb-1">{t('adminDashboard.helloAdmin')}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">&#128075;</span>
              {t('adminDashboard.welcomeBack') || 'Bienvenue !'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            
            <div className="flex gap-2 p-1 rounded-xl border border-border bg-muted/50 w-fit">
              {(['today', 'week', 'month'] as const).map((filter) => (
                <button
                  key={filter}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${
                    dateFilter === filter
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-transparent text-muted-foreground'
                  }`}
                  onClick={() => setDateFilter(filter)}
                >
                  {filter === 'today' ? t('adminDashboard.today') : filter === 'week' ? t('adminDashboard.week') : t('adminDashboard.month')}
                </button>
              ))}
            </div>
            <button className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200" aria-label="Calendar">
              <Calendar className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
            variants={itemVariants}
            whileHover="hover"
            initial="rest"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20`, color: stat.color }}>
                {stat.icon}
              </div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                stat.isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
              }`}>
                {stat.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <motion.h3
                  className="text-3xl font-extrabold tracking-tight text-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {stat.value}
                </motion.h3>
                <p className="text-slate-500 text-sm mt-1">{stat.title}</p>
              </div>
              <SparklineChart data={stat.sparklineData} color={stat.color} />
            </div>
          </motion.div>
        ))}
      </motion.div>

    
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
        <motion.div
          className="lg:col-span-2 bg-card rounded-2xl p-8 border border-border shadow-md relative overflow-hidden"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">{t('adminDashboard.balance')}</h2>
            <div className="flex gap-2 p-1 rounded-xl border border-border bg-muted/50 w-fit">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${
                  balanceTab === 'revenue' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground'
                }`}
                onClick={() => setBalanceTab('revenue')}
              >
                {t('adminDashboard.revenue')}
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${
                  balanceTab === 'expenditure' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground'
                }`}
                onClick={() => setBalanceTab('expenditure')}
              >
                {t('adminDashboard.expenditure')}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-6">
            <div>
              <motion.div
                className="text-4xl font-extrabold text-foreground flex items-baseline gap-4"
                key={balanceTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ${balanceData.total.toLocaleString()}
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  balanceData.change >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
                }`}>
                  {balanceData.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(balanceData.change)}%
                </span>
              </motion.div>
            </div>

            <div className="h-[150px] flex-1 max-w-md relative">
              <svg width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient id="gradient-purple-area" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M0,80 C50,70 100,40 150,50 C200,60 250,20 300,30"
                  className="[stroke:url(#gradient-purple)] [stroke-width:3] fill-none [stroke-linecap:round] [stroke-linejoin:round]"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2 }}
                />
                <path
                  d="M0,80 C50,70 100,40 150,50 C200,60 250,20 300,30 L300,100 L0,100 Z"
                  className="[fill:url(#gradient-purple-area)] opacity-20"
                />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
            {balanceData.breakdown.map((item, index) => (
              <motion.div
                key={index}
                className="flex flex-col gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <div className="text-xl font-bold text-foreground flex items-center gap-2">
                  <span className={item.trend === 'up' ? 'text-emerald-600' : 'text-destructive'}>
                    {item.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </span>
                  ${item.value.toLocaleString()}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground">{t('adminDashboard.orders')}</h2>
            <button className="text-primary text-sm font-medium flex items-center gap-1 transition-colors hover:text-primary/80">
              {t('adminDashboard.detail')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <DonutChart data={orderData} />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground">{t('adminDashboard.recentActivity')}</h2>
            <button className="text-primary text-sm font-medium flex items-center gap-1 transition-colors hover:text-primary/80">
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t('common.noData')}</p>
            ) : (
            recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <motion.div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl transition-all cursor-pointer border border-transparent hover:bg-muted hover:border-border hover:translate-x-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    activity.color === 'green' ? 'bg-emerald-500/10 text-emerald-600' :
                    activity.color === 'blue' ? 'bg-blue-500/10 text-blue-600' :
                    activity.color === 'purple' ? 'bg-purple-500/10 text-purple-600' :
                    'bg-pink-500/10 text-pink-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{activity.user}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.action} <span className="text-foreground font-medium">{activity.item}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                </motion.div>
              );
            })
            )}
          </div>
        </motion.div>

        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-xl font-bold text-foreground mb-4">{t('adminDashboard.quickActions')}</h2>
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                className="flex items-center gap-3 w-full p-4 bg-muted/50 border border-border rounded-xl text-foreground font-medium transition-all cursor-pointer hover:bg-muted hover:border-primary/30 hover:translate-x-1 hover:shadow-md"
                onClick={action.onClick}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ x: 4 }}
                aria-label={String(action.title)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  action.color === 'blue' ? 'bg-primary/10 text-primary' :
                  action.color === 'green' ? 'bg-emerald-500/10 text-emerald-600' :
                  action.color === 'purple' ? 'bg-purple-500/10 text-purple-600' :
                  'bg-amber-500/10 text-amber-600'
                }`}>
                  {action.icon}
                </div>
                <span className="text-sm font-medium">{action.title}</span>
                <ArrowRight className="w-4 h-4 ml-auto text-slate-500" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        className="bg-card rounded-2xl p-6 border border-border shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">{t('adminDashboard.recentUsers')}</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
            onClick={() => router.push(`/${locale}/dashboard/admin/users`)}
          >
            {t('common.viewAll')} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/50">{t('common.name')}</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/50">{t('common.role')}</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/50">{t('common.status')}</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/50">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                >
                  <td className="p-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm bg-primary text-primary-foreground">{user.avatar}</div>
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 border-b border-border/50">
                    <span className="text-muted-foreground">{user.role}</span>
                  </td>
                  <td className="p-4 border-b border-border/50">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {user.status}
                    </span>
                  </td>
                  <td className="p-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors focus-ring"
                        aria-label={`View ${user.name}`}
                        onClick={() => router.push(`/${locale}/dashboard/admin/users?view=${user.id}`)}
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors focus-ring"
                        aria-label={`Edit ${user.name}`}
                        onClick={() => router.push(`/${locale}/dashboard/admin/users?edit=${user.id}`)}
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        className="p-2 hover:bg-purple-100 rounded-lg transition-colors focus-ring"
                        aria-label={`Change password for ${user.name}`}
                        onClick={() => handleChangePassword(user.id, user.name)}
                      >
                        <Key className="w-4 h-4 text-purple-600" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div
        className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 mb-1">{t('adminDashboard.systemNotification')}</h3>
          <p className="text-slate-600 text-sm">{t('adminDashboard.maintenanceMessage')}</p>
        </div>
      </motion.div>

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSave={async (newPassword) => {
          if (!selectedUserForPassword.id) return;
          await changePassword.mutateAsync({ id: selectedUserForPassword.id, password: newPassword });
        }}
        userName={selectedUserForPassword.name}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  TrendingUp, TrendingDown, Users, BookOpen, Award,
  DollarSign, Download, ArrowUpRight, ArrowDownRight,
  Target, Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAnalyticsOverview } from '@/hooks/api/useAdmin';
import { getAdminUiSettings } from '@/lib/adminUiSettings';
import { formatMoney } from '@/lib/money';

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const currency = getAdminUiSettings().paymentCurrency || 'EUR';
  const [dateRange, setDateRange] = useState('30d');
  const { data: overview, isLoading } = useAnalyticsOverview();

  const activeUsers = overview?.activeUsers ?? 0;
  const coursesCompleted = overview?.coursesCompleted ?? 0;
  const revenue = overview?.revenue ?? '0';
  const completionRate = overview?.completionRate ?? 0;

  const stats = [
    { label: t('analytics.activeUsers'), value: String(activeUsers.toLocaleString()), change: '', trend: 'up' as const, icon: Users, color: 'bg-primary/10 text-primary' },
    { label: t('analytics.coursesCompleted'), value: String(coursesCompleted.toLocaleString()), change: '', trend: 'up' as const, icon: BookOpen, color: 'bg-green-50 text-green-700' },
    { label: t('analytics.revenue'), value: formatMoney(Number(revenue) || 0, { currency }), change: '', trend: 'up' as const, icon: DollarSign, color: 'bg-purple-50 text-purple-700' },
    { label: t('analytics.completionRate'), value: `${completionRate}%`, change: '', trend: 'down' as const, icon: Target, color: 'bg-amber-50 text-amber-700' },
  ];

  const topCourses = overview?.topCourses?.length ? overview.topCourses : [];

  const userMetrics = [
    { label: t('analytics.newSignups'), value: overview?.newSignups ?? 0, period: t('analytics.thisMonth') },
    { label: t('analytics.dailyActiveUsers'), value: activeUsers, period: t('analytics.average') },
    { label: t('analytics.avgSessionDuration'), value: '—', period: t('analytics.average') },
    { label: t('analytics.retentionRate'), value: `${completionRate}%`, period: t('analytics.30days') },
  ];

  const revenueData = overview?.revenueData?.length ? overview.revenueData : [];

  const maxRevenue = revenueData.length > 0 ? Math.max(1, ...revenueData.map(d => d.value)) : 1;

  const categoryStats: Array<{ name: string; courses: number; students: number; revenue: string; growth: string }> = [];

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      period: dateRange,
      stats,
      topCourses,
      categoryStats
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${dateRange}.json`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('analytics.overview')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('analytics.title') || 'Vue d’ensemble'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="7d">7 {t('analytics.days')}</option>
            <option value="30d">30 {t('analytics.days')}</option>
            <option value="90d">90 {t('analytics.days')}</option>
          </select>
          <Button variant="outline" size="sm" onClick={exportReport} className="gap-2">
            <Download className="w-4 h-4" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              {stat.change ? (
                <div className={`flex items-center gap-1 text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {stat.change}
                </div>
              ) : null}
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">{t('analytics.revenueEvolution')}</h2>
            <Badge variant="secondary" className="bg-green-100 text-green-700">{t('analytics.vsPreviousYear', { percentage: '0%' })}</Badge>
          </div>
          <div className="h-64 flex items-end gap-2">
            {revenueData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-500">
                {t('common.noData')}
              </div>
            ) : revenueData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-primary to-primary/90 rounded-t-lg transition-all hover:from-primary/90 hover:to-primary cursor-pointer relative group"
                  style={{ height: `${(data.value / maxRevenue) * 100}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatMoney(data.value, { currency })}
                  </div>
                </div>
                <span className="text-xs text-slate-500">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('analytics.userMetrics')}</h2>
          <div className="space-y-4">
            {userMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">{metric.label}</p>
                  <p className="text-xs text-slate-400">{metric.period}</p>
                </div>
                <p className="text-xl font-bold text-slate-900">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('analytics.topCourses')}</h2>
          <div className="space-y-4">
            {topCourses.length === 0 ? (
              <div className="text-sm text-slate-500">{t('common.noData')}</div>
            ) : topCourses.map((course, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{course.name}</p>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{course.students} {t('analytics.students')}</span>
                    <span>{course.completion}% {t('analytics.completion')}</span>
                  </div>
                </div>
                <p className="font-semibold text-green-600">{course.revenue}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t('analytics.placeholderData')}
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('analytics.categoryPerformance')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-sm font-medium text-slate-600">{t('analytics.category')}</th>
                  <th className="text-right py-2 text-sm font-medium text-slate-600">{t('analytics.courses')}</th>
                  <th className="text-right py-2 text-sm font-medium text-slate-600">{t('analytics.students')}</th>
                  <th className="text-right py-2 text-sm font-medium text-slate-600">{t('analytics.revenue')}</th>
                  <th className="text-right py-2 text-sm font-medium text-slate-600">{t('analytics.growth')}</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.length === 0 ? (
                  <tr>
                    <td className="py-4 text-sm text-slate-500" colSpan={5}>{t('common.noData')}</td>
                  </tr>
                ) : categoryStats.map((cat, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{cat.name}</td>
                    <td className="py-3 text-right text-slate-600">{cat.courses}</td>
                    <td className="py-3 text-right text-slate-600">{cat.students.toLocaleString()}</td>
                    <td className="py-3 text-right font-medium text-slate-900">{cat.revenue}</td>
                    <td className="py-3 text-right">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">{cat.growth}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t('analytics.placeholderActivity')}
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('analytics.recentActivity')}</h2>
        <div className="text-sm text-slate-500">{t('common.noData')}</div>
      </div>
    </div>
  );
}

'use client';

import {
  Briefcase, Users, Award, CalendarCheck, UserPlus,
  ArrowUpRight, ArrowDownRight, Building2, Clock, AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import { Badge, Button } from '@/components/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { useEmployerDashboard } from '@/hooks/api/useEmployer';

export default function EmployerDashboard() {
  const { t } = useTranslation();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const { data: dashboard, isLoading, isError, refetch, isFetching } = useEmployerDashboard();

  const company = dashboard?.company ?? null;
  const apiStats = dashboard?.stats ?? { 
    activeJobs: '0', 
    pendingJobs: '0', 
    totalJobs: '0',
    totalEmployees: '0',
    totalCertifiedLearners: '0',
  };
  const stats = [
    {
      title: t('employerDashboard.activeOffers'),
      value: apiStats.activeJobs ?? '0',
      change: '',
      trend: 'up' as const,
      icon: <Briefcase className="w-6 h-6" />,
      color: '#8b5cf6',
    },
    {
      title: t('employerDashboard.pendingJobs') || 'Offres en attente',
      value: apiStats.pendingJobs ?? '0',
      change: '',
      trend: 'up' as const,
      icon: <Clock className="w-6 h-6" />,
      color: '#f59e0b',
    },
    {
      title: t('employerDashboard.registeredEmployees'),
      value: apiStats.totalEmployees ?? '0',
      change: '',
      trend: 'up' as const,
      icon: <UserPlus className="w-6 h-6" />,
      color: '#10b981',
    },
    {
      title: t('employerDashboard.certifiedLearners') || 'Apprenants certifiés',
      value: apiStats.totalCertifiedLearners ?? '0',
      change: '',
      trend: 'up' as const,
      icon: <Award className="w-6 h-6" />,
      color: '#3b82f6',
    },
  ];

  const recentCandidatures = dashboard?.recentCandidatures ?? [];
  const upcomingInterviews = dashboard?.upcomingInterviews ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/10 text-green-700';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700';
      case 'rejected': return 'bg-red-500/10 text-red-700';
      case 'archived': return 'bg-slate-500/10 text-slate-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getApplicationStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      published: String(t('employerDashboard.statusPublished')),
      pending: String(t('employerDashboard.statusPending')),
      rejected: String(t('employerDashboard.statusRejected')),
      archived: String(t('employerDashboard.statusArchived')),
    };
    return map[status] ?? status;
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center gap-4">
        {company?.logo ? (
          <Image src={company.logo} alt="Logo" width={56} height={56} className="w-14 h-14 rounded-xl object-contain border border-slate-200 bg-white p-1" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-violet-600" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-black text-slate-900">{company?.name || t('employerDashboard.title')}</h1>
          <p className="text-slate-600 mt-1">{t('employerDashboard.subtitle')}</p>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {String(t('employerDashboard.loadError'))}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {String(t('common.retry'))}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20`, color: stat.color }}>
                {stat.icon}
              </div>
              <Badge variant="secondary" className={stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}>
                <span className="flex items-center gap-1">
                  {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </span>
              </Badge>
            </div>
            <div>
              <h3 className="text-3xl font-extrabold tracking-tight text-foreground mb-1">{stat.value}</h3>
              <p className="text-muted-foreground text-sm">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">{t('employerDashboard.recentApplications')}</h2>
              <Link href={`/${locale}/dashboard/employer/candidats`}>
                <Button variant="ghost" size="sm">{t('employerDashboard.viewAll')}</Button>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 text-sm font-medium text-slate-600">{t('employerDashboard.candidate')}</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">{t('employerDashboard.position')}</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">{t('employerDashboard.date')}</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">{t('employerDashboard.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-destructive text-sm">
                        {String(t('employerDashboard.loadError'))}
                      </td>
                    </tr>
                  ) : recentCandidatures.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">
                        {String(t('employerDashboard.noRecentApplications'))}
                      </td>
                    </tr>
                  ) : (
                    recentCandidatures.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-violet-500/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-violet-700">
                              {(c.name || ' ').split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900">{c.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-700">{c.poste}</td>
                      <td className="p-3 text-sm text-slate-500">{c.date}</td>
                      <td className="p-3">
                        <Badge className={getStatusColor(c.status)}>{getApplicationStatusLabel(c.status)}</Badge>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">{t('employerDashboard.upcomingInterviews')}</h2>
              <Link href={`/${locale}/dashboard/employer/entretiens`}>
                <Button variant="ghost" size="sm">{t('employerDashboard.viewAll')}</Button>
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingInterviews.map((interview) => (
                <div key={interview.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{interview.name}</p>
                    <p className="text-xs text-slate-500">{interview.poste}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{interview.heure}</p>
                    <p className="text-xs text-slate-500">{interview.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('employerDashboard.quickActions')}</h2>
            <div className="space-y-3">
              <Link href={`/${locale}/dashboard/employer/offres`} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600"><Briefcase size={20} /></div>
                <span className="font-medium text-slate-900 text-sm">{t('employerDashboard.publishOffer')}</span>
              </Link>
              <Link href={`/${locale}/dashboard/employer/certifies`} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Award size={20} /></div>
                <span className="font-medium text-slate-900 text-sm">{t('employerDashboard.viewCertified')}</span>
              </Link>
              <Link href={`/${locale}/dashboard/employer/employes`} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><UserPlus size={20} /></div>
                <span className="font-medium text-slate-900 text-sm">{t('employerDashboard.addEmployee')}</span>
              </Link>
              <Link href={`/${locale}/dashboard/employer/candidats`} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600"><Users size={20} /></div>
                <span className="font-medium text-slate-900 text-sm">{t('employerDashboard.manageCandidates')}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

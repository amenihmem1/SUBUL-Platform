"use client";

import { useAdminStats } from '@/hooks/api/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/contexts/LanguageContext';

export default function DashboardStats() {
  const { t } = useTranslation();
  const { data: stats, isLoading, isError } = useAdminStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border p-6 rounded-lg shadow">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-6 rounded-lg shadow col-span-full">
          <p className="text-sm text-muted-foreground">Failed to load dashboard stats.</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: t('adminDashboard.totalUsers'), value: stats.totalUsers, color: 'bg-primary', icon: '👥' },
    { title: t('adminDashboard.activeUsers'), value: stats.activeUsers, color: 'bg-green-500', icon: '✅' },
    { title: t('adminDashboard.pendingApproval'), value: stats.pendingUsers, color: 'bg-yellow-500', icon: '⏳' },
    { title: t('adminDashboard.adminUsers'), value: stats.adminUsers, color: 'bg-purple-500', icon: '👑' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-card border border-border p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${stat.color} text-white text-2xl mr-4`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

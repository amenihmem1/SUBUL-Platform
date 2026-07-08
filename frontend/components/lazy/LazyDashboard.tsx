"use client";

import { lazy, Suspense } from 'react';
import { PageLoader } from '@/components/ui/loading';

const AdminDashboard = lazy(() => import('../../app/[locale]/dashboard/admin/page'));
const LearnerDashboard = lazy(() => import('../../app/[locale]/dashboard/learner/page'));
const EmployerDashboard = lazy(() => import('../../app/[locale]/dashboard/employer/page'));
const DashboardLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <PageLoader label="Chargement du dashboard…" />
  </div>
);

interface LazyDashboardProps {
  userRole: 'admin' | 'learner' | 'employer';
  locale: string;
}

export default function LazyDashboard({ userRole, locale }: LazyDashboardProps) {
  const renderDashboard = () => {
    switch (userRole) {
      case 'admin':
        return (
          <Suspense fallback={<DashboardLoader />}>
            <AdminDashboard />
          </Suspense>
        );
      case 'learner':
        return (
          <Suspense fallback={<DashboardLoader />}>
            <LearnerDashboard />
          </Suspense>
        );
      case 'employer':
        return (
          <Suspense fallback={<DashboardLoader />}>
            <EmployerDashboard />
          </Suspense>
        );
      default:
        return <DashboardLoader />;
    }
  };

  return <>{renderDashboard()}</>;
}

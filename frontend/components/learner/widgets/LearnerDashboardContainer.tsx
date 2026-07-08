'use client';

import { ActiveCoursesSection } from './ActiveCoursesSection';
import { GoalsOverviewSection } from './GoalsOverviewSection';
import { CertificatesSection } from './CertificatesSection';
import { LearnerDashboardHeader } from './LearnerDashboardHeader';
import { QuickActionsSection } from './QuickActionsSection';
import { QuizProgressSection } from './QuizProgressSection';
import { CareerOutcomesWidget } from './CareerOutcomesWidget';
import { FreePlanUpgradeSection } from './FreePlanUpgradeSection';
import { useLatestAssessment } from '@/hooks/api/useQuizResults';
import { useLearnerDashboard } from '@/hooks/api/useLearnerDashboard';
import { useQuery } from '@tanstack/react-query';
import { getSubscriptionStatus } from '@/services/subscriptions';
import QuizFlowManager from '@/components/learner/QuizFlowManager';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/contexts/LanguageContext';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

/** Full-screen assessment gate */
function EntryAssessmentGate({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 max-w-md text-center"
      >
        <div className="mb-5 flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg shadow-violet-500/30"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #f43f5e 100%)' }}
          >
            <span className="text-2xl">🚀</span>
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {t('learnerDashboard.entryAssessmentTitle')}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('learnerDashboard.entryAssessmentSubtitle')}
        </p>
      </motion.div>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-2xl"
      >
        <QuizFlowManager open={true} onClose={() => {}} onComplete={onComplete} />
      </motion.div>
    </motion.div>
  );
}

const SECTION = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 18 },
  },
};

const CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

export function LearnerDashboardContainer() {
  const { data: latestAssessment, isLoading: assessmentLoading, refetch } = useLatestAssessment();
  const { data: dashboardData } = useLearnerDashboard();
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    staleTime: 30_000,
  });
  const isPremium = subscriptionStatus?.effectivePlanSlug === 'premium';
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!assessmentLoading) {
      const t = setTimeout(() => setReady(true), 80);
      return () => clearTimeout(t);
    }
  }, [assessmentLoading]);

  if (assessmentLoading) {
    return (
      <div className="space-y-5 p-6">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl xl:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    );
  }

  if (!latestAssessment) {
    return <EntryAssessmentGate onComplete={() => refetch()} />;
  }

  const stats = dashboardData?.stats;

  return (
    <motion.div
      variants={CONTAINER}
      initial="hidden"
      animate={ready ? 'visible' : 'hidden'}
      className="space-y-5"
    >
      {/* 1. Hero Header */}
      <motion.div variants={SECTION}>
        <LearnerDashboardHeader />
      </motion.div>

      {/* 2. Active Courses — full width, featured */}
      <motion.div variants={SECTION}>
        <ActiveCoursesSection />
      </motion.div>

      {/* 3. Goals + Quiz Progress — 2 panes */}
      <motion.div variants={SECTION} className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <QuizProgressSection />
        </div>
        <GoalsOverviewSection />
      </motion.div>

      {/* 4. Recommended upsell — hidden for Premium (lean dashboard) */}
      {ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS && !isPremium && (
        <motion.div variants={SECTION}>
          <FreePlanUpgradeSection />
        </motion.div>
      )}

      {/* 5. Quick Actions + Certificates */}
      <motion.div variants={SECTION} className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <QuickActionsSection />
        </div>
        <CertificatesSection />
      </motion.div>

      {/* 6. Career outcomes */}
      <motion.div variants={SECTION}>
        <CareerOutcomesWidget stats={stats} />
      </motion.div>

    </motion.div>
  );
}

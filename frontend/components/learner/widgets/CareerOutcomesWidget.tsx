'use client';

import { Briefcase, FileCheck2, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import type { LearnerDashboardStats } from '@/services/learnerDashboard';

export function CareerOutcomesWidget({ stats }: { stats?: LearnerDashboardStats }) {
  const coursesCompleted = stats?.coursesCompleted ?? 0;
  const certificatesCount = stats?.certificatesCount ?? 0;

  const jobsMatchedEstimate = Math.max(3, coursesCompleted * 2 + certificatesCount);
  const atsReadiness = Math.min(95, 35 + coursesCompleted * 8 + certificatesCount * 6);
  const certificationProgress = Math.min(100, certificatesCount * 25 + coursesCompleted * 5);

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.35)]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Career outcomes</p>
        <h3 className="mt-1 text-base font-bold text-slate-900">Track your career impact and opportunities</h3>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <OutcomeCard
          icon={<Briefcase className="h-4 w-4 text-violet-600" />}
          label="Jobs potentiels"
          value={`${jobsMatchedEstimate}+`}
          hint="Basé sur votre parcours actuel"
        />
        <OutcomeCard
          icon={<FileCheck2 className="h-4 w-4 text-blue-600" />}
          label="Score ATS estimé"
          value={`${atsReadiness}%`}
          hint="Optimisation CV continue"
        />
        <OutcomeCard
          icon={<Trophy className="h-4 w-4 text-amber-600" />}
          label="Progression certification"
          value={`${certificationProgress}%`}
          hint="Accélérez avec Premium"
        />
      </div>
    </section>
  );
}

function OutcomeCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200 shadow-sm">{icon}</span>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

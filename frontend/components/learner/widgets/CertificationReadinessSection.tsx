'use client';

import { Settings } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useLearnerDashboard } from '@/hooks/api/useLearnerDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export function CertificationReadinessSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useLearnerDashboard();

  const activeCourses = data?.activeCourses ?? [];
  const stats = data?.stats;

  const avgProgress =
    activeCourses.length > 0
      ? Math.round(
          activeCourses.reduce((acc, c) => acc + (c.progress ?? 0), 0) / activeCourses.length
        )
      : 0;

  const primaryCourse = [...activeCourses].sort(
    (a, b) => (b.progress ?? 0) - (a.progress ?? 0)
  )[0];

  const readinessConfig =
    avgProgress >= 80
      ? { stroke: '#7c3aed', text: 'text-violet-600', label: 'Ready', labelBg: 'bg-violet-50 text-violet-700' }
      : avgProgress >= 50
      ? { stroke: '#f43f5e', text: 'text-rose-600', label: 'In progress', labelBg: 'bg-rose-50 text-rose-700' }
      : { stroke: '#7c3aed', text: 'text-violet-600', label: 'Getting started', labelBg: 'bg-violet-50 text-violet-700' };

  const size = 96;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - avgProgress / 100);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex gap-4 items-center">
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-8 rounded-lg" />
              <Skeleton className="h-8 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('learnerDashboard.certificationReadiness')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{avgProgress}% avg. completion</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${readinessConfig.labelBg}`}>
          {readinessConfig.label}
        </span>
      </div>

      <div className="p-5">
        {activeCourses.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
              <Settings className="h-6 w-6 text-violet-400" />
            </div>
            <p className="mb-1 text-sm font-semibold text-foreground">No courses in progress</p>
            <p className="max-w-[200px] text-xs text-muted-foreground/70">
              {t('learnerDashboard.noCoursesCertReadiness')}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            {/* Ring */}
            <div className="relative shrink-0">
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle
                  cx={size / 2} cy={size / 2} r={r}
                  fill="none" stroke="hsl(220 13% 93%)" strokeWidth={stroke}
                />
                <circle
                  cx={size / 2} cy={size / 2} r={r}
                  fill="none" stroke={readinessConfig.stroke} strokeWidth={stroke}
                  strokeDasharray={circ} strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold ${readinessConfig.text}`}>{avgProgress}%</span>
                <span className="text-[9px] font-medium text-muted-foreground/60">Ready</span>
              </div>
            </div>

            {/* Course list */}
            <div className="min-w-0 flex-1 space-y-2">
              {primaryCourse && (
                <p className="mb-1.5 truncate text-xs font-semibold text-foreground">
                  Top: {primaryCourse.title}
                </p>
              )}
              {activeCourses.slice(0, 3).map((course) => (
                <div key={course.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="max-w-[120px] truncate text-muted-foreground">{course.title}</span>
                    <span className="ml-2 shrink-0 font-bold text-foreground">{course.progress}%</span>
                  </div>
                  <div className="progress-bar-track !h-1.5">
                    <div
                      className="progress-bar-fill !h-1.5"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              ))}
              {stats && (
                <div className="flex gap-3 pt-1 text-[10px] text-muted-foreground/60">
                  <span>{stats.inProgress} in progress</span>
                  <span>·</span>
                  <span>{stats.coursesCompleted} completed</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

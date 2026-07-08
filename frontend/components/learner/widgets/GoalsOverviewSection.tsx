'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Target, Flag, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { useGoals, useTodayDailyGoals, useCurrentWeeklyGoals } from '@/hooks/api';
import type { Goal, DailyGoal, WeeklyGoal } from '@/services/goals';
import { Skeleton } from '@/components/ui/skeleton';

function RingChart({
  pct,
  size = 72,
  stroke = 8,
  color,
  trackColor = 'hsl(220 13% 93%)',
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color: string;
  trackColor?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  );
}

const PRIORITY_STYLES = {
  high:   { dot: 'bg-rose-500',   text: 'text-rose-600',   bg: 'bg-rose-50',   label: 'High' },
  medium: { dot: 'bg-violet-500', text: 'text-violet-600', bg: 'bg-violet-50', label: 'Med' },
  low:    { dot: 'bg-violet-300',  text: 'text-violet-400',  bg: 'bg-violet-50/60',  label: 'Low' },
};

export function GoalsOverviewSection() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: dailyGoalsData, isLoading: dailyLoading } = useTodayDailyGoals();
  const { data: weeklyGoalsData, isLoading: weeklyLoading } = useCurrentWeeklyGoals();
  const isLoading = goalsLoading || dailyLoading || weeklyLoading;

  const allGoals: Goal[] = goalsData ?? [];
  const allDaily: DailyGoal[] = dailyGoalsData ?? [];
  const allWeekly: WeeklyGoal[] = weeklyGoalsData ?? [];

  const activeGoals = allGoals.filter((g) => g.status !== 'completed');
  const dailyCompleted = allDaily.filter((g) => g.completed).length;
  const dailyTotal = allDaily.length;
  const dailyPct = dailyTotal > 0 ? Math.round((dailyCompleted / dailyTotal) * 100) : 0;

  const weeklyPct =
    allWeekly.length > 0
      ? Math.round(allWeekly.reduce((s, g) => s + (g.progress ?? 0), 0) / allWeekly.length)
      : 0;

  const highGoals = activeGoals.filter((g) => g.priority === 'high').length;
  const medGoals = activeGoals.filter((g) => g.priority === 'medium').length;
  const lowGoals = activeGoals.filter((g) => g.priority === 'low').length;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-5">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const isEmpty = activeGoals.length === 0 && dailyTotal === 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('learnerDashboard.goalsOverview') ?? 'Goals Overview'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 h-8"
          asChild
        >
          <Link href={`/${locale}/dashboard/learner/goals`}>
            {t('learnerDashboard.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="p-5">
        {isEmpty ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
              <Target className="h-7 w-7 text-violet-500" />
            </div>
            <p className="mb-1 font-semibold text-foreground">No goals set yet</p>
            <p className="mb-5 max-w-[220px] text-sm text-muted-foreground">
              Set daily and weekly goals to build momentum and stay on track.
            </p>
            <Button size="sm" className="gap-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700" asChild>
              <Link href={`/${locale}/dashboard/learner/goals`}>
                <Plus className="h-4 w-4" />
                Create your first goal
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Ring charts */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {/* Daily */}
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-violet-50 p-3">
                <div className="relative">
                  <RingChart pct={dailyPct} color="#7c3aed" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-violet-700">
                    {dailyPct}%
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-violet-700 text-center leading-tight">
                  {t('learnerDashboard.dailyGoals') ?? 'Daily'}
                </p>
                <p className="text-[10px] text-violet-500/70">{dailyCompleted}/{dailyTotal}</p>
              </div>

              {/* Weekly */}
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-rose-50 p-3">
                <div className="relative">
                  <RingChart pct={weeklyPct} color="#f43f5e" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-rose-600">
                    {weeklyPct}%
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-rose-600 text-center leading-tight">
                  {t('learnerDashboard.weeklyProgress') ?? 'Weekly'}
                </p>
                <p className="text-[10px] text-rose-400/70">
                  {allWeekly.filter((g) => g.progress >= 100).length}/{allWeekly.length}
                </p>
              </div>

              {/* Priority breakdown */}
              <div className="flex flex-col justify-center gap-2 rounded-xl bg-violet-50/40 p-3">
                <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-0.5">Priority</p>
                {([
                  { count: highGoals, ...PRIORITY_STYLES.high },
                  { count: medGoals, ...PRIORITY_STYLES.medium },
                  { count: lowGoals, ...PRIORITY_STYLES.low },
                ] as Array<{ count: number; dot: string; text: string; label: string }>).map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${row.dot}`} />
                      <span className="text-[11px] text-muted-foreground">{row.label}</span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active goal list */}
            {activeGoals.length > 0 && (
              <div className="space-y-1.5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">
                  Active Goals
                </p>
                {activeGoals.slice(0, 3).map((goal, i) => {
                  const ps = PRIORITY_STYLES[goal.priority as keyof typeof PRIORITY_STYLES] ?? PRIORITY_STYLES.low;
                  return (
                    <div
                      key={goal.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors group cursor-default"
                    >
                      <div className={`h-2 w-2 shrink-0 rounded-full ${ps.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ps.bg} ${ps.text}`}>
                        {ps.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

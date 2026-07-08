'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Target, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useGoals, useTodayDailyGoals, useCurrentWeeklyGoals } from '@/hooks/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 300);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${width}%`, background: color }}
      />
    </div>
  );
}

export function GoalsMiniWidget() {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: dailyData, isLoading: dailyLoading } = useTodayDailyGoals();
  const { data: weeklyData, isLoading: weeklyLoading } = useCurrentWeeklyGoals();
  const isLoading = goalsLoading || dailyLoading || weeklyLoading;

  const activeGoals = (goalsData ?? []).filter(g => g.status !== 'completed');
  const dailyCompleted = (dailyData ?? []).filter(g => g.completed).length;
  const dailyTotal = (dailyData ?? []).length;
  const dailyPct = dailyTotal > 0 ? Math.round((dailyCompleted / dailyTotal) * 100) : 0;

  const weeklyItems = weeklyData ?? [];
  const weeklyPct = weeklyItems.length > 0
    ? Math.round(weeklyItems.reduce((s, g) => s + (g.progress ?? 0), 0) / weeklyItems.length)
    : 0;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
    );
  }

  const isEmpty = activeGoals.length === 0 && dailyTotal === 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Goals</h3>
        </div>
        <Link
          href={`/${locale}/dashboard/learner/goals`}
          className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5"
        >
          View <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="p-4 space-y-3">
        {isEmpty ? (
          <div className="flex flex-col items-center text-center py-2 gap-2">
            <p className="text-[11px] text-muted-foreground">No goals set yet</p>
            <Link
              href={`/${locale}/dashboard/learner/goals`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Create a goal
            </Link>
          </div>
        ) : (
          <>
            {/* Daily */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-muted-foreground">Daily</span>
                <span className="font-bold text-foreground tabular-nums">
                  {dailyCompleted}/{dailyTotal}
                </span>
              </div>
              <AnimatedBar pct={dailyPct} color="hsl(var(--primary))" />
            </div>

            {/* Weekly */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-muted-foreground">Weekly</span>
                <span className="font-bold text-foreground tabular-nums">{weeklyPct}%</span>
              </div>
              <AnimatedBar pct={weeklyPct} color="hsl(var(--accent))" />
            </div>

            {/* Active count */}
            {activeGoals.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                <CheckCircle2 className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{activeGoals.length}</span> active goal{activeGoals.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

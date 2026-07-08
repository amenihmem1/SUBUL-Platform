'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Calendar, Plus, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { useLearnerDashboard } from '@/hooks/api/useLearnerDashboard';
import { Skeleton } from '@/components/ui/skeleton';

const PRIORITY_CONFIG = {
  high: {
    bg: 'bg-rose-50',
    icon: 'text-rose-500',
    badge: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
    bar: 'bg-rose-400',
    label: 'Urgent',
  },
  medium: {
    bg: 'bg-violet-50',
    icon: 'text-violet-500',
    badge: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-500',
    bar: 'bg-violet-400',
    label: 'Normal',
  },
  low: {
    bg: 'bg-violet-50/60',
    icon: 'text-violet-300',
    badge: 'bg-violet-50 text-violet-500',
    dot: 'bg-violet-300',
    bar: 'bg-violet-200',
    label: 'Low',
  },
} as const;

export function UpcomingDeadlinesSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useLearnerDashboard();
  const upcomingDeadlines = data?.upcomingDeadlines ?? [];
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-28" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-foreground">
            {t('learnerDashboard.upcomingDeadlines')}
          </h2>
          {upcomingDeadlines.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              {upcomingDeadlines.length} due
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
          asChild
        >
          <Link href={`/${locale}/dashboard/learner/goals`}>
            <CalendarDays className="h-3.5 w-3.5" />
            {t('learnerDashboard.viewCalendar')}
          </Link>
        </Button>
      </div>

      <div className="p-4">
        {upcomingDeadlines.length === 0 ? (
          <div className="py-6">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
                <CheckCircle className="h-7 w-7 text-violet-500" />
              </div>
              <p className="mb-1 font-semibold text-foreground">All clear!</p>
              <p className="max-w-[200px] text-sm text-muted-foreground">
                No upcoming deadlines. A great time to get ahead.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Suggested actions
              </p>
              {[
                { icon: Plus, label: 'Set a new learning goal', href: `/${locale}/dashboard/learner/goals` },
                { icon: Calendar, label: 'Schedule study time', href: `/${locale}/dashboard/learner/goals` },
                { icon: AlertCircle, label: 'Review your certifications', href: `/${locale}/dashboard/learner/certifications` },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-violet-50/60 group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 transition-colors group-hover:bg-violet-100">
                    <item.icon className="h-4 w-4 text-violet-600" />
                  </div>
                  <span className="text-sm font-medium text-foreground transition-colors">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {upcomingDeadlines.map((item, i) => {
              const cfg = PRIORITY_CONFIG[item.priority];
              return (
                <div
                  key={i}
                  className="group flex items-center justify-between rounded-xl px-3.5 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Calendar className={`h-4 w-4 ${cfg.icon}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground/60" />
                        <p className="text-[11px] text-muted-foreground truncate">{item.due} · {item.course}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

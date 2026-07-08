'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Clock, PlayCircle, BookOpen, ArrowRight, Zap, ShieldCheck, Target } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { useLearnerDashboard } from '@/hooks/api/useLearnerDashboard';
import { Skeleton } from '@/components/ui/skeleton';

function AnimatedRing({ pct }: { pct: number }) {
  const [displayed, setDisplayed] = useState(0);
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - displayed / 100);

  useEffect(() => {
    const t = setTimeout(() => setDisplayed(pct), 250);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="relative shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold leading-none text-white">{pct}%</span>
      </div>
    </div>
  );
}

export function ActiveCoursesSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useLearnerDashboard();
  const activeCourses = data?.activeCourses ?? [];
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-52 rounded-2xl" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (activeCourses.length === 0) {
    return (
      <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.35)] md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t('learnerDashboard.activeCourses')}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Your ongoing learning journey</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-sm font-medium text-violet-600 hover:text-violet-700" asChild>
            <Link href={`/${locale}/dashboard/learner/cours`}>
              Browse <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="rounded-2xl border border-dashed border-violet-200 bg-gradient-to-b from-slate-50 to-white px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100/80 ring-1 ring-violet-200">
            <BookOpen className="h-8 w-8 text-violet-600" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-900">No active courses yet</p>
          <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500">
            Start a course to track your progress and pick up where you left off.
          </p>
          <Button className="h-10 gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-700 hover:to-violet-700" asChild>
            <Link href={`/${locale}/dashboard/learner/cours`}>
              <PlayCircle className="h-4 w-4" />
              {t('learnerDashboard.browseCourses')}
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  const sorted = [...activeCourses].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
  const featured = sorted[0];
  const rest = sorted.slice(1);

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.35)] md:p-6">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('learnerDashboard.activeCourses')}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activeCourses.length} course{activeCourses.length !== 1 ? 's' : ''} in progress
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-sm font-medium text-violet-600 hover:text-violet-700" asChild>
          <Link href={`/${locale}/dashboard/learner/cours`}>
            {t('learnerDashboard.viewAll')} <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Featured course — premium compact card */}
      <Link
        href={`/${locale}/dashboard/learner/cours/${featured.id}`}
        className="group relative mb-4 flex min-h-[150px] overflow-hidden rounded-2xl"
      >
        {/* Violet → rose gradient background */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #f43f5e 100%)' }}
        />
        {/* Soft light top-right bloom */}
        <div className="absolute -top-10 right-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        {/* Overlay for text legibility */}
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 flex w-full items-center justify-between p-5">
          <div className="flex max-w-[70%] items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
            {featured.progress > 70 && (
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                <Zap className="h-3 w-3" />
                On Fire!
              </div>
            )}
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-white/50">
              {t('learnerDashboard.by')} {featured.instructor}
            </p>
            <h3 className="text-lg font-bold leading-snug text-white line-clamp-2 group-hover:text-white/90">
              {featured.title}
            </h3>
            <div className="mt-2 flex items-center gap-3 text-xs text-white/70">
              <Clock className="h-3 w-3" />
              <span>{featured.duration}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
                <Target className="h-3 w-3" />
                {featured.next}
              </span>
            </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <AnimatedRing pct={featured.progress} />
            <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition-colors group-hover:bg-fuchsia-50">
              <PlayCircle className="h-3.5 w-3.5" />
              Continuer
            </div>
          </div>
        </div>
      </Link>

      {/* Rest of courses — compact list */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((course) => (
            <div
              key={course.id}
              className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card px-4 py-3 transition-all duration-200 hover:border-violet-200 hover:shadow-sm"
            >
              {/* Color dot / thumbnail */}
              <div className={`h-9 w-9 shrink-0 rounded-lg ${course.color || 'bg-violet-100'} flex items-center justify-center`}>
                <BookOpen className="h-4 w-4 text-white/80 drop-shadow" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{course.title}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="progress-bar-track flex-1 !h-1.5">
                    <div className="progress-bar-fill !h-1.5" style={{ width: `${course.progress}%` }} />
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-violet-600">{course.progress}%</span>
                </div>
              </div>

              <Button
                asChild
                size="sm"
                variant="ghost"
                className="shrink-0 h-8 gap-1 rounded-lg text-xs font-medium text-violet-600 hover:bg-violet-50 hover:text-violet-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Link href={`/${locale}/dashboard/learner/cours/${course.id}`}>
                  Resume
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

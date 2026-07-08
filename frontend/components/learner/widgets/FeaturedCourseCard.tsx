'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play, Clock, BookOpen, ArrowRight, Flame } from 'lucide-react';
import { useLearnerDashboard } from '@/hooks/api/useLearnerDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function FeaturedCourseCard() {
  const { data, isLoading } = useLearnerDashboard();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';
  const [progressWidth, setProgressWidth] = useState(0);

  const activeCourses = data?.activeCourses ?? [];
  // Featured = highest progress course (the one furthest along)
  const featured = activeCourses.length > 0
    ? [...activeCourses].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0]
    : null;

  useEffect(() => {
    if (featured) {
      const timer = setTimeout(() => setProgressWidth(featured.progress ?? 0), 500);
      return () => clearTimeout(timer);
    }
  }, [featured?.id]);

  if (isLoading) {
    return <Skeleton className="h-[280px] xl:h-[320px] rounded-2xl" />;
  }

  if (!featured) {
    return (
      <div className="relative h-[280px] xl:h-[320px] rounded-2xl bg-[#0C0C15] overflow-hidden flex flex-col items-center justify-center text-center px-8">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(232,23,125,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(232,23,125,0.06) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary/8 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1.5">Start your first course</h3>
            <p className="text-sm text-white/35 max-w-xs mx-auto leading-relaxed">
              Browse our catalog and begin your learning journey today.
            </p>
          </div>
          <Link
            href={`/${locale}/dashboard/learner/cours`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#0C0C15] hover:bg-white/90 transition-all duration-150 active:scale-[0.97]"
          >
            Browse Courses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[280px] xl:h-[320px] rounded-2xl bg-[#0C0C15] overflow-hidden group">
      {/* Background ambient lights */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/10 blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent/8 blur-[60px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.022] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* On Fire badge */}
      {featured.progress > 70 && (
        <div className="absolute top-5 left-5 z-20 flex items-center gap-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 px-2.5 py-1 text-[10px] font-bold text-orange-400 backdrop-blur-sm">
          <Flame className="h-3 w-3" />
          On Fire
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full p-6 xl:p-8">
        {/* Top row: label + big number */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-8 bg-gradient-to-r from-primary to-transparent rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">
                Continue Learning
              </span>
            </div>
            <h2 className="text-xl xl:text-[1.6rem] font-black text-white leading-tight line-clamp-2 max-w-[360px] tracking-tight">
              {featured.title}
            </h2>
            <p className="text-[13px] text-white/30 mt-2 font-medium">
              {featured.instructor}
            </p>
          </div>

          {/* Large progress number */}
          <div className="text-right shrink-0 select-none">
            <div className="text-5xl xl:text-6xl font-black leading-none tabular-nums text-white/90">
              {featured.progress}
              <span className="text-[1.6rem] text-white/20 font-bold">%</span>
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/20 mt-1.5">
              Complete
            </div>
          </div>
        </div>

        {/* Bottom: thin progress bar + meta + CTA */}
        <div className="space-y-4">
          {/* Thin animated SUBUL gradient progress bar */}
          <div className="h-[3px] bg-white/8 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #E8177D 0%, #D115A0 50%, #8B1CC8 100%)' }}
              initial={{ width: '0%' }}
              animate={{ width: `${progressWidth}%` }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Meta info */}
            <div className="flex items-center gap-4 text-[11px] text-white/30 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0" />
                {featured.duration}
              </span>
              {featured.next && (
                <span className="hidden sm:flex items-center gap-1.5 max-w-[220px]">
                  <BookOpen className="h-3 w-3 shrink-0" />
                  <span className="truncate">Next: {featured.next}</span>
                </span>
              )}
            </div>

            {/* White CTA button */}
            <Link
              href={`/${locale}/dashboard/learner/cours/${featured.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-bold text-[#0C0C15] hover:bg-white/90 transition-all duration-150 active:scale-[0.97] shadow-[0_0_0_1px_rgba(255,255,255,0.08)] group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Continue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

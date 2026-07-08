'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  BookOpen, Clock, Trophy, Star,
  PlayCircle, ArrowRight, CheckCircle, GraduationCap,
  TrendingUp, Sparkles, Target, Search, LayoutGrid,
  List, Lock, ChevronRight, Zap, Award, BarChart2,
  BookMarked,
} from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { getProviderImage, hasProviderImage } from '@/utils/providerImages';
import { mapToLearnerCertifications } from '@/lib/certifications/learner-mapping';
import { useLearnerCourses, useLearnerCatalogCourses } from '@/hooks/api/useCourses';
import { useLearnerCertifications } from '@/hooks/api/useCertifications';
import { useCurrentUser } from '@/hooks/api/useUsers';
import { useContentAccess } from '@/hooks/api/useContentAccess';
import { LockedOverlay } from '@/components/ui/locked-overlay';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

/* ── Types ──────────────────────────────────────────────── */
interface EnrolledCourse {
  id: string | number;
  title: string;
  provider: string;
  instructor: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  level: string;
  nextLesson: string;
  description?: string;
  color?: string;
  track?: string | null;
}

interface AvailableCourse {
  id: string | number;
  courseId?: string | null;
  name: string;
  issuer: string;
  duration: string;
  cost: string;
  description?: string;
  students?: number;
  color?: string;
  icon?: string;
  difficulty?: string;
}

function hasCourseContent(course: AvailableCourse): boolean {
  return !!course.courseId;
}

function mapCatalogCourseToAvailable(course: EnrolledCourse): AvailableCourse {
  return {
    id: course.id,
    courseId: String(course.id),
    name: course.title,
    issuer: course.provider || course.instructor || 'SUBUL',
    duration: course.duration,
    cost: 'Inclus',
    description: course.description,
    students: 0,
    color: course.color ?? 'from-blue-500 to-cyan-400',
    icon: '📘',
    difficulty: course.level,
  };
}

/* ── Animation variants ─────────────────────────────────── */
const CONTAINER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
} satisfies Variants;

const ITEM = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
  },
} satisfies Variants;

const SPRING_CARD_HOVER = {
  y: -4,
  transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
};

/* ── Skeleton ───────────────────────────────────────────── */
function CourseCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
      <Skeleton className="h-48 w-full" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

/* ── Provider logo ──────────────────────────────────────── */
function ProviderBadge({ name }: { name?: string }) {
  const initial = name?.trim().charAt(0)?.toUpperCase() || '?';
  if (hasProviderImage(name || '')) {
    const img = getProviderImage(name || '');
    return (
      <div className="h-8 px-2 flex items-center justify-center rounded-lg bg-white/95 shadow-sm shrink-0">
        <img src={img?.src} alt={img?.alt} className="h-5 w-auto max-w-[56px] object-contain" />
      </div>
    );
  }
  return (
    <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/20 border border-white/30 shrink-0" aria-hidden>
      <span className="text-xs font-bold text-white">{initial}</span>
    </div>
  );
}

/* ── Animated progress ring ─────────────────────────────── */
function ProgressRing({ pct, size = 52 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <defs>
        <linearGradient id="ring-gr" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className="stroke-white/20" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" strokeWidth={5}
        stroke="url(#ring-gr)"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="transition-all duration-700"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function CoursPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'enrolled' | 'available' | 'completed'>('available');
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';
  const go = (path: string) => router.push(`/${locale}${path}`);

  const { data: currentUser } = useCurrentUser();
  const { data: contentAccess } = useContentAccess();
  const isFree = contentAccess?.isFree ?? true;
  const accessibleCourseIds = contentAccess?.accessibleCourseIds ?? [];

  const { data: coursesData, isLoading: loading } = useLearnerCourses();
  // Always fetch full catalog — per-course locking handles access via isCourseLocked().
  // Track-scoping returns empty for users with no profile track, causing a blank page.
  const { data: catalogCourses = [], isLoading: loadingCatalog } = useLearnerCatalogCourses(true);
  const { data: learnerCertifications = [], isLoading: loadingAvailable } = useLearnerCertifications(true);

  const enrolledCourses = coursesData?.enrolled ?? [];
  const completedCourses = coursesData?.completed ?? [];
  const certificationCourses = useMemo(
    () => mapToLearnerCertifications(Array.isArray(learnerCertifications) ? learnerCertifications : []),
    [learnerCertifications],
  );
  const catalogAvailableCourses = useMemo(
    () => catalogCourses.map((course) => mapCatalogCourseToAvailable(course)),
    [catalogCourses],
  );
  const availableCourses = useMemo(() => {
    const seen = new Set<string>();
    return [...certificationCourses, ...catalogAvailableCourses].filter((course) => {
      const key = course.courseId
        ? `course:${course.courseId}`
        : `item:${course.name}:${course.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [certificationCourses, catalogAvailableCourses]);

  const completedCoursesForProfile = useMemo(() => {
    if (showAllTracks || !currentUser?.track) return completedCourses;
    return completedCourses.filter(
      (c) => !(c as EnrolledCourse).track || (c as EnrolledCourse).track === currentUser?.track,
    );
  }, [completedCourses, showAllTracks, currentUser?.track]);

  const isCourseLocked = (courseId: string | number): boolean => {
    if (!isFree) return false;
    return !accessibleCourseIds.includes(String(courseId));
  };

  const handleLockedClick = () => {
    toast.error(String(t('subscription.upgradeToAccessCourse')), { id: 'locked-course' });
  };

  // Stats
  const totalProgress =
    enrolledCourses.length > 0
      ? Math.round(enrolledCourses.reduce((a, c) => a + c.progress, 0) / enrolledCourses.length)
      : 0;
  const totalCompletedLessons = enrolledCourses.reduce((a, c) => a + c.completedLessons, 0);

  // Feature course: most progressed in-progress course
  const featuredCourse = useMemo(() => {
    if (enrolledCourses.length === 0) return null;
    const inProgress = enrolledCourses.filter((c) => c.progress > 0 && c.progress < 100);
    if (inProgress.length === 0) return enrolledCourses[0];
    return inProgress.sort((a, b) => b.progress - a.progress)[0];
  }, [enrolledCourses]);

  // Search filter
  const filteredEnrolled = useMemo(() => {
    if (!search.trim()) return enrolledCourses;
    const q = search.toLowerCase();
    return enrolledCourses.filter(
      (c) => c.title.toLowerCase().includes(q) || c.provider.toLowerCase().includes(q),
    );
  }, [enrolledCourses, search]);

  const filteredAvailable = useMemo(() => {
    if (!search.trim()) return availableCourses;
    const q = search.toLowerCase();
    return availableCourses.filter(
      (c: AvailableCourse) => c.name.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q),
    );
  }, [availableCourses, search]);

  const filteredCompleted = useMemo(() => {
    if (!search.trim()) return completedCoursesForProfile;
    const q = search.toLowerCase();
    return completedCoursesForProfile.filter(
      (c) => c.title.toLowerCase().includes(q) || c.provider.toLowerCase().includes(q),
    );
  }, [completedCoursesForProfile, search]);

  const featuredAvailable = useMemo(() => {
    if (filteredAvailable.length === 0) return null;
    return filteredAvailable[0];
  }, [filteredAvailable]);
  const featuredAvailableLocked = featuredAvailable
    ? isCourseLocked(featuredAvailable.courseId || featuredAvailable.id)
    : false;

  const tabs = [
    { id: 'available' as const, label: t('learnerCourses.discover'), icon: Sparkles, count: availableCourses.length },
    { id: 'enrolled' as const, label: t('learnerCourses.myCourses'), icon: BookOpen, count: enrolledCourses.length },
    { id: 'completed' as const, label: t('learnerCourses.completed'), icon: Trophy, count: completedCoursesForProfile.length },
  ];

  const stats = [
    { icon: BookOpen, value: enrolledCourses.length, label: t('learnerCourses.activeCourses') },
    { icon: TrendingUp, value: totalCompletedLessons, label: t('learnerCourses.lessonsCompleted') },
    { icon: CheckCircle, value: completedCourses.length, label: t('learnerCourses.completed') },
    { icon: BarChart2, value: `${totalProgress}%`, label: t('learnerCourses.progress') },
  ];

  return (
    <div className="space-y-8 pb-10">

      {/* ── HERO ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-900"
      >
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl" />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        <div className="relative z-10 p-6 md:p-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] font-semibold text-white">
              <BookOpen className="h-3.5 w-3.5" />
              {t('learnerCourses.learningContent') as string}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/20 border border-white/10 px-3 py-1 text-[11px] font-medium text-white/90">
              {t('learnerCourses.heroSubtag') as string}
            </span>
          </div>
          {/* Top row */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
                  {t('learnerCourses.myLearning') as string}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {t('learnerCourses.heroTitle') as string}
              </h1>
            </div>

            {/* Featured course CTA or primary action */}
            {featuredCourse && (
              <button
                onClick={() => go(`/dashboard/learner/cours/${featuredCourse.id}`)}
                className="group flex shrink-0 items-center gap-2.5 self-start rounded-xl border-0 bg-white px-5 py-2.5 text-sm font-bold text-violet-700 shadow-md transition-all duration-200 hover:bg-white/95 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <PlayCircle className="h-4 w-4" />
                {t('learnerCourses.continueLearning') as string}
                <ArrowRight className="h-3.5 w-3.5 opacity-50 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            )}
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur-sm"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.5) 0%, rgba(244,63,94,0.4) 100%)' }}
                  >
                    <Icon className="h-[17px] w-[17px] text-white/90" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold leading-none text-white">{stat.value}</p>
                    <p className="mt-0.5 truncate text-[10px] font-medium text-white/40">{stat.label as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ── DISCOVER FIRST STRIP ─────────────────────────── */}
      {activeTab === 'available' && featuredAvailable && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50 via-fuchsia-50/70 to-white p-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
                {t('learnerCourses.startHere') as string}
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                {t('learnerCourses.recommendedTitle') as string}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t('learnerCourses.recommendedDesc') as string}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                featuredAvailableLocked
                  ? handleLockedClick()
                  : go(
                      hasCourseContent(featuredAvailable)
                        ? `/dashboard/learner/cours/${featuredAvailable.courseId}`
                        : '/dashboard/learner/certifications',
                    )
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-bold text-white hover:from-violet-700 hover:to-fuchsia-700"
            >
              {t('learnerCourses.startNow') as string}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.section>
      )}

      {/* ── FEATURED COURSE (Continue Learning) ─────────── */}
      <AnimatePresence>
        {featuredCourse && activeTab === 'enrolled' && (
          <motion.section
            key="featured"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
          >
            <FeaturedCourseCard
              course={featuredCourse}
              locked={isCourseLocked(featuredCourse.id)}
              onAction={() =>
                isCourseLocked(featuredCourse.id)
                  ? handleLockedClick()
                  : go(`/dashboard/learner/cours/${featuredCourse.id}`)
              }
              onLockedClick={handleLockedClick}
              locale={locale}
              t={t}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── FILTER / SEARCH / TABS ───────────────────────── */}
      <section className="space-y-3">
        {/* Search + view toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('learnerCourses.searchPlaceholder') as string}
              className="h-11 w-full rounded-xl border border-border/70 bg-card pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground/50 transition-all duration-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
            />
          </div>
          {/* View mode toggle */}
          <div className="flex h-11 items-center gap-0.5 rounded-xl border border-border/70 bg-card p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                viewMode === 'grid'
                  ? 'text-violet-600'
                  : 'text-muted-foreground/60 hover:text-foreground',
              )}
              style={viewMode === 'grid' ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(244,63,94,0.08) 100%)' } : undefined}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                viewMode === 'list'
                  ? 'text-violet-600'
                  : 'text-muted-foreground/60 hover:text-foreground',
              )}
              style={viewMode === 'list' ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(244,63,94,0.08) 100%)' } : undefined}
              aria-label="List view"
            >
              <List className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {/* All tracks toggle */}
          {!isFree && (
            <button
              type="button"
              onClick={() => setShowAllTracks((v) => !v)}
              className={cn(
                'hidden sm:flex h-11 items-center gap-1.5 rounded-xl border px-4 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                showAllTracks
                  ? 'border-violet-300 bg-violet-50 text-violet-700'
                  : 'border-border/70 bg-card text-muted-foreground hover:border-violet-200 hover:text-violet-600',
              )}
            >
              <BookMarked className="h-3.5 w-3.5" aria-hidden />
              {showAllTracks
                ? (t('learnerCourses.myProfile') as string)
                : (t('learnerCourses.viewFullCatalog') as string)}
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-muted/40 p-1.5"
          role="tablist"
          aria-label="Course filter"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 whitespace-nowrap',
                  active
                    ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span>{tab.label as string}</span>
                <span
                  className={cn(
                    'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                    active ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── TAB CONTENT ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.section
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
        >

          {/* ── Enrolled ── */}
          {activeTab === 'enrolled' && (
            loading ? (
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                  : 'flex flex-col gap-3',
              )}>
                {[1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)}
              </div>
            ) : filteredEnrolled.length === 0 && search ? (
              <EmptySearch onClear={() => setSearch('')} t={t} />
            ) : enrolledCourses.length === 0 ? (
              <EmptyEnrolled
                loading={loadingCatalog}
                catalogCourses={catalogCourses}
                isCourseLocked={isCourseLocked}
                handleLockedClick={handleLockedClick}
                go={go}
                t={t}
                locale={locale}
                viewMode={viewMode}
              />
            ) : (
              <motion.div
                variants={CONTAINER}
                initial="hidden"
                animate="show"
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                    : 'flex flex-col gap-3',
                )}
              >
                {filteredEnrolled.map((course) => {
                  const locked = isCourseLocked(course.id);
                  return viewMode === 'grid' ? (
                    <EnrolledCourseCard
                      key={course.id}
                      course={course}
                      onAction={locked ? handleLockedClick : () => go(`/dashboard/learner/cours/${course.id}`)}
                      locked={locked}
                      locale={locale}
                      onLockedClick={handleLockedClick}
                      t={t}
                    />
                  ) : (
                    <EnrolledCourseRow
                      key={course.id}
                      course={course}
                      onAction={locked ? handleLockedClick : () => go(`/dashboard/learner/cours/${course.id}`)}
                      locked={locked}
                      locale={locale}
                      onLockedClick={handleLockedClick}
                      t={t}
                    />
                  );
                })}
              </motion.div>
            )
          )}

          {/* ── Discover ── */}
          {activeTab === 'available' && (
            loadingAvailable ? (
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                  : 'flex flex-col gap-3',
              )}>
                {[1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)}
              </div>
            ) : filteredAvailable.length === 0 && search ? (
              <EmptySearch onClear={() => setSearch('')} t={t} />
            ) : availableCourses.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm mx-auto">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(244,63,94,0.08) 100%)' }}
                >
                  <Sparkles className="h-8 w-8 text-violet-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{t('learnerCourses.noAvailableCourses') as string}</h3>
                <p className="text-sm text-muted-foreground">{t('learnerCourses.checkBackLater') as string}</p>
                {!showAllTracks && (
                  <button
                    type="button"
                    onClick={() => setShowAllTracks(true)}
                    className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors focus-visible:outline-none focus-visible:underline"
                  >
                    {t('learnerCourses.viewFullCatalog') as string} →
                  </button>
                )}
              </div>
            ) : (
              <motion.div
                variants={CONTAINER}
                initial="hidden"
                animate="show"
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                    : 'flex flex-col gap-3',
                )}
              >
                {filteredAvailable.map((course: AvailableCourse) => {
                  const locked = isCourseLocked(course.courseId || course.id);
                  return viewMode === 'grid' ? (
                    <DiscoverCourseCard
                      key={course.id}
                      course={course}
                      onAction={locked ? handleLockedClick : () => go(hasCourseContent(course) ? `/dashboard/learner/cours/${course.courseId}` : '/dashboard/learner/certifications')}
                      t={t}
                      locked={locked}
                      locale={locale}
                      onLockedClick={handleLockedClick}
                    />
                  ) : (
                    <DiscoverCourseRow
                      key={course.id}
                      course={course}
                      onAction={locked ? handleLockedClick : () => go(hasCourseContent(course) ? `/dashboard/learner/cours/${course.courseId}` : '/dashboard/learner/certifications')}
                      t={t}
                      locked={locked}
                      locale={locale}
                      onLockedClick={handleLockedClick}
                    />
                  );
                })}
              </motion.div>
            )
          )}

          {/* ── Completed ── */}
          {activeTab === 'completed' && (
            loading ? (
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                  : 'flex flex-col gap-3',
              )}>
                {[1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)}
              </div>
            ) : filteredCompleted.length === 0 && search ? (
              <EmptySearch onClear={() => setSearch('')} t={t} />
            ) : completedCourses.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm mx-auto">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(244,63,94,0.08) 100%)' }}
                >
                  <Trophy className="h-8 w-8 text-rose-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{t('learnerCourses.noCompletedCourses') as string}</h3>
                <p className="text-sm text-muted-foreground">{t('learnerCourses.keepGoing') as string}</p>
              </div>
            ) : completedCoursesForProfile.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm mx-auto">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(244,63,94,0.08) 100%)' }}
                >
                  <Trophy className="h-8 w-8 text-rose-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {t('learnerCourses.noCompletedInFilter') as string}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('learnerCourses.noCompletedInFilterDesc') as string}
                </p>
                <button
                  type="button"
                  onClick={() => setShowAllTracks(true)}
                  className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  {t('learnerCourses.viewAll') as string} →
                </button>
              </div>
            ) : (
              <motion.div
                variants={CONTAINER}
                initial="hidden"
                animate="show"
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                    : 'flex flex-col gap-3',
                )}
              >
                {filteredCompleted.map((course) =>
                  viewMode === 'grid' ? (
                    <CompletedCourseCard
                      key={course.id}
                      course={course}
                      onAction={() => go(`/dashboard/learner/cours/${course.id}`)}
                      t={t}
                    />
                  ) : (
                    <CompletedCourseRow
                      key={course.id}
                      course={course}
                      onAction={() => go(`/dashboard/learner/cours/${course.id}`)}
                      t={t}
                    />
                  ),
                )}
              </motion.div>
            )
          )}

        </motion.section>
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FEATURED COURSE CARD (Continue Learning banner)
═══════════════════════════════════════════════════════════ */
function FeaturedCourseCard({
  course,
  locked,
  onAction,
  onLockedClick,
  locale,
  t,
}: {
  course: EnrolledCourse;
  locked: boolean;
  onAction: () => void;
  onLockedClick?: () => void;
  locale: string;
  t: (key: string) => string | string[];
}) {
  return (
    <motion.article
      whileHover={locked ? undefined : { y: -2 }}
      transition={{ type: 'spring' as const, stiffness: 300, damping: 28 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 shadow-lg',
        locked && 'opacity-75',
      )}
      style={{ background: 'linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #4c1d95 100%)' }}
    >
      <LockedOverlay locked={locked} locale={locale} onClick={onLockedClick} />

      {/* Glows */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-56 w-56 rounded-full bg-rose-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-violet-500/20 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-5 p-6 md:flex-row md:items-center md:gap-8">
        {/* Progress ring + percentage */}
        <div className="relative flex shrink-0 items-center justify-center">
          <ProgressRing pct={course.progress} size={72} />
          <span className="absolute text-base font-extrabold text-white">{course.progress}%</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <Zap className="h-3 w-3 text-rose-400" aria-hidden />
              {t('learnerCourses.continueLearning') as string}
            </span>
            <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white/50">
              {course.level}
            </span>
          </div>
          <h2 className="text-lg font-extrabold tracking-tight text-white sm:text-xl line-clamp-1">{course.title}</h2>
          <p className="text-sm text-white/60 truncate">
            {course.instructor && `${course.instructor} · `}
            {course.completedLessons}/{course.totalLessons} {t('learnerCourses.lessons') as string} · {course.duration}
          </p>
          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${course.progress}%`,
                background: 'linear-gradient(to right, #a78bfa, #fb7185)',
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onAction}
          className="group/btn flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-violet-700 shadow-md transition-all duration-200 hover:bg-white/95 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <PlayCircle className="h-4 w-4" aria-hidden />
          {t('learnerCourses.resumeCourse') as string}
          <ArrowRight className="h-3.5 w-3.5 opacity-50 transition-transform duration-200 group-hover/btn:translate-x-0.5" aria-hidden />
        </button>
      </div>
    </motion.article>
  );
}

/* ═══════════════════════════════════════════════════════════
   ENROLLED COURSE CARD (grid)
═══════════════════════════════════════════════════════════ */
function EnrolledCourseCard({
  course,
  onAction,
  locked = false,
  locale = 'en',
  onLockedClick,
  t,
}: {
  course: EnrolledCourse;
  onAction: () => void;
  locked?: boolean;
  locale?: string;
  onLockedClick?: () => void;
  t: (key: string) => string | string[];
}) {
  const actionLabel = course.progress > 0
    ? (t('learnerCourses.continue') as string)
    : (t('learnerCourses.startCourse') as string);

  return (
    <motion.article
      variants={ITEM}
      whileHover={locked ? undefined : SPRING_CARD_HOVER}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow duration-300',
        locked
          ? 'opacity-70 border-border/40'
          : 'border-border/60 hover:border-violet-200/60 hover:shadow-[0_8px_32px_rgba(124,58,237,0.10)]',
      )}
    >
      <LockedOverlay locked={locked} locale={locale} onClick={onLockedClick} />

      {/* Thumbnail */}
      <div
        className="relative h-48 overflow-hidden"
        style={{
          background: course.color ?? 'linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #f43f5e 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Provider badge */}
        <div className="absolute top-3 right-3">
          <ProviderBadge name={course.provider} />
        </div>

        {/* Lock badge */}
        {locked && (
          <div className="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
            <Lock className="h-3.5 w-3.5 text-white" aria-hidden />
          </div>
        )}

        {/* Progress pill */}
        {course.progress > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span className="text-[10px] font-bold text-white">{course.progress}%</span>
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 inset-x-0 p-4">
          <h3 className="text-[13px] font-bold text-white line-clamp-2 leading-snug">{course.title}</h3>
          {course.instructor && (
            <p className="mt-0.5 text-[11px] text-white/60 truncate">{course.instructor}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 gap-3.5 p-4">
        {/* Meta chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-100">
            {course.level}
          </span>
          {course.duration && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden />
              {course.duration}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {course.progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">{t('learnerCourses.progress') as string}</span>
              <span className="font-bold text-violet-600">{course.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${course.progress}%`,
                  background: 'linear-gradient(to right, #7c3aed, #f43f5e)',
                }}
              />
            </div>
            {course.totalLessons > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {course.completedLessons} / {course.totalLessons} {t('learnerCourses.lessons') as string}
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onAction}
          className={cn(
            'mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
            locked
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'text-white shadow-sm hover:shadow-md hover:opacity-95',
          )}
          style={!locked ? { background: 'linear-gradient(135deg, #7c3aed 0%, #f43f5e 100%)' } : undefined}
          disabled={locked}
        >
          {course.progress > 0 ? <PlayCircle className="h-3.5 w-3.5" aria-hidden /> : <GraduationCap className="h-3.5 w-3.5" aria-hidden />}
          {actionLabel}
        </button>
      </div>
    </motion.article>
  );
}

/* ── Enrolled course ROW (list view) ────────────────────── */
function EnrolledCourseRow({
  course,
  onAction,
  locked = false,
  locale = 'en',
  onLockedClick,
  t,
}: {
  course: EnrolledCourse;
  onAction: () => void;
  locked?: boolean;
  locale?: string;
  onLockedClick?: () => void;
  t: (key: string) => string | string[];
}) {
  return (
    <motion.article
      variants={ITEM}
      className={cn(
        'group relative flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all duration-200',
        locked
          ? 'opacity-70 border-border/40'
          : 'border-border/60 hover:border-violet-200/60 hover:shadow-[0_4px_16px_rgba(124,58,237,0.08)]',
      )}
    >
      <LockedOverlay locked={locked} locale={locale} onClick={onLockedClick} />

      {/* Thumbnail */}
      <div
        className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl"
        style={{ background: course.color ?? 'linear-gradient(135deg, #7c3aed 0%, #f43f5e 100%)' }}
      >
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Lock className="h-4 w-4 text-white" aria-hidden />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <h3 className="text-sm font-bold text-foreground truncate">{course.title}</h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{course.level}</span>
          {course.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden />
              {course.duration}
            </span>
          )}
          {course.progress > 0 && (
            <span className="font-semibold text-violet-600">
              {course.progress}% {t('learnerCourses.completed') as string}
            </span>
          )}
        </div>
        {course.progress > 0 && (
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${course.progress}%`, background: 'linear-gradient(to right, #7c3aed, #f43f5e)' }}
            />
          </div>
        )}
      </div>

      {/* Action */}
      <button
        onClick={onAction}
        disabled={locked}
        className={cn(
          'flex shrink-0 h-9 items-center gap-2 rounded-xl px-4 text-[12px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
          locked
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'text-white hover:opacity-90',
        )}
        style={!locked ? { background: 'linear-gradient(135deg, #7c3aed 0%, #f43f5e 100%)' } : undefined}
      >
        <PlayCircle className="h-3.5 w-3.5" aria-hidden />
        {course.progress > 0
          ? (t('learnerCourses.continue') as string)
          : (t('learnerCourses.startCourse') as string)}
      </button>
    </motion.article>
  );
}

/* ═══════════════════════════════════════════════════════════
   DISCOVER CARD (grid)
═══════════════════════════════════════════════════════════ */
function DiscoverCourseCard({
  course,
  onAction,
  t,
  locked = false,
  locale = 'en',
  onLockedClick,
}: {
  course: AvailableCourse;
  onAction: () => void;
  t: (key: string) => string | string[];
  locked?: boolean;
  locale?: string;
  onLockedClick?: () => void;
}) {
  return (
    <motion.article
      variants={ITEM}
      whileHover={locked ? undefined : SPRING_CARD_HOVER}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow duration-300',
        locked
          ? 'opacity-70 border-border/40'
          : 'border-border/60 hover:border-rose-200/60 hover:shadow-[0_8px_32px_rgba(244,63,94,0.08)]',
      )}
    >
      <LockedOverlay locked={locked} locale={locale} onClick={onLockedClick} />

      {/* Header */}
      <div
        className="relative h-44 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #f43f5e 100%)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />

        {/* "New" badge */}
        <div className="absolute top-3 left-3">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <Star className="h-2.5 w-2.5 fill-rose-300 text-rose-300" aria-hidden />
            {String(t('learnerCourses.availableNow'))}
          </span>
        </div>

        {locked && (
          <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
            <Lock className="h-3.5 w-3.5 text-white" aria-hidden />
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 p-4">
          <h3 className="text-[13px] font-bold text-white line-clamp-2 leading-snug">{course.name}</h3>
          <p className="mt-0.5 text-[11px] text-white/60 truncate">{course.issuer}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 gap-3.5 p-4">
        <div className="flex flex-wrap gap-1.5">
          {course.difficulty && (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-100">
              {course.difficulty}
            </span>
          )}
          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-600 border border-rose-100">
            {String(t('learnerCourses.examTipsIncluded'))}
          </span>
        </div>

        {course.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
        )}

        <button
          onClick={onAction}
          disabled={locked}
          className={cn(
            'mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400',
            locked
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'text-white shadow-sm hover:shadow-md hover:opacity-95',
          )}
          style={!locked ? { background: 'linear-gradient(135deg, #7c3aed 0%, #f43f5e 100%)' } : undefined}
        >
          <GraduationCap className="h-3.5 w-3.5" aria-hidden />
          {String(t('learnerCourses.startCourse'))}
        </button>
      </div>
    </motion.article>
  );
}

/* ── Discover ROW ───────────────────────────────────────── */
function DiscoverCourseRow({
  course,
  onAction,
  t,
  locked = false,
  locale = 'en',
  onLockedClick,
}: {
  course: AvailableCourse;
  onAction: () => void;
  t: (key: string) => string | string[];
  locked?: boolean;
  locale?: string;
  onLockedClick?: () => void;
}) {
  return (
    <motion.article
      variants={ITEM}
      className={cn(
        'group relative flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all duration-200',
        locked
          ? 'opacity-70 border-border/40'
          : 'border-border/60 hover:border-rose-200/60 hover:shadow-[0_4px_16px_rgba(244,63,94,0.07)]',
      )}
    >
      <LockedOverlay locked={locked} locale={locale} onClick={onLockedClick} />

      <div
        className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #f43f5e 100%)' }}
      >
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Lock className="h-4 w-4 text-white" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <Award className="h-7 w-7 text-white/60" aria-hidden />
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <h3 className="text-sm font-bold text-foreground truncate">{course.name}</h3>
        <p className="text-[11px] text-muted-foreground truncate">{course.issuer}</p>
        <div className="flex gap-2">
          {course.difficulty && (
            <span className="text-[10px] font-medium text-violet-600">{course.difficulty}</span>
          )}
        </div>
      </div>

      <button
        onClick={onAction}
        disabled={locked}
        className={cn(
          'flex shrink-0 h-9 items-center gap-2 rounded-xl px-4 text-[12px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
          locked
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'text-white hover:opacity-90',
        )}
        style={!locked ? { background: 'linear-gradient(135deg, #7c3aed 0%, #f43f5e 100%)' } : undefined}
      >
        <GraduationCap className="h-3.5 w-3.5" aria-hidden />
        {String(t('learnerCourses.startCourse'))}
      </button>
    </motion.article>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPLETED COURSE CARD (grid)
═══════════════════════════════════════════════════════════ */
function CompletedCourseCard({
  course,
  onAction,
  t,
}: {
  course: EnrolledCourse;
  onAction: () => void;
  t: (key: string) => string | string[];
}) {
  return (
    <motion.article
      variants={ITEM}
      whileHover={SPRING_CARD_HOVER}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-shadow duration-300 hover:border-violet-200/60 hover:shadow-[0_8px_32px_rgba(124,58,237,0.09)]"
    >
      {/* Thumbnail */}
      <div
        className="relative h-48 overflow-hidden"
        style={{
          background: course.color ?? 'linear-gradient(135deg, #7c3aed 0%, #c026d3 60%, #f43f5e 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Completed badge */}
        <div className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <CheckCircle className="h-5 w-5 text-white" aria-hidden />
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4">
          <h3 className="text-[13px] font-bold text-white line-clamp-2 leading-snug">{course.title}</h3>
          {course.instructor && (
            <p className="mt-0.5 text-[11px] text-white/60 truncate">{course.instructor}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-100">
            {course.level}
          </span>
          {course.duration && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden />
              {course.duration}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
          <CheckCircle className="h-3.5 w-3.5" aria-hidden />
          {String(t('learnerCourses.completePercent'))}
        </div>

        {/* Full progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full w-full rounded-full"
            style={{ background: 'linear-gradient(to right, #7c3aed, #f43f5e)' }}
          />
        </div>

        <button
          onClick={onAction}
          className="mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 text-[13px] font-bold text-violet-700 transition-all duration-200 hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          {String(t('learnerCourses.reviewCourse'))}
        </button>
      </div>
    </motion.article>
  );
}

/* ── Completed ROW ──────────────────────────────────────── */
function CompletedCourseRow({
  course,
  onAction,
  t,
}: {
  course: EnrolledCourse;
  onAction: () => void;
  t: (key: string) => string | string[];
}) {
  return (
    <motion.article
      variants={ITEM}
      className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-violet-200/60 hover:shadow-[0_4px_16px_rgba(124,58,237,0.08)]"
    >
      <div
        className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl"
        style={{ background: course.color ?? 'linear-gradient(135deg, #7c3aed 0%, #f43f5e 100%)' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-white/80" aria-hidden />
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <h3 className="text-sm font-bold text-foreground truncate">{course.title}</h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{course.level}</span>
          {course.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden />{course.duration}</span>}
        </div>
        <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full rounded-full" style={{ background: 'linear-gradient(to right, #7c3aed, #f43f5e)' }} />
        </div>
      </div>

      <button
        onClick={onAction}
        className="flex shrink-0 h-9 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-[12px] font-bold text-violet-700 transition-all duration-200 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        {String(t('learnerCourses.reviewCourse'))}
      </button>
    </motion.article>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMPTY STATES
═══════════════════════════════════════════════════════════ */
function EmptySearch({ onClear, t }: { onClear: () => void; t: (key: string) => string | string[] }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm mx-auto">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(244,63,94,0.08) 100%)' }}
      >
        <Search className="h-7 w-7 text-violet-400" aria-hidden />
      </div>
      <h3 className="text-lg font-bold text-foreground">{String(t('learnerCourses.noResults'))}</h3>
      <p className="text-sm text-muted-foreground">{String(t('learnerCourses.noResultsDesc'))}</p>
      <button
        onClick={onClear}
        className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors focus-visible:outline-none focus-visible:underline"
      >
        {String(t('learnerCourses.clearSearch'))}
      </button>
    </div>
  );
}

function EmptyEnrolled({
  loading,
  catalogCourses,
  isCourseLocked,
  handleLockedClick,
  go,
  t,
  locale,
  viewMode,
}: {
  loading: boolean;
  catalogCourses: EnrolledCourse[];
  isCourseLocked: (id: string | number) => boolean;
  handleLockedClick: () => void;
  go: (path: string) => void;
  t: (key: string) => string | string[];
  locale: string;
  viewMode: 'grid' | 'list';
}) {
  return (
    <div className="flex flex-col items-center gap-10 py-6">
      <div className="text-center max-w-sm">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(244,63,94,0.08) 100%)' }}
        >
          <BookOpen className="h-8 w-8 text-violet-500" aria-hidden />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{String(t('learnerCourses.noCourses'))}</h3>
        <p className="text-sm text-muted-foreground">{String(t('learnerCourses.profileAssessmentMsg'))}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
          {[1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)}
        </div>
      ) : catalogCourses.length > 0 ? (
        <div className="w-full space-y-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(244,63,94,0.10) 100%)' }}
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden />
            </div>
            <h4 className="text-sm font-bold text-foreground">{String(t('learnerCourses.discover'))}</h4>
          </div>
          <motion.div
            variants={CONTAINER}
            initial="hidden"
            animate="show"
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                : 'flex flex-col gap-3',
            )}
          >
            {catalogCourses.map((course) => {
              const locked = isCourseLocked(course.id);
              return (
                <EnrolledCourseCard
                  key={course.id}
                  course={course}
                  onAction={locked ? handleLockedClick : () => go(`/dashboard/learner/cours/${course.id}`)}
                  locked={locked}
                  locale={locale}
                  onLockedClick={handleLockedClick}
                  t={t}
                />
              );
            })}
          </motion.div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{String(t('learnerCourses.browseToStart'))}</p>
      )}
    </div>
  );
}

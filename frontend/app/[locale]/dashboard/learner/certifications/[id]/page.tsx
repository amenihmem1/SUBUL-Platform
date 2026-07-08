'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Crown,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Lock,
  Shield,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Briefcase,
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { localeFromPathname } from '@/lib/i18n/config';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';
import { cn } from '@/lib/utils';
import {
  useEnrollInCertification,
  useLearnerCertificationExperience,
} from '@/hooks/api/useCertifications';
import { useContentAccess } from '@/hooks/api/useContentAccess';
import { certificationsUpgradeCheckoutHref } from '@/lib/subscription/certificationAccess';
import { LockedOverlay } from '@/components/ui/locked-overlay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui';
import { downloadLearnerCertificatePdf } from '@/services/certifications';
import { filenameFromContentDisposition, triggerBlobDownload } from '@/lib/downloads';
import type { CertificationPathStepType } from '@/services/certifications';

const DKEY = 'learnerCertifications.detail';

function safeText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function normalizeResourceLinks(resources: Record<string, unknown> | null | undefined): Array<{
  id: string;
  label: string;
  href: string;
}> {
  if (!resources || typeof resources !== 'object') return [];
  const out: Array<{ id: string; label: string; href: string }> = [];
  const pushLink = (id: string, label: string, href: string) => {
    const h = href.trim();
    if (!h) return;
    out.push({ id, label: label || id, href: h });
  };
  for (const [key, val] of Object.entries(resources)) {
    if (val == null) continue;
    if (typeof val === 'string') {
      const s = val.trim();
      if (/^https?:\/\//i.test(s)) pushLink(key, key.replace(/_/g, ' '), s);
      else {
        try {
          const parsed = JSON.parse(s) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const o = parsed as Record<string, unknown>;
            const url = safeText(o.url || o.href || o.link);
            const label = safeText(o.label || o.title || o.name || key);
            if (url) pushLink(key, label, url);
          }
        } catch { /* plain string */ }
      }
      continue;
    }
    if (typeof val === 'object' && !Array.isArray(val)) {
      const o = val as Record<string, unknown>;
      const url = safeText(o.url || o.href || o.link);
      const label = safeText(o.label || o.title || o.name || key);
      if (url) pushLink(key, label, url);
    }
  }
  return out;
}

function stepHref(locale: string, stepType: CertificationPathStepType, stepRef: string): string | null {
  const ref = stepRef.trim();
  if (!ref) return null;
  switch (stepType) {
    case 'course':
      return `/${locale}/dashboard/learner/cours/${encodeURIComponent(ref)}`;
    case 'lab':
      return `/${locale}/dashboard/learner/labs/${encodeURIComponent(ref)}`;
    case 'practice_exam':
      return `/${locale}/dashboard/learner/practice-exams/${encodeURIComponent(ref)}`;
    case 'assessment':
      return `/${locale}/dashboard/learner/examens`;
    case 'quiz':
      return `/${locale}/dashboard/learner/cours/${encodeURIComponent(ref)}`;
    case 'final_certificate':
      return null;
    default:
      return null;
  }
}

const COURSE_ICON_COLORS = [
  'bg-blue-50 text-blue-600',
  'bg-orange-50 text-orange-500',
  'bg-yellow-50 text-yellow-600',
  'bg-purple-50 text-purple-600',
  'bg-emerald-50 text-emerald-600',
  'bg-rose-50 text-rose-500',
];

const COURSE_ICONS = [BookOpen, Cloud, Shield, Target, TrendingUp, Award];

export default function LearnerCertificationDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale: lang } = useTranslation();
  const { showToast } = useToast();
  const locale = localeFromPathname(pathname);

  const td = (key: string, fallback: string): string => {
    const result = t(`${DKEY}.${key}`);
    if (!result || result === `${DKEY}.${key}`) return fallback;
    return String(result);
  };

  const rawId = params?.id;
  const certificationId = Number(Array.isArray(rawId) ? rawId[0] : rawId);
  const idValid = Number.isFinite(certificationId) && certificationId > 0;

  const { data: contentAccess } = useContentAccess();
  const certsLocked = contentAccess?.certificationsLocked ?? true;
  const certificationsCheckoutHref = useMemo(
    () => certificationsUpgradeCheckoutHref(locale, 'monthly'),
    [locale],
  );

  const { data: exp, isLoading, isError, refetch } = useLearnerCertificationExperience(certificationId);
  const enrollMutation = useEnrollInCertification();
  const [downloading, setDownloading] = useState(false);
  const [showAllLabs, setShowAllLabs] = useState(false);

  const tips = useMemo(() => {
    const raw = exp?.certification?.finalExamTips;
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => safeText(x)).filter(Boolean);
  }, [exp?.certification?.finalExamTips]);

  const weakAreas = useMemo(() => {
    const raw = exp?.weakAreas ?? [];
    return (Array.isArray(raw) ? raw : []).map((x) => safeText(x)).filter(Boolean);
  }, [exp?.weakAreas]);

  const nextSuggestions = useMemo(() => {
    const raw = exp?.nextCertificationSuggestions ?? [];
    return (Array.isArray(raw) ? raw : []).map((x) => safeText(x)).filter(Boolean);
  }, [exp?.nextCertificationSuggestions]);

  const jobRoles = useMemo(() => {
    const raw = exp?.careerOutcomes?.jobOpportunitiesUnlocked ?? [];
    return (Array.isArray(raw) ? raw : []).map((x) => safeText(x)).filter(Boolean);
  }, [exp?.careerOutcomes?.jobOpportunitiesUnlocked]);

  const milestones = useMemo(() => {
    const raw = exp?.studyPlanner?.milestones ?? [];
    return (Array.isArray(raw) ? raw : []).map((x) => safeText(x)).filter(Boolean);
  }, [exp?.studyPlanner?.milestones]);

  const weeklyPlanner = useMemo(
    () => (Array.isArray(exp?.weeklyPlanner) ? exp!.weeklyPlanner : []),
    [exp?.weeklyPlanner],
  );

  const gamificationTimeline = useMemo(
    () => (Array.isArray(exp?.gamification?.timeline) ? exp!.gamification.timeline : []),
    [exp?.gamification?.timeline],
  );

  const streakHistory = useMemo(
    () => (Array.isArray(exp?.streak?.history) ? exp!.streak.history : []),
    [exp?.streak?.history],
  );

  const practiceAttempts = useMemo(
    () => (Array.isArray(exp?.practiceExamHub?.attempts) ? exp!.practiceExamHub.attempts : []),
    [exp?.practiceExamHub?.attempts],
  );

  const roadmapSteps = useMemo(
    () => (Array.isArray(exp?.roadmap?.steps) ? exp!.roadmap.steps : []),
    [exp?.roadmap?.steps],
  );

  const groupedRoadmapSteps = useMemo(
    () => ({
      courses: roadmapSteps.filter((s) => s.stepType === 'course'),
      labs: roadmapSteps.filter((s) => s.stepType === 'lab'),
      exams: roadmapSteps.filter((s) => s.stepType === 'practice_exam'),
      final: roadmapSteps.filter((s) => s.stepType === 'final_certificate'),
      other: roadmapSteps.filter(
        (s) =>
          s.stepType !== 'course' &&
          s.stepType !== 'lab' &&
          s.stepType !== 'practice_exam' &&
          s.stepType !== 'final_certificate',
      ),
    }),
    [roadmapSteps],
  );

  const pathStepCounts = useMemo(() => ({
    courses: groupedRoadmapSteps.courses.length,
    labs: groupedRoadmapSteps.labs.length,
    exams: groupedRoadmapSteps.exams.length,
    total: roadmapSteps.length,
  }), [groupedRoadmapSteps, roadmapSteps]);

  const resourceLinks = useMemo(
    () => normalizeResourceLinks(
      exp?.certification?.resources && typeof exp.certification.resources === 'object'
        ? (exp.certification.resources as Record<string, unknown>)
        : undefined,
    ),
    [exp?.certification?.resources],
  );

  const firstPracticeExamHref = useMemo(() => {
    const step = roadmapSteps.find((s) => s.stepType === 'practice_exam');
    if (!step) return null;
    return stepHref(locale, 'practice_exam', safeText(step.stepRef));
  }, [roadmapSteps, locale]);

  const practiceStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'ready': return td('practiceStatusReady', 'Ready');
      case 'in_progress': return td('practiceStatusInProgress', 'In progress');
      default: return td('practiceStatusNotStarted', 'Not started');
    }
  };

  const handleEnroll = async () => {
    if (!idValid) return;
    try {
      await enrollMutation.mutateAsync(certificationId);
      showToast(String(t('learnerCertifications.enrolledToast')), 'success');
      await refetch();
    } catch {
      showToast(String(t('learnerCertifications.enrollFailed')), 'error');
    }
  };

  const handleDownloadCert = async () => {
    if (!idValid) return;
    setDownloading(true);
    try {
      const response = await downloadLearnerCertificatePdf(certificationId);
      const filename = filenameFromContentDisposition(response.headers['content-disposition']);
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'application/pdf' });
      triggerBlobDownload(blob, filename ?? `certificate-${certificationId}.pdf`);
      showToast(td('certificateDownloaded', 'Downloaded.'), 'success');
    } catch {
      showToast(td('certificateDownloadFailed', 'Download failed.'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (!idValid) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
        {td('invalidId', 'Invalid certification.')}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" aria-hidden />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (isError || !exp) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-rose-200/80 bg-rose-50/50 p-8 shadow-sm">
        <p className="text-sm font-medium text-rose-900">{td('loadFailed', 'Could not load.')}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => refetch()}>
            {td('retry', 'Retry')}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href={`/${locale}/dashboard/learner/certifications`} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {td('backToHub', 'Back')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const c = exp.certification;
  const linked = exp.linkedCourse;
  const linkedCoursesList =
    Array.isArray(exp.linkedCourses) && exp.linkedCourses.length > 0
      ? exp.linkedCourses
      : linked ? [linked] : [];

  const readinessPct = Math.round(Number(exp.readiness?.percent ?? 0));
  const enrollmentStarted = exp.progress?.enrollmentStatus === 'in_progress';
  const issued = exp.issuedCertificate as Record<string, unknown> | null | undefined;
  const hasIssued = issued && typeof issued === 'object' && issued !== null;

  const primaryCta = exp.nextRecommendedAction;
  const primaryHref =
    primaryCta && typeof primaryCta === 'object' && 'type' in primaryCta
      ? stepHref(locale, primaryCta.type as CertificationPathStepType, safeText(primaryCta.stepRef))
      : null;

  const langLabel = lang === 'fr' ? 'Français' : 'English';
  const domainOrLevel = safeText(c.domain) || safeText(c.level) || '—';
  const levelLabel = safeText(c.level) || '—';

  const visibleLabs = showAllLabs
    ? groupedRoadmapSteps.labs
    : groupedRoadmapSteps.labs.slice(0, 3);

  const contentCourses = groupedRoadmapSteps.courses.length > 0
    ? groupedRoadmapSteps.courses
    : linkedCoursesList.map((lc) => ({
        stepOrder: 0,
        stepType: 'course' as CertificationPathStepType,
        stepRef: lc.courseId,
        title: lc.title,
        description: lc.description,
        completed: false,
        ctaLabel: td('openCourse', 'Open'),
      }));

  return (
    <div className="relative mx-auto max-w-7xl space-y-5 pb-14">
      {certsLocked && (
        <LockedOverlay
          locked={certsLocked}
          locale={locale}
          minimumPlan="premium_only"
          message={String(t('subscription.certificationsLockedPremium'))}
          checkoutHref={certificationsCheckoutHref}
        />
      )}

      {/* Breadcrumb */}
      <Link
        href={`/${locale}/dashboard/learner/certifications`}
        className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 transition hover:text-violet-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {td('backToHub', 'Back to My Certifications')}
      </Link>

      {/* ── HERO ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm"
      >
        <div className="grid gap-6 p-6 md:grid-cols-[1fr,min(220px,28%)]">
          <div className="min-w-0 space-y-4">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                {safeText(c.provider, 'Provider')}
              </span>
              {c.examCode && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {safeText(c.examCode)}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {safeText(c.title, 'Certification')}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
              {safeText(c.description)}
            </p>

            {/* Metadata chips */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: td('credentialType', 'Credential type'), value: domainOrLevel },
                { label: td('level', 'Level'), value: levelLabel },
                {
                  label: td('studentsMeta', 'Estimated effort'),
                  value: c.estimatedHours != null && c.estimatedHours > 0
                    ? `${c.estimatedHours} h`
                    : (exp.progress?.totalLessons ?? 0) > 0
                      ? `${safeText(exp.progress?.totalLessons)} modules`
                      : '—',
                },
                { label: td('language', 'Language'), value: langLabel },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-slate-900" title={item.value}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-2 pt-1">
              {hasIssued ? (
                <Button type="button" onClick={handleDownloadCert} disabled={downloading} variant="outline" className="border-slate-200">
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span className="ml-2">{td('downloadCertificate', 'Download')}</span>
                </Button>
              ) : null}

              {enrollmentStarted ? (
                primaryHref ? (
                  <Button type="button" asChild className="bg-violet-600 hover:bg-violet-700">
                    <Link href={primaryHref}>
                      <TrendingUp className="h-4 w-4" />
                      <span className="ml-2">{td('continuePath', 'Continue path')}</span>
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null
              ) : (
                <Button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrollMutation.isPending || certsLocked}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {enrollMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                  <span className="ml-2">{td('enroll', 'Enroll')}</span>
                </Button>
              )}

              {certsLocked && ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS ? (
                <Button type="button" asChild className="bg-gradient-to-r from-violet-600 to-fuchsia-600">
                  <Link href={certificationsCheckoutHref}>
                    <Crown className="h-4 w-4" />
                    <span className="ml-2">{String(t('subscription.certificationsUpgradeCta'))}</span>
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          {/* Illustration */}
          <div className="relative flex min-h-[160px] items-center justify-center rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50/60">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <Cloud className="h-10 w-10 text-violet-600" aria-hidden />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── MAIN 2-COLUMN ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr,380px]">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Progression card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">
                {td('readinessTitle', 'Progression')}
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {readinessPct}% · {practiceStatusLabel(exp.practiceExamStatus)}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all"
                style={{ width: `${readinessPct}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{safeText(exp.readiness?.message)}</p>
            {primaryHref && (
              <Button type="button" asChild className="mt-4 bg-violet-600 hover:bg-violet-700">
                <Link href={primaryHref}>
                  {enrollmentStarted ? td('continuePath', 'Continue path') : td('startLearning', 'Start learning')}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          {/* Certification Path card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              {td('certificationPath', 'Certification path')}
            </h2>
            {pathStepCounts.total > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                {pathStepCounts.courses} {td('pathCoursesLabel', 'compulsory courses')}
                {pathStepCounts.labs > 0 && ` · ${pathStepCounts.labs} ${td('pathLabsLabel', 'complementary resources')}`}
              </p>
            )}

            {roadmapSteps.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">{td('noPathSteps', 'No path steps yet.')}</p>
            ) : (
              <div className="mt-5 space-y-6">

                {/* COURS OBLIGATOIRES */}
                {groupedRoadmapSteps.courses.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      {td('pathSectionCourses', 'Compulsory courses')}
                    </p>
                    <ol className="mt-3 space-y-2">
                      {groupedRoadmapSteps.courses.map((step, index) => {
                        const href = stepHref(locale, step.stepType, safeText(step.stepRef));
                        const done = Boolean(step.completed);
                        return (
                          <li key={`${step.stepOrder}-${step.stepRef}`}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                          >
                            <span className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                              done
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-violet-200 bg-white text-violet-700',
                            )}>
                              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">{safeText(step.title)}</p>
                              {exp.progress?.courseProgressPercent != null && (
                                <p className="text-xs text-slate-500">{safeText(exp.progress.courseProgressPercent)}%</p>
                              )}
                            </div>
                            {href && (
                              <Button type="button" variant="ghost" size="sm" className="shrink-0 text-violet-700 hover:text-violet-900" asChild>
                                <Link href={href}>{done ? td('openCourse', 'Open') : td('startCourse', 'Start Course')}</Link>
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}

                {/* RESSOURCES COMPLÉMENTAIRES */}
                {groupedRoadmapSteps.labs.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      {td('pathSectionLabs', 'Complementary resources')}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {visibleLabs.map((step) => {
                        const href = stepHref(locale, step.stepType, safeText(step.stepRef));
                        return (
                          <li key={`${step.stepOrder}-${step.stepRef}`}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                          >
                            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{safeText(step.title)}</span>
                            {href ? (
                              <Button type="button" variant="ghost" size="sm" className="shrink-0 text-violet-700 hover:text-violet-900" asChild>
                                <Link href={href}>{td('openResource', 'Open')}</Link>
                              </Button>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    {groupedRoadmapSteps.labs.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllLabs((v) => !v)}
                        className="mt-2 w-full py-2 text-center text-sm font-medium text-violet-700 hover:text-violet-900"
                      >
                        {showAllLabs
                          ? td('showAllResources', 'Show fewer')
                          : `${td('showAllResources', 'Show all resources')} (${groupedRoadmapSteps.labs.length})`}
                      </button>
                    )}
                  </div>
                )}

                {/* PRATIQUE EXAMENS */}
                {groupedRoadmapSteps.exams.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      {td('pathSectionPracticeExams', 'Practice exams')}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {groupedRoadmapSteps.exams.map((step) => {
                        const href = stepHref(locale, step.stepType, safeText(step.stepRef));
                        return (
                          <li key={`${step.stepOrder}-${step.stepRef}`}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                          >
                            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{safeText(step.title)}</span>
                            {href ? (
                              <Button type="button" variant="ghost" size="sm" className="shrink-0 text-violet-700 hover:text-violet-900" asChild>
                                <Link href={href}>{td('takePracticeExam', 'Take exam')}</Link>
                              </Button>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Other assessments */}
                {groupedRoadmapSteps.other.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      {td('pathSectionOther', 'Assessments')}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {groupedRoadmapSteps.other.map((step) => {
                        const href = stepHref(locale, step.stepType, safeText(step.stepRef));
                        return (
                          <li key={`${step.stepOrder}-${step.stepRef}`}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                          >
                            <Target className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{safeText(step.title)}</span>
                            {href ? (
                              <Button type="button" variant="ghost" size="sm" className="shrink-0 text-violet-700 hover:text-violet-900" asChild>
                                <Link href={href}>{safeText(step.ctaLabel, td('openResource', 'Open'))}</Link>
                              </Button>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* CERTIFICATION FINALE */}
                {groupedRoadmapSteps.final.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      {td('pathSectionFinal', 'Final certificate')}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {groupedRoadmapSteps.final.map((step) => {
                        const done = Boolean(step.completed);
                        const priorIncomplete = roadmapSteps
                          .filter((s) => s.stepType !== 'final_certificate')
                          .some((s) => !s.completed);
                        const locked = !done && priorIncomplete;
                        return (
                          <li key={`${step.stepOrder}-${step.stepRef}`}
                            className={cn(
                              'flex items-center gap-3 rounded-xl border px-4 py-3',
                              locked ? 'border-slate-100 bg-slate-50/50' : 'border-emerald-100 bg-emerald-50/50',
                            )}
                          >
                            <Award className={cn('h-4 w-4 shrink-0', locked ? 'text-slate-300' : 'text-emerald-500')} />
                            <div className="min-w-0 flex-1">
                              <p className={cn('truncate text-sm font-medium', locked ? 'text-slate-500' : 'text-slate-900')}>
                                {safeText(step.title)}
                              </p>
                              {locked && (
                                <p className="text-xs text-slate-400">{td('availableAtEnd', 'Available at the end of the path')}</p>
                              )}
                            </div>
                            {locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" /> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-4">

          {/* Contenu de la certification */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              {td('certContent', 'Certification content')}
            </h2>
            {contentCourses.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {contentCourses.map((step, i) => {
                  const IconComponent = COURSE_ICONS[i % COURSE_ICONS.length];
                  const colorClass = COURSE_ICON_COLORS[i % COURSE_ICON_COLORS.length];
                  const href = 'courseId' in step
                    ? `/${locale}/dashboard/learner/cours/${encodeURIComponent((step as { courseId: string }).courseId)}`
                    : stepHref(locale, 'course', safeText((step as { stepRef: string }).stepRef));
                  return (
                    <li key={i} className="flex gap-3">
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', colorClass)}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-slate-900">{safeText((step as { title: string }).title)}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {safeText((step as { description?: string }).description)}
                        </p>
                        {href ? (
                          <Link
                            href={href}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900"
                          >
                            {td('openCourse', 'Open')}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{td('noLinkedCourse', 'No linked course.')}</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs font-medium text-slate-500">{td('lessonsCompleted', 'Lessons completed')}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                  {safeText(exp.progress?.completedLessons)} / {safeText(exp.progress?.totalLessons)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{td('overallProgress', 'Overall progress')}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                  {safeText(exp.progress?.courseProgressPercent)}%
                </p>
              </div>
            </div>
          </div>

          {/* Points à renforcer */}
          {weakAreas.length > 0 && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">{td('weakAreas', 'Weak areas')}</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
                {weakAreas.map((w) => <li key={w}>{w}</li>)}
              </ul>
              {primaryHref && (
                <Link href={primaryHref} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900">
                  {td('viewDetails', 'View details')} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}

          {/* Perspectives carrière */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{td('careerOutlook', 'Career outlook')}</h3>
              <Briefcase className="h-5 w-5 shrink-0 text-slate-300" />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{td('focus', 'Focus')}: </span>
              {safeText(exp.careerOutcomes?.roleFocus)}
            </p>
            {jobRoles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {jobRoles.map((r) => (
                  <span key={r} className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                    {r}
                  </span>
                ))}
              </div>
            )}
            <Link href={`/${locale}/dashboard/learner/emploi`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900">
              {td('viewCareerPaths', 'Career paths')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Plan d'études */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">{td('studyPlan', 'Study plan')}</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
              {c.estimatedHours != null && c.estimatedHours > 0 && (
                <li className="flex items-center gap-2">
                  <span className="text-slate-400">•</span>
                  {c.estimatedHours}h de formation
                </li>
              )}
              {pathStepCounts.labs > 0 && (
                <li className="flex items-center gap-2">
                  <span className="text-slate-400">•</span>
                  {pathStepCounts.labs} {td('pathLabsLabel', 'complementary resources')}
                </li>
              )}
              {pathStepCounts.exams > 0 && (
                <li className="flex items-center gap-2">
                  <span className="text-slate-400">•</span>
                  {pathStepCounts.exams} {td('pathPracticeExamsLabel', 'practice exams')}
                </li>
              )}
              {groupedRoadmapSteps.final.length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="text-slate-400">•</span>
                  {td('pathSectionFinal', 'Final certificate')}
                </li>
              )}
              {milestones.slice(0, 3).map((m) => (
                <li key={m} className="flex items-center gap-2">
                  <span className="text-slate-400">•</span>
                  {m}
                </li>
              ))}
            </ul>
            {exp.estimatedExamReadinessDate && (
              <p className="mt-3 text-xs font-medium text-slate-700">
                {td('targetReadinessDate', 'Target date')}: {safeText(exp.estimatedExamReadinessDate)}
              </p>
            )}
            {primaryHref && (
              <Link href={primaryHref} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900">
                {td('viewStudyPlan', 'View plan')} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM 4-COL ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Certifications suivantes */}
        <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">{td('nextCerts', 'Next certifications')}</h3>
          {nextSuggestions.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">—</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {nextSuggestions.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  {s}
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/${locale}/dashboard/learner/certifications`}
            className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
          >
            {td('explorePath', 'Explore')} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Séries (Streak) */}
        <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">{td('streak', 'Streak')}</h3>
          <p className="mt-2 text-sm text-slate-600">
            {safeText(exp.streak?.daysActive ?? '0')} day · {td('best', 'Best')}: {safeText(exp.streak?.longestStreak ?? '1')}
          </p>
          {streakHistory.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {streakHistory.slice(0, 10).map((h) => (
                <span
                  key={safeText(h.date)}
                  className={cn('h-2 w-2 rounded-full', h.active ? 'bg-violet-500' : 'bg-slate-200')}
                  title={safeText(h.date)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-2 flex gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-slate-200" />
              ))}
            </div>
          )}
          <span className={cn(
            'mt-3 self-start rounded-full px-2.5 py-0.5 text-xs font-medium',
            exp.streak?.onTrack ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
          )}>
            {exp.streak?.onTrack ? td('onTrack', 'On track') : td('offTrack', 'Behind')}
          </span>
        </div>

        {/* Expérience (XP / Gamification) */}
        <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{td('xp', 'Experience')}</h3>
              <p className="mt-1 text-sm font-semibold text-violet-700">
                Level {safeText(exp.gamification?.level ?? '1')} · {safeText(exp.gamification?.xp ?? '0')} XP
              </p>
            </div>
            <Trophy className="h-8 w-8 text-amber-400/60" />
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Leçons terminées</span>
              <span className="font-medium text-slate-700">{safeText(exp.progress?.completedLessons ?? '0')}</span>
            </div>
            <div className="flex justify-between">
              <span>Heures apprises</span>
              <span className="font-medium text-slate-700">
                {c.estimatedHours != null ? `${Math.round((c.estimatedHours * readinessPct) / 100)}h` : '0h'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Points gagnés</span>
              <span className="font-medium text-slate-700">{safeText(exp.gamification?.xp ?? '0')}</span>
            </div>
          </div>
          {gamificationTimeline.length > 0 && (
            <div className="mt-3 max-h-16 space-y-1 overflow-y-auto border-t border-slate-100 pt-2 text-[11px] text-slate-400">
              {gamificationTimeline.map((row) => (
                <div key={`${safeText(row.date)}-${safeText(row.label)}`} className="flex justify-between gap-2">
                  <span className="truncate">{safeText(row.label)}</span>
                  <span className="shrink-0 tabular-nums text-emerald-600">+{safeText(row.xpGained)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Semaine (Weekly Planner) */}
        <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarDays className="h-4 w-4 text-violet-600" />
            {td('weekPlan', 'Week')}
          </h3>
          <div className="mt-3 flex-1 space-y-2 text-xs">
            {weeklyPlanner.length === 0 ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() + i);
                  return (
                    <div key={i} className="flex justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <span className="tabular-nums text-slate-500">{date.toISOString().slice(0, 10)}</span>
                      <span className="text-right text-slate-400">Focused preparation session</span>
                    </div>
                  );
                })}
              </>
            ) : (
              weeklyPlanner.slice(0, 5).map((d) => (
                <div key={safeText(d.date)} className="flex justify-between gap-2 border-b border-slate-100 pb-1.5">
                  <span className="tabular-nums text-slate-500">{safeText(d.date)}</span>
                  <span className="max-w-[55%] text-right text-slate-600">{safeText(d.task)}</span>
                </div>
              ))
            )}
          </div>
          <Link
            href={`/${locale}/dashboard/learner/certifications`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900"
          >
            {td('viewCalendar', 'View calendar')} <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── PRACTICE EXAMS ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{td('practiceExams', 'Practice exams')}</h3>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
              <span>
                {td('attempts', 'Attempts')}:{' '}
                <span className="font-semibold text-slate-900">{safeText(exp.practiceExamHub?.totalAttempts ?? 0)}</span>
              </span>
              <span>
                {td('average', 'Average')}:{' '}
                <span className="font-semibold text-slate-900">{safeText(exp.practiceExamHub?.averageScore ?? 0)}%</span>
              </span>
              <span>
                {td('best', 'Best')}:{' '}
                <span className="font-semibold text-slate-900">{safeText(exp.practiceExamHub?.bestScore ?? 0)}%</span>
              </span>
            </div>
          </div>
          {firstPracticeExamHref ? (
            <Button type="button" className="bg-violet-600 hover:bg-violet-700 sm:shrink-0" asChild>
              <Link href={firstPracticeExamHref}>{td('startPracticeExam', 'Launch practice exam')}</Link>
            </Button>
          ) : null}
        </div>
        {practiceAttempts.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">{td('noAttempts', 'No attempts yet.')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {practiceAttempts.map((a) => {
              let when = '';
              if (a.completedAt != null) {
                try { when = new Date(a.completedAt as string | number | Date).toLocaleString(); } catch { when = ''; }
              }
              return (
                <li key={safeText(a.id)} className="flex justify-between gap-2 py-2">
                  <span className="text-slate-600">{safeText(a.status)}</span>
                  <span className="tabular-nums text-slate-900">{safeText(a.score)}% · {when}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Exam tips (optional) */}
      {tips.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">{td('examTips', 'Exam tips')}</h3>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-600">
            {tips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </div>
      )}

      {/* External resources (optional) */}
      {resourceLinks.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">{td('resources', 'Resources')}</h3>
          <ul className="mt-4 space-y-2">
            {resourceLinks.map((r) => (
              <li key={r.id}>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 underline-offset-4 hover:underline"
                >
                  {r.label}
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>
          {td('quizAvg', 'Quiz avg')}: <span className="font-semibold text-slate-800">{safeText(exp.quizAverage)}%</span>
        </span>
        <button
          type="button"
          className="font-medium text-violet-700 hover:text-violet-900"
          onClick={() => router.push(`/${locale}/dashboard/learner/certifications`)}
        >
          {td('backToHub', 'Back')}
        </button>
      </footer>
    </div>
  );
}

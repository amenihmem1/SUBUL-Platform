'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Award,
  BadgeCheck,
  Download,
  Eye,
  ExternalLink,
  Clock,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Search,
  CheckCircle,
  TrendingUp,
  Shield,
  Target,
  BarChart3,
  Loader2,
  GraduationCap,
  Crown,
  LayoutGrid,
  Sparkles,
  BookOpen,
  Zap,
  ArrowRight,
  Star,
  Users,
  Trophy,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from '@/contexts/LanguageContext';
import { mapToLearnerCertifications, type LearnerCertification } from '@/lib/certifications/learner-mapping';
import {
  useLearnerCertifications,
  useLearnerCertificationsStatus,
  useEnrollInCertification,
  useLearnerIssuedCertificates,
  useVerifyLearnerCertificate,
} from '@/hooks/api/useCertifications';
import { useToast } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { localeFromPathname } from '@/lib/i18n/config';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';
import { useContentAccess } from '@/hooks/api/useContentAccess';
import { LockedOverlay } from '@/components/ui/locked-overlay';
import { certificationsUpgradeCheckoutHref } from '@/lib/subscription/certificationAccess';
import type { LearnerCertificationEarned, LearnerCertificationInProgress } from '@/services/certifications';
import { downloadLearnerCertificatePdf } from '@/services/certifications';
import { filenameFromContentDisposition, triggerBlobDownload } from '@/lib/downloads';
import CertificationPathProgress from '@/components/learner/CertificationPathProgress';

const PAGE_SIZE = 9;

type Tab = 'all' | 'earned' | 'in-progress' | 'available';

function visiblePageNumbers(current: number, total: number): number[] {
  const maxBtn = 5;
  if (total <= maxBtn) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + maxBtn - 1);
  start = Math.max(1, end - maxBtn + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function PaginationBar({
  page,
  totalPages,
  onPageChange,
  labels,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  labels: { prev: string; next: string };
}) {
  if (totalPages <= 1) return null;
  const nums = visiblePageNumbers(page, totalPages);
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5 pt-10" aria-label="Pagination">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={labels.prev}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPageChange(n)}
          className={cn(
            'flex h-9 min-w-9 items-center justify-center rounded-lg text-sm font-semibold transition-all',
            n === page
              ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-600',
          )}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600 disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label={labels.next}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

const DIFFICULTY_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  beginner: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  intermediate: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  advanced: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
  associate: { dot: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50' },
  professional: { dot: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50' },
  specialty: { dot: 'bg-fuchsia-500', text: 'text-fuchsia-700', bg: 'bg-fuchsia-50' },
};

function DifficultyBadge({ level }: { level?: string }) {
  if (!level) return null;
  const key = level.toLowerCase();
  const style = DIFFICULTY_STYLES[key] ?? { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', style.bg, style.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {level}
    </span>
  );
}

function ReadinessRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="3" stroke="#e2e8f0" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth="3"
        stroke="url(#ring-grad)"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c026d3" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill="#1e293b">
        {value}%
      </text>
    </svg>
  );
}

function CertificationCatalogCard({
  cert,
  locale,
  certsLocked,
  certificationsCheckoutHref,
  enrolledCertificationIds,
  enrollMutation,
  t,
  router,
  index,
  shouldReduceMotion,
}: {
  cert: LearnerCertification;
  locale: string;
  certsLocked: boolean;
  certificationsCheckoutHref: string;
  enrolledCertificationIds: Set<number>;
  enrollMutation: ReturnType<typeof useEnrollInCertification>;
  t: (key: string) => string;
  router: ReturnType<typeof useRouter>;
  index: number;
  shouldReduceMotion: boolean | null;
}) {
  const hasCourse = !!cert.courseId;
  const enrolled = enrolledCertificationIds.has(cert.id);
  const readiness = cert.completion ?? 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : index * 0.04 }}
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border bg-white shadow-sm transition-all duration-200',
        certsLocked
          ? 'border-slate-200/60 opacity-80'
          : 'border-slate-200 hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5',
      )}
    >
      <LockedOverlay
        locked={certsLocked}
        locale={locale}
        compact
        minimumPlan="premium_only"
        message={String(t('subscription.certificationsLockedPremium'))}
        checkoutHref={certificationsCheckoutHref}
      />

      {/* Top accent strip */}
      <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500" />

      <div className="flex flex-1 flex-col p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-lg ring-1 ring-slate-200/70"
            aria-hidden
          >
            {cert.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-slate-900">
              {cert.name}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{cert.issuer}</p>
          </div>
          <DifficultyBadge level={cert.difficulty} />
        </div>

        {/* Description */}
        {cert.description ? (
          <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-slate-600">{cert.description}</p>
        ) : null}

        {/* Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {enrolled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200/60">
              <Flame className="h-3 w-3" />
              {t('learnerCertifications.enrollmentInProgress')}
            </span>
          )}
          {hasCourse && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
              <BookOpen className="h-3 w-3" />
              {t('learnerCourses.courseAvailable')}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium tabular-nums text-slate-700">{(cert.students ?? 0).toLocaleString()}</span>
            </span>
            {cert.duration && cert.duration !== 'N/A' && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium text-slate-700">{cert.duration}</span>
              </span>
            )}
          </div>
          <ReadinessRing value={readiness} size={40} />
        </div>

        {/* Path progress */}
        <CertificationPathProgress certificationId={cert.id} />

        {/* CTA */}
        <button
          type="button"
          disabled={enrollMutation.isPending}
          onClick={() => router.push(`/${locale}/dashboard/learner/certifications/${cert.id}`)}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-sm font-semibold text-white shadow-sm transition-all hover:from-fuchsia-700 hover:to-violet-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-70"
        >
          {enrollMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <GraduationCap className="h-4 w-4" />
              <span>{t('learnerCertifications.startPrep')}</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-80" />
            </>
          )}
        </button>
      </div>
    </motion.article>
  );
}

function EarnedCertCard({
  cert,
  issuedCertificates,
  downloadingCertId,
  onDownload,
  onDetails,
  onVerify,
  t,
  locale,
  router,
}: {
  cert: LearnerCertificationEarned;
  issuedCertificates: Array<{ certificationId: number; verificationCode?: string }>;
  downloadingCertId: number | null;
  onDownload: (cert: LearnerCertificationEarned) => void;
  onDetails: (cert: LearnerCertificationEarned) => void;
  onVerify: (cert: LearnerCertificationEarned) => void;
  t: (key: string) => string;
  locale: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-white shadow-sm transition-all hover:border-emerald-300 hover:shadow-md">
      <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200/70">
            <Trophy className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">{cert.name}</h3>
                <p className="text-xs font-medium text-slate-500">{cert.issuer}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200/70">
                <CheckCircle className="h-3 w-3" />
                {t('learnerCertifications.completed')}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {t('learnerCertifications.issued')} <span className="font-semibold text-slate-700">{cert.issueDate}</span>
              </span>
              {cert.expiryDate ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {t('learnerCertifications.expires')} <span className="font-semibold text-slate-700">{cert.expiryDate}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-50"
            onClick={() => onDownload(cert)}
            disabled={downloadingCertId === cert.id}
          >
            {downloadingCertId === cert.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t('learnerCertifications.download')}
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
            onClick={() => onDetails(cert)}
          >
            <Eye className="h-3.5 w-3.5" />
            {t('learnerCertifications.details')}
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
            onClick={() => onVerify(cert)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('learnerCertifications.verify')}
          </button>
        </div>
      </div>
    </article>
  );
}

function InProgressCard({
  cert,
  locale,
  router,
  t,
}: {
  cert: LearnerCertificationInProgress;
  locale: string;
  router: ReturnType<typeof useRouter>;
  t: (key: string) => string;
}) {
  const pct = cert.progress ?? 0;
  return (
    <article className="group rounded-2xl border border-violet-200/60 bg-white p-5 shadow-sm transition-all hover:border-violet-300 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 ring-1 ring-violet-200/70">
          <Clock className="h-6 w-6 text-violet-600" />
          {pct >= 50 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-500 ring-2 ring-white">
              <Zap className="h-2.5 w-2.5 text-white" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900">{cert.name}</h3>
          <p className="text-xs font-medium text-slate-500">{cert.issuer}</p>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500">{t('learnerCertifications.progress')}</span>
              <span className="font-bold tabular-nums text-violet-700">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          <CertificationPathProgress certificationId={cert.id} />
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:from-fuchsia-700 hover:to-violet-700 active:scale-[0.98]"
          onClick={() => router.push(`/${locale}/dashboard/learner/certifications/${cert.id}`)}
        >
          <Flame className="h-3.5 w-3.5" />
          {t('learnerCertifications.continueLearning')}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action }: {
  icon: typeof Award;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/60 to-white py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <Icon className="h-8 w-8 text-slate-300" />
      </div>
      <p className="text-base font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default function CertificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [catalogPage, setCatalogPage] = useState(1);
  const [downloadingCertId, setDownloadingCertId] = useState<number | null>(null);

  const { data: contentAccess } = useContentAccess();
  const certsLocked = contentAccess?.certificationsLocked ?? true;
  const certificationsCheckoutHref = useMemo(
    () => certificationsUpgradeCheckoutHref(locale, 'monthly'),
    [locale],
  );

  const { data: learnerCertifications = [], isLoading: loadingAvailable } = useLearnerCertifications();
  const { data: certStatus, isLoading: loadingStatus } = useLearnerCertificationsStatus();
  const { data: issuedCertificates = [] } = useLearnerIssuedCertificates();
  const enrollMutation = useEnrollInCertification();
  const verifyMutation = useVerifyLearnerCertificate();
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const downloadEarnedSummary = async (cert: LearnerCertificationEarned) => {
    setDownloadingCertId(cert.id);
    try {
      const response = await downloadLearnerCertificatePdf(cert.id);
      const filename = filenameFromContentDisposition(response.headers['content-disposition']);
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'application/pdf' });
      triggerBlobDownload(blob, filename ?? `certificate-${cert.id}.pdf`);
      showToast('Téléchargement du certificat réussi.', 'success');
    } catch {
      showToast('Échec de génération du certificat PDF.', 'error');
    } finally {
      setDownloadingCertId(null);
    }
  };

  const handleDetails = (cert: LearnerCertificationEarned) => {
    if (!cert.courseId) {
      showToast('Détails indisponibles: cours associé introuvable.', 'error');
      return;
    }
    router.push(`/${locale}/dashboard/learner/cours/${cert.courseId}`);
  };

  const handleVerify = (cert: LearnerCertificationEarned) => {
    const issued = issuedCertificates.find((item) => item.certificationId === cert.id);
    if (!issued?.verificationCode) {
      showToast('Code de vérification indisponible pour ce certificat.', 'error');
      return;
    }
    verifyMutation
      .mutateAsync(issued.verificationCode)
      .then(() => showToast('Certificat vérifié avec succès.', 'success'))
      .catch(() => showToast('Échec de la vérification du certificat.', 'error'));
  };

  const availableCertifications = useMemo(
    () => mapToLearnerCertifications(Array.isArray(learnerCertifications) ? learnerCertifications : []),
    [learnerCertifications],
  );
  const earnedCertifications: LearnerCertificationEarned[] = useMemo(
    () => certStatus?.earned ?? [],
    [certStatus?.earned],
  );
  const inProgressCertifications: LearnerCertificationInProgress[] = useMemo(
    () => certStatus?.inProgress ?? [],
    [certStatus?.inProgress],
  );

  const distinctLevels = useMemo(() => {
    const s = new Set<string>();
    availableCertifications.forEach((c) => { if (c.difficulty) s.add(c.difficulty); });
    return Array.from(s).sort();
  }, [availableCertifications]);

  const filteredEarned = useMemo(
    () => earnedCertifications.filter(
      (cert) =>
        cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.issuer.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    [searchQuery, earnedCertifications],
  );

  const filteredInProgress = useMemo(
    () => inProgressCertifications.filter(
      (cert) =>
        cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.issuer.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    [searchQuery, inProgressCertifications],
  );

  const filteredAvailable = useMemo(
    () => availableCertifications.filter(
      (cert) =>
        cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.issuer.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    [searchQuery, availableCertifications],
  );

  const catalogFiltered = useMemo(() => {
    if (levelFilter === 'all') return filteredAvailable;
    return filteredAvailable.filter(
      (c) => c.difficulty?.toLowerCase() === levelFilter.toLowerCase(),
    );
  }, [filteredAvailable, levelFilter]);

  const catalogTotalPages = Math.max(1, Math.ceil(catalogFiltered.length / PAGE_SIZE));
  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * PAGE_SIZE;
    return catalogFiltered.slice(start, start + PAGE_SIZE);
  }, [catalogFiltered, catalogPage]);

  useEffect(() => { setCatalogPage(1); }, [searchQuery, levelFilter, activeTab]);
  useEffect(() => {
    if (catalogPage > catalogTotalPages) setCatalogPage(catalogTotalPages);
  }, [catalogPage, catalogTotalPages]);

  const enrolledCertificationIds = useMemo(
    () => new Set(inProgressCertifications.map((c) => c.id)),
    [inProgressCertifications],
  );

  const successRateDisplay = useMemo(() => {
    const e = earnedCertifications.length;
    const p = inProgressCertifications.length;
    if (e + p === 0) return '—';
    return `${Math.round((e / (e + p)) * 100)}%`;
  }, [earnedCertifications.length, inProgressCertifications.length]);

  const successRateBar = useMemo(() => {
    const e = earnedCertifications.length;
    const p = inProgressCertifications.length;
    if (e + p === 0) return 0;
    return Math.round((e / (e + p)) * 100);
  }, [earnedCertifications.length, inProgressCertifications.length]);

  const tabs: { id: Tab; label: string; count: number; icon: typeof Award; color: string }[] = [
    { id: 'all', label: t('learnerCertifications.all'), count: availableCertifications.length, icon: LayoutGrid, color: 'text-slate-600' },
    { id: 'earned', label: t('learnerCertifications.earned'), count: earnedCertifications.length, icon: Trophy, color: 'text-emerald-600' },
    { id: 'in-progress', label: t('learnerCertifications.inProgress'), count: inProgressCertifications.length, icon: Flame, color: 'text-violet-600' },
    { id: 'available', label: t('learnerCertifications.available'), count: availableCertifications.length, icon: Star, color: 'text-amber-600' },
  ];

  const statCards = [
    {
      icon: Trophy,
      count: earnedCertifications.length,
      title: t('learnerCertifications.earned'),
      subtitle: t('learnerCertifications.activeCertifications'),
      gradient: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      bar: earnedCertifications.length > 0 ? 100 : 8,
    },
    {
      icon: Flame,
      count: inProgressCertifications.length,
      title: t('learnerCertifications.inProgress'),
      subtitle: t('learnerCertifications.currentlyPreparing'),
      gradient: 'from-violet-500 to-indigo-500',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      bar: inProgressCertifications.length > 0 ? Math.min(100, inProgressCertifications.length * 25) : 8,
    },
    {
      icon: Target,
      count: successRateDisplay,
      title: t('learnerCertifications.successRate'),
      subtitle: t('learnerCertifications.examPassRate'),
      gradient: 'from-fuchsia-500 to-pink-500',
      iconBg: 'bg-fuchsia-50',
      iconColor: 'text-fuchsia-600',
      bar: successRateBar,
    },
    {
      icon: BarChart3,
      count: availableCertifications.length,
      title: t('learnerCertifications.available'),
      subtitle: t('learnerCertifications.certificationsToP'),
      gradient: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      bar: Math.min(100, Math.max(8, availableCertifications.length * 3)),
    },
  ];

  const renderCatalogGrid = (list: LearnerCertification[]) => (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((cert, i) => (
          <CertificationCatalogCard
            key={cert.id}
            cert={cert}
            locale={locale}
            certsLocked={certsLocked}
            certificationsCheckoutHref={certificationsCheckoutHref}
            enrolledCertificationIds={enrolledCertificationIds}
            enrollMutation={enrollMutation}
            t={t}
            router={router}
            index={i}
            shouldReduceMotion={shouldReduceMotion}
          />
        ))}
      </div>
      <PaginationBar
        page={catalogPage}
        totalPages={catalogTotalPages}
        onPageChange={setCatalogPage}
        labels={{ prev: 'Previous page', next: 'Next page' }}
      />
    </>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 pb-16">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-900 px-6 py-8 text-white shadow-lg md:px-10 md:py-10">
          {/* blobs */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-indigo-400/20 blur-2xl" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Credential Hub
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  Exam readiness
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                {t('learnerCertifications.hub')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/80 md:text-base">
                {t('learnerCertifications.heroLead')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { icon: TrendingUp, key: 'learnerCertifications.careerGrowth' },
                  { icon: Shield, key: 'learnerCertifications.industryValidated' },
                  { icon: Target, key: 'learnerCertifications.skillMastery' },
                ].map(({ icon: Icon, key }) => (
                  <span key={key} className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                    <Icon className="h-3.5 w-3.5 opacity-90" />
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero mini-stats */}
            <div className="grid grid-cols-2 gap-3 lg:shrink-0">
              {[
                { value: earnedCertifications.length, label: t('learnerCertifications.earned'), icon: Trophy },
                { value: inProgressCertifications.length, label: t('learnerCertifications.inProgress'), icon: Flame },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center rounded-xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
                  <Icon className="mb-1.5 h-5 w-5 opacity-80" />
                  <span className="text-2xl font-black tabular-nums">{value}</span>
                  <span className="mt-0.5 text-[11px] font-medium text-white/70">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={String(stat.title)}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : index * 0.06 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className={cn('absolute left-0 top-0 h-full w-1.5 rounded-l-2xl bg-gradient-to-b opacity-90', stat.gradient)} />
            <div className="pl-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl font-black tabular-nums tracking-tight text-slate-900 md:text-3xl">
                    {stat.count}
                  </p>
                  <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {stat.title}
                  </p>
                </div>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-slate-200/60', stat.iconBg)}>
                  <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
                </div>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{stat.subtitle}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className={cn('h-full rounded-full bg-gradient-to-r', stat.gradient)}
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.bar}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Toolbar: tabs + filters ────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Tabs */}
        <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm lg:w-auto">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex min-h-[38px] shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200',
                  active
                    ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm',
                )}
              >
                <tab.icon className={cn('h-4 w-4', active ? 'text-white' : tab.color)} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span
                  className={cn(
                    'inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                    active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          {(activeTab === 'available' || activeTab === 'all') && (
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="h-10 w-full border-slate-200 bg-white shadow-sm sm:w-[180px]">
                <SelectValue placeholder={t('learnerCertifications.allLevels')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('learnerCertifications.allLevels')}</SelectItem>
                {distinctLevels.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              placeholder={t('learnerCertifications.searchPlaceholder') as string}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('learnerCertifications.searchPlaceholder') as string}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>
      </div>

      {/* ── Premium upgrade banner ─────────────────────────────────── */}
      {certsLocked && (activeTab === 'all' || activeTab === 'available') && (
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm sm:flex-row sm:items-center"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white shadow-sm">
            <Crown className="h-5 w-5 text-violet-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">
              {String(t('subscription.certificationsLockedPremium'))}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
              {String(t('subscription.certificationsUpgradePremiumHint'))}
            </p>
          </div>
          {ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS && (
            <Link
              href={certificationsCheckoutHref}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:from-fuchsia-700 hover:to-violet-700"
            >
              <Crown className="h-4 w-4" />
              {String(t('subscription.certificationsUpgradeCta'))}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </motion.div>
      )}

      {/* ── Tab content ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        >
          {/* ALL */}
          {activeTab === 'all' && (
            <div className="space-y-10">
              {/* Earned */}
              {filteredEarned.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                      {t('learnerCertifications.yourCredentials')}
                    </h2>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {filteredEarned.length}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredEarned.map((cert) => (
                      <EarnedCertCard
                        key={cert.id}
                        cert={cert}
                        issuedCertificates={issuedCertificates as Array<{ certificationId: number; verificationCode?: string }>}
                        downloadingCertId={downloadingCertId}
                        onDownload={(c) => void downloadEarnedSummary(c)}
                        onDetails={handleDetails}
                        onVerify={handleVerify}
                        t={t}
                        locale={locale}
                        router={router}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* In progress */}
              {filteredInProgress.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-violet-600" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                      {t('learnerCertifications.activePreparation')}
                    </h2>
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                      {filteredInProgress.length}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredInProgress.map((cert) => (
                      <InProgressCard key={cert.id} cert={cert} locale={locale} router={router} t={t} />
                    ))}
                  </div>
                </section>
              )}

              {/* Catalog */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-500" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                    {t('learnerCertifications.exploreCatalog')}
                  </h2>
                  {catalogFiltered.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      {catalogFiltered.length}
                    </span>
                  )}
                </div>
                {loadingAvailable ? (
                  <div className="flex items-center justify-center gap-3 py-20 text-slate-500">
                    <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                    <span className="text-sm font-medium">Loading certifications…</span>
                  </div>
                ) : catalogFiltered.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title={t('learnerCertifications.noFound')}
                    subtitle="Try adjusting your search or filters"
                    action={
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setLevelFilter('all'); }}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700"
                      >
                        Clear filters
                      </button>
                    }
                  />
                ) : (
                  renderCatalogGrid(paginatedCatalog)
                )}
              </section>
            </div>
          )}

          {/* EARNED */}
          {activeTab === 'earned' && (
            <div className="space-y-4">
              {loadingStatus ? (
                <div className="flex items-center justify-center gap-3 py-20">
                  <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                </div>
              ) : filteredEarned.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title={t('learnerCertifications.noEarned')}
                  subtitle={t('learnerCertifications.completeTosee')}
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab('available')}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-sm hover:from-fuchsia-700 hover:to-violet-700"
                    >
                      <GraduationCap className="h-4 w-4" />
                      {t('learnerCertifications.exploreCatalog')}
                    </button>
                  }
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredEarned.map((cert) => (
                    <EarnedCertCard
                      key={cert.id}
                      cert={cert}
                      issuedCertificates={issuedCertificates as Array<{ certificationId: number; verificationCode?: string }>}
                      downloadingCertId={downloadingCertId}
                      onDownload={(c) => void downloadEarnedSummary(c)}
                      onDetails={handleDetails}
                      onVerify={handleVerify}
                      t={t}
                      locale={locale}
                      router={router}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* IN PROGRESS */}
          {activeTab === 'in-progress' && (
            <div className="space-y-4">
              {loadingStatus ? (
                <div className="flex items-center justify-center gap-3 py-20">
                  <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                </div>
              ) : filteredInProgress.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title={t('learnerCertifications.noInProgress')}
                  subtitle={t('learnerCertifications.browseToStart')}
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab('available')}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-sm hover:from-fuchsia-700 hover:to-violet-700"
                    >
                      <Sparkles className="h-4 w-4" />
                      {t('learnerCertifications.available')}
                    </button>
                  }
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredInProgress.map((cert) => (
                    <InProgressCard key={cert.id} cert={cert} locale={locale} router={router} t={t} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AVAILABLE */}
          {activeTab === 'available' && (
            <div>
              {loadingAvailable ? (
                <div className="flex items-center justify-center gap-3 py-20">
                  <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                </div>
              ) : catalogFiltered.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title={t('learnerCertifications.noFound')}
                  subtitle="Try adjusting your search or level filter"
                  action={
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setLevelFilter('all'); }}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700"
                    >
                      Clear filters
                    </button>
                  }
                />
              ) : (
                renderCatalogGrid(paginatedCatalog)
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

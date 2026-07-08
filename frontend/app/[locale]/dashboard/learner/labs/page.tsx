'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Play, Code, Terminal, Award, Clock, Zap, FlaskConical, Cloud,
  Loader2, Search, CheckCircle2, RotateCcw, ChevronRight,
  ChevronLeft, LayoutGrid, Lock, Filter, ListOrdered, Bookmark,
} from 'lucide-react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '@/contexts/LanguageContext'
import { useLearnerLabs, useStartLab, useMyLabsProgress } from '@/hooks/api/useLabs'
import type { LabDto, LabProgressDto } from '@/services/labs'
import { useToast } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/api/useUsers'
import { useContentAccess } from '@/hooks/api/useContentAccess'
import { LockedOverlay } from '@/components/ui/locked-overlay'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type ProgressState = 'not_started' | 'in_progress' | 'completed'

function getProgressState(
  slug: string,
  progressMap: Map<number, LabProgressDto>,
  labIdBySlug: Map<string, number>,
): { state: ProgressState; pct: number } {
  const labId = labIdBySlug.get(slug)
  if (!labId) return { state: 'not_started', pct: 0 }
  const p = progressMap.get(labId)
  if (!p) return { state: 'not_started', pct: 0 }
  if (p.isCompleted) return { state: 'completed', pct: 100 }
  const total = p.lab?.tasks?.length ?? 0
  const done = p.completedTasks?.length ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return { state: pct > 0 ? 'in_progress' : 'not_started', pct }
}

const PROVIDER_THEME: Record<string, { primary: string; gradient: string; badgeBg: string; badgeText: string }> = {
  aws:    { primary: '#FF9900', gradient: 'linear-gradient(135deg, #FF9900 0%, #E8830A 100%)', badgeBg: 'bg-orange-50 border-orange-200', badgeText: 'text-orange-700' },
  azure:  { primary: '#0078D4', gradient: 'linear-gradient(135deg, #0078D4 0%, #106EBE 100%)', badgeBg: 'bg-blue-50 border-blue-200', badgeText: 'text-blue-700' },
  gcp:    { primary: '#4285F4', gradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)', badgeBg: 'bg-indigo-50 border-indigo-200', badgeText: 'text-indigo-700' },
  nvidia: { primary: '#76B900', gradient: 'linear-gradient(135deg, #76B900 0%, #5A8F00 100%)', badgeBg: 'bg-green-50 border-green-200', badgeText: 'text-green-700' },
}

function getProviderTheme(provider: string) {
  return PROVIDER_THEME[provider] ?? PROVIDER_THEME.azure
}

function getProviderIcon(provider: string) {
  switch (provider) {
    case 'aws':    return <Terminal className="h-5 w-5" />
    case 'azure':  return <Code className="h-5 w-5" />
    case 'nvidia': return <Play className="h-5 w-5" />
    case 'gcp':    return <Cloud className="h-5 w-5" />
    default:       return <FlaskConical className="h-5 w-5" />
  }
}

const DIFFICULTY_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 }

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  advanced:     'bg-rose-50 text-rose-700 border-rose-200',
}

const LABS_PER_PAGE = 18

const CERTIFICATION_LABELS: Record<string, string> = {
  'aws-certified-cloud-practitioner-clf-c02': 'CLF-C02',
  'aws-certified-ai-practitioner-aif-c01': 'AIF-C01',
  'aws-developer-associate-dva-c02': 'DVA-C02',
  'aws-solutions-architect-associate-saa-c03': 'SAA-C03',
  'cncf-certified-kubernetes-administrator': 'CKA',
  'cncf-certified-kubernetes-security-specialist': 'CKS',
  'cncf-kubernetes-cloud-native-associate': 'KCNA',
  'google-associate-cloud-engineer': 'GCP ACE',
  'google-cloud-digital-leader': 'CDL',
  'google-professional-cloud-architect': 'GCP PCA',
  'google-professional-machine-learning-engineer': 'GCP PMLE',
  'hashicorp-certified-terraform-associate-004': 'Terraform',
  'hashicorp-certified-vault-associate-003': 'Vault',
  'microsoft-azure-administrator-az-104': 'AZ-104',
  'microsoft-azure-ai-fundamentals-ai-900': 'AI-900',
  'microsoft-azure-fundamentals-az-900': 'AZ-900',
  'microsoft-security-compliance-identity-sc-900': 'SC-900',
  'nvidia-certified-associate-ai-infrastructure-operations': 'NCA Infra',
  'nvidia-certified-associate-generative-ai-llms': 'NCA GenAI',
  'nvidia-certified-professional-generative-ai-llms': 'NCP GenAI',
}

function getCertificationLabel(lab: LabDto): string | null {
  const id = lab.metadata?.certificationExternalId
  return id ? (CERTIFICATION_LABELS[id] ?? id) : null
}

function LabCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Skeleton className="h-1 w-full" />
      <div className="flex items-start gap-4 p-5">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="px-5 pb-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    </div>
  )
}

export default function LabsPage() {
  const { t } = useTranslation()
  const [startingLabSlug, setStartingLabSlug] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname.split('/')[1] || 'fr'

  const { data: currentUser } = useCurrentUser()
  const userTrack = currentUser?.track
  const [showAllTracks, setShowAllTracks] = useState(false)
  const { data: contentAccess } = useContentAccess()
  const isFree = contentAccess?.isFree ?? true
  const accessibleLabSlugs = contentAccess?.accessibleLabSlugs ?? []

  const isLabLocked = (slug: string): boolean => {
    if (!isFree) return false
    return !accessibleLabSlugs.includes(slug)
  }

  const handleLockedLabClick = () => {
    toast.error(String(t('subscription.upgradeToAccessLab')), { id: 'locked-lab' })
  }

  const { data: labsData, isLoading, error: labsError } = useLearnerLabs(isFree ? false : showAllTracks)
  const { data: progressData } = useMyLabsProgress()
  const startLabMutation = useStartLab()
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [certificationFilter, setCertificationFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<Set<string>>(new Set())
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false)

  useEffect(() => {
    setBookmarkedSlugs(new Set(JSON.parse(localStorage.getItem('subul-lab-bookmarks') ?? '[]') as string[]))
  }, [])

  const allLabs = useMemo(() => {
    const raw = labsData as LabDto[] | undefined
    if (!raw || !Array.isArray(raw)) return []
    return raw
  }, [labsData])

  const progressMap = useMemo(() => {
    const map = new Map<number, LabProgressDto>()
    if (progressData && Array.isArray(progressData)) {
      for (const p of progressData) map.set(p.labId, p)
    }
    return map
  }, [progressData])

  const labIdBySlug = useMemo(() => {
    const map = new Map<string, number>()
    for (const lab of allLabs) map.set(lab.slug, lab.id)
    return map
  }, [allLabs])

  const filtered = useMemo(() => {
    let result = allLabs
    if (providerFilter !== 'all') result = result.filter((l) => l.provider === providerFilter)
    if (difficultyFilter !== 'all') result = result.filter((l) => l.difficulty === difficultyFilter)
    if (certificationFilter !== 'all') {
      result = result.filter((l) => l.metadata?.certificationExternalId === certificationFilter)
    }
    if (showBookmarkedOnly) result = result.filter((l) => bookmarkedSlugs.has(l.slug))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          (l.title ?? '').toLowerCase().includes(q) ||
          (l.description ?? '').toLowerCase().includes(q) ||
          (l.metadata?.tags ?? []).some((tag: string) => tag.toLowerCase().includes(q)) ||
          (l.metadata?.learningObjectives ?? []).some((objective) => objective.toLowerCase().includes(q)) ||
          (l.steps ?? []).some(
            (step) =>
              step.title.toLowerCase().includes(q) ||
              step.instruction.toLowerCase().includes(q),
          ) ||
          (l.slug ?? '').toLowerCase().includes(q),
      )
    }
    if (certificationFilter !== 'all') {
      result = [...result].sort(
        (a, b) => (a.metadata?.sequence ?? Number.MAX_SAFE_INTEGER) - (b.metadata?.sequence ?? Number.MAX_SAFE_INTEGER),
      )
    }
    return result
  }, [allLabs, providerFilter, difficultyFilter, certificationFilter, showBookmarkedOnly, bookmarkedSlugs, search])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, providerFilter, difficultyFilter, certificationFilter, showBookmarkedOnly, showAllTracks])

  const certificationOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const lab of allLabs) {
      if (lab.metadata?.certificationExternalId) ids.add(lab.metadata.certificationExternalId)
    }
    return [...ids].sort((a, b) =>
      (CERTIFICATION_LABELS[a] ?? a).localeCompare(CERTIFICATION_LABELS[b] ?? b),
    )
  }, [allLabs])

  const totalPages = Math.max(1, Math.ceil(filtered.length / LABS_PER_PAGE))
  const paginatedLabs = useMemo(
    () => filtered.slice((currentPage - 1) * LABS_PER_PAGE, currentPage * LABS_PER_PAGE),
    [filtered, currentPage],
  )

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const inProgressLabs = useMemo(
    () =>
      allLabs
        .map((lab) => ({ lab, progress: getProgressState(lab.slug, progressMap, labIdBySlug) }))
        .filter(({ progress }) => progress.state === 'in_progress'),
    [allLabs, progressMap, labIdBySlug],
  )

  const selectedCertificationCompleted = useMemo(
    () =>
      certificationFilter === 'all'
        ? 0
        : filtered.filter(
            (lab) => getProgressState(lab.slug, progressMap, labIdBySlug).state === 'completed',
          ).length,
    [certificationFilter, filtered, progressMap, labIdBySlug],
  )

  const selectedCertificationMinutes = useMemo(
    () => filtered.reduce((sum, lab) => sum + (lab.estimatedDurationMinutes ?? 0), 0),
    [filtered],
  )

  const toggleBookmark = (slug: string) => {
    setBookmarkedSlugs((previous) => {
      const next = new Set(previous)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      localStorage.setItem('subul-lab-bookmarks', JSON.stringify([...next]))
      return next
    })
  }

  const completedCount = useMemo(() => {
    let n = 0
    for (const lab of allLabs) {
      const { state } = getProgressState(lab.slug, progressMap, labIdBySlug)
      if (state === 'completed') n++
    }
    return n
  }, [allLabs, progressMap, labIdBySlug])

  const inProgressCount = useMemo(() => {
    let n = 0
    for (const lab of allLabs) {
      const { state } = getProgressState(lab.slug, progressMap, labIdBySlug)
      if (state === 'in_progress') n++
    }
    return n
  }, [allLabs, progressMap, labIdBySlug])

  const labDetailUrl = (slug: string) => `/${locale}/dashboard/learner/labs/${slug}`

  const handleLabAction = (lab: LabDto, progressState: ProgressState) => {
    if (progressState !== 'not_started') {
      router.push(labDetailUrl(lab.slug))
      return
    }
    setStartingLabSlug(lab.slug)
    startLabMutation.mutate(lab.slug, {
      onSuccess: () => router.push(labDetailUrl(lab.slug)),
      onError: () => {
        const msg = t('learnerLabs.startLabError')
        showToast(typeof msg === 'string' ? msg : 'Impossible de démarrer le lab', 'error')
      },
      onSettled: () => setStartingLabSlug(null),
    })
  }

  // Translated difficulty label
  const getDiffLabel = (d: string | undefined) => {
    if (!d) return ''
    if (d === 'beginner') return String(t('learnerLabs.beginner'))
    if (d === 'intermediate') return String(t('learnerLabs.intermediate'))
    if (d === 'advanced') return String(t('learnerLabs.advanced'))
    return d
  }

  // Track label map
  const trackLabel = (track: string | null | undefined) => {
    if (!track) return null
    if (track === 'cloud') return String(t('learnerLabs.trackCloud'))
    if (track === 'cyber') return String(t('learnerLabs.trackCyber'))
    if (track === 'ai') return String(t('learnerLabs.trackAI'))
    return track
  }

  const PROVIDER_FILTERS = [
    { value: 'all', label: String(t('learnerLabs.all')) },
    { value: 'aws', label: 'AWS' },
    { value: 'azure', label: 'Azure' },
    { value: 'gcp', label: 'GCP' },
  ]

  const DIFFICULTY_FILTERS = [
    { value: 'all', label: String(t('learnerLabs.all')) },
    { value: 'beginner', label: String(t('learnerLabs.beginner')) },
    { value: 'intermediate', label: String(t('learnerLabs.intermediate')) },
    { value: 'advanced', label: String(t('learnerLabs.advanced')) },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => <LabCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (labsError) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-200">
          <FlaskConical className="h-8 w-8 text-rose-400" />
        </div>
        <p className="text-sm text-slate-600">{String(t('learnerLabs.loadError'))}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-900 px-6 py-8 text-white shadow-lg md:px-10 md:py-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-48 w-48 rounded-full bg-indigo-400/15 blur-2xl" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
            aria-hidden
          />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <FlaskConical className="h-3.5 w-3.5 text-cyan-300" />
                  {String(t('learnerLabs.title'))}
                </span>
                {userTrack && !showAllTracks && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-semibold">
                    {trackLabel(userTrack)}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                {String(t('learnerLabs.title'))}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/80 md:text-base">
                {String(t('learnerLabs.subtitle'))}
              </p>
            </div>
            {/* Hero mini-stats */}
            <div className="grid grid-cols-3 gap-3 lg:shrink-0">
              {[
                { value: allLabs.length, label: String(t('learnerLabs.labsAvailable')), icon: FlaskConical },
                { value: inProgressCount, label: String(t('learnerLabs.inProgress')), icon: Zap },
                { value: completedCount, label: String(t('learnerLabs.completed')), icon: CheckCircle2 },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center rounded-xl border border-white/20 bg-white/10 px-3 py-4 backdrop-blur-sm">
                  <Icon className="mb-1.5 h-4 w-4 opacity-80" />
                  <span className="text-xl font-black tabular-nums">{value}</span>
                  <span className="mt-0.5 text-center text-[10px] font-medium text-white/70 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { value: allLabs.length, label: String(t('learnerLabs.labsAvailable')), icon: FlaskConical, gradient: 'from-blue-500 to-indigo-500', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', bar: Math.min(100, allLabs.length * 5) },
          { value: inProgressCount, label: String(t('learnerLabs.inProgress')), icon: Zap, gradient: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', bar: Math.min(100, inProgressCount * 20) || 8 },
          { value: completedCount, label: String(t('learnerLabs.completed')), icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', bar: allLabs.length > 0 ? Math.round((completedCount / allLabs.length) * 100) : 8 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={cn('absolute left-0 top-0 h-full w-1.5 rounded-l-2xl bg-gradient-to-b opacity-90', stat.gradient)} />
            <div className="pl-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl font-black tabular-nums tracking-tight text-slate-900">{stat.value}</p>
                  <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-500">{stat.label}</p>
                </div>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-slate-200/60', stat.iconBg)}>
                  <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className={cn('h-full rounded-full bg-gradient-to-r', stat.gradient)}
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.bar}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Track scope banner ────────────────────────────────────── */}
      {inProgressLabs.length > 0 && (
        <section className="space-y-3" aria-labelledby="continue-learning-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="continue-learning-title" className="text-lg font-black text-slate-900">
                Reprendre où vous en étiez
              </h2>
              <p className="text-xs text-slate-500">Continuez vos labs en cours sans perdre le fil.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {inProgressLabs.length} en cours
            </span>
          </div>
          <div className="flex snap-x gap-4 overflow-x-auto pb-2">
            {inProgressLabs.map(({ lab, progress }) => {
              const theme = getProviderTheme(lab.provider ?? 'azure')
              return (
                <button
                  key={lab.slug}
                  type="button"
                  onClick={() => handleLabAction(lab, progress.state)}
                  className="group min-w-[280px] max-w-[340px] snap-start rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ background: theme.gradient }}
                    >
                      {getProviderIcon(lab.provider ?? '')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-bold text-slate-900">{lab.title ?? lab.slug}</p>
                      <p className="mt-1 text-xs font-semibold text-violet-700 group-hover:text-violet-900">
                        Reprendre <ChevronRight className="inline h-3.5 w-3.5" />
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${progress.pct}%`, background: theme.gradient }}
                      />
                    </div>
                    <span className="text-xs font-black tabular-nums text-slate-700">{progress.pct}%</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50">
            <LayoutGrid className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <p className="text-xs text-slate-600 truncate">
            {showAllTracks
              ? String(t('learnerLabs.allLabsShown'))
              : userTrack
                ? `${String(t('learnerLabs.labsForProfile'))} — ${trackLabel(userTrack)}`
                : String(t('learnerLabs.labsForAssessment'))}
          </p>
        </div>
        {!isFree && (
          <button
            type="button"
            onClick={() => setShowAllTracks((v) => !v)}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
          >
            {showAllTracks ? String(t('learnerLabs.myProfile')) : String(t('learnerLabs.viewAll'))}
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ── Search + Filters ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={String(t('learnerLabs.searchPlaceholder'))}
            aria-label={String(t('learnerLabs.searchPlaceholder'))}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Provider filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
            <Cloud className="h-3.5 w-3.5 text-slate-400 mr-0.5 shrink-0" />
            {PROVIDER_FILTERS.map((f) => (
              <button
                type="button"
                key={f.value}
                onClick={() => setProviderFilter(f.value)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-lg font-semibold transition-all duration-150',
                  providerFilter === f.value
                    ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Difficulty filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
            <Filter className="h-3.5 w-3.5 text-slate-400 mr-0.5 shrink-0" />
            {DIFFICULTY_FILTERS.map((f) => (
              <button
                type="button"
                key={f.value}
                onClick={() => setDifficultyFilter(f.value)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-lg font-semibold transition-all duration-150',
                  difficultyFilter === f.value
                    ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
            <ListOrdered className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span className="sr-only">Filtrer par certification</span>
            <select
              value={certificationFilter}
              onChange={(event) => setCertificationFilter(event.target.value)}
              className="max-w-[180px] cursor-pointer border-0 bg-transparent py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-0"
            >
              <option value="all">Toutes les certifications</option>
              {certificationOptions.map((id) => (
                <option key={id} value={id}>{CERTIFICATION_LABELS[id] ?? id}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setShowBookmarkedOnly((value) => !value)}
            aria-pressed={showBookmarkedOnly}
            className={cn(
              'flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold shadow-sm transition-colors',
              showBookmarkedOnly
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <Bookmark className={cn('h-3.5 w-3.5', showBookmarkedOnly && 'fill-current')} />
            Enregistrés ({bookmarkedSlugs.size})
          </button>
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center max-w-sm mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <FlaskConical className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-base font-semibold text-slate-700">
            {search || providerFilter !== 'all' || difficultyFilter !== 'all' || certificationFilter !== 'all' || showBookmarkedOnly
              ? String(t('learnerLabs.noFiltered'))
              : showAllTracks
                ? String(t('learnerLabs.noLabs'))
                : String(t('learnerLabs.noProfileMatch'))}
          </p>
          {!showAllTracks && !search && providerFilter === 'all' && difficultyFilter === 'all' && certificationFilter === 'all' && !showBookmarkedOnly && (
            <button
              type="button"
              onClick={() => setShowAllTracks(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-sm hover:from-fuchsia-700 hover:to-violet-700"
            >
              {String(t('learnerLabs.viewAll'))}
            </button>
          )}
        </div>
      )}

      {/* ── Lab grid ─────────────────────────────────────────────── */}
      {certificationFilter !== 'all' && filtered.length > 0 ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Parcours certification</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                {CERTIFICATION_LABELS[certificationFilter] ?? certificationFilter}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Suivez les labs dans l&apos;ordre pour construire vos compétences progressivement.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-indigo-200 bg-white/70 px-3 py-1 text-indigo-700">
                  Environ {Math.floor(selectedCertificationMinutes / 60)} h {selectedCertificationMinutes % 60} min
                </span>
                <span className="rounded-full border border-violet-200 bg-white/70 px-3 py-1 text-violet-700">
                  Encore {Math.max(0, filtered.length - selectedCertificationCompleted)} labs pour débloquer le badge
                </span>
              </div>
            </div>
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full p-2"
              style={{
                background: `conic-gradient(#7c3aed ${
                  filtered.length ? Math.round((selectedCertificationCompleted / filtered.length) * 360) : 0
                }deg, #e2e8f0 0deg)`,
              }}
              aria-label={`${selectedCertificationCompleted} labs terminés sur ${filtered.length}`}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                <span className="text-xl font-black tabular-nums text-slate-900">
                  {selectedCertificationCompleted}/{filtered.length}
                </span>
                <span className="text-[10px] font-bold uppercase text-slate-500">terminés</span>
              </div>
            </div>
          </div>

          <div className="relative space-y-3 before:absolute before:bottom-7 before:left-6 before:top-7 before:w-px before:bg-slate-200">
            {filtered.map((lab, index) => {
              const { state: pState, pct } = getProgressState(lab.slug, progressMap, labIdBySlug)
              const locked = isLabLocked(lab.slug)
              return (
                <button
                  key={lab.slug}
                  type="button"
                  onClick={() => locked ? handleLockedLabClick() : handleLabAction(lab, pState)}
                  className="group relative flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <span
                    className={cn(
                      'relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-white text-sm font-black shadow-sm',
                      pState === 'completed'
                        ? 'bg-emerald-500 text-white'
                        : pState === 'in_progress'
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {pState === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : String(lab.metadata?.sequence ?? index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Lab {String(lab.metadata?.sequence ?? index + 1).padStart(2, '0')} / {filtered.length}
                        </p>
                        <h3 className="mt-0.5 text-sm font-bold text-slate-900">{lab.title ?? lab.slug}</h3>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {lab.difficulty && (
                          <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', DIFFICULTY_COLORS[lab.difficulty])}>
                            {getDiffLabel(lab.difficulty)}
                          </span>
                        )}
                        {(lab.estimatedTime || lab.estimatedDurationMinutes) && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            <Clock className="h-3 w-3" />
                            {lab.estimatedTime ?? `${lab.estimatedDurationMinutes} min`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {locked ? <Lock className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />}
                </button>
              )
            })}
          </div>
        </section>
      ) : (
      <>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`${providerFilter}-${difficultyFilter}-${search}`}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
        >
          {paginatedLabs.map((lab) => {
            const theme = getProviderTheme(lab.provider ?? 'azure')
            const { state: pState, pct } = getProgressState(lab.slug, progressMap, labIdBySlug)
            const taskCount = lab.tasks?.length ?? 0
            const quizResult = progressMap.get(lab.id)?.notes
            const isStarting = startLabMutation.isPending && startingLabSlug === lab.slug
            const diffColor = lab.difficulty ? (DIFFICULTY_COLORS[lab.difficulty] ?? '') : ''
            const locked = isLabLocked(lab.slug)

            return (
              <motion.div
                key={lab.slug}
                layout
                variants={{ hidden: { opacity: 0, y: 14, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28 } } }}
              >
                <div
                  className={cn(
                    'group relative flex flex-col h-full rounded-2xl border bg-white overflow-hidden transition-all duration-200',
                    locked ? 'opacity-75' : 'hover:shadow-md hover:-translate-y-0.5',
                    pState === 'completed' ? 'border-emerald-200' : 'border-slate-200 hover:border-violet-300',
                  )}
                  style={{ borderTopColor: theme.primary, borderTopWidth: 3 }}
                  onClick={() => locked ? handleLockedLabClick() : handleLabAction(lab, pState)}
                  role="article"
                  aria-label={lab.title ?? lab.slug}
                >
                  <LockedOverlay locked={locked} locale={locale} compact onClick={handleLockedLabClick} />

                  <div className="flex items-start gap-4 p-5 pb-3">
                    {/* Provider icon */}
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm text-white"
                      style={{ background: theme.gradient }}
                    >
                      {lab.metadata?.logo ? (
                        <Image src={lab.metadata.logo} alt="" width={28} height={28} className="object-contain" />
                      ) : (
                        getProviderIcon(lab.provider ?? '')
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold leading-snug line-clamp-2 text-slate-900">
                          {lab.title ?? lab.slug}
                        </h3>
                        {pState === 'completed' && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                        {locked && (
                          <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <button
                          type="button"
                          aria-label={bookmarkedSlugs.has(lab.slug) ? 'Retirer des labs enregistrés' : 'Enregistrer ce lab'}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleBookmark(lab.slug)
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        >
                          <Bookmark className={cn('h-4 w-4', bookmarkedSlugs.has(lab.slug) && 'fill-current text-violet-700')} />
                        </button>
                      </div>
                      {getCertificationLabel(lab) && (
                        <span className="mt-2 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                          {getCertificationLabel(lab)}
                        </span>
                      )}
                      {lab.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {lab.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 flex flex-col gap-3 flex-1">
                    {/* Meta badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {lab.difficulty && (
                        <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', diffColor)}>
                          {getDiffLabel(lab.difficulty)}
                        </span>
                      )}
                      {(lab.estimatedTime || lab.estimatedDurationMinutes) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                          <Clock className="h-2.5 w-2.5" />
                          {lab.estimatedTime ?? `${lab.estimatedDurationMinutes} min`}
                        </span>
                      )}
                      {taskCount > 0 && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {taskCount} {String(t('learnerLabs.tasks'))}
                        </span>
                      )}
                      {quizResult?.quizTotal && (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold text-violet-700">
                          Quiz {quizResult.quizScore ?? 0}/{quizResult.quizTotal}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {pState === 'in_progress' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">{String(t('learnerLabs.inProgress'))}</span>
                          <span className="font-bold tabular-nums" style={{ color: theme.primary }}>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: theme.gradient }}
                          />
                        </div>
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      type="button"
                      className={cn(
                        'mt-auto flex h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 active:scale-[0.98]',
                        pState === 'completed'
                          ? 'border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700'
                          : 'text-white shadow-sm hover:opacity-90',
                      )}
                      style={pState !== 'completed' ? { background: theme.gradient } : undefined}
                      disabled={isStarting}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!locked) handleLabAction(lab, pState)
                        else handleLockedLabClick()
                      }}
                    >
                      {isStarting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : pState === 'completed' ? (
                        <RotateCcw className="h-3.5 w-3.5" />
                      ) : pState === 'in_progress' ? (
                        <Play className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isStarting
                          ? '…'
                          : pState === 'completed'
                            ? String(t('learnerLabs.reviewLab'))
                            : pState === 'in_progress'
                              ? String(t('learnerLabs.resumeLab'))
                              : String(t('learnerLabs.startLab'))}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
      {filtered.length > 0 && totalPages > 1 && (
        <nav className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row" aria-label="Pagination des labs">
          <p className="text-xs font-semibold text-slate-600">
            Page {currentPage} sur {totalPages} — Labs {(currentPage - 1) * LABS_PER_PAGE + 1}–
            {Math.min(currentPage * LABS_PER_PAGE, filtered.length)} sur {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="min-h-10 gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              className="min-h-10 gap-1.5"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
      </>
      )}
    </div>
  )
}

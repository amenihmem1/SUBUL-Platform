'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/ui/loading'
import {
  LabDetailExperience,
  labThemeForProvider,
  type LabResourceLink,
} from '@/components/learner/LabDetailExperience'
import { useLab, useStartLab, useLabProgress, useUpdateLabProgress } from '@/hooks/api/useLabs'
import { useToast } from '@/components/ui'
import type { LabProvider } from '@/services/labs'
import { useMyLabAccess } from '@/hooks/api/useLabAccess'
import { LabAccessCredentialsPanel } from '@/components/learner/LabAccessCredentialsPanel'

function resourceLinksForProvider(provider: LabProvider | null | undefined): LabResourceLink[] {
  const p = (provider ?? 'aws').toLowerCase()
  if (p === 'azure') {
    return [
      { label: 'Portail Azure →', href: 'https://portal.azure.com' },
      { label: 'Documentation Azure →', href: 'https://docs.microsoft.com/azure' },
    ]
  }
  if (p === 'aws') {
    return [
      { label: 'Console AWS →', href: 'https://console.aws.amazon.com' },
      { label: 'Documentation AWS →', href: 'https://docs.aws.amazon.com' },
    ]
  }
  if (p === 'gcp') {
    return [
      { label: 'Console GCP →', href: 'https://console.cloud.google.com' },
      { label: 'Documentation GCP →', href: 'https://cloud.google.com/docs' },
    ]
  }
  return []
}

export default function StandaloneLabDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const slug = params.slug as string
  const locale = pathname.split('/')[1] || 'fr'
  const baseLabsPath = `/${locale}/dashboard/learner/labs`

  const { data: lab, isLoading, error } = useLab(slug, locale)
  const [progressReady, setProgressReady] = useState(false)
  const startLabMutation = useStartLab()
  const { data: progress } = useLabProgress(slug, progressReady && !!lab)
  const updateProgressMutation = useUpdateLabProgress()
  const { showToast } = useToast()

  const { data: accessData, isLoading: accessLoading } = useMyLabAccess(lab?.provider)

  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set())
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [labCompleted, setLabCompleted] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const syncedFromServer = useRef(false)

  // ── Timer ──
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPersistRef = useRef(0)

  useEffect(() => {
    syncedFromServer.current = false
    setProgressReady(false)
    setCheckedTasks(new Set())
    setLabCompleted(false)
    setTimerSeconds(0)
  }, [slug])

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('subul-lab-bookmarks') ?? '[]') as string[]
    setIsBookmarked(saved.includes(slug))
  }, [slug])

  useEffect(() => {
    if (!slug || !lab) return
    startLabMutation.mutate(slug, {
      onSettled: () => setProgressReady(true),
    })
  }, [slug, lab?.id])

  useEffect(() => {
    if (progress == null || syncedFromServer.current) return
    syncedFromServer.current = true
    setCheckedTasks(new Set(progress.completedTasks ?? []))
    setLabCompleted(progress.isCompleted ?? false)
    setTimerSeconds(progress.timeSpent ?? 0)
  }, [progress])

  // Start/stop timer based on visibility
  useEffect(() => {
    if (!lab || labCompleted) return

    const tick = () => setTimerSeconds((s) => s + 1)
    timerRef.current = setInterval(tick, 1000)

    const onVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        timerRef.current = setInterval(tick, 1000)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [lab, labCompleted])

  // Persist time every 30s
  useEffect(() => {
    if (timerSeconds === 0 || !lab) return
    if (timerSeconds - lastPersistRef.current >= 30) {
      lastPersistRef.current = timerSeconds
      updateProgressMutation.mutate({
        slug,
        data: {
          completedTasks: [...checkedTasks].sort((a, b) => a - b),
          timeSpent: timerSeconds,
        },
      })
    }
  }, [timerSeconds])

  const theme = useMemo(() => labThemeForProvider(lab?.provider), [lab?.provider])

  const meta = lab?.metadata
  const tasks = Array.isArray(lab?.tasks) ? lab.tasks : []
  const steps = lab?.steps ?? null
  const learningObjectives = meta?.learningObjectives?.length ? meta.learningObjectives : null
  const labIndexOneBased = (meta?.index ?? 0) + 1
  const labTotalInLevel = Math.max(meta?.totalInLevel ?? 1, 1)
  const isBeginner =
    (lab?.difficulty ?? 'beginner').toLowerCase() === 'beginner' ||
    (meta?.level ?? '').toLowerCase() === 'beginner'
  const levelLabel = meta?.levelLabel ?? (isBeginner ? 'Débutant' : 'Intermédiaire')

  const persistProgress = useCallback(
    (
      next: Set<number>,
      opts?: {
        markComplete?: boolean
        notes?: { quizScore?: number; quizTotal?: number; quizCompletedAt?: string }
      },
    ) => {
      const completedTasks = [...next].sort((a, b) => a - b)
      updateProgressMutation.mutate(
        {
          slug,
          data: {
            completedTasks,
            timeSpent: timerSeconds,
            ...(opts?.markComplete ? { isCompleted: true } : {}),
            ...(opts?.notes ? { notes: opts.notes } : {}),
          },
        },
        {
          onError: () => showToast('Impossible de sauvegarder la progression.', 'error'),
        },
      )
    },
    [slug, timerSeconds, updateProgressMutation, showToast],
  )

  const toggleTask = (i: number) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      persistProgress(next)
      return next
    })
  }

  const handleMarkComplete = () => {
    persistProgress(checkedTasks, { markComplete: true })
    setLabCompleted(true)
    if (timerRef.current) clearInterval(timerRef.current)
    showToast('Lab marqué comme terminé.', 'success')
  }

  const handleBookmarkToggle = () => {
    const saved = new Set(JSON.parse(localStorage.getItem('subul-lab-bookmarks') ?? '[]') as string[])
    if (saved.has(slug)) saved.delete(slug)
    else saved.add(slug)
    localStorage.setItem('subul-lab-bookmarks', JSON.stringify([...saved]))
    setIsBookmarked(saved.has(slug))
    showToast(saved.has(slug) ? 'Lab enregistré pour plus tard.' : 'Lab retiré des éléments enregistrés.', 'success')
  }

  const handleQuizComplete = (score: number, total: number) => {
    persistProgress(checkedTasks, {
      notes: { quizScore: score, quizTotal: total, quizCompletedAt: new Date().toISOString() },
    })
  }

  if (isLoading) {
    return <PageLoader label="Chargement du lab…" className="min-h-[280px]" />
  }

  if (error || !lab) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push(baseLabsPath)} className="gap-2">
          Retour aux labs
        </Button>
        <p className="text-destructive mt-4">Lab introuvable.</p>
      </div>
    )
  }

  return (
    <LabDetailExperience
      theme={theme}
      title={lab.title ?? slug}
      moduleTitle={lab.moduleTitle}
      description={lab.description}
      tasks={tasks}
      steps={steps}
      learningObjectives={learningObjectives}
      levelLabel={levelLabel}
      isBeginnerLevel={isBeginner}
      labIndexOneBased={labIndexOneBased}
      labTotalInLevel={labTotalInLevel}
      checkedTaskIndices={checkedTasks}
      onToggleTask={toggleTask}
      onBack={() => router.push(baseLabsPath)}
      backLabel="Retour aux labs"
      prevSlug={meta?.prevSlug ?? null}
      nextSlug={meta?.nextSlug ?? null}
      onNavigateToSlug={(s) => router.push(`${baseLabsPath}/${s}`)}
      onMarkComplete={tasks.length > 0 ? handleMarkComplete : undefined}
      assistantOpen={assistantOpen}
      onAssistantToggle={() => setAssistantOpen((o) => !o)}
      resourceLinks={resourceLinksForProvider(lab.provider)}
      timerSeconds={timerSeconds}
      isCompleted={labCompleted}
      scenario={meta?.scenario ?? null}
      costWarning={meta?.costWarning ?? null}
      sandboxUrl={meta?.sandboxUrl ?? null}
      postLabQuiz={meta?.postLabQuiz ?? null}
      careerConnection={meta?.careerConnection ?? null}
      certificationLabel={meta?.certificationExternalId ? (lab.title ?? '').split(' Lab ')[0] : null}
      isBookmarked={isBookmarked}
      onBookmarkToggle={handleBookmarkToggle}
      onQuizComplete={handleQuizComplete}
      credentialsPanel={
        <LabAccessCredentialsPanel
          provider={lab.provider}
          accessData={accessData}
          isLoading={accessLoading}
        />
      }
    />
  )
}

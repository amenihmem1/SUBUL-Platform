'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { useCourse } from '@/hooks/api/useCourses'
import { PageLoader } from '@/components/ui/loading'
import { AZ900_FULL_COURSE } from '@/data/courses/az900'
import { LabDetailExperience, AZURE_LAB_THEME } from '@/components/learner/LabDetailExperience'

const AZ900_COURSE_ID = 'AZ-900-UNIFIED'

const AZURE_RESOURCE_LINKS = [
  { label: 'Portail Azure →', href: 'https://portal.azure.com' },
  { label: 'Documentation Azure →', href: 'https://docs.microsoft.com/azure' },
]

type LabWithMeta = {
  id: number
  title: string
  moduleTitle?: string
  tasks: string[]
  level: 'beginner' | 'intermediate'
  levelLabel: string
  slug: string
  index: number
  totalInLevel: number
  prevSlug: string | null
  nextSlug: string | null
}

export default function LabDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'fr'
  const labId = params.labId as string

  const { data: course, isLoading } = useCourse(AZ900_COURSE_ID)
  const labMap = useMemo(() => {
    const map: Record<string, LabWithMeta> = {}
    const source = (course?.levels?.some((l) => (l.labs ?? []).length > 0) ? course : AZ900_FULL_COURSE) ?? AZ900_FULL_COURSE
    if (!source?.levels) return map
    source.levels.forEach((lvl) => {
      (lvl.labs || []).forEach((lab, idx) => {
        const slug = `az900-${lvl.level}-${lab.id}`
        const prevLab = lvl.labs?.[idx - 1]
        const nextLab = lvl.labs?.[idx + 1]
        map[slug] = {
          id: lab.id as number,
          title: lab.title,
          moduleTitle: lab.moduleTitle,
          tasks: lab.tasks || [],
          level: lvl.level as 'beginner' | 'intermediate',
          levelLabel: lvl.label,
          slug,
          index: idx,
          totalInLevel: (lvl.labs || []).length,
          prevSlug: prevLab ? `az900-${lvl.level}-${prevLab.id}` : null,
          nextSlug: nextLab ? `az900-${lvl.level}-${nextLab.id}` : null,
        }
      })
    })
    return map
  }, [course])
  const lab = labMap[labId]

  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set())
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)

  useEffect(() => {
    if (!lab) return
    const storedTasks = localStorage.getItem(`lab-tasks-${labId}`)
    if (storedTasks) setCheckedTasks(new Set(JSON.parse(storedTasks)))
  }, [labId, lab])

  useEffect(() => {
    setCheckedTasks(new Set())
    if (lab) {
      const storedTasks = localStorage.getItem(`lab-tasks-${labId}`)
      if (storedTasks) setCheckedTasks(new Set(JSON.parse(storedTasks)))
    }
  }, [labId])

  if (isLoading) {
    return <PageLoader className="min-h-[200px]" />
  }
  if (!lab) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push(`/${locale}/dashboard/learner/labs/azure-az900`)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          Retour
        </button>
        <p className="text-destructive">Labo introuvable.</p>
      </div>
    )
  }

  const toggleTask = (i: number) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      localStorage.setItem(`lab-tasks-${labId}`, JSON.stringify([...next]))
      return next
    })
  }

  const completeLab = () => {
    localStorage.setItem(`lab-completed-${labId}`, 'true')
  }

  const isBeginner = lab.level === 'beginner'

  return (
    <LabDetailExperience
      theme={AZURE_LAB_THEME}
      title={lab.title}
      moduleTitle={lab.moduleTitle}
      tasks={lab.tasks}
      levelLabel={lab.levelLabel}
      isBeginnerLevel={isBeginner}
      labIndexOneBased={lab.index + 1}
      labTotalInLevel={lab.totalInLevel}
      checkedTaskIndices={checkedTasks}
      onToggleTask={toggleTask}
      onBack={() => router.push(`/${locale}/dashboard/learner/labs/azure-az900`)}
      backLabel="Retour aux labs"
      prevSlug={lab.prevSlug}
      nextSlug={lab.nextSlug}
      onNavigateToSlug={(s) => router.push(`/${locale}/dashboard/learner/labs/${s}`)}
      onMarkComplete={completeLab}
      assistantOpen={rightSidebarOpen}
      onAssistantToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
      resourceLinks={AZURE_RESOURCE_LINKS}
    />
  )
}

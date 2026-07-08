'use client'

import { useMemo } from 'react'
import LabAssistant from '@/components/learner/LabAssistant'

type TutorContextType = 'lab' | 'course' | 'certification'

type UniversalTutorProps = {
  contextType: TutorContextType
  contextTitle: string
  contextItems?: string[]
  contextMetadata?: Record<string, unknown>
  isOpen: boolean
  onToggle: () => void
  className?: string
  /** Active platform locale ('en' | 'fr') — drives greeting, chips, Deepgram & Cartesia language. */
  locale?: string
  /** Pre-filled question to auto-send once the tutor mounts or receives it. */
  pendingQuestion?: string
  onPendingQuestionSent?: () => void
  /** When true the auto-sent pendingQuestion response is read aloud via TTS. */
  pendingQuestionIsAudio?: boolean
  /** Forwarded to the cloud-tutor backend so retrieval can be scoped to this course. */
  courseId?: string
  /** Forwarded to the cloud-tutor backend (lesson context). */
  lessonId?: string | number
  /** Forwarded to the cloud-tutor backend (full title for prompt grounding). */
  courseTitle?: string
  /** Forwarded to the cloud-tutor backend (lesson title for prompt grounding). */
  lessonTitle?: string
  /** Forwarded to the cloud-tutor backend so retrieval can be scoped to this lab. */
  labSlug?: string
}

function inferPlatform(contextType: TutorContextType, contextTitle: string): 'aws' | 'azure' | 'default' {
  const lower = `${contextTitle}`.toLowerCase()
  if (lower.includes('aws') || lower.includes('amazon')) return 'aws'
  if (lower.includes('azure') || lower.includes('az-')) return 'azure'
  if (contextType === 'lab') return 'default'
  return 'default'
}

function buildDefaultPrompts(contextType: TutorContextType, contextTitle: string): string[] {
  if (contextType === 'certification') {
    return [
      `Par quoi commencer pour ${contextTitle} ?`,
      'Quel plan de revision sur 30 jours ?',
      'Quels pre-requis dois-je maitriser ?',
    ]
  }
  if (contextType === 'course') {
    return [
      `Resume-moi les points cles de ${contextTitle}`,
      'Donne-moi un mini quiz de revision',
      'Explique-moi les notions difficiles simplement',
    ]
  }
  return [
    `Explique cette etape de ${contextTitle}`,
    'Je suis bloque, aide-moi pas a pas',
    'Comment verifier que ma configuration est correcte ?',
  ]
}

export default function UniversalTutor({
  contextType,
  contextTitle,
  contextItems,
  contextMetadata,
  isOpen,
  onToggle,
  className,
  locale,
  pendingQuestion,
  onPendingQuestionSent,
  pendingQuestionIsAudio,
  courseId,
  lessonId,
  courseTitle,
  lessonTitle,
  labSlug,
}: UniversalTutorProps) {
  const tasks = useMemo(() => {
    const metadataPrompt = contextMetadata
      ? `Contexte structuré: ${JSON.stringify(contextMetadata)}`
      : null
    if (contextItems && contextItems.length > 0) {
      return metadataPrompt ? [metadataPrompt, ...contextItems] : contextItems
    }
    const defaults = buildDefaultPrompts(contextType, contextTitle)
    return metadataPrompt ? [metadataPrompt, ...defaults] : defaults
  }, [contextItems, contextMetadata, contextType, contextTitle])

  const platform = useMemo(() => inferPlatform(contextType, contextTitle), [contextType, contextTitle])

  return (
    <LabAssistant
      labTitle={contextTitle}
      tasks={tasks}
      platform={platform}
      isOpen={isOpen}
      onToggle={onToggle}
      className={className}
      locale={locale}
      pendingQuestion={pendingQuestion}
      onPendingQuestionSent={onPendingQuestionSent}
      pendingQuestionIsAudio={pendingQuestionIsAudio}
      courseId={courseId}
      lessonId={lessonId !== undefined ? String(lessonId) : undefined}
      courseTitle={courseTitle}
      lessonTitle={lessonTitle ?? contextTitle}
      labSlug={labSlug}
    />
  )
}

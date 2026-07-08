'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  ArrowLeft,
  FlaskConical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Target,
  Trophy,
  MessageCircle,
  Clock,
  Lightbulb,
  ShieldCheck,
  PartyPopper,
  CheckCircle2,
  Maximize2,
  MoreVertical,
  Zap,
  BookOpen,
  Video,
  ExternalLink,
  AlertTriangle,
  Loader2,
  RefreshCw,
  XCircle,
  Terminal,
  Share2,
  Bookmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import UniversalTutor from '@/components/learner/UniversalTutor'
import { useTranslation } from '@/contexts/LanguageContext'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { toast } from 'sonner'

export type LabDetailTheme = {
  primary: string
  gradient: string
  bg: string
  text: string
  border: string
  progressTextClass?: string
  resourceSectionClass?: string
  resourceHeadingClass?: string
  resourceLinkClass?: string
  objectiveBulletClass?: string
}

export const AZURE_LAB_THEME: LabDetailTheme = {
  primary: '#0078D4',
  gradient: 'linear-gradient(135deg, #0078D4 0%, #005BA1 100%)',
  bg: 'bg-blue-50',
  text: 'text-blue-700',
  border: 'border-blue-200',
  progressTextClass: 'text-blue-600',
  resourceSectionClass: 'bg-blue-50/50 border border-blue-100',
  resourceHeadingClass: 'text-blue-800',
  resourceLinkClass: 'text-blue-600 hover:underline',
  objectiveBulletClass: 'text-blue-500',
}

export const AWS_LAB_THEME: LabDetailTheme = {
  primary: '#FF9900',
  gradient: 'linear-gradient(135deg, #FF9900 0%, #FFB84D 100%)',
  bg: 'bg-orange-50',
  text: 'text-orange-700',
  border: 'border-orange-200',
  progressTextClass: 'text-orange-600',
  resourceSectionClass: 'bg-orange-50/50 border border-orange-100',
  resourceHeadingClass: 'text-orange-900',
  resourceLinkClass: 'text-orange-700 hover:underline',
  objectiveBulletClass: 'text-orange-500',
}

export const DEFAULT_LAB_THEME: LabDetailTheme = {
  primary: '#6366f1',
  gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  bg: 'bg-violet-50',
  text: 'text-violet-700',
  border: 'border-violet-200',
  progressTextClass: 'text-violet-600',
  resourceSectionClass: 'bg-violet-50/50 border border-violet-100',
  resourceHeadingClass: 'text-violet-900',
  resourceLinkClass: 'text-violet-700 hover:underline',
  objectiveBulletClass: 'text-violet-500',
}

export function labThemeForProvider(provider: string | null | undefined): LabDetailTheme {
  const p = (provider ?? '').toLowerCase()
  if (p === 'azure') return AZURE_LAB_THEME
  if (p === 'aws') return AWS_LAB_THEME
  return DEFAULT_LAB_THEME
}

function CopyableCodeBlock({ code, language, theme }: { code: string; language: string; theme: LabDetailTheme }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-800 text-[10px] text-slate-400 font-mono select-none">
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[11.5px] font-mono text-slate-100 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export type LabResourceLink = { label: string; href: string }

export interface LabStepData {
  title: string
  instruction: string
  hint?: string
  validationNote?: string
  estimatedMinutes?: number
}

export interface PostLabQuizItem {
  question: string
  options: string[]
  correct: number
  explanation: string
}

export type LabDetailExperienceProps = {
  theme: LabDetailTheme
  title: string
  moduleTitle?: string | null
  description?: string | null
  tasks: string[]
  steps?: LabStepData[] | null
  learningObjectives?: string[] | null
  levelLabel: string
  isBeginnerLevel: boolean
  labIndexOneBased: number
  labTotalInLevel: number
  checkedTaskIndices: Set<number>
  onToggleTask: (index: number) => void
  onBack: () => void
  backLabel?: string
  prevSlug: string | null
  nextSlug: string | null
  onNavigateToSlug: (slug: string) => void
  onMarkComplete?: () => void
  assistantOpen: boolean
  onAssistantToggle: () => void
  resourceLinks: LabResourceLink[]
  guideIntro?: string
  timerSeconds?: number
  isCompleted?: boolean
  credentialsPanel?: React.ReactNode
  scenario?: string | null
  costWarning?: string | null
  sandboxUrl?: string | null
  postLabQuiz?: PostLabQuizItem[] | null
  careerConnection?: string | null
  certificationLabel?: string | null
  isBookmarked?: boolean
  onBookmarkToggle?: () => void
  onQuizComplete?: (score: number, total: number) => void
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function LabDetailExperience({
  theme,
  title,
  moduleTitle,
  description,
  tasks,
  steps,
  learningObjectives,
  levelLabel,
  isBeginnerLevel,
  labIndexOneBased,
  labTotalInLevel,
  checkedTaskIndices,
  onToggleTask,
  onBack,
  backLabel,
  prevSlug,
  nextSlug,
  onNavigateToSlug,
  onMarkComplete,
  assistantOpen,
  onAssistantToggle,
  resourceLinks,
  guideIntro,
  timerSeconds = 0,
  isCompleted = false,
  credentialsPanel,
  scenario,
  costWarning,
  sandboxUrl,
  postLabQuiz,
  careerConnection,
  certificationLabel,
  isBookmarked = false,
  onBookmarkToggle,
  onQuizComplete,
}: LabDetailExperienceProps) {
  const { t, locale } = useTranslation()
  const [expandedStepIdx, setExpandedStepIdx] = useState<number | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [guideFullscreen, setGuideFullscreen] = useState(false)
  const [quizMode, setQuizMode] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  const [activeStepIdx, setActiveStepIdx] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<'instructions' | 'scenario' | 'resources' | 'terminal'>('instructions')
  const [isCheckingConfig, setIsCheckingConfig] = useState(false)
  const [configCheckedSteps, setConfigCheckedSteps] = useState<Set<number>>(new Set())
  const [stepVerifications, setStepVerifications] = useState<Record<number, {
    status: 'idle' | 'checking' | 'failed' | 'success'
    checks: { label: string; status: 'idle' | 'checking' | 'failed' | 'success' }[]
    errorMessage?: string
    advice?: string
  }>>({})
  const [verifyAttempts, setVerifyAttempts] = useState<Record<number, number>>({})
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>(undefined)
  const guideContentRef = useRef<HTMLElement | null>(null)

  const [cloudState, setCloudState] = useState<{
    azure: {
      resourceGroups: Set<string>
      vms: Record<string, {
        name: string
        resourceGroup: string
        size: string
        state: 'Running' | 'Stopped' | 'Deallocated'
        nsgRules: { port: number; access: 'Allow' | 'Deny' }[]
      }>
    }
    aws: {
      buckets: Set<string>
      instances: Record<string, {
        id: string
        type: string
        state: 'running' | 'stopped' | 'terminated'
        securityGroups: { port: number; action: 'allow' | 'deny' }[]
      }>
    }
  }>({
    azure: {
      resourceGroups: new Set(['default-rg']),
      vms: {}
    },
    aws: {
      buckets: new Set(['my-bucket']),
      instances: {}
    }
  })

  const getStepChecks = (stepIdx: number) => {
    const isAzure = theme.primary === '#0078D4'
    const prov = isAzure ? 'Azure' : 'AWS'
    const rgName = isAzure ? 'rg-az900-lab1' : 'aws-resource-group'
    const vmName = isAzure ? 'vm-az900-lab2' : 'ec2-instance-lab'
    const sizeName = isAzure ? 'B1s' : 't3.micro'

    if (stepIdx === 0) {
      return [
        { label: `Recherche du groupe de ressources '${rgName}'...`, status: 'idle' as const },
        { label: `Détection de la machine virtuelle '${vmName}'...`, status: 'idle' as const },
        { label: `Validation du type de l'instance (${sizeName})...`, status: 'idle' as const },
        { label: "Vérification de l'état d'exécution (Running)...", status: 'idle' as const },
      ]
    }
    if (stepIdx === 2) {
      return [
        { label: "Résolution de l'adresse IP publique de l'instance...", status: 'idle' as const },
        { label: `Test d'écoute du port d'administration (${isAzure ? 'RDP 3389' : 'SSH 22'})...`, status: 'idle' as const },
        { label: `Vérification des règles d'accès du Security Group (${isAzure ? 'NSG' : 'SG'})...`, status: 'idle' as const },
      ]
    }
    if (stepIdx === 3 || stepIdx === 5) {
      return [
        { label: `Vérification du statut de suppression de '${vmName}'...`, status: 'idle' as const },
        { label: "Libération de l'adresse IP publique...", status: 'idle' as const },
        { label: "Nettoyage des ressources associées (Disques, Réseaux)...", status: 'idle' as const },
      ]
    }
    return [
      { label: `Vérification des ressources sur la console ${prov}...`, status: 'idle' as const },
      { label: "Validation de la configuration par script automatique...", status: 'idle' as const },
    ]
  }

  const handleVerifyStep = (stepIdx: number) => {
    const initialChecks = getStepChecks(stepIdx)
    setIsCheckingConfig(true)
    setStepVerifications(prev => ({
      ...prev,
      [stepIdx]: {
        status: 'checking',
        checks: initialChecks
      }
    }))

    const attempt = (verifyAttempts[stepIdx] ?? 0) + 1
    setVerifyAttempts(prev => ({ ...prev, [stepIdx]: attempt }))

    let currentCheck = 0
    const runNextCheck = () => {
      setStepVerifications(prev => {
        const state = prev[stepIdx]
        if (!state) return prev

        const updatedChecks = [...state.checks]

        if (currentCheck > 0) {
          updatedChecks[currentCheck - 1] = {
            ...updatedChecks[currentCheck - 1],
            status: 'success'
          }
        }

        const isLastCheck = currentCheck === updatedChecks.length
        const isAzure = theme.primary === '#0078D4'
        const isAws = theme.primary === '#FF9900'

        let hasFailed = false
        let errorMessage = ""
        let advice = ""

        if (currentCheck === updatedChecks.length - 1) {
          if (stepIdx === 0) {
            if (isAzure) {
              const vm = cloudState.azure.vms['vm-az900-lab2']
              if (!vm) {
                hasFailed = true
                errorMessage = "[ERROR] VM non trouvée : Aucune machine virtuelle nommée 'vm-az900-lab2' n'a été détectée dans votre groupe de ressources."
                advice = "💡 Conseil : Créez la VM depuis le portail Azure graphique (en utilisant le simulateur GUI dans le Guide) ou lancez la commande terminal : 'az vm create --name vm-az900-lab2 --resource-group rg-az900-lab1 --size Standard_B1s'."
              } else if (vm.size !== 'Standard_B1s') {
                hasFailed = true
                errorMessage = `[ERROR] Taille non autorisée : Vous avez déployé la VM avec la taille '${vm.size}' au lieu de 'Standard_B1s' demandée.`
                advice = "⚠️ Attention : Pour valider cette étape et éviter les coûts excessifs, supprimez cette VM et recréez-la sur le portail (ou via CLI) en sélectionnant bien la taille gratuite 'Standard_B1s'."
              }
            } else if (isAws) {
              const instances = Object.values(cloudState.aws.instances)
              const hasT3Micro = instances.some((ins: any) => ins.type === 't3.micro')
              if (instances.length === 0) {
                hasFailed = true
                errorMessage = "[ERROR] EC2 Instance not found: No instances detected in your VPC."
                advice = "💡 Conseil : Lancez l'instance depuis la console AWS (simulateur GUI dans le Guide) ou utilisez le terminal : 'aws ec2 run-instances --instance-type t3.micro'."
              } else if (!hasT3Micro) {
                hasFailed = true
                errorMessage = `[ERROR] Invalid Instance Type: One or more instances deployed do not match 't3.micro'.`
                advice = "⚠️ Attention : Arrêtez l'instance existante et recréez-la avec la taille gratuite 't3.micro'."
              }
            }
          } else if (stepIdx === 2) {
            if (isAzure) {
              const vm = cloudState.azure.vms['vm-az900-lab2']
              const rdpOpen = vm?.nsgRules.some((r: any) => r.port === 3389 && r.access === 'Allow')
              if (!vm) {
                hasFailed = true
                errorMessage = "[ERROR] VM non trouvée : La VM 'vm-az900-lab2' doit exister pour cette étape."
                advice = "💡 Conseil : Complétez d'abord l'étape 1 en créant la machine virtuelle."
              } else if (!rdpOpen) {
                hasFailed = true
                errorMessage = "[ERROR] Connection Timeout : Impossible d'atteindre le port RDP 3389 sur l'IP publique de la VM."
                advice = "💡 Conseil : Ouvrez le port RDP 3389 sur le portail (simulateur GUI) ou utilisez la commande CLI suivante dans le terminal : 'az vm open-port --name vm-az900-lab2 --resource-group rg-az900-lab1 --port 3389'."
              }
            } else if (isAws) {
              const instId = Object.keys(cloudState.aws.instances)[0]
              const ins = instId ? cloudState.aws.instances[instId] : null
              const sshOpen = ins?.securityGroups.some((g: any) => g.port === 22 && g.action === 'allow')
              if (!ins) {
                hasFailed = true
                errorMessage = "[ERROR] EC2 Instance not found. Complete step 1 first."
                advice = "💡 Conseil : Retournez à l'étape 1 pour démarrer votre instance."
              } else if (!sshOpen) {
                hasFailed = true
                errorMessage = "[ERROR] Connection Timeout : Cannot reach port 22 (SSH) on your instance."
                advice = "💡 Conseil : Ajoutez une règle de sécurité d'entrée pour le port 22 dans le Security Group (simulateur GUI) ou utilisez la CLI : 'aws ec2 authorize-security-group-ingress --port 22'."
              }
            }
          } else if (stepIdx === 3 || stepIdx === 5) {
            if (isAzure) {
              const vmExists = !!cloudState.azure.vms['vm-az900-lab2']
              if (vmExists) {
                hasFailed = true
                errorMessage = "[ERROR] VM active : L'instance 'vm-az900-lab2' est toujours en cours d'exécution."
                advice = "⚠️ Important : Supprimez la VM via le portail Azure (simulateur GUI) ou exécutez la commande terminal : 'az vm delete --name vm-az900-lab2 --resource-group rg-az900-lab1 --yes'."
              }
            } else if (isAws) {
              const instancesExist = Object.keys(cloudState.aws.instances).length > 0
              if (instancesExist) {
                hasFailed = true
                errorMessage = "[ERROR] Instance active: You still have active running EC2 instances."
                advice = "⚠️ Important : Terminez toutes les instances actives sur la console AWS ou utilisez la CLI : 'aws ec2 terminate-instances --instance-ids <id>'."
              }
            }
          }
        }

        if (hasFailed) {
          setIsCheckingConfig(false)
          updatedChecks[currentCheck] = {
            ...updatedChecks[currentCheck],
            status: 'failed'
          }

          return {
            ...prev,
            [stepIdx]: {
              status: 'failed',
              checks: updatedChecks,
              errorMessage,
              advice
            }
          }
        }

        if (isLastCheck) {
          setIsCheckingConfig(false)
          setConfigCheckedSteps(checked => {
            const next = new Set(checked)
            next.add(stepIdx)
            return next
          })
          if (!checkedTaskIndices.has(stepIdx)) {
            handleTaskToggle(stepIdx)
          }

          return {
            ...prev,
            [stepIdx]: {
              status: 'success',
              checks: updatedChecks
            }
          }
        }

        updatedChecks[currentCheck] = {
          ...updatedChecks[currentCheck],
          status: 'checking'
        }

        setTimeout(runNextCheck, 600)
        currentCheck++

        return {
          ...prev,
          [stepIdx]: {
            ...state,
            checks: updatedChecks
          }
        }
      })
    }

    setTimeout(runNextCheck, 100)
  }

  const renderers = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const codeText = String(children).replace(/\n$/, '')
      if (!inline) {
        return (
          <CopyableCodeBlock code={codeText} language={match ? match[1] : ''} theme={theme} />
        )
      }
      return (
        <code className={cn("px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]", className)} {...props}>
          {children}
        </code>
      )
    }
  }

  const objectives =
    learningObjectives && learningObjectives.length > 0 ? learningObjectives : tasks
  const allChecked = tasks.length > 0 && checkedTaskIndices.size === tasks.length
  const taskProgress = tasks.length ? Math.round((checkedTaskIndices.size / tasks.length) * 100) : 0

  const effectiveSteps = tasks.map((task, index): LabStepData => {
    const step = steps?.[index]
    if (step?.instruction?.trim()) return step

    const context = scenario?.trim() || description?.trim()
    return {
      title: step?.title?.trim() || task,
      instruction: [
        `## ${step?.title?.trim() || task}`,
        context ? `**Contexte :** ${context}` : null,
        '### Travail à réaliser',
        `Réalisez la tâche **${task}** dans votre environnement de lab. Documentez les valeurs utilisées, les commandes exécutées et le résultat obtenu.`,
        '### Vérification',
        `Confirmez que la configuration attendue est visible, puis notez toute erreur rencontrée et la correction appliquée avant de valider cette étape.`,
      ].filter(Boolean).join('\n\n'),
      hint: step?.hint,
      validationNote: step?.validationNote,
      estimatedMinutes: step?.estimatedMinutes,
    }
  })
  const hasRichSteps = effectiveSteps.length > 0

  // Derived metadata
  const estimatedMinutes = Math.max(5, tasks.length * 3)
  const labPoints = tasks.length * 10 + 10

  const handleTaskToggle = (index: number) => {
    const isCompleting = !checkedTaskIndices.has(index)
    onToggleTask(index)
    if (isCompleting && index < tasks.length - 1) {
      window.setTimeout(() => {
        setActiveStepIdx(index + 1)
        setActiveTab('instructions')
        guideContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }, 220)
    }
  }

  const handleShareCompletion = async () => {
    const certificationTag = certificationLabel ? ` #${certificationLabel.replace(/[^a-zA-Z0-9]/g, '')}` : ''
    const text = `Je viens de terminer le lab ${title} sur Subul! #CloudLearning${certificationTag}`
    if (navigator.share) {
      await navigator.share({ title: 'Lab terminé sur Subul', text, url: window.location.href })
      return
    }
    await navigator.clipboard.writeText(`${text} ${window.location.href}`)
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
      '_blank',
      'noopener,noreferrer',
    )
    toast.success('Texte de partage copié. LinkedIn est ouvert dans un nouvel onglet.')
  }

  const handleMarkComplete = () => {
    if (postLabQuiz && postLabQuiz.length > 0 && !quizSubmitted) {
      setQuizMode(true)
      return
    }
    if (onMarkComplete) {
      onMarkComplete()
      setShowCompletion(true)
    }
  }

  const handleQuizSubmit = () => {
    setQuizSubmitted(true)
  }

  const handleQuizFinish = () => {
    setQuizMode(false)
    if (postLabQuiz) onQuizComplete?.(quizScore, postLabQuiz.length)
    if (onMarkComplete) {
      onMarkComplete()
      setShowCompletion(true)
    }
  }

  const quizScore = postLabQuiz
    ? postLabQuiz.filter((q, i) => quizAnswers[i] === q.correct).length
    : 0

  // Resource icons heuristic
  const resourceIcon = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('vid') || l.includes('watch') || l.includes('regarder')) return Video
    if (l.includes('doc') || l.includes('guide')) return BookOpen
    return ExternalLink
  }

  const resourceCta = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('vid') || l.includes('watch') || l.includes('regarder')) return 'Regarder'
    return 'Ouvrir'
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-white">

      {/* ═══ HEADER ══════════════════════════════════════════════════════════ */}
      <header className="shrink-0 border-b z-30 border-slate-100 bg-white">
        <div className="flex items-center gap-3 px-4 h-14">
          {/* Back */}
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel ?? String(t('learnerLabs.backToLabsList'))}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          {/* Level badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border shrink-0',
              theme.bg, theme.text,
            )}
            style={{ borderColor: theme.primary }}
          >
            {isBeginnerLevel ? <Target className="h-3 w-3" /> : <Trophy className="h-3 w-3" />}
            {levelLabel}
          </span>

          <span className="text-sm text-slate-400 shrink-0">
            Lab {labIndexOneBased} / {labTotalInLevel}
          </span>

          <div className="flex-1" />

          {/* Timer */}
          <span className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 font-mono shrink-0">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {formatTime(timerSeconds)}
          </span>

          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: theme.gradient }}
                initial={{ width: 0 }}
                animate={{ width: `${taskProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: theme.primary }}>
              {taskProgress}%
            </span>
          </div>

          {/* Mark complete */}
          {onBookmarkToggle && (
            <button
              type="button"
              onClick={onBookmarkToggle}
              aria-pressed={isBookmarked}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors',
                isBookmarked
                  ? 'border-violet-300 bg-violet-50 text-violet-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              )}
              title={isBookmarked ? 'Retirer des labs enregistrés' : 'Enregistrer ce lab'}
            >
              <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current')} />
            </button>
          )}

          {allChecked && onMarkComplete && !isCompleted && (
            <button
              type="button"
              onClick={handleMarkComplete}
              className="hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90 shrink-0"
              style={{ borderColor: theme.primary, color: theme.primary }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Marquer comme terminé
            </button>
          )}

          {isCompleted && (
            <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terminé
            </span>
          )}

          {/* Mobile chat toggle */}
          <button
            type="button"
            onClick={onAssistantToggle}
            className="xl:hidden flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0"
            style={{ background: theme.gradient, color: '#fff' }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Assistant</span>
          </button>

          {/* Language switcher — always accessible inside the immersive view */}
          <LanguageSwitcher variant="compact" className="hidden sm:block" />

          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors shrink-0">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* ── Metadata chips row ── */}
        <div className="flex items-center gap-6 px-4 pb-3 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0" style={{ background: `${theme.primary}18` }}>
              <AlertTriangle className="h-3.5 w-3.5" style={{ color: theme.primary }} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Difficulté</p>
              <p className="text-xs font-bold text-slate-800">{levelLabel}</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-100 shrink-0" />

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 shrink-0">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Durée estimée</p>
              <p className="text-xs font-bold text-slate-800">{estimatedMinutes} minutes</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-100 shrink-0" />

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 shrink-0">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Points</p>
              <p className="text-xs font-bold text-amber-600">+{labPoints} XP</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-100 shrink-0" />

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 shrink-0">
              <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Ressources</p>
              <p className="text-xs font-bold text-slate-800">{resourceLinks.length} liens utiles</p>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ MAIN LAYOUT ════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: Checklist panel ── */}
        <aside className="hidden lg:flex w-[260px] xl:w-[280px] shrink-0 flex-col border-r overflow-y-auto border-slate-100 bg-white">

          {/* Checklist header */}
          <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0" style={{ background: theme.gradient }}>
                <FlaskConical className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Checklist</p>
                <p className="text-[11px] text-slate-400">{tasks.length} tâches</p>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="flex-1 px-2 py-3 space-y-2">
            {tasks.map((task, i) => {
              const isChecked = checkedTaskIndices.has(i)
              const step = effectiveSteps[i] ?? null
              const isActive = activeStepIdx === i
              return (
                <div
                  key={i}
                  onClick={() => {
                    setActiveStepIdx(i)
                    setActiveTab('instructions')
                  }}
                  className={cn(
                    'group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer select-none',
                    isActive
                      ? 'bg-slate-50 border-slate-200 shadow-sm'
                      : 'bg-white hover:bg-slate-50/80 border-slate-100',
                  )}
                  style={isActive ? { borderLeft: `4px solid ${theme.primary}` } : {}}
                >
                  {/* Stepper checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTaskToggle(i)
                    }}
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold border transition-all mt-0.5',
                      isChecked
                        ? 'text-white border-transparent'
                        : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:border-slate-300',
                    )}
                    style={isChecked ? { background: theme.gradient } : {}}
                  >
                    {isChecked ? '✓' : i + 1}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-xs font-semibold leading-relaxed tracking-wide',
                      isChecked ? 'line-through text-slate-400' : 'text-slate-700',
                    )}>
                      {task}
                    </p>
                    {step?.estimatedMinutes && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-slate-400 tracking-wider uppercase">
                        <Clock className="h-2.5 w-2.5" />
                        {step.estimatedMinutes}min
                      </span>
                    )}
                  </div>

                  <ChevronRight className={cn(
                    'h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-slate-400 transition-transform self-center',
                    isActive && 'translate-x-0.5 text-indigo-500'
                  )} />
                </div>
              )
            })}

            {/* Mark complete (mobile/sm checklist area) */}
            {allChecked && onMarkComplete && !isCompleted && (
              <button
                onClick={handleMarkComplete}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: theme.gradient }}
              >
                <Trophy className="h-4 w-4" />
                {String(t('learnerLabs.markComplete'))}
              </button>
            )}
          </div>

          {/* Cloud credentials panel */}
          {credentialsPanel && (
            <div className="shrink-0 px-3 pb-3">
              {credentialsPanel}
            </div>
          )}

          {/* Besoin d'aide? */}
          <div className="shrink-0 mx-3 mb-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white overflow-hidden">
            {/* Cloud illustration placeholder */}
            <div className="flex items-center justify-center h-24 bg-gradient-to-br from-slate-50 to-blue-50/30">
              <div className="flex items-center gap-1">
                {/* Simple cloud icon arrangement */}
                <div className="h-10 w-16 rounded-full opacity-20 blur-sm" style={{ background: theme.gradient }} />
                <div className="absolute flex items-center justify-center">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center shadow-sm bg-white" style={{ border: `2px solid ${theme.primary}30` }}>
                    <MessageCircle className="h-4 w-4" style={{ color: theme.primary }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4">
              <p className="text-xs font-bold text-slate-800">Besoin d&apos;aide ?</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Consultez l&apos;Assistant IA ou les ressources ci-dessous.
              </p>
              <button
                type="button"
                onClick={onAssistantToggle}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                style={{ color: theme.primary }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Ouvrir l&apos;Assistant IA →
              </button>
            </div>
          </div>
        </aside>

        {/* ── MIDDLE: Guide pratique ── */}
        <main ref={guideContentRef} className="flex-1 min-w-0 overflow-y-auto bg-white">

          {/* Post-lab quiz overlay */}
          <AnimatePresence>
            {quizMode && postLabQuiz && postLabQuiz.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mx-5 mt-5 rounded-2xl border-2 p-6"
                style={{ borderColor: theme.primary, background: `${theme.primary}06` }}
              >
                {!quizSubmitted ? (
                  <>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: theme.gradient }}>
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Quiz final</h2>
                        <p className="text-xs text-slate-500">{postLabQuiz.length} questions — prouvez vos acquis avant de valider</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {postLabQuiz.map((q, qi) => (
                        <div key={qi} className="rounded-xl border border-slate-100 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-800 mb-3">
                            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: theme.gradient }}>{qi + 1}</span>
                            {q.question}
                          </p>
                          <div className="space-y-2">
                            {q.options.map((opt, oi) => (
                              <button
                                key={oi}
                                type="button"
                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [qi]: oi }))}
                                className={cn(
                                  'w-full rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-all',
                                  quizAnswers[qi] === oi
                                    ? 'border-2 text-white'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white',
                                )}
                                style={quizAnswers[qi] === oi ? { borderColor: theme.primary, background: theme.gradient } : {}}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="mt-5 w-full font-bold"
                      disabled={Object.keys(quizAnswers).length < postLabQuiz.length}
                      onClick={handleQuizSubmit}
                      style={{ background: theme.gradient }}
                    >
                      Soumettre les réponses
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-5">
                      <div className="text-4xl font-black mb-1" style={{ color: theme.primary }}>
                        {quizScore}/{postLabQuiz.length}
                      </div>
                      <p className="text-sm text-slate-500">
                        {quizScore === postLabQuiz.length
                          ? 'Parfait ! Toutes les réponses sont correctes.'
                          : `${postLabQuiz.length - quizScore} erreur(s) — lisez les explications ci-dessous.`}
                      </p>
                    </div>
                    <div className="space-y-4 mb-5">
                      {postLabQuiz.map((q, qi) => {
                        const selected = quizAnswers[qi]
                        const isCorrect = selected === q.correct
                        return (
                          <div
                            key={qi}
                            className={cn('rounded-xl border p-4', isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50')}
                          >
                            <div className="flex items-start gap-2 mb-2">
                              {isCorrect
                                ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                : <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                              <p className="text-xs font-semibold text-slate-800">{q.question}</p>
                            </div>
                            {!isCorrect && (
                              <p className="text-xs text-red-700 mb-1">
                                Votre réponse: <span className="font-semibold">{q.options[selected]}</span>
                              </p>
                            )}
                            <p className="text-xs text-slate-600 mb-1">
                              Bonne réponse: <span className="font-semibold">{q.options[q.correct]}</span>
                            </p>
                            <p className="text-xs text-slate-500 italic">{q.explanation}</p>
                          </div>
                        )
                      })}
                    </div>
                    <Button
                      className="w-full font-bold"
                      onClick={handleQuizFinish}
                      style={{ background: theme.gradient }}
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      Valider le lab et voir ma progression
                    </Button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completion celebration */}
          <AnimatePresence>
            {showCompletion && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="mx-5 mt-5 rounded-2xl border-2 p-6 text-center"
                style={{ borderColor: theme.primary, background: `${theme.primary}08` }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                >
                  <PartyPopper className="h-12 w-12 mx-auto mb-3" style={{ color: theme.primary }} />
                </motion.div>
                <h2 className="text-xl font-bold mb-1">{String(t('learnerLabs.labCompleted'))}</h2>
                <p className="text-sm text-slate-500 mb-4">{String(t('learnerLabs.labCompletedDesc'))}</p>
                <div className="flex items-center justify-center gap-6 text-sm text-slate-500 mb-4">
                  {timerSeconds > 0 && (
                    <span>
                      <Clock className="h-3.5 w-3.5 inline mr-1" />
                      {String(t('learnerLabs.timeSpent'))}: {formatTime(timerSeconds)}
                    </span>
                  )}
                  <span>
                    {String(t('learnerLabs.completedOn'))}: {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={handleShareCompletion} className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Partager sur LinkedIn
                  </Button>
                  {nextSlug && (
                    <Button
                      onClick={() => { setShowCompletion(false); onNavigateToSlug(nextSlug) }}
                      style={{ background: theme.gradient }}
                    >
                      {String(t('learnerLabs.nextLab'))}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                  <Button variant="outline" onClick={onBack}>
                    {String(t('learnerLabs.backToLabsList'))}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guide content tabs header */}
          <div className="border-b border-slate-100 px-6 sm:px-8 bg-slate-50/20">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('instructions')}
                className={cn(
                  'py-3 text-xs font-bold border-b-2 transition-all relative',
                  activeTab === 'instructions'
                    ? 'text-slate-900'
                    : 'text-slate-400 hover:text-slate-600 border-b-transparent',
                )}
                style={activeTab === 'instructions' ? { borderBottomColor: theme.primary } : {}}
              >
                Guide de l&apos;étape
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terminal')}
                className={cn(
                  'py-3 text-xs font-bold border-b-2 transition-all relative flex items-center gap-1.5',
                  activeTab === 'terminal'
                    ? 'text-slate-900'
                    : 'text-slate-400 hover:text-slate-600 border-b-transparent',
                )}
                style={activeTab === 'terminal' ? { borderBottomColor: theme.primary } : {}}
              >
                <Terminal className="h-3.5 w-3.5" />
                Terminal Cloud
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scenario')}
                className={cn(
                  'py-3 text-xs font-bold border-b-2 transition-all relative',
                  activeTab === 'scenario'
                    ? 'text-slate-900'
                    : 'text-slate-400 hover:text-slate-600 border-b-transparent',
                )}
                style={activeTab === 'scenario' ? { borderBottomColor: theme.primary } : {}}
              >
                Contexte & Objectifs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('resources')}
                className={cn(
                  'py-3 text-xs font-bold border-b-2 transition-all relative',
                  activeTab === 'resources'
                    ? 'text-slate-900'
                    : 'text-slate-400 hover:text-slate-600 border-b-transparent',
                )}
                style={activeTab === 'resources' ? { borderBottomColor: theme.primary } : {}}
              >
                Ressources
              </button>
            </div>
          </div>

          <div className="px-5 sm:px-8 py-5 max-w-3xl">
            {/* Mobile Step Selector */}
            <div className="lg:hidden flex items-center justify-between gap-2 border border-slate-100 rounded-xl px-4 py-2 bg-slate-50/50 mb-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={activeStepIdx === 0}
                onClick={() => setActiveStepIdx((prev) => prev - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-bold text-slate-700">
                Étape {activeStepIdx + 1} sur {tasks.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={activeStepIdx === tasks.length - 1}
                onClick={() => setActiveStepIdx((prev) => prev + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* TAB CONTENT: ACTIVE STEP GUIDE */}
            {activeTab === 'instructions' && (
              <div className="space-y-5">
                {hasRichSteps && effectiveSteps[activeStepIdx] ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          Étape {activeStepIdx + 1} : {effectiveSteps[activeStepIdx].title}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5">
                          CONSIGNE PRATIQUE
                        </p>
                      </div>
                      {effectiveSteps[activeStepIdx].estimatedMinutes && (
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {effectiveSteps[activeStepIdx].estimatedMinutes} min
                        </span>
                      )}
                    </div>

                    <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-600">
                      <ReactMarkdown components={renderers}>
                        {effectiveSteps[activeStepIdx].instruction}
                      </ReactMarkdown>
                    </div>

                    {effectiveSteps[activeStepIdx].hint && (
                      <div className="border border-slate-100 bg-amber-50/30 rounded-xl p-3">
                        <HintToggle hint={effectiveSteps[activeStepIdx].hint!} theme={theme} />
                      </div>
                    )}

                    {effectiveSteps[activeStepIdx].validationNote && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-emerald-700">Note de validation : </span>
                          <span className="text-emerald-600 leading-relaxed">{effectiveSteps[activeStepIdx].validationNote}</span>
                        </div>
                      </div>
                    )}

                    {/* GUI Simulation Controls */}
                    {(() => {
                      const isAzure = theme.primary === '#0078D4'
                      const isAws = theme.primary === '#FF9900'

                      if (activeStepIdx === 0) {
                        return (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <span>🖥️</span> Simulateur de Console Graphique (GUI)
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Vous pouvez simuler la création de la machine virtuelle sur la console graphique en un clic.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (isAzure) {
                                    setCloudState(prev => {
                                      const next = { ...prev }
                                      next.azure.vms['vm-az900-lab2'] = {
                                        name: 'vm-az900-lab2',
                                        resourceGroup: 'rg-az900-lab1',
                                        size: 'Standard_B1s',
                                        state: 'Running',
                                        nsgRules: []
                                      }
                                      return next
                                    })
                                    toast.success("Simulation : VM 'vm-az900-lab2' (Standard_B1s) créée sur le Portail Azure.")
                                  } else if (isAws) {
                                    setCloudState(prev => {
                                      const next = { ...prev }
                                      next.aws.instances['i-1234567890abcdef0'] = {
                                        id: 'i-1234567890abcdef0',
                                        type: 't3.micro',
                                        state: 'running',
                                        securityGroups: []
                                      }
                                      return next
                                    })
                                    toast.success("Simulation : Instance EC2 'i-1234567890abcdef0' (t3.micro) créée sur la console AWS.")
                                  }
                                }}
                                className="font-bold text-xs"
                              >
                                Déployer l&apos;instance (Recommandé - Gratuite)
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (isAzure) {
                                    setCloudState(prev => {
                                      const next = { ...prev }
                                      next.azure.vms['vm-az900-lab2'] = {
                                        name: 'vm-az900-lab2',
                                        resourceGroup: 'rg-az900-lab1',
                                        size: 'Standard_D2s_v5',
                                        state: 'Running',
                                        nsgRules: []
                                      }
                                      return next
                                    })
                                    toast.warning("Simulation : VM 'vm-az900-lab2' (Standard_D2s_v5) créée sur le Portail Azure.")
                                  } else if (isAws) {
                                    setCloudState(prev => {
                                      const next = { ...prev }
                                      next.aws.instances['i-1234567890abcdef0'] = {
                                        id: 'i-1234567890abcdef0',
                                        type: 't3.large',
                                        state: 'running',
                                        securityGroups: []
                                      }
                                      return next
                                    })
                                    toast.warning("Simulation : Instance EC2 'i-1234567890abcdef0' (t3.large) créée sur la console AWS.")
                                  }
                                }}
                                className="font-bold text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                              >
                                Déployer l&apos;instance (D2s/t3.large - Trop grande)
                              </Button>
                            </div>
                          </div>
                        )
                      }

                      if (activeStepIdx === 2) {
                        return (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <span>🛡️</span> Sécurité Réseau & Groupes (GUI)
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Simulez l&apos;ouverture des ports d&apos;entrée pour autoriser la connexion d&apos;administration.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (isAzure) {
                                    setCloudState(prev => {
                                      const next = { ...prev }
                                      const vm = next.azure.vms['vm-az900-lab2']
                                      if (vm) vm.nsgRules = [{ port: 3389, access: 'Allow' }]
                                      return next
                                    })
                                    toast.success("Simulation : Règle NSG configurée pour autoriser le port RDP 3389.")
                                  } else if (isAws) {
                                    setCloudState(prev => {
                                      const next = { ...prev }
                                      const instId = Object.keys(next.aws.instances)[0]
                                      const ins = instId ? next.aws.instances[instId] : null
                                      if (ins) ins.securityGroups = [{ port: 22, action: 'allow' }]
                                      return next
                                    })
                                    toast.success("Simulation : Security Group configuré pour autoriser le port SSH 22.")
                                  }
                                }}
                                className="font-bold text-xs"
                              >
                                Ouvrir le port d&apos;administration ({isAzure ? 'RDP 3389' : 'SSH 22'})
                              </Button>
                            </div>
                          </div>
                        )
                      }

                      if (activeStepIdx === 3 || activeStepIdx === 5) {
                        return (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <span>🗑️</span> Nettoyage des Ressources (GUI)
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Simulez la suppression définitive des ressources créées pour ce lab.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (isAzure) {
                                    setCloudState(prev => {
                                      const next = { ...prev }
                                      delete next.azure.vms['vm-az900-lab2']
                                      return next
                                    })
                                    toast.success("Simulation : Toutes les ressources Azure ont été supprimées.")
                                  } else if (isAws) {
                                    setCloudState(prev => {
                                      const next = { ...prev }
                                      next.aws.instances = {}
                                      return next
                                    })
                                    toast.success("Simulation : Toutes les instances EC2 ont été détruites.")
                                  }
                                }}
                                className="font-bold text-xs"
                              >
                                Supprimer toutes les ressources du Lab
                              </Button>
                            </div>
                          </div>
                        )
                      }

                      return null
                    })()}

                    {/* Verification Panel */}
                    <div className="border-t border-slate-100 pt-6 mt-6">
                      {(() => {
                        const verification = stepVerifications[activeStepIdx]

                        if (!verification) {
                          return (
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                              <Button
                                onClick={() => handleVerifyStep(activeStepIdx)}
                                className="w-full sm:w-auto font-bold rounded-xl px-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: theme.gradient }}
                              >
                                Vérifier ma configuration
                              </Button>
                              <span className="text-[11px] text-slate-400 leading-normal text-center sm:text-left">
                                Cliquez pour exécuter l&apos;évaluation automatique de cette étape sur votre sandbox.
                              </span>
                            </div>
                          )
                        }

                        return (
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-4">
                            <div className="space-y-2.5">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Statut de la vérification : {verification.status === 'checking' ? 'Vérification en cours...' : verification.status === 'failed' ? 'Échec de la validation' : 'Configuration validée'}
                              </p>

                              <div className="space-y-2">
                                {verification.checks.map((check, idx) => (
                                  <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-600">
                                    {check.status === 'idle' && (
                                      <div className="h-4 w-4 rounded-full border border-slate-200 bg-white" />
                                    )}
                                    {check.status === 'checking' && (
                                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                    )}
                                    {check.status === 'success' && (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                    )}
                                    {check.status === 'failed' && (
                                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                                    )}
                                    <span className={cn(
                                      check.status === 'checking' && "font-semibold text-slate-800",
                                      check.status === 'success' && "text-slate-500 line-through decoration-slate-200",
                                      check.status === 'failed' && "font-semibold text-red-600"
                                    )}>
                                      {check.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {verification.status === 'failed' && (
                              <div className="rounded-xl border border-red-100 bg-red-50/60 p-3.5 space-y-3 animation-fade-in">
                                <div className="space-y-1">
                                  <p className="text-xs font-mono font-bold text-red-700 leading-normal">{verification.errorMessage}</p>
                                  <p className="text-xs text-red-600 leading-relaxed font-medium">{verification.advice}</p>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleVerifyStep(activeStepIdx)}
                                    className="font-bold text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Réessayer la vérification
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (!assistantOpen) {
                                        onAssistantToggle()
                                      }
                                      const isAzure = theme.primary === '#0078D4'
                                      let query = ""
                                      if (activeStepIdx === 0) {
                                        query = isAzure
                                          ? "J'ai déployé une VM Azure de mauvaise taille (D2s_v5 au lieu de B1s). Comment puis-je redimensionner la VM ou la recréer en taille B1s sur Azure ?"
                                          : "I deployed an EC2 instance of the wrong size. How do I change the instance type to t3.micro on AWS?"
                                      } else if (activeStepIdx === 2) {
                                        query = isAzure
                                          ? "Je reçois un Connection Timeout sur le port RDP 3389 de ma VM Azure. Comment ajouter une règle NSG de port d'entrée sur Azure ?"
                                          : "I'm getting a SSH port 22 timeout. How do I add an inbound rule to my Security Group on AWS?"
                                      } else {
                                        query = "Comment vérifier et supprimer proprement toutes les ressources de mon lab pour libérer la sandbox ?"
                                      }
                                      setPendingQuestion(query)
                                    }}
                                    className="font-bold text-xs rounded-lg border-red-200 text-red-700 hover:bg-red-100/50"
                                  >
                                    Aide de l&apos;Assistant IA 🤖
                                  </Button>
                                </div>
                              </div>
                            )}

                            {verification.status === 'success' && (
                              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-emerald-800 animation-success-bounce">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-700">Configuration validée avec succès dans votre bac à sable cloud !</span>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-600">Aucune consigne détaillée pour cette étape.</p>
                    <p className="text-xs text-slate-400 mt-1">Marquez la tâche comme complétée dans le volet de gauche.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: CLOUD SHELL TERMINAL */}
            {activeTab === 'terminal' && (
              <div className="space-y-4">
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>💡</span> Mode d&apos;apprentissage Hybride
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Ce shell virtuel est connecté à l&apos;état de votre sandbox. Toutes vos actions en ligne de commande mettent à jour vos ressources virtuelles en temps réel, ce qui permet à l&apos;outil d&apos;évaluation d&apos;analyser votre configuration.
                  </p>
                </div>
                <CloudShellTerminal
                  theme={theme}
                  title={title}
                  prov={theme.primary === '#0078D4' ? 'azure' : theme.primary === '#FF9900' ? 'aws' : 'gcp'}
                  cloudState={cloudState}
                  setCloudState={setCloudState}
                />
              </div>
            )}

            {/* TAB CONTENT: SCENARIO & OBJECTIVES */}
            {activeTab === 'scenario' && (
              <div className="space-y-6">
                {/* Cost warning banner */}
                {costWarning && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-amber-800 mb-0.5">Avertissement coût</p>
                      <p className="text-xs text-amber-700 leading-relaxed">{costWarning}</p>
                      {sandboxUrl && (
                        <a
                          href={sandboxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 underline hover:opacity-80"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Accéder au Sandbox gratuit
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Scenario narrative */}
                {scenario && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <BookOpen className="h-4.5 w-4.5" style={{ color: theme.primary }} />
                      <span className="text-sm font-bold text-slate-800">Contexte du lab</span>
                    </div>
                    <div className="prose prose-slate max-w-none text-xs text-slate-600 leading-relaxed">
                      <ReactMarkdown components={renderers}>{scenario}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Description */}
                {description && (
                  <div className="rounded-xl border border-slate-100 p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-2.5">Description générale</h3>
                    <p className="text-xs leading-relaxed text-slate-500 whitespace-pre-wrap">{description}</p>
                  </div>
                )}

                {/* Objectifs du lab */}
                <div className="rounded-xl border border-slate-100 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Objectifs d&apos;apprentissage</h3>
                  <ul className="space-y-2.5">
                    {objectives.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600 leading-normal">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: theme.primary }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB CONTENT: RESOURCES & CAREER */}
            {activeTab === 'resources' && (
              <div className="space-y-6">
                {resourceLinks.length > 0 ? (
                  <div className={cn(
                    'rounded-xl p-5 border',
                    theme.resourceSectionClass ?? 'bg-slate-50/60 border border-slate-100',
                  )}>
                    <h3 className={cn(
                      'text-sm font-bold mb-3.5',
                      theme.resourceHeadingClass ?? 'text-slate-800',
                    )}>
                      {String(t('learnerLabs.usefulResources'))}
                    </h3>
                    <ul className="space-y-2">
                      {resourceLinks.map((link) => (
                        <li key={link.href + link.label}>
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'flex items-center gap-1.5 text-xs font-bold transition-colors',
                              theme.resourceLinkClass ?? 'text-primary hover:opacity-80',
                            )}
                          >
                            {link.label}
                            <ExternalLink className="h-3.5 w-3.5 opacity-60 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">Aucun lien utile disponible.</div>
                )}

                {careerConnection && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-5">
                    <div className="mb-2.5 flex items-center gap-2">
                      <Trophy className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                      <span className="text-sm font-bold text-emerald-800">Lien avec votre carrière</span>
                    </div>
                    <p className="text-xs leading-relaxed text-emerald-700">{careerConnection}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* ── RIGHT: Assistant IA panel (always visible xl+) ── */}
        <div className="hidden xl:flex w-[320px] shrink-0 border-l border-slate-100 flex-col bg-white overflow-hidden">

          {/* Chat — takes all available space; UniversalTutor renders its own chips + input */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <UniversalTutor
              contextType="lab"
              contextTitle={title}
              contextItems={tasks}
              isOpen
              onToggle={() => {}}
              locale={locale}
              className="h-full w-full border-0"
              pendingQuestion={pendingQuestion}
              onPendingQuestionSent={() => setPendingQuestion(undefined)}
            />
          </div>

          {/* Compact footer: progress bar + resource links */}
          <div className="shrink-0 border-t border-slate-100 bg-white">
            {/* Progression row */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${theme.primary}12` }}>
                <Trophy className="h-3.5 w-3.5" style={{ color: taskProgress === 100 ? theme.primary : '#94a3b8' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {checkedTaskIndices.size}/{tasks.length} tâches
                  </span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: theme.primary }}>
                    {taskProgress}%
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: theme.gradient }}
                    initial={{ width: 0 }}
                    animate={{ width: `${taskProgress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            {/* Resource links (compact, max 2) */}
            {resourceLinks.length > 0 && (
              <div className="px-4 pb-3 flex gap-2 flex-wrap">
                {resourceLinks.slice(0, 2).map((link) => {
                  const Icon = resourceIcon(link.label)
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 hover:bg-white hover:border-slate-200 transition-all"
                    >
                      <Icon className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-[11px] font-medium text-slate-600 truncate max-w-[90px]">
                        {link.label.replace(' →', '')}
                      </span>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile assistant overlay */}
        <AnimatePresence>
          {assistantOpen && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="xl:hidden fixed inset-y-0 right-0 w-full sm:w-[360px] z-50 flex flex-col border-l border-slate-100 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100" style={{ background: theme.gradient }}>
                <p className="text-sm font-bold text-white">Assistant IA</p>
                <button
                  type="button"
                  onClick={onAssistantToggle}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <UniversalTutor
                  contextType="lab"
                  contextTitle={title}
                  contextItems={tasks}
                  isOpen
                  onToggle={onAssistantToggle}
                  locale={locale}
                  className="h-full w-full border-0"
                  pendingQuestion={pendingQuestion}
                  onPendingQuestionSent={() => setPendingQuestion(undefined)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ BOTTOM NAVIGATION ══════════════════════════════════════════════ */}
      <footer className="shrink-0 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-4 py-3 z-20">
        <div className="flex items-center gap-3">
          {/* Précédent */}
          <Button
            variant="ghost"
            size="sm"
            disabled={!prevSlug}
            onClick={() => prevSlug && onNavigateToSlug(prevSlug)}
            className="gap-1.5 text-slate-500 hover:text-slate-800 font-semibold disabled:opacity-30 rounded-xl h-9 px-3"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{String(t('learnerLabs.previous'))}</span>
          </Button>

          {/* Astuce */}
          <div className="flex-1 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="font-medium">Astuce :</span>
            <span className="truncate">Prenez votre temps et suivez chaque étape.</span>
          </div>

          {/* Suivant */}
          <Button
            size="sm"
            disabled={!nextSlug}
            onClick={() => nextSlug && onNavigateToSlug(nextSlug)}
            className="gap-1.5 font-bold rounded-xl h-9 px-4 disabled:opacity-30 ml-auto sm:ml-0"
            style={{ background: nextSlug ? theme.gradient : undefined }}
          >
            <span>{String(t('learnerLabs.next'))}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Button>
        </div>
      </footer>
    </div>
  )
}

function HintToggle({ hint, theme }: { hint: string; theme: LabDetailTheme }) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium hover:underline"
        style={{ color: theme.primary }}
      >
        <Lightbulb className="h-3 w-3" />
        {show ? String(t('learnerLabs.hideHint')) : String(t('learnerLabs.showHint'))}
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-1">
              {hint}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function CloudShellTerminal({
  theme,
  title,
  prov,
  cloudState,
  setCloudState
}: {
  theme: any
  title: string
  prov: 'azure' | 'aws' | 'gcp'
  cloudState: any
  setCloudState: React.Dispatch<React.SetStateAction<any>>
}) {
  const [history, setHistory] = useState<{ text: string; type: 'input' | 'output' | 'error' | 'header' }[]>([
    { text: `Welcome to Subul Cloud Shell (Virtual Sandbox Client v1.3)`, type: 'header' },
    { text: `Authenticated as: student@subul-sandbox`, type: 'header' },
    { text: `Active Subscription: Subul-Student-Sandbox-Subscription`, type: 'header' },
    { text: `Type 'help' to see list of available commands.`, type: 'header' },
    { text: `--------------------------------------------------------`, type: 'header' }
  ])
  const [input, setInput] = useState('')
  const terminalEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const handleCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim()
    if (!trimmed) return

    setHistory(prev => [...prev, { text: `${prov === 'azure' ? 'student@azure-cli:~$ ' : 'student@aws-cli:~$ '}${trimmed}`, type: 'input' }])
    setInput('')

    const parts = trimmed.split(/\s+/)
    const baseCmd = parts[0].toLowerCase()

    if (baseCmd === 'clear') {
      setHistory([])
      return
    }

    if (baseCmd === 'help') {
      const azureHelp = [
        "Commandes Azure CLI disponibles :",
        "  az group list                - Lister les groupes de ressources",
        "  az group create --name <rg>  - Créer un groupe de ressources (ex: rg-az900-lab1)",
        "  az vm list                   - Lister vos machines virtuelles",
        "  az vm create --name <n> --resource-group <rg> --size <size> - Déployer une VM (ex: Standard_B1s)",
        "  az vm open-port --name <n> --resource-group <rg> --port <p>  - Ouvrir un port réseau (ex: 3389)",
        "  az vm delete --name <n> --resource-group <rg> --yes         - Supprimer une VM et ses disques",
        "  az vm show --name <n> --resource-group <rg>                 - Afficher les détails d'une VM",
        "Commandes générales :",
        "  clear                        - Effacer l'écran",
        "  help                         - Afficher cette aide"
      ]
      const awsHelp = [
        "Commandes AWS CLI disponibles :",
        "  aws s3 ls                                            - Lister les buckets S3",
        "  aws s3 mb s3://<bucket>                              - Créer un nouveau bucket S3",
        "  aws ec2 describe-instances                           - Lister vos instances EC2",
        "  aws ec2 run-instances --instance-type <type>         - Lancer une instance EC2 (ex: t3.micro)",
        "  aws ec2 authorize-security-group-ingress --port <p>  - Ouvrir un port d'entrée (ex: 22)",
        "  aws ec2 terminate-instances --instance-ids <id>      - Arrêter et détruire une instance EC2",
        "Commandes générales :",
        "  clear                                                - Effacer l'écran",
        "  help                                                 - Afficher cette aide"
      ]

      const helpLines = prov === 'azure' ? azureHelp : awsHelp
      setHistory(prev => [...prev, ...helpLines.map(l => ({ text: l, type: 'output' as const }))])
      return
    }

    const getFlag = (flagName: string) => {
      const idx = parts.findIndex(p => p === flagName)
      if (idx !== -1 && idx + 1 < parts.length) {
        return parts[idx + 1]
      }
      return null
    }

    if (baseCmd === 'az') {
      if (prov !== 'azure') {
        setHistory(prev => [...prev, { text: "Error: CLI 'az' commands are only available in Microsoft Azure lab environments.", type: 'error' }])
        return
      }

      const subCmd1 = parts[1]?.toLowerCase()
      const subCmd2 = parts[2]?.toLowerCase()

      if (subCmd1 === 'group') {
        if (subCmd2 === 'list') {
          const rgs = Array.from(cloudState.azure.resourceGroups)
          const output = rgs.map(rg => ({ name: rg, location: 'westeurope', provisioningState: 'Succeeded' }))
          setHistory(prev => [...prev, { text: JSON.stringify(output, null, 2), type: 'output' }])
          return
        }
        if (subCmd2 === 'create') {
          const name = getFlag('--name') || getFlag('-n') || getFlag('-g')
          if (!name) {
            setHistory(prev => [...prev, { text: "Error: Missing required argument '--name' or '-n'", type: 'error' }])
            return
          }
          setCloudState((prev: any) => {
            const next = { ...prev }
            next.azure.resourceGroups.add(name)
            return next
          })
          setHistory(prev => [...prev, { text: JSON.stringify({ name, location: 'westeurope', properties: { provisioningState: 'Succeeded' } }, null, 2), type: 'output' }])
          return
        }
      }

      if (subCmd1 === 'vm') {
        if (subCmd2 === 'list') {
          const vms = Object.values(cloudState.azure.vms)
          if (vms.length === 0) {
            setHistory(prev => [...prev, { text: "[]", type: 'output' }])
            return
          }
          if (parts.includes('-o') && parts[parts.indexOf('-o') + 1] === 'table') {
            let table = "Name\t\tResourceGroup\tLocation\tSize\t\tStatus\n"
            table += "----------------------------------------------------------------------\n"
            vms.forEach((vm: any) => {
              table += `${vm.name}\t${vm.resourceGroup}\t\twesteurope\t${vm.size}\tVM ${vm.state.toLowerCase()}\n`
            })
            setHistory(prev => [...prev, { text: table, type: 'output' }])
          } else {
            setHistory(prev => [...prev, { text: JSON.stringify(vms, null, 2), type: 'output' }])
          }
          return
        }

        if (subCmd2 === 'create') {
          const name = getFlag('--name') || getFlag('-n')
          const rg = getFlag('--resource-group') || getFlag('-g')
          const size = getFlag('--size') || 'Standard_B1s'

          if (!name || !rg) {
            setHistory(prev => [...prev, { text: "Error: Missing required arguments '--name' (-n) and '--resource-group' (-g)", type: 'error' }])
            return
          }

          if (!cloudState.azure.resourceGroups.has(rg)) {
            setHistory(prev => [...prev, { text: `Error: Resource group '${rg}' could not be found. Create it first using 'az group create'.`, type: 'error' }])
            return
          }

          setCloudState((prev: any) => {
            const next = { ...prev }
            next.azure.vms[name] = {
              name,
              resourceGroup: rg,
              size,
              state: 'Running',
              nsgRules: []
            }
            return next
          })

          setHistory(prev => [
            ...prev,
            { text: `Deploying virtual machine '${name}'...`, type: 'output' },
            { text: `Resource Group: ${rg}, Size: ${size}`, type: 'output' },
            { text: `VM deployed successfully. Private IP: 10.0.0.4, Public IP: 20.223.118.9`, type: 'output' }
          ])
          return
        }

        if (subCmd2 === 'open-port') {
          const name = getFlag('--name') || getFlag('-n')
          const rg = getFlag('--resource-group') || getFlag('-g')
          const portStr = getFlag('--port')

          if (!name || !rg || !portStr) {
            setHistory(prev => [...prev, { text: "Error: Missing required arguments '--name', '--resource-group', and '--port'", type: 'error' }])
            return
          }

          const port = parseInt(portStr)
          const vm = cloudState.azure.vms[name]
          if (!vm) {
            setHistory(prev => [...prev, { text: `Error: Virtual machine '${name}' not found in group '${rg}'.`, type: 'error' }])
            return
          }

          setCloudState((prev: any) => {
            const next = { ...prev }
            const activeVm = next.azure.vms[name]
            if (activeVm) {
              activeVm.nsgRules = [...activeVm.nsgRules, { port, access: 'Allow' }]
            }
            return next
          })

          setHistory(prev => [...prev, { text: `Successfully opened port ${port} on VM '${name}'. NSG rule created.`, type: 'output' }])
          return
        }

        if (subCmd2 === 'delete') {
          const name = getFlag('--name') || getFlag('-n')
          const rg = getFlag('--resource-group') || getFlag('-g')

          if (!name || !rg) {
            setHistory(prev => [...prev, { text: "Error: Missing required arguments '--name' and '--resource-group'", type: 'error' }])
            return
          }

          if (!cloudState.azure.vms[name]) {
            setHistory(prev => [...prev, { text: `Error: Virtual machine '${name}' not found.`, type: 'error' }])
            return
          }

          setCloudState((prev: any) => {
            const next = { ...prev }
            delete next.azure.vms[name]
            return next
          })

          setHistory(prev => [...prev, { text: `VM '${name}' and its associated network interface and disk have been deleted.`, type: 'output' }])
          return
        }

        if (subCmd2 === 'show') {
          const name = getFlag('--name') || getFlag('-n')
          const rg = getFlag('--resource-group') || getFlag('-g')

          if (!name || !rg) {
            setHistory(prev => [...prev, { text: "Error: Missing required arguments '--name' and '--resource-group'", type: 'error' }])
            return
          }

          const vm = cloudState.azure.vms[name]
          if (!vm) {
            setHistory(prev => [...prev, { text: `Error: VM '${name}' not found.`, type: 'error' }])
            return
          }

          setHistory(prev => [...prev, { text: JSON.stringify(vm, null, 2), type: 'output' }])
          return
        }
      }

      setHistory(prev => [...prev, { text: `az: error: command or arguments not recognized. Type 'help' to see list of valid commands.`, type: 'error' }])
      return
    }

    if (baseCmd === 'aws') {
      if (prov !== 'aws') {
        setHistory(prev => [...prev, { text: "Error: CLI 'aws' commands are only available in AWS lab environments.", type: 'error' }])
        return
      }

      const subCmd1 = parts[1]?.toLowerCase()
      const subCmd2 = parts[2]?.toLowerCase()

      if (subCmd1 === 's3') {
        if (subCmd2 === 'ls') {
          const buckets = Array.from(cloudState.aws.buckets)
          if (buckets.length === 0) {
            setHistory(prev => [...prev, { text: "No buckets found.", type: 'output' }])
          } else {
            setHistory(prev => [...prev, ...buckets.map(b => ({ text: `2026-06-11 21:52:00 s3://${b}`, type: 'output' as const }))])
          }
          return
        }
        if (subCmd2 === 'mb') {
          const path = parts[3]
          if (!path || !path.startsWith('s3://')) {
            setHistory(prev => [...prev, { text: "Error: Invalid bucket path. Usage: aws s3 mb s3://<bucket-name>", type: 'error' }])
            return
          }
          const bucketName = path.replace('s3://', '')
          setCloudState((prev: any) => {
            const next = { ...prev }
            next.aws.buckets.add(bucketName)
            return next
          })
          setHistory(prev => [...prev, { text: `make_bucket: s3://${bucketName}`, type: 'output' }])
          return
        }
      }

      if (subCmd1 === 'ec2') {
        if (subCmd2 === 'describe-instances') {
          const insts = Object.values(cloudState.aws.instances)
          if (insts.length === 0) {
            setHistory(prev => [...prev, { text: JSON.stringify({ Reservations: [] }, null, 2), type: 'output' }])
            return
          }
          if (parts.includes('--output') && parts[parts.indexOf('--output') + 1] === 'table') {
            let table = "InstanceId\t\tInstanceType\tState\t\tSecurityGroupPortsOpen\n"
            table += "----------------------------------------------------------------------\n"
            insts.forEach((ins: any) => {
              const ports = ins.securityGroups.map((g: any) => g.port).join(', ') || 'None'
              table += `${ins.id}\t${ins.type}\t\t${ins.state}\t\t${ports}\n`
            })
            setHistory(prev => [...prev, { text: table, type: 'output' }])
          } else {
            setHistory(prev => [...prev, { text: JSON.stringify({ Reservations: [{ Instances: insts }] }, null, 2), type: 'output' }])
          }
          return
        }

        if (subCmd2 === 'run-instances') {
          const type = getFlag('--instance-type') || 't3.micro'
          const id = 'i-' + Math.random().toString(36).substr(2, 17)

          setCloudState((prev: any) => {
            const next = { ...prev }
            next.aws.instances[id] = {
              id,
              type,
              state: 'running',
              securityGroups: []
            }
            return next
          })

          setHistory(prev => [
            ...prev,
            { text: `Starting instance ${id}...`, type: 'output' },
            { text: `Instance launched: ${id} (${type})`, type: 'output' }
          ])
          return
        }

        if (subCmd2 === 'authorize-security-group-ingress') {
          const portStr = getFlag('--port')
          const instId = Object.keys(cloudState.aws.instances)[0]

          if (!portStr) {
            setHistory(prev => [...prev, { text: "Error: Missing required argument '--port'", type: 'error' }])
            return
          }

          if (!instId) {
            setHistory(prev => [...prev, { text: "Error: No EC2 instances found. Launch an instance first using 'aws ec2 run-instances'.", type: 'error' }])
            return
          }

          const port = parseInt(portStr)
          setCloudState((prev: any) => {
            const next = { ...prev }
            const ins = next.aws.instances[instId]
            if (ins) {
              ins.securityGroups = [...ins.securityGroups, { port, action: 'allow' }]
            }
            return next
          })

          setHistory(prev => [...prev, { text: `Security Group ingress rule added successfully: Inbound Allow port ${port}`, type: 'output' }])
          return
        }

        if (subCmd2 === 'terminate-instances') {
          const id = getFlag('--instance-ids')
          if (!id) {
            setHistory(prev => [...prev, { text: "Error: Missing required argument '--instance-ids'", type: 'error' }])
            return
          }

          if (!cloudState.aws.instances[id]) {
            setHistory(prev => [...prev, { text: `Error: Instance ${id} not found.`, type: 'error' }])
            return
          }

          setCloudState((prev: any) => {
            const next = { ...prev }
            delete next.aws.instances[id]
            return next
          })

          setHistory(prev => [...prev, { text: `Terminating instance ${id}...`, type: 'output' }])
          return
        }
      }

      setHistory(prev => [...prev, { text: `aws: error: command not recognized. Type 'help' to see list of valid commands.`, type: 'error' }])
      return
    }

    setHistory(prev => [...prev, { text: `bash: ${baseCmd}: command not found. Type 'help' for help.`, type: 'error' }])
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950 font-mono overflow-hidden shadow-2xl h-[360px]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Cloud Shell CLI ({prov})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Active</span>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-1.5 text-xs text-slate-300">
        {history.map((line, idx) => (
          <div key={idx} className={cn(
            "leading-relaxed whitespace-pre-wrap",
            line.type === 'input' && "text-slate-100 font-bold",
            line.type === 'error' && "text-red-400 font-semibold",
            line.type === 'header' && "text-slate-500",
            line.type === 'output' && "text-slate-300"
          )}>
            {line.text}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleCommand(input)
        }}
        className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 shrink-0"
      >
        <span className="text-xs font-bold text-emerald-400 select-none">{prov === 'azure' ? 'student@azure-cli:~$ ' : 'student@aws-cli:~$ '}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Entrez votre commande cloud CLI ici..."
          className="flex-1 bg-transparent text-slate-100 outline-none border-none focus:ring-0 p-0 font-mono text-xs placeholder:text-slate-600"
          autoFocus
        />
      </form>
    </div>
  )
}

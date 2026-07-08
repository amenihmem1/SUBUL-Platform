'use client'

import React, { useMemo, useRef, useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui'
import { useTranslation } from '@/contexts/LanguageContext'
import {
  getAdminContentLabs,
  getLabStats,
  createAdminContentLab,
  updateAdminContentLab,
  deleteAdminContentLab,
  importLabsJson,
  type LabDto,
  type LabStatDto,
  type CreateOrUpdateLabInput,
  type LabStep,
} from '@/services/labs'
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Inbox,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  BarChart3,
  Clock,
  Trophy,
  Eye,
  GripVertical,
  Download,
  Upload,
} from 'lucide-react'
import { ImportResultPanel, type ImportResultLike } from '@/components/admin/import/ImportResultPanel'
import { IndexingBanner } from '@/components/admin/import/IndexingBanner'
import { LABS_TEMPLATE, downloadJson } from '@/components/admin/import/import-templates'

const adminLabKeys = {
  all: ['admin-labs'] as const,
  list: () => [...adminLabKeys.all, 'list'] as const,
  stats: () => [...adminLabKeys.all, 'stats'] as const,
}

const ITEMS_PER_PAGE = 10

const PROVIDERS = [
  { value: 'aws', label: 'AWS' },
  { value: 'azure', label: 'Azure' },
  { value: 'gcp', label: 'GCP' },
  { value: 'nvidia', label: 'NVIDIA' },
]

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

interface StepForm {
  title: string
  instruction: string
  hint: string
  validationNote: string
}

function emptyStep(): StepForm {
  return { title: '', instruction: '', hint: '', validationNote: '' }
}

function normalizeTasks(steps: StepForm[]): string[] {
  return steps.map((s) => s.title.trim()).filter(Boolean)
}

function normalizeSteps(steps: StepForm[]): LabStep[] {
  return steps
    .filter((s) => s.title.trim())
    .map((s) => ({
      title: s.title.trim(),
      instruction: s.instruction.trim(),
      ...(s.hint.trim() ? { hint: s.hint.trim() } : {}),
      ...(s.validationNote.trim() ? { validationNote: s.validationNote.trim() } : {}),
    }))
}

export default function AdminLabsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<ImportResultLike | null>(null)
  const [showIndexingBanner, setShowIndexingBanner] = useState(false)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: adminLabKeys.list(),
    queryFn: () => getAdminContentLabs({ page: 1, limit: 500 }),
  })

  const { data: statsData } = useQuery({
    queryKey: adminLabKeys.stats(),
    queryFn: getLabStats,
  })

  const allLabs = (data?.data ?? []) as LabDto[]
  const totalPages = Math.max(1, Math.ceil(allLabs.length / ITEMS_PER_PAGE))
  const labs = allLabs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const stats = useMemo(() => {
    const s = (statsData ?? []) as LabStatDto[]
    const totalLabs = allLabs.length
    const totalStarts = s.reduce((a, b) => a + b.totalStarts, 0)
    const totalCompletions = s.reduce((a, b) => a + b.totalCompletions, 0)
    const avgCompletion =
      s.length > 0 ? Math.round(s.reduce((a, b) => a + b.completionRate, 0) / s.length) : 0
    return { totalLabs, totalStarts, totalCompletions, avgCompletion }
  }, [allLabs, statsData])

  const statsForLab = useCallback(
    (slug: string) => ((statsData ?? []) as LabStatDto[]).find((s) => s.slug === slug),
    [statsData],
  )

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const selected = useMemo(
    () => allLabs.find((l) => l.slug === selectedSlug) ?? null,
    [allLabs, selectedSlug],
  )
  const formRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    slug: '',
    title: '',
    description: '',
    provider: 'aws',
    difficulty: 'beginner',
    estimatedTime: '45 min',
    estimatedDurationMinutes: 45,
    moduleTitle: '',
    status: 'draft',
    providerLoginUrl: '',
    logoUrl: '',
    tags: '',
    learningObjectives: '',
    prerequisites: '',
    level: '',
    levelLabel: '',
    prevSlug: '',
    nextSlug: '',
  })

  const [stepsForm, setStepsForm] = useState<StepForm[]>([emptyStep()])
  const [expandedStep, setExpandedStep] = useState<number | null>(0)
  const [showPreview, setShowPreview] = useState(false)
  const [showMeta, setShowMeta] = useState(false)

  const resetFormFromLab = (lab: LabDto | null) => {
    if (!lab) return
    const meta = lab.metadata ?? {}
    setForm({
      slug: lab.slug ?? '',
      title: lab.title ?? '',
      description: lab.description ?? '',
      provider: lab.provider ?? 'aws',
      difficulty: lab.difficulty ?? 'beginner',
      estimatedTime: lab.estimatedTime ?? '',
      estimatedDurationMinutes: lab.estimatedDurationMinutes ?? 0,
      moduleTitle: lab.moduleTitle ?? '',
      status: lab.status ?? 'draft',
      providerLoginUrl: meta.providerLoginUrl ?? '',
      logoUrl: meta.logo ?? '',
      tags: (meta.tags ?? []).join(', '),
      learningObjectives: (meta.learningObjectives ?? []).join('\n'),
      prerequisites: (meta.prerequisites ?? []).join('\n'),
      level: meta.level ?? '',
      levelLabel: meta.levelLabel ?? '',
      prevSlug: meta.prevSlug ?? '',
      nextSlug: meta.nextSlug ?? '',
    })
    if (lab.steps && lab.steps.length > 0) {
      setStepsForm(
        lab.steps.map((s) => ({
          title: s.title,
          instruction: s.instruction,
          hint: s.hint ?? '',
          validationNote: s.validationNote ?? '',
        })),
      )
    } else if (lab.tasks && lab.tasks.length > 0) {
      setStepsForm(lab.tasks.map((t) => ({ title: t, instruction: '', hint: '', validationNote: '' })))
    } else {
      setStepsForm([emptyStep()])
    }
    setExpandedStep(0)
  }

  const resetToNew = () => {
    setSelectedSlug(null)
    setForm({
      slug: '',
      title: '',
      description: '',
      provider: 'aws',
      difficulty: 'beginner',
      estimatedTime: '45 min',
      estimatedDurationMinutes: 45,
      moduleTitle: '',
      status: 'draft',
      providerLoginUrl: '',
      logoUrl: '',
      tags: '',
      learningObjectives: '',
      prerequisites: '',
      level: '',
      levelLabel: '',
      prevSlug: '',
      nextSlug: '',
    })
    setStepsForm([emptyStep()])
    setExpandedStep(0)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateOrUpdateLabInput) => createAdminContentLab(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminLabKeys.list() })
      await queryClient.invalidateQueries({ queryKey: adminLabKeys.stats() })
      showToast(String(t('adminLabs.toastCreated')), 'success')
    },
    onError: () => showToast(String(t('adminLabs.toastCreateFailed')), 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ slug, payload }: { slug: string; payload: CreateOrUpdateLabInput }) =>
      updateAdminContentLab(slug, payload),
    onSuccess: async (lab) => {
      await queryClient.invalidateQueries({ queryKey: adminLabKeys.list() })
      await queryClient.invalidateQueries({ queryKey: adminLabKeys.stats() })
      setSelectedSlug(lab.slug)
      showToast(String(t('adminLabs.toastUpdated')), 'success')
    },
    onError: () => showToast(String(t('adminLabs.toastUpdateFailed')), 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deleteAdminContentLab(slug),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminLabKeys.list() })
      await queryClient.invalidateQueries({ queryKey: adminLabKeys.stats() })
      setSelectedSlug(null)
      showToast(String(t('adminLabs.toastDeleted')), 'success')
    },
    onError: () => showToast(String(t('adminLabs.toastDeleteFailed')), 'error'),
  })

  const payloadFromForm = (): CreateOrUpdateLabInput => {
    const tasks = normalizeTasks(stepsForm)
    const steps = normalizeSteps(stepsForm)
    return {
      slug: form.slug.trim(),
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      provider: form.provider as any,
      difficulty: form.difficulty as any,
      estimatedTime: form.estimatedTime.trim() || null,
      estimatedDurationMinutes: form.estimatedDurationMinutes || null,
      moduleTitle: form.moduleTitle.trim() || null,
      tasks,
      steps: steps.length > 0 ? steps : null,
      metadata: {
        providerLoginUrl: form.providerLoginUrl.trim() || undefined,
        logo: form.logoUrl.trim() || undefined,
        tags: form.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        learningObjectives: form.learningObjectives
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        prerequisites: form.prerequisites
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        level: form.level.trim() || undefined,
        levelLabel: form.levelLabel.trim() || undefined,
        prevSlug: form.prevSlug.trim() || undefined,
        nextSlug: form.nextSlug.trim() || undefined,
      },
      status: form.status as any,
    }
  }

  const runImport = async (dryRun: boolean) => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      showToast('Choose a JSON file first.', 'error')
      return
    }
    let payload: unknown
    try {
      payload = JSON.parse(await file.text())
    } catch (err) {
      showToast(`JSON parse error: ${err instanceof Error ? err.message : 'Invalid JSON file'}`, 'error')
      return
    }
    if (!Array.isArray(payload)) {
      showToast('Labs JSON must be an array of lab items.', 'error')
      return
    }
    try {
      const res = await importLabsJson(payload as Array<Record<string, unknown>>, dryRun)
      setImportPreview(res as ImportResultLike)
      if (!dryRun) {
        await queryClient.invalidateQueries({ queryKey: adminLabKeys.list() })
        await queryClient.invalidateQueries({ queryKey: adminLabKeys.stats() })
        setShowIndexingBanner(true)
      }
      showToast(dryRun ? 'Import preview generated.' : 'Labs imported successfully.', 'success')
    } catch (error: any) {
      const status = error?.response?.status
      const detail = error?.response?.data?.message ?? (error instanceof Error ? error.message : 'Import failed')
      const msg = Array.isArray(detail) ? detail.join(', ') : detail
      showToast(status ? `${status} — ${msg}` : msg, 'error')
    }
  }

  const handleDownloadLabsTemplate = () => {
    downloadJson('subul-labs-template.json', LABS_TEMPLATE)
    showToast('Labs JSON template downloaded.', 'success')
  }

  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= stepsForm.length) return
    setStepsForm((prev) => {
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setExpandedStep(j)
  }

  const updateStep = (i: number, field: keyof StepForm, value: string) => {
    setStepsForm((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  const addStep = () => {
    setStepsForm((prev) => [...prev, emptyStep()])
    setExpandedStep(stepsForm.length)
  }

  const removeStep = (i: number) => {
    setStepsForm((prev) => prev.filter((_, idx) => idx !== i))
    setExpandedStep(null)
  }

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Labs', value: stats.totalLabs, icon: BarChart3 },
          { label: 'Active Learners', value: stats.totalStarts, icon: Users },
          { label: 'Completions', value: stats.totalCompletions, icon: Trophy },
          { label: 'Avg Completion', value: `${stats.avgCompletion}%`, icon: Clock },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{String(t('adminLabs.title'))}</h1>
          <p className="text-sm text-muted-foreground">{String(t('adminLabs.subtitle'))}</p>
        </div>
        <Button variant="outline" onClick={resetToNew}>
          <Plus className="h-4 w-4 mr-1" />
          {String(t('adminLabs.new'))}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Import Interactive Labs JSON</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Array of standalone interactive labs (slug, title, steps/tasks). Re-importing the same slug updates the lab in place.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadLabsTemplate}>
            <Download className="h-4 w-4 mr-2" /> Template
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input ref={fileInputRef} type="file" accept="application/json" />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => runImport(true)}>Preview (dry-run)</Button>
            <Button onClick={() => runImport(false)}>
              <Upload className="h-4 w-4 mr-2" /> Import labs
            </Button>
          </div>
          <ImportResultPanel result={importPreview} />
          <IndexingBanner visible={showIndexingBanner} onClose={() => setShowIndexingBanner(false)} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left: Lab list ─── */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{String(t('adminLabs.allLabs'))}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}
            {isError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 space-y-3">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {String(t('adminLabs.loadError'))}
                </p>
                {error instanceof Error ? (
                  <p className="text-xs text-muted-foreground">{error.message}</p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  Retry
                </Button>
              </div>
            )}
            {!isLoading && !isError && allLabs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Inbox className="w-10 h-10 opacity-40 mb-2" />
                <p className="text-sm">{String(t('adminLabs.empty'))}</p>
              </div>
            )}

            {!isLoading &&
              !isError &&
              labs.map((lab) => {
                const labStat = statsForLab(lab.slug)
                return (
                  <button
                    key={lab.slug}
                    onClick={() => {
                      setSelectedSlug(lab.slug)
                      const target = allLabs.find((l) => l.slug === lab.slug) ?? null
                      setTimeout(() => resetFormFromLab(target), 0)
                    }}
                    className={`w-full text-left rounded-xl border p-3 hover:bg-muted/40 transition ${
                      selectedSlug === lab.slug ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{lab.title ?? lab.slug}</div>
                        <div className="text-xs text-muted-foreground truncate">{lab.slug}</div>
                      </div>
                      <Badge
                        variant={
                          lab.status === 'published'
                            ? 'default'
                            : lab.status === 'archived'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {lab.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                      <span>{lab.provider ?? '-'}</span>
                      <span>·</span>
                      <span>{lab.difficulty ?? '-'}</span>
                      <span>·</span>
                      <span>{lab.estimatedTime ?? '-'}</span>
                      {labStat && labStat.totalStarts > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-primary font-medium">
                            {labStat.completionRate}% completion
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                )
              })}

            {!isLoading && !isError && totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-xs text-muted-foreground">
                  {allLabs.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(currentPage * ITEMS_PER_PAGE, allLabs.length)} / {allLabs.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-medium px-1">
                    {currentPage}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 px-2"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Right: Form ─── */}
        <Card ref={formRef} className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {selected
                ? String(t('adminLabs.editTitle', { slug: selected.slug }))
                : String(t('adminLabs.createTitle'))}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Row 1: Slug + Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{String(t('adminLabs.slug'))}</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="aws-ec2-first-instance"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{String(t('adminLabs.status'))}</label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Provider + Difficulty + Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{String(t('adminLabs.provider'))}</label>
                <Select
                  value={form.provider}
                  onValueChange={(v) => setForm((p) => ({ ...p, provider: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{String(t('adminLabs.difficulty'))}</label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) => setForm((p) => ({ ...p, difficulty: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{String(t('adminLabs.estimatedTime'))}</label>
                <div className="flex gap-2">
                  <Input
                    value={form.estimatedTime}
                    onChange={(e) => setForm((p) => ({ ...p, estimatedTime: e.target.value }))}
                    placeholder="45 min"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={form.estimatedDurationMinutes}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        estimatedDurationMinutes: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="min"
                    className="w-20"
                    title="Minutes (numeric)"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Module title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{String(t('adminLabs.moduleTitle'))}</label>
              <Input
                value={form.moduleTitle}
                onChange={(e) => setForm((p) => ({ ...p, moduleTitle: e.target.value }))}
                placeholder="EC2 Basics"
              />
            </div>

            {/* Row 4: Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{String(t('adminLabs.titleField'))}</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Launch Your First EC2 Instance"
              />
            </div>

            {/* Row 5: Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{String(t('adminLabs.description'))}</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* ─── Steps Editor ─── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Steps / Tasks</label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" /> Add Step
                </Button>
              </div>
              <div className="space-y-2">
                {stepsForm.map((step, i) => {
                  const isExpanded = expandedStep === i
                  return (
                    <div
                      key={i}
                      className="border rounded-lg overflow-hidden bg-card"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition"
                        onClick={() => setExpandedStep(isExpanded ? null : i)}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground w-6">
                          {i + 1}.
                        </span>
                        <span className="text-sm flex-1 truncate">
                          {step.title || '(untitled step)'}
                        </span>
                        {step.instruction && (
                          <Badge variant="secondary" className="text-[10px]">
                            has instructions
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-3 border-t">
                          <div className="pt-3 space-y-1.5">
                            <label className="text-xs font-medium">Title (task label)</label>
                            <Input
                              value={step.title}
                              onChange={(e) => updateStep(i, 'title', e.target.value)}
                              placeholder="Create an EC2 instance"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">
                              Instruction (Markdown)
                            </label>
                            <Textarea
                              value={step.instruction}
                              onChange={(e) => updateStep(i, 'instruction', e.target.value)}
                              rows={4}
                              placeholder="Detailed step-by-step instruction with **markdown** support..."
                              className="font-mono text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium">Hint (optional)</label>
                              <Textarea
                                value={step.hint}
                                onChange={(e) => updateStep(i, 'hint', e.target.value)}
                                rows={2}
                                placeholder="Need help? Try looking at..."
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium">
                                Validation note (optional)
                              </label>
                              <Textarea
                                value={step.validationNote}
                                onChange={(e) => updateStep(i, 'validationNote', e.target.value)}
                                rows={2}
                                placeholder="How to verify this step..."
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => moveStep(i, -1)}
                              disabled={i === 0}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => moveStep(i, 1)}
                              disabled={i === stepsForm.length - 1}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <div className="flex-1" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeStep(i)}
                              disabled={stepsForm.length === 1}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ─── Metadata (collapsible) ─── */}
            <div className="border rounded-lg">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition"
                onClick={() => setShowMeta((v) => !v)}
              >
                <span className="text-sm font-semibold">Metadata & Navigation</span>
                {showMeta ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {showMeta && (
                <div className="px-4 pb-4 space-y-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Provider Login URL</label>
                      <Input
                        value={form.providerLoginUrl}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, providerLoginUrl: e.target.value }))
                        }
                        placeholder="https://console.aws.amazon.com/"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Logo URL</label>
                      <div className="flex gap-2 items-center">
                        <Input
                          value={form.logoUrl}
                          onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
                          placeholder="/AWS.png"
                          className="flex-1"
                        />
                        {form.logoUrl && (
                          <img
                            src={form.logoUrl}
                            alt=""
                            className="h-8 w-8 rounded object-contain border"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Tags (comma-separated)</label>
                    <Input
                      value={form.tags}
                      onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                      placeholder="aws, ec2, compute"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Learning Objectives (one per line)</label>
                      <Textarea
                        value={form.learningObjectives}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, learningObjectives: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Prerequisites (one per line)</label>
                      <Textarea
                        value={form.prerequisites}
                        onChange={(e) => setForm((p) => ({ ...p, prerequisites: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Level</label>
                      <Input
                        value={form.level}
                        onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                        placeholder="beginner"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Level Label</label>
                      <Input
                        value={form.levelLabel}
                        onChange={(e) => setForm((p) => ({ ...p, levelLabel: e.target.value }))}
                        placeholder="Beginner"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Prev Slug</label>
                      <Input
                        value={form.prevSlug}
                        onChange={(e) => setForm((p) => ({ ...p, prevSlug: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Next Slug</label>
                      <Input
                        value={form.nextSlug}
                        onChange={(e) => setForm((p) => ({ ...p, nextSlug: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Actions ─── */}
            <div className="flex flex-wrap gap-2 pt-2">
              {!selected ? (
                <Button
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate(payloadFromForm())}
                >
                  {String(t('adminLabs.create'))}
                </Button>
              ) : (
                <>
                  <Button
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({ slug: selected.slug, payload: payloadFromForm() })
                    }
                  >
                    {String(t('adminLabs.save'))}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (!confirm(String(t('adminLabs.deleteConfirm', { slug: selected.slug }))))
                        return
                      deleteMutation.mutate(selected.slug)
                    }}
                  >
                    {String(t('adminLabs.delete'))}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => resetFormFromLab(selected)}
                  >
                    {String(t('adminLabs.reset'))}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={() => setShowPreview((v) => !v)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {showPreview ? 'Hide Preview' : 'Preview'}
              </Button>
            </div>

            {/* ─── Preview ─── */}
            {showPreview && (
              <Card className="border-2 border-dashed border-primary/30 mt-4">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    Learner Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h2 className="text-xl font-bold">{form.title || '(No title)'}</h2>
                  {form.moduleTitle && (
                    <p className="text-sm text-muted-foreground">{form.moduleTitle}</p>
                  )}
                  {form.description && (
                    <p className="text-sm">{form.description}</p>
                  )}
                  <div className="flex gap-2">
                    <Badge>{form.provider}</Badge>
                    <Badge variant="outline">{form.difficulty}</Badge>
                    {form.estimatedTime && (
                      <Badge variant="secondary">{form.estimatedTime}</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">
                      Steps ({stepsForm.filter((s) => s.title.trim()).length})
                    </h3>
                    {stepsForm
                      .filter((s) => s.title.trim())
                      .map((step, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded border">
                          <span className="text-xs text-muted-foreground mt-0.5">{i + 1}.</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{step.title}</p>
                            {step.instruction && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {step.instruction}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import { useState, use } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui'
import {
  getAdminCertificationFull,
  updateAdminContentCertification,
  deleteAdminContentCertification,
} from '@/services/certifications'
import {
  ArrowLeft, Save, Trash2, Award, BookOpen, FlaskConical,
  ClipboardList, GitBranch, Image, Globe, Clock, Star,
  Hash, Tag, ChevronRight, ExternalLink, Plus, X,
  Target, Layers, CheckCircle2, AlertCircle, Loader2,
  Upload, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'general' | 'courses' | 'labs' | 'exams' | 'path' | 'import'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'general',  label: 'Informations générales', icon: Award },
  { id: 'courses',  label: 'Cours',                  icon: BookOpen },
  { id: 'labs',     label: 'Labs',                   icon: FlaskConical },
  { id: 'exams',    label: 'Examens pratiques',       icon: ClipboardList },
  { id: 'path',     label: 'Parcours',               icon: GitBranch },
]

function SectionTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          className="h-8 text-sm flex-1"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <Button variant="outline" size="sm" className="h-8 px-3" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium rounded-full px-2.5 py-0.5">
              {t}
              <button type="button" onClick={() => onChange(value.filter(x => x !== t))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CertificationEditorPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id: idStr, locale } = use(params)
  const id = parseInt(idStr, 10)
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('general')

  const { data: cert, isLoading } = useQuery({
    queryKey: ['admin-cert-full', id],
    queryFn: () => getAdminCertificationFull(id),
    enabled: !isNaN(id),
  })

  const [form, setForm] = useState<Record<string, any>>({})
  const [dirty, setDirty] = useState(false)

  // Sync form with loaded data (once)
  const [synced, setSynced] = useState(false)
  if (cert && !synced) {
    setForm({
      title: cert.title ?? '',
      provider: cert.provider ?? '',
      description: cert.description ?? '',
      examCode: cert.examCode ?? '',
      externalId: cert.externalId ?? '',
      level: cert.level ?? '',
      domain: cert.domain ?? '',
      duration: cert.duration ?? '',
      price: cert.price ?? '',
      estimatedHours: cert.estimatedHours ?? '',
      badgeColor: cert.badgeColor ?? '#8B1CC8',
      imageUrl: cert.imageUrl ?? '',
      bannerUrl: cert.bannerUrl ?? '',
      iconUrl: cert.iconUrl ?? '',
      passingScore: cert.passingScore ?? 70,
      numQuestions: cert.numQuestions ?? '',
      examDurationMinutes: cert.examDurationMinutes ?? '',
      language: cert.language ?? 'fr',
      status: cert.status ?? 'Draft',
      skills: cert.skills ?? [],
      tags: cert.tags ?? [],
      finalExamTips: cert.finalExamTips ?? [],
    })
    setSynced(true)
  }

  const set = (key: string, val: any) => {
    setForm((f) => ({ ...f, [key]: val }))
    setDirty(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => updateAdminContentCertification(id, form as any),
    onSuccess: () => {
      showToast('Certification enregistrée', 'success')
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['admin-cert-full', id] })
    },
    onError: () => showToast('Erreur lors de l\'enregistrement', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminContentCertification(id),
    onSuccess: () => {
      showToast('Certification supprimée', 'success')
      router.push(`/${locale}/dashboard/admin/certifications`)
    },
    onError: () => showToast('Erreur lors de la suppression', 'error'),
  })

  if (isLoading || !cert) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const statusColor = form.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
    form.status === 'Draft' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/dashboard/admin/certifications`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <div className="h-5 w-px bg-slate-200" />

        {/* Cert image thumbnail */}
        {form.imageUrl ? (
          <img src={form.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover border border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: form.badgeColor || '#8B1CC8' }}>
            {(form.title || '?')[0]}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-slate-900 truncate">{form.title || 'Certification sans titre'}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${statusColor}`}>{form.status}</span>
            {form.examCode && <span className="text-[10px] text-slate-400">{form.examCode}</span>}
            {form.provider && <span className="text-[10px] text-slate-400">· {form.provider}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <span className="text-[11px] text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Modifications non enregistrées
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => confirm('Supprimer cette certification ?') && deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-white"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !dirty}
          >
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* ── Side Tab Nav ── */}
        <nav className="w-56 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] bg-white border-r border-slate-100 flex flex-col pt-4 gap-1 px-3 overflow-y-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors',
                tab === t.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              {t.label}
              {t.id === 'courses' && cert.courses?.length > 0 && (
                <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5">{cert.courses.length}</span>
              )}
              {t.id === 'labs' && cert.interactiveLabs?.length > 0 && (
                <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5">{cert.interactiveLabs.length}</span>
              )}
              {t.id === 'exams' && cert.practiceExams?.length > 0 && (
                <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5">{cert.practiceExams.length}</span>
              )}
            </button>
          ))}

          <div className="mt-auto pb-4 pt-2 border-t border-slate-100 mx-1">
            <a
              href={`/${locale}/dashboard/learner/certifications/${id}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Vue apprenant
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          </div>
        </nav>

        {/* ── Content ── */}
        <div className="flex-1 p-6 max-w-3xl">

          {/* ════ TAB: General ════ */}
          {tab === 'general' && (
            <div className="space-y-8">

              {/* Image preview */}
              {form.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-video max-h-48 bg-slate-100">
                  <img
                    src={form.imageUrl}
                    alt="Certification image"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                  />
                </div>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <SectionTitle icon={Image} title="Visuels & Médias" sub="Image principale, bannière, icône" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldRow label="Image principale (URL)" hint="Taille recommandée : 1280×720px. Affiché sur la carte certification.">
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" placeholder="https://example.com/image.jpg" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
                      {form.imageUrl && <a href={form.imageUrl} target="_blank" rel="noopener" className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"><Eye className="h-3.5 w-3.5 text-slate-400" /></a>}
                    </div>
                  </FieldRow>
                  <FieldRow label="Bannière (URL)" hint="Image large pour la page détail. Format 16:9 recommandé.">
                    <Input className="h-8 text-sm" placeholder="https://example.com/banner.jpg" value={form.bannerUrl} onChange={(e) => set('bannerUrl', e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Icône / Logo fournisseur (URL)" hint="Petit logo (ex: logo Microsoft Azure). PNG transparent recommandé.">
                    <Input className="h-8 text-sm" placeholder="https://example.com/icon.png" value={form.iconUrl} onChange={(e) => set('iconUrl', e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Couleur du badge (hex)">
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.badgeColor || '#8B1CC8'} onChange={(e) => set('badgeColor', e.target.value)} className="h-8 w-10 rounded border border-slate-200 cursor-pointer" />
                      <Input className="h-8 text-sm w-28 font-mono" value={form.badgeColor} onChange={(e) => set('badgeColor', e.target.value)} placeholder="#8B1CC8" />
                      <div className="h-8 px-3 rounded-lg text-white text-xs font-bold flex items-center" style={{ background: form.badgeColor || '#8B1CC8' }}>
                        {form.examCode || 'AZ-900'}
                      </div>
                    </div>
                  </FieldRow>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <SectionTitle icon={Award} title="Informations générales" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldRow label="Titre *">
                    <Input className="h-8 text-sm" value={form.title} onChange={(e) => set('title', e.target.value)} />
                  </FieldRow>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="Fournisseur *">
                      <Input className="h-8 text-sm" placeholder="Microsoft, AWS, Google…" value={form.provider} onChange={(e) => set('provider', e.target.value)} />
                    </FieldRow>
                    <FieldRow label="Code examen">
                      <Input className="h-8 text-sm font-mono" placeholder="AZ-900, AWS-SAA-C03…" value={form.examCode} onChange={(e) => set('examCode', e.target.value)} />
                    </FieldRow>
                  </div>
                  <FieldRow label="Description">
                    <Textarea className="text-sm" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
                  </FieldRow>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldRow label="Niveau">
                      <Select value={form.level || ''} onValueChange={(v) => set('level', v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Niveau" /></SelectTrigger>
                        <SelectContent>
                          {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Domaine">
                      <Select value={form.domain || ''} onValueChange={(v) => set('domain', v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Domaine" /></SelectTrigger>
                        <SelectContent>
                          {['cloud', 'cyber', 'ai', 'data', 'devops'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Langue">
                      <Select value={form.language || 'fr'} onValueChange={(v) => set('language', v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">العربية</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldRow>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldRow label="Durée">
                      <Input className="h-8 text-sm" placeholder="ex: 4 semaines" value={form.duration} onChange={(e) => set('duration', e.target.value)} />
                    </FieldRow>
                    <FieldRow label="Heures estimées">
                      <Input className="h-8 text-sm" type="number" placeholder="40" value={form.estimatedHours} onChange={(e) => set('estimatedHours', e.target.value)} />
                    </FieldRow>
                    <FieldRow label="Prix examen">
                      <Input className="h-8 text-sm" placeholder="165€" value={form.price} onChange={(e) => set('price', e.target.value)} />
                    </FieldRow>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="Statut">
                      <Select value={form.status} onValueChange={(v) => set('status', v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label="ID externe">
                      <Input className="h-8 text-sm font-mono" placeholder="az-900" value={form.externalId} onChange={(e) => set('externalId', e.target.value)} />
                    </FieldRow>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <SectionTitle icon={Target} title="Détails de l'examen" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <FieldRow label="Score requis (%)" hint="Ex: 70 pour 70%">
                      <Input className="h-8 text-sm" type="number" min={0} max={100} placeholder="70" value={form.passingScore} onChange={(e) => set('passingScore', parseInt(e.target.value, 10) || '')} />
                    </FieldRow>
                    <FieldRow label="Nb de questions">
                      <Input className="h-8 text-sm" type="number" placeholder="60" value={form.numQuestions} onChange={(e) => set('numQuestions', e.target.value)} />
                    </FieldRow>
                    <FieldRow label="Durée (min)">
                      <Input className="h-8 text-sm" type="number" placeholder="90" value={form.examDurationMinutes} onChange={(e) => set('examDurationMinutes', e.target.value)} />
                    </FieldRow>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <SectionTitle icon={Tag} title="Compétences & Tags" sub="Visibles sur la page certification apprenant" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldRow label="Compétences acquises">
                    <TagInput value={form.skills ?? []} onChange={(v) => set('skills', v)} placeholder="Ajouter une compétence… (Entrée)" />
                  </FieldRow>
                  <FieldRow label="Tags">
                    <TagInput value={form.tags ?? []} onChange={(v) => set('tags', v)} placeholder="cloud, azure, beginner… (Entrée)" />
                  </FieldRow>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <SectionTitle icon={CheckCircle2} title="Conseils pour l'examen" sub="Tips affichés à l'apprenant avant l'examen" />
                </CardHeader>
                <CardContent>
                  <TagInput
                    value={form.finalExamTips ?? []}
                    onChange={(v) => set('finalExamTips', v)}
                    placeholder="Ajouter un conseil… (Entrée)"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ════ TAB: Courses ════ */}
          {tab === 'courses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle icon={BookOpen} title="Cours liés à cette certification" sub={`${cert.courses?.length ?? 0} cours`} />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  onClick={() => router.push(`/${locale}/dashboard/admin/courses`)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Gérer les cours
                </Button>
              </div>

              {(!cert.courses || cert.courses.length === 0) ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                  <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-500">Aucun cours lié</p>
                  <p className="text-xs text-slate-400 mt-1">Liez des cours à cette certification depuis la page Cours admin.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cert.courses.map((c: any, i: number) => (
                    <div key={c.id} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary/30 transition-colors">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{c.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                          <span>{c.modulesCount} modules</span>
                          <span>{c.lessonsCount} leçons</span>
                          <span>{c.labsCount} labs cours</span>
                          {c.track && <Badge variant="outline" className="text-[10px] h-4">{c.track}</Badge>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => router.push(`/${locale}/dashboard/admin/courses/${c.id}`)}
                      >
                        Éditer <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB: Labs ════ */}
          {tab === 'labs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle icon={FlaskConical} title="Labs interactifs" sub={`Labs du domaine "${cert.domain ?? 'non défini'}"`} />
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => router.push(`/${locale}/dashboard/admin/labs`)}>
                  <Plus className="h-3.5 w-3.5" /> Gérer les labs
                </Button>
              </div>

              {(!cert.interactiveLabs || cert.interactiveLabs.length === 0) ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                  <FlaskConical className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-500">Aucun lab trouvé pour ce domaine</p>
                  <p className="text-xs text-slate-400 mt-1">Définissez le domaine de la certification (cloud/cyber/ai) pour voir les labs associés.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cert.interactiveLabs.map((l: any) => (
                    <div key={l.id} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary/30 transition-colors">
                      <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{l.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          <span className="font-mono">{l.slug}</span>
                          <Badge variant="outline" className="text-[10px] h-4">{l.provider}</Badge>
                          <Badge variant="outline" className="text-[10px] h-4">{l.difficulty}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => router.push(`/${locale}/dashboard/admin/labs`)}
                      >
                        Éditer <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB: Exams ════ */}
          {tab === 'exams' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle icon={ClipboardList} title="Examens pratiques" sub={`${cert.practiceExams?.length ?? 0} examens`} />
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => router.push(`/${locale}/dashboard/admin/content/practice-exams`)}>
                  <Plus className="h-3.5 w-3.5" /> Gérer les examens
                </Button>
              </div>

              {(!cert.practiceExams || cert.practiceExams.length === 0) ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                  <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-500">Aucun examen pratique</p>
                  <p className="text-xs text-slate-400 mt-1">Importez des examens pratiques via la page Content → Examens pratiques.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cert.practiceExams.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{e.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                          <span>{e.questionsCount} questions</span>
                          {e.passingScore && <span>Score requis : {e.passingScore}%</span>}
                          <span className="font-mono">{e.slug}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB: Path ════ */}
          {tab === 'path' && (
            <div className="space-y-4">
              <SectionTitle icon={GitBranch} title="Parcours de préparation" sub="Définissez les étapes obligatoires pour cette certification" />
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <GitBranch className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">Éditeur de parcours</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">Le parcours définit les cours, labs et examens requis dans l'ordre.</p>
                <Button
                  className="gap-2 bg-primary hover:bg-primary/90 text-white"
                  onClick={() => router.push(`/${locale}/dashboard/admin/certifications/${id}/path`)}
                >
                  <GitBranch className="h-4 w-4" />
                  Ouvrir l'éditeur de parcours
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {cert.pathSteps?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cert.pathSteps.length} étapes définies</p>
                  {cert.pathSteps.map((s: any, i: number) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white text-sm">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="flex-1 font-medium text-slate-700 truncate">{s.title || s.stepRef}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{s.stepType}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import {
  X, ExternalLink, FileText, Loader2, Download,
  CheckCircle2, AlertCircle, Sparkles, RotateCcw,
  TrendingUp, Eye, EyeOff, ChevronUp, ChevronDown,
  Mic,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Job {
  url: string
  title: string
  industry?: string
  location?: string
  description?: string
  skills_req?: string
  skills_bon?: string
}

interface ATSScoreData {
  total_score: number
  breakdown?: Record<string, number>          // ← vrai champ retourné par l'API
  sections?: Record<string, { score: number; max: number; detail?: string }>  // legacy
  keywords_matched?: string[]
  keywords_missing?: string[]
  suggestions?: string[]
}

interface ParsedCV {
  name: string
  job_title?: string
  sections: Record<string, string[]>
}

interface BoostResult {
  parsed_cv:          string
  docx_base64:        string
  file_name:          string
  ats_score_before:   number
  ats_score_after:    number
  domain:             string
  keywords_matched:   string[]
  missing_sections:   string[]
  ats_breakdown_after: Record<string, unknown>
}

interface ATSScoreModalProps {
  job: Job
  data: ATSScoreData | null
  loading: boolean
  error: string
  onClose: () => void
  onBoostCV?: (jobUrl: string) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function normKey(k: unknown): string {
  return String(k ?? '').toLowerCase().replace(/[^a-z]/g, '')
}

/** Map any section key to a canonical English label */
function sectionLabel(key: unknown): string {
  const k = normKey(key)
  if (['contact','coordonnees','coordinates','info'].some(x => k.startsWith(x))) return 'Contact'
  if (['summary','profil','profile','résumé','about','objective'].some(x => k.startsWith(x))) return 'Profil'
  if (['experience','expérience','experiences'].some(x => k.startsWith(x))) return 'Expérience'
  if (['education','formation','études','etude'].some(x => k.startsWith(x))) return 'Formation'
  if (['skills','compétences','competences','technical'].some(x => k.startsWith(x))) return 'Compétences'
  if (['languages','langues','langue'].some(x => k.startsWith(x))) return 'Langues'
  if (['certif','certificate','certificates'].some(x => k.startsWith(x))) return 'Certifications'
  if (['projects','projets','projet'].some(x => k.startsWith(x))) return 'Projets'
  const s = String(key ?? '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function isContactSection(key: unknown) {
  const k = normKey(key)
  return ['contact','coordonnees','coordinates','info'].some(x => k.startsWith(x))
}

function isSkillsSection(key: unknown) {
  const k = normKey(key)
  return ['skills','compétences','competences','technical'].some(x => k.startsWith(x))
}

function renderSectionLines(lines: string[], mode: 'classic' | 'modern'): string {
  if (!lines.length) return ''
  const items = lines.map(l => {
    const line = esc(l.trim())
    if (!line) return ''
    // bullet points
    if (line.startsWith('-') || line.startsWith('•') || line.startsWith('·')) {
      return `<li style="margin:1px 0">${line.replace(/^[-•·]\s*/, '')}</li>`
    }
    // bold pattern **text**
    const withBold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    return `<p style="margin:2px 0">${withBold}</p>`
  })
  // wrap li tags in ul
  let html = ''
  let inList = false
  for (const item of items) {
    if (!item) continue
    if (item.startsWith('<li')) {
      if (!inList) { html += '<ul style="margin:2px 0;padding-left:14px">'; inList = true }
      html += item
    } else {
      if (inList) { html += '</ul>'; inList = false }
      html += item
    }
  }
  if (inList) html += '</ul>'
  return html
}

function renderSkills(lines: string[]): string {
  // Flatten comma-separated skills
  const all = lines.flatMap(l => l.split(/[,;·•]/)).map(s => s.trim()).filter(Boolean)
  return `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px">
    ${all.map(s => `<span class="skill">${esc(s)}</span>`).join('')}
  </div>`
}

function buildClassicHtml(cv: ParsedCV, jobTitle: string): string {
  const entries = Object.entries(cv.sections).filter(([, v]) => v?.length)
  const contactKey = Object.keys(cv.sections).find(isContactSection)
  const contactLines = contactKey ? (cv.sections[contactKey] || []) : []

  const sectionsHtml = entries
    .filter(([k]) => !isContactSection(k))
    .map(([k, lines]) => {
      const label = sectionLabel(k)
      const content = isSkillsSection(k) ? renderSkills(lines) : renderSectionLines(lines, 'classic')
      return `<div class="section">
        <h2>${esc(label)}</h2>
        ${content}
      </div>`
    }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #111; margin: 0; padding: 20px 24px; line-height: 1.45; background: #fff; }
  h1 { font-size: 18px; margin: 0 0 2px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }
  .jobtitle { color: #444; font-size: 11px; margin-bottom: 6px; letter-spacing: 0.5px; }
  .contact-bar { display: flex; gap: 14px; flex-wrap: wrap; color: #555; font-size: 10px; padding-bottom: 8px; border-bottom: 1.5px solid #222; margin-bottom: 2px; }
  .contact-bar span::before { content: ""; }
  h2 { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #bbb; padding-bottom: 2px; margin: 14px 0 5px; color: #111; }
  .section { margin-bottom: 4px; }
  p { margin: 2px 0; }
  ul { margin: 2px 0; padding-left: 14px; }
  li { margin: 1px 0; }
  strong { font-weight: 700; }
  .skill { background: #eee; padding: 2px 7px; border-radius: 3px; font-size: 10px; display: inline-block; }
</style>
</head><body>
  <h1>${esc(cv.name || 'Nom Prénom')}</h1>
  ${cv.job_title ? `<div class="jobtitle">${esc(cv.job_title)}</div>` : ''}
  <div class="contact-bar">
    ${contactLines.slice(0, 5).map(l => `<span>${esc(l.trim())}</span>`).join('')}
  </div>
  ${sectionsHtml}
  <div style="margin-top:14px;font-size:9px;color:#aaa;text-align:center">
    Optimisé pour : ${esc(jobTitle)} — généré par Subul IA
  </div>
</body></html>`
}

function buildModernHtml(cv: ParsedCV, jobTitle: string): string {
  const entries = Object.entries(cv.sections).filter(([, v]) => v?.length)
  const contactKey = Object.keys(cv.sections).find(isContactSection)
  const contactLines = contactKey ? (cv.sections[contactKey] || []) : []

  const sectionsHtml = entries
    .filter(([k]) => !isContactSection(k))
    .map(([k, lines]) => {
      const label = sectionLabel(k)
      const content = isSkillsSection(k) ? renderSkills(lines) : renderSectionLines(lines, 'modern')
      return `<div class="section">
        <h2><span class="bar"></span>${esc(label)}</h2>
        <div class="section-body">${content}</div>
      </div>`
    }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5px; color: #222; margin: 0; background: #fff; line-height: 1.5; }
  .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #fff; padding: 22px 24px 18px; }
  h1 { font-size: 20px; margin: 0 0 2px; font-weight: 700; letter-spacing: 0.5px; }
  .jobtitle { opacity: 0.85; font-size: 11.5px; margin-bottom: 8px; }
  .contact-bar { display: flex; gap: 14px; flex-wrap: wrap; font-size: 9.5px; opacity: 0.85; }
  .contact-bar span { display: flex; align-items: center; gap: 3px; }
  .body { padding: 14px 24px 20px; }
  h2 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #4F46E5; display: flex; align-items: center; gap: 6px; margin: 14px 0 5px; }
  .bar { display: inline-block; width: 3px; height: 12px; background: #4F46E5; border-radius: 2px; flex-shrink: 0; }
  .section { margin-bottom: 6px; }
  .section-body { padding-left: 9px; border-left: 1px solid #e5e5f5; }
  p { margin: 2px 0; }
  ul { margin: 2px 0; padding-left: 14px; }
  li { margin: 1px 0; }
  strong { font-weight: 600; color: #111; }
  .skill { background: #EEF2FF; color: #4F46E5; padding: 2px 9px; border-radius: 12px; font-size: 9.5px; font-weight: 500; display: inline-block; }
</style>
</head><body>
  <div class="header">
    <h1>${esc(cv.name || 'Nom Prénom')}</h1>
    ${cv.job_title ? `<div class="jobtitle">${esc(cv.job_title)}</div>` : ''}
    <div class="contact-bar">
      ${contactLines.slice(0, 5).map(l => `<span>${esc(l.trim())}</span>`).join('')}
    </div>
  </div>
  <div class="body">
    ${sectionsHtml}
    <div style="margin-top:16px;font-size:8.5px;color:#bbb;text-align:center">
      Optimisé pour : ${esc(jobTitle)} — généré par Subul IA
    </div>
  </div>
</body></html>`
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const r     = size * 0.38
  const circ  = 2 * Math.PI * r
  const dash  = (score / 100) * circ
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={6} className="stroke-muted/30" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={6} strokeLinecap="round"
          stroke={color} strokeDasharray={`${dash} ${circ}`} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground font-semibold">/100</span>
      </div>
    </div>
  )
}

// ─── Mini score ring for before/after ────────────────────────────────────────

function MiniScore({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  const r = 18, circ = 2 * Math.PI * r, dash = (score / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 48, height: 48 }}>
        <svg width={48} height={48} className="-rotate-90">
          <circle cx={24} cy={24} r={r} fill="none" strokeWidth={5} stroke="#f1f1f1" />
          <circle cx={24} cy={24} r={r} fill="none" strokeWidth={5} strokeLinecap="round"
            stroke={color} strokeDasharray={`${dash} ${circ}`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ATSScoreModal({
  job, data, loading, error, onClose, onBoostCV,
}: ATSScoreModalProps) {
  const score      = data?.total_score ?? 0
  const label      = score >= 75 ? 'Excellent' : score >= 50 ? 'Average' : 'Needs work'
  const labelColor = score >= 75 ? 'text-emerald-600 bg-emerald-50'
    : score >= 50 ? 'text-amber-600 bg-amber-50'
    : 'text-red-600 bg-red-50'

  // ── Boost state ──
  type Phase = 'idle' | 'boosting' | 'ready' | 'error'
  const [phase, setPhase]             = useState<Phase>('idle')
  const [boostResult, setBoostResult] = useState<BoostResult | null>(null)
  const [cvStructure, setCvStructure] = useState<ParsedCV | null>(null)
  const [boostError, setBoostError]   = useState('')
  const [downloading, setDownloading] = useState<'classic' | 'modern' | null>(null)
  const [previewTab, setPreviewTab]   = useState<'classic' | 'modern'>('classic')
  const [showPreview, setShowPreview] = useState(true)
  const boostRef                      = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    if (phase !== 'idle') {
      setTimeout(() => boostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120)
    }
  }, [phase])

  // ── Boost ─────────────────────────────────────────────────────────────────

  async function handleBoost() {
    if (phase === 'boosting') return
    setPhase('boosting')
    setBoostError('')
    setBoostResult(null)
    setCvStructure(null)
    onBoostCV?.(job.url)

    try {
      const fd = new FormData()
      fd.append('cv_format', 'ats')
      fd.append('include_quiz', 'true')
      fd.append('include_labs', 'true')
      fd.append('include_certs', 'true')
      const totalScoreBefore = data?.total_score ?? 0;
      const breakdownBefore  = (data as any)?.breakdown ?? {};
      fd.append('extra_data', JSON.stringify({
        job_title:               job.title,
        job_description:         job.description  || '',
        job_requirements:        job.skills_req   || '',
        bonus_skills:            job.skills_bon   || '',
        missing_keywords:        data?.keywords_missing || [],
        suggestions:             data?.suggestions      || [],
        ats_score_before:        totalScoreBefore,
        ats_breakdown_before:    breakdownBefore,
        ats_score_before_locked: true,   // ← NEW : ne pas recalculer côté backend
      }))

      const res = await api.post<BoostResult>('/api/cv/boost', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180_000,
      })

      const result = res.data
      if (!result.docx_base64 && !result.parsed_cv) {
        throw new Error('CV non retourné. Assurez-vous d\'avoir uploadé votre CV dans votre profil.')
      }

      setBoostResult(result)

      // Parse CV structure for preview
      if (result.parsed_cv) {
        try {
          const parsed = JSON.parse(result.parsed_cv) as ParsedCV
          setCvStructure(parsed)
        } catch { /* preview unavailable */ }
      }

      setPhase('ready')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Erreur lors du boost.'
      setBoostError(String(msg))
      setPhase('error')
    }
  }

  // ── Download ──────────────────────────────────────────────────────────────

  function triggerDownload(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = name
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  async function downloadCv(format: 'classic' | 'modern') {
    if (!boostResult || downloading) return
    setDownloading(format)
    const safe = job.title.replace(/[^a-zA-Z0-9À-ÿ\s]/g,'').replace(/\s+/g,'-').trim().slice(0,40)

    try {
      if (format === 'classic' && boostResult.docx_base64) {
        const chars = atob(boostResult.docx_base64)
        const arr   = new Uint8Array(chars.length)
        for (let i = 0; i < chars.length; i++) arr[i] = chars.charCodeAt(i)
        const blob  = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        triggerDownload(blob, `cv-${safe}-classic.docx`)
      } else {
        if (!boostResult.parsed_cv) throw new Error('Données CV manquantes.')
        const res = await api.post('/api/cv/apply-format', {
          parsed_cv: boostResult.parsed_cv,
          cv_format: format === 'classic' ? 'ats' : 'modern',
        }, { responseType: 'blob', timeout: 120_000 })
        const mime = (res.headers['content-type'] as string) || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        const ext  = mime.includes('pdf') ? 'pdf' : 'docx'
        triggerDownload(new Blob([res.data as BlobPart], { type: mime }), `cv_${safe}_moderne.${ext}`)
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Échec du téléchargement.')
    } finally {
      setDownloading(null)
    }
  }

  // ── Enhancement summary data ───────────────────────────────────────────────

  const scoreBefore = data?.total_score ?? boostResult?.ats_score_before ?? 0
  const scoreAfter    = boostResult?.ats_score_after  ?? 0
  const scoreDelta = Math.round((scoreAfter - scoreBefore) * 10) / 10
  const addedKeywords = (boostResult?.keywords_matched ?? []).filter(kw => {
    if (typeof kw !== 'string') return false
    return (data?.keywords_missing ?? []).some(
      k => typeof k === 'string' && k.toLowerCase() === kw.toLowerCase()
    )
  })

  // ─── Render ───────────────────────────────────────────────────────────────

  const isWide = phase === 'ready'

  return (
    <div onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div onClick={e => e.stopPropagation()}
        className={cn(
          'w-full bg-card border border-border rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 transition-all duration-300',
          'flex flex-col max-h-[90vh]',
          isWide ? 'max-w-5xl' : 'max-w-[680px]',
        )}>

        {/* ── Header ── */}
        <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-border bg-card rounded-t-2xl">
          <div className="min-w-0 flex-1 mr-3">
            <h3 className="text-sm font-bold text-foreground truncate">{job.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{job.industry || job.location || ''}</p>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* ── ATS loading ── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Computing ATS score...</p>
            </div>
          )}

          {/* ── ATS error ── */}
          {error && (
            <div className="py-12 text-center">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>Close</Button>
            </div>
          )}

          {/* ── Content ── */}
          {!loading && !error && data && (
            <div className="flex flex-col gap-5">

              {/* Score overview */}
              <div className="flex items-center gap-6">
                <ScoreRing score={score} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', labelColor)}>{label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Votre CV obtient {score}/100 pour ce poste.
                    {score < 75 && ' Boostez votre CV pour améliorer le score.'}
                  </p>
                </div>
              </div>

              {/* Section breakdown */}
              {data.sections && Object.keys(data.sections).length > 0 && (
                <div className="bg-muted/30 border border-border rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Score Breakdown</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(data.sections).map(([key, sec]) => {
                      const pct = sec.max > 0 ? Math.round((sec.score / sec.max) * 100) : 0
                      const bar = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-24 truncate capitalize">{key.replace(/_/g,' ')}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all duration-500', bar)} style={{ width:`${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-foreground w-10 text-right">{sec.score}/{sec.max}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {(data.keywords_matched?.length || data.keywords_missing?.length) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.keywords_matched && data.keywords_matched.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Matched</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {data.keywords_matched.slice(0,12).map(kw => (
                          <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.keywords_missing && data.keywords_missing.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Manquants</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {data.keywords_missing.slice(0,12).map(kw => (
                          <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Suggestions */}
              {data.suggestions && data.suggestions.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">Suggestions</h4>
                  <ul className="space-y-1.5">
                    {data.suggestions.slice(0,5).map((s,i) => (
                      <li key={i} className="text-xs text-amber-800 leading-relaxed flex gap-2">
                        <span className="shrink-0">💡</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action row */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {(phase === 'idle' || phase === 'error') && (
                  <Button onClick={handleBoost} disabled={false}
                    className="bg-primary hover:bg-primary/90 gap-2 shadow-sm shadow-primary/25">
                    <Sparkles className="h-4 w-4" />
                    {phase === 'error' ? 'Réessayer le Boost' : 'Boost CV for this job'}
                  </Button>
                )}
                {phase === 'ready' && (
                  <button onClick={handleBoost}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" /> Régénérer
                  </button>
                )}
                <a href={job.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  Voir l&apos;offre <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* ══ BOOST SECTION ══ */}
              {phase !== 'idle' && (
                <div ref={boostRef} className="rounded-2xl border border-border overflow-hidden">

                  {/* ── Boosting ── */}
                  {phase === 'boosting' && (
                    <div className="flex flex-col items-center gap-5 px-6 py-10 bg-gradient-to-br from-primary/5 to-accent/5">
                      <div className="relative flex h-16 w-16 items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">Analyse et optimisation du CV…</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Personnalisation pour <span className="font-semibold">{job.title}</span>
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 w-full max-w-xs">
                        {['Lecture et analyse de votre CV', 'Intégration des mots-clés manquants', 'Génération des deux versions finales'].map((s,i) => (
                          <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />{s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Error ── */}
                  {phase === 'error' && (
                    <div className="flex items-start gap-3 px-5 py-4 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-700">Boost échoué</p>
                        <p className="text-xs text-red-600 mt-0.5">{boostError}</p>
                      </div>
                    </div>
                  )}

                  {/* ── Ready ── */}
                  {phase === 'ready' && boostResult && (
                    <div className={cn('flex gap-0', isWide ? 'flex-row' : 'flex-col')}>

                      {/* Left panel — enhancement summary + downloads */}
                      <div className={cn(
                        'flex flex-col gap-4 p-5 bg-gradient-to-b from-slate-50/80 to-white',
                        isWide ? 'w-[260px] shrink-0 border-r border-border' : 'border-b border-border',
                      )}>
                        {/* Success header */}
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground leading-tight">CV Optimisé !</p>
                            <p className="text-[10px] text-muted-foreground">Prêt au téléchargement</p>
                          </div>
                        </div>

                        {/* Score before/after */}
                        <div className="bg-white border border-border rounded-xl p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                            Score ATS
                          </p>
                          <div className="flex items-center justify-around">
                            <MiniScore score={scoreBefore} label="Avant" />
                            <div className="flex flex-col items-center gap-0.5">
                              <div className={cn(
                                'text-sm font-black tabular-nums',
                                scoreDelta > 0 ? 'text-emerald-600' : 'text-slate-400',
                              )}>
                                {scoreDelta > 0 ? '+' : ''}{scoreDelta}
                              </div>
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            </div>
                            <MiniScore score={scoreAfter} label="Après" />
                          </div>
                        </div>

                        {/* What was enhanced */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Améliorations
                          </p>

                          {/* Added keywords */}
                          {addedKeywords.length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                              <p className="text-[10px] font-bold text-emerald-700 mb-1.5">
                                ✅ {addedKeywords.length} mot{addedKeywords.length > 1 ? 's' : ''}-clé{addedKeywords.length > 1 ? 's' : ''} intégré{addedKeywords.length > 1 ? 's' : ''}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {addedKeywords.slice(0, 10).map(kw => (
                                  <span key={kw} className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium">{kw}</span>
                                ))}
                                {addedKeywords.length > 10 && (
                                  <span className="text-[9px] text-emerald-600">+{addedKeywords.length - 10}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Job tailoring */}
                          <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-primary mb-0.5">✅ Adapté pour ce poste</p>
                            <p className="text-[9.5px] text-primary/70 font-medium truncate">{job.title}</p>
                          </div>

                          {/* Platform data enrichment */}
                          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-violet-700">✅ Enrichi par votre profil</p>
                            <p className="text-[9px] text-violet-600 mt-0.5">Certifications · Labs · Quiz Subul</p>
                          </div>

                          {/* Sections added */}
                          {boostResult.missing_sections.length > 0 && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                              <p className="text-[10px] font-bold text-amber-700 mb-1">✅ Sections complétées</p>
                              <div className="flex flex-wrap gap-1">
                                {boostResult.missing_sections.map(s => (
                                  <span key={s} className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium capitalize">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Download buttons */}
                        <div className="flex flex-col gap-2 pt-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Télécharger</p>
                          <button onClick={() => downloadCv('classic')} disabled={!!downloading}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all',
                              'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm active:scale-[0.98]',
                              'disabled:opacity-50 disabled:cursor-not-allowed',
                            )}>
                            {downloading === 'classic'
                              ? <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />
                              : <FileText className="h-4 w-4 text-slate-600 shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-800 leading-tight">CV Classique</p>
                              <p className="text-[9px] text-slate-400">ATS-friendly · Sobre</p>
                            </div>
                            {!downloading && <Download className="h-3 w-3 text-slate-400 ml-auto shrink-0" />}
                          </button>
                          <button onClick={() => downloadCv('modern')} disabled={!!downloading}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all',
                              'border-primary/30 bg-primary/5 hover:border-primary/50 hover:shadow-sm active:scale-[0.98]',
                              'disabled:opacity-50 disabled:cursor-not-allowed',
                            )}>
                            {downloading === 'modern'
                              ? <Loader2 className="h-4 w-4 animate-spin text-primary/40 shrink-0" />
                              : <Sparkles className="h-4 w-4 text-primary shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-primary leading-tight">CV Moderne</p>
                              <p className="text-[9px] text-primary/50">Design · Visuel</p>
                            </div>
                            {!downloading && <Download className="h-3 w-3 text-primary/40 ml-auto shrink-0" />}
                          </button>
                        </div>
                      </div>

                      {/* Right panel — live CV preview */}
                      <div className="flex-1 flex flex-col min-w-0">
                        {/* Preview header */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20 shrink-0">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-semibold text-muted-foreground mr-auto">Prévisualisation</span>
                          {/* Tab switcher */}
                          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                            {(['classic', 'modern'] as const).map(tab => (
                              <button key={tab} onClick={() => setPreviewTab(tab)}
                                className={cn(
                                  'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                                  previewTab === tab
                                    ? 'bg-white shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground',
                                )}>
                                {tab === 'classic' ? '📄 Classique' : '🎨 Moderne'}
                              </button>
                            ))}
                          </div>
                          {/* Toggle preview visibility (mobile) */}
                          <button onClick={() => setShowPreview(v => !v)}
                            className="xl:hidden flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0">
                            {showPreview ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </div>

                        {/* iframe preview */}
                        {showPreview && (
                          <div className="flex-1 relative bg-slate-100" style={{ minHeight: 320 }}>
                            {cvStructure ? (
                              <iframe
                                key={previewTab}
                                srcDoc={previewTab === 'classic'
                                  ? buildClassicHtml(cvStructure, job.title)
                                  : buildModernHtml(cvStructure, job.title)}
                                title={`Prévisualisation CV ${previewTab}`}
                                className="absolute inset-0 w-full h-full border-0 bg-white"
                                sandbox="allow-same-origin"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full py-16 gap-2 text-muted-foreground">
                                <EyeOff className="h-8 w-8 opacity-30" />
                                <p className="text-xs">Prévisualisation indisponible</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

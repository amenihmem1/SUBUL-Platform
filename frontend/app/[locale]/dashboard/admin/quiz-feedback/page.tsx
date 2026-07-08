'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui'
import {
  getAdminQuizFeedback,
  getAdminQuizFeedbackStats,
  updateFeedbackStatus,
  type QuizFeedbackRecord,
} from '@/services/quiz-feedback'
import { Flag, AlertTriangle, CheckCircle2, Clock, BarChart3, BookOpen, XCircle } from 'lucide-react'

const REASON_LABELS: Record<string, string> = {
  not_in_course: '📚 Pas dans le cours',
  off_topic: '🔀 Hors sujet',
  wrong_answer: '❌ Mauvaise réponse',
  unclear: '❓ Question confuse',
  too_hard: '🧠 Trop difficile',
  other: '💬 Autre',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  reviewed: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  dismissed: 'bg-slate-100 text-slate-500 border-slate-200',
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminQuizFeedbackPage() {
  const { showToast } = useToast()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-quiz-feedback', statusFilter],
    queryFn: () => getAdminQuizFeedback(statusFilter === 'all' ? undefined : statusFilter),
    refetchInterval: 30_000,
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-quiz-feedback-stats'],
    queryFn: getAdminQuizFeedbackStats,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateFeedbackStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-quiz-feedback'] })
      qc.invalidateQueries({ queryKey: ['admin-quiz-feedback-stats'] })
      showToast('Statut mis à jour', 'success')
    },
    onError: () => showToast('Erreur lors de la mise à jour', 'error'),
  })

  const pending = reports.filter((r) => r.status === 'pending').length

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Flag className="h-5 w-5 text-amber-500" />
            Signalements de questions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Questions signalées par les apprenants comme hors sujet ou incorrectes.
          </p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{pending} en attente</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Flag} label="Total signalements" value={stats?.total ?? 0} color="bg-slate-100 text-slate-600" />
        <StatCard icon={Clock} label="En attente" value={stats?.pending ?? 0} color="bg-amber-100 text-amber-600" />
        <StatCard
          icon={CheckCircle2}
          label="Résolus"
          value={reports.filter(r => r.status === 'resolved').length}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={BookOpen}
          label="Cours affectés"
          value={stats?.byCourse?.length ?? 0}
          color="bg-blue-100 text-blue-600"
        />
      </div>

      {/* Top courses by reports */}
      {stats?.byCourse?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              Cours les plus signalés
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {stats.byCourse.map((c: { courseId: string; count: string }) => (
                <span key={c.courseId} className="text-xs bg-slate-100 text-slate-700 rounded-full px-2.5 py-1 font-medium">
                  {c.courseId} <span className="text-slate-400">({c.count})</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="reviewed">Examiné</SelectItem>
            <SelectItem value="resolved">Résolu</SelectItem>
            <SelectItem value="dismissed">Ignoré</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-400">{reports.length} résultat(s)</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-8">Chargement…</p>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
          <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Aucun signalement</p>
          <p className="text-xs text-slate-400 mt-1">Les apprenants n&apos;ont signalé aucune question pour ce filtre.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {reports.map((r) => (
            <div key={r.id} className="bg-white hover:bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                {/* Status indicator */}
                <div className={`shrink-0 h-2 w-2 rounded-full mt-2 ${
                  r.status === 'pending' ? 'bg-amber-400' :
                  r.status === 'resolved' ? 'bg-emerald-400' :
                  r.status === 'reviewed' ? 'bg-blue-400' : 'bg-slate-300'
                }`} />

                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Question text */}
                  <p className="text-sm font-medium text-slate-800 leading-snug">{r.questionText}</p>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                    </Badge>
                    <span className="text-[11px] font-medium text-amber-600">
                      {REASON_LABELS[r.reason] ?? r.reason}
                    </span>
                    {r.moduleTitle && (
                      <span className="text-[11px] text-slate-400">
                        📦 {r.moduleTitle}
                      </span>
                    )}
                    {r.courseId && (
                      <span className="text-[11px] text-slate-400">
                        🎓 {r.courseId}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-300 ml-auto">
                      {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Comment */}
                  {r.comment && (
                    <p className="text-xs text-slate-500 italic">« {r.comment} »</p>
                  )}
                </div>

                {/* Status actions */}
                <div className="shrink-0 flex gap-1.5">
                  {r.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateStatus.mutate({ id: r.id, status: 'resolved' })}
                        className="h-7 w-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
                        title="Marquer comme résolu"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus.mutate({ id: r.id, status: 'dismissed' })}
                        className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                        title="Ignorer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {(r.status === 'resolved' || r.status === 'dismissed') && (
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: r.id, status: 'pending' })}
                      className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5"
                    >
                      Rouvrir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

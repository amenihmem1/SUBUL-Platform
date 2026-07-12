'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Gauge,
  Layers,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react';

type CoachKind = 'hr' | 'technical';

type CoachSession = {
  session_id: string;
  candidate_key?: string;
  candidate_name?: string;
  headline?: string;
  updated_at?: string;
  created_at?: string;
  history_at?: string;
  finalized_at?: string;
  turns_count?: number;
  score_total?: number | null;
  status?: 'completed' | 'active' | 'draft' | string;
  title?: string;
  preview?: string;
  response_language?: string;
  pinned?: boolean;
  archived?: boolean;
  proctoring_alerts_count?: number;
};

type SessionsResponse = {
  sessions?: CoachSession[];
  recent_sessions?: CoachSession[];
  total_sessions?: number;
  total_candidates?: number;
};

type CoachConfig = {
  kind: CoachKind;
  label: string;
  apiBase: string;
  reportBase: string;
  accent: 'violet' | 'cyan';
  emptyTitle: string;
  emptyDescription: string;
};

type FilterKey = 'active' | 'archived' | 'completed' | 'pinned';

const ROWS_PER_PAGE = 5;

const configs: Record<CoachKind, CoachConfig> = {
  hr: {
    kind: 'hr',
    label: 'HR Coach',
    apiBase: '/hr-coach-app/api/rh',
    reportBase: '/hr-coach-app/report',
    accent: 'violet',
    emptyTitle: 'Aucun resultat HR',
    emptyDescription: 'Les rapports candidats apparaitront ici apres les entretiens HR Coach.',
  },
  technical: {
    kind: 'technical',
    label: 'coach technique',
    apiBase: '/technical-coach-app/api/tech',
    reportBase: '/technical-coach-app/report',
    accent: 'cyan',
    emptyTitle: 'Aucun resultat technique',
    emptyDescription: 'Les rapports techniques apparaitront ici apres les sessions du coach technique.',
  },
};

function getSessionDate(session: CoachSession) {
  return session.history_at || session.finalized_at || session.created_at || session.updated_at || '';
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function statusLabel(status?: string) {
  if (status === 'completed') return 'Termine';
  if (status === 'draft') return 'Brouillon';
  return 'Actif';
}

function statusClasses(status?: string) {
  if (status === 'completed') return 'border-emerald-200 bg-emerald-500/10 text-emerald-700';
  if (status === 'draft') return 'border-amber-200 bg-amber-500/10 text-amber-700';
  return 'border-blue-200 bg-blue-500/10 text-blue-700';
}

function scoreLabel(score?: number | null) {
  return typeof score === 'number' ? `${Math.round(score)}%` : '--';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function readJsonResponse(res: Response) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { error: raw };
  }
}

async function fetchSessions(config: CoachConfig): Promise<CoachSession[]> {
  const res = await fetch(`${config.apiBase}/sessions?limit=300`, {
    method: 'GET',
    cache: 'no-store',
  });
  const data = (await readJsonResponse(res)) as SessionsResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Impossible de charger les resultats ${config.label}.`);
  }

  const sessions = Array.isArray(data.sessions)
    ? data.sessions
    : Array.isArray(data.recent_sessions)
      ? data.recent_sessions
      : [];

  const byId = new Map<string, CoachSession>();
  sessions.forEach((session) => {
    const id = String(session.session_id || '').trim();
    if (!id) return;
    const existing = byId.get(id);
    if (!existing || String(getSessionDate(session)).localeCompare(String(getSessionDate(existing))) > 0) {
      byId.set(id, { ...session, session_id: id });
    }
  });

  return Array.from(byId.values()).sort((left, right) => {
    if (Boolean(left.pinned) !== Boolean(right.pinned)) return left.pinned ? -1 : 1;
    return String(getSessionDate(right)).localeCompare(String(getSessionDate(left)));
  });
}

async function patchSession(config: CoachConfig, sessionId: string, payload: Partial<CoachSession>) {
  const res = await fetch(`${config.apiBase}/session/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) {
    const error = typeof data === 'object' && data && 'error' in data ? String((data as { error?: unknown }).error) : '';
    throw new Error(error || 'Action impossible pour cette session.');
  }
}

async function deleteSession(config: CoachConfig, sessionId: string) {
  const res = await fetch(`${config.apiBase}/session/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
  const data = await readJsonResponse(res);
  if (!res.ok) {
    const error = typeof data === 'object' && data && 'error' in data ? String((data as { error?: unknown }).error) : '';
    throw new Error(error || 'Suppression impossible pour cette session.');
  }
}

export default function AdminCoachResultsPage({ kind }: { kind: CoachKind }) {
  const config = configs[kind];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('active');
  const [deleteTarget, setDeleteTarget] = useState<CoachSession | null>(null);
  const [reportTarget, setReportTarget] = useState<CoachSession | null>(null);
  const [page, setPage] = useState(1);

  const queryKey = ['admin', 'coach-results', kind];
  const sessionsQuery = useQuery({
    queryKey,
    queryFn: () => fetchSessions(config),
    refetchOnWindowFocus: true,
  });

  const sessions = sessionsQuery.data || [];
  const visibleSessions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sessions.filter((session) => {
      const filterMatch =
        filter === 'archived'
          ? session.archived
          : filter === 'completed'
            ? session.status === 'completed'
            : filter === 'pinned'
              ? session.pinned
              : !session.archived;
      if (!filterMatch) return false;
      if (!term) return true;
      return [
        session.candidate_name,
        session.title,
        session.headline,
        session.preview,
        session.session_id,
        statusLabel(session.status),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [filter, search, sessions]);

  const stats = useMemo(() => {
    const active = sessions.filter((session) => !session.archived).length;
    const completed = sessions.filter((session) => session.status === 'completed').length;
    const pinned = sessions.filter((session) => session.pinned).length;
    const archived = sessions.filter((session) => session.archived).length;
    const scores = sessions
      .map((session) => session.score_total)
      .filter((score): score is number => typeof score === 'number');
    const averageScore = scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null;
    const candidates = new Set(
      sessions.map((session) => session.candidate_key || session.candidate_name || session.session_id),
    ).size;
    return { active, completed, pinned, archived, averageScore, candidates };
  }, [sessions]);

  const totalPages = Math.max(1, Math.ceil(visibleSessions.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const firstItem = visibleSessions.length ? (currentPage - 1) * ROWS_PER_PAGE + 1 : 0;
  const lastItem = Math.min(currentPage * ROWS_PER_PAGE, visibleSessions.length);
  const paginatedSessions = visibleSessions.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const metaMutation = useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: string; payload: Partial<CoachSession> }) =>
      patchSession(config, sessionId, payload),
    onSuccess: async () => {
      toast.success('Session mise a jour');
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Action impossible')),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteSession(config, sessionId),
    onSuccess: async () => {
      toast.success('Session supprimee');
      setDeleteTarget(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Suppression impossible')),
  });

  const accentGradient =
    config.accent === 'violet'
      ? 'from-violet-600 via-fuchsia-600 to-rose-500'
      : 'from-cyan-600 via-blue-600 to-violet-600';
  const accentText = config.accent === 'violet' ? 'text-violet-700' : 'text-cyan-700';
  const accentSoft = config.accent === 'violet' ? 'bg-violet-500/10' : 'bg-cyan-500/10';

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard index={0} label="Sessions actives" value={stats.active} icon={<Clock3 className="h-5 w-5" />} tone="blue" />
        <StatCard index={1} label="Rapports termines" value={stats.completed} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
        <StatCard index={2} label="Candidats" value={stats.candidates} icon={<Users className="h-5 w-5" />} tone="violet" />
        <StatCard index={3} label="Epingles" value={stats.pinned} icon={<Pin className="h-5 w-5" />} tone="amber" />
        <StatCard
          index={4}
          label="Score moyen"
          value={stats.averageScore === null ? '--' : `${stats.averageScore}%`}
          icon={<Gauge className="h-5 w-5" />}
          tone="cyan"
        />
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Liste des candidats</h2>
            <p className="text-sm text-muted-foreground">{visibleSessions.length} resultat(s) affiche(s)</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value as FilterKey);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 lg:w-48"
            >
              <option value="active">Actifs</option>
              <option value="completed">Termines</option>
              <option value="pinned">Epingles</option>
              <option value="archived">Archives</option>
            </select>
            <div className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 lg:w-80">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Rechercher candidat, rapport, session..."
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse border border-border bg-background">
            <thead>
              <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Candidat</th>
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Rapport</th>
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Score</th>
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Statut</th>
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Activite</th>
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Alertes</th>
                <th className="border-b border-border px-5 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessionsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-muted-foreground">
                    Chargement des resultats...
                  </td>
                </tr>
              ) : sessionsQuery.isError ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                      <ShieldAlert className="h-9 w-9 text-rose-500" />
                      <p className="font-semibold text-foreground">Impossible de charger les resultats.</p>
                      <p className="text-sm text-muted-foreground">
                        {getErrorMessage(sessionsQuery.error, `Verifier le service ${config.label}.`)}
                      </p>
                      <button
                        type="button"
                        onClick={() => sessionsQuery.refetch()}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reessayer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : visibleSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accentSoft} ${accentText}`}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-foreground">{config.emptyTitle}</p>
                      <p className="text-sm text-muted-foreground">{config.emptyDescription}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((session, index) => (
                  <motion.tr
                    key={session.session_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: Math.min(index * 0.035, 0.45) }}
                    className="bg-background transition even:bg-muted/20 hover:bg-muted/40"
                  >
                    <td className="border-b border-r border-border/70 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentSoft} text-sm font-bold ${accentText}`}>
                          {(session.candidate_name || session.title || 'C').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate font-semibold text-foreground">{session.candidate_name || 'Candidat'}</p>
                            {session.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : null}
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{session.headline || session.session_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-r border-border/70 px-5 py-4">
                      <p className="max-w-[280px] truncate font-medium text-foreground">
                        {session.title || session.preview || 'Rapport candidat'}
                      </p>
                      <p className="max-w-[280px] truncate text-sm text-muted-foreground">
                        {session.preview || `${session.turns_count || 0} message(s)`}
                      </p>
                    </td>
                    <td className="border-b border-r border-border/70 px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${accentGradient}`}
                            style={{ width: `${Math.max(0, Math.min(100, session.score_total || 0))}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-foreground">{scoreLabel(session.score_total)}</span>
                      </div>
                    </td>
                    <td className="border-b border-r border-border/70 px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(session.status)}`}>
                        {statusLabel(session.status)}
                      </span>
                    </td>
                    <td className="border-b border-r border-border/70 px-5 py-4 text-sm text-muted-foreground">{formatDate(getSessionDate(session))}</td>
                    <td className="border-b border-r border-border/70 px-5 py-4">
                      {kind === 'technical' ? (
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          Number(session.proctoring_alerts_count || 0) > 0
                            ? 'border-amber-200 bg-amber-500/10 text-amber-700'
                            : 'border-emerald-200 bg-emerald-500/10 text-emerald-700'
                        }`}>
                          {Number(session.proctoring_alerts_count || 0)} alerte(s)
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="border-b border-border/70 px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReportTarget(session)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Choisir un rapport"
                          title="Rapports"
                        >
                          <Layers className="h-4 w-4" />
                        </button>
                        <IconAction
                          label={session.pinned ? 'Desepingler' : 'Epingler'}
                          disabled={metaMutation.isPending}
                          onClick={() =>
                            metaMutation.mutate({
                              sessionId: session.session_id,
                              payload: { pinned: !session.pinned },
                            })
                          }
                        >
                          {session.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </IconAction>
                        <IconAction
                          label={session.archived ? 'Restaurer' : 'Archiver'}
                          disabled={metaMutation.isPending}
                          onClick={() =>
                            metaMutation.mutate({
                              sessionId: session.session_id,
                              payload: { archived: !session.archived },
                            })
                          }
                        >
                          {session.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </IconAction>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(session)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border bg-background px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Affichage {firstItem}-{lastItem} de {visibleSessions.length} utilisateurs</span>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </button>
            <span className="inline-flex h-9 items-center rounded-lg border border-border bg-muted/40 px-4 font-semibold text-foreground">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.section>

      {deleteTarget ? (
        <DeleteSessionDialog
          session={deleteTarget}
          isDeleting={deleteMutation.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.session_id)}
        />
      ) : null}

      {reportTarget ? (
        <ReportChoiceDialog
          config={config}
          session={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      ) : null}
    </div>
  );
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function DeleteSessionDialog({
  session,
  isDeleting,
  onClose,
  onConfirm,
}: {
  session: CoachSession;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} aria-label="Fermer" />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
          <Trash2 className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground">Supprimer cette session ?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La session et son historique seront retires de la liste admin.
        </p>
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
          <p className="font-semibold text-foreground">{session.candidate_name || 'Candidat'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{session.title || session.session_id}</p>
          <p className="mt-2 text-sm font-medium text-foreground">{formatDate(getSessionDate(session))}</p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportChoiceDialog({
  config,
  session,
  onClose,
}: {
  config: CoachConfig;
  session: CoachSession;
  onClose: () => void;
}) {
  const encodedSessionId = encodeURIComponent(session.session_id);
  const mainLabel = config.kind === 'hr' ? 'RH' : 'Technique';
  const mainDescription =
    config.kind === 'hr'
      ? 'Tableau de bord RH avec score candidat et synthese entretien.'
      : 'Tableau de bord technique avec score et synthese des reponses.';
  const reportView = config.kind === 'hr' ? 'rh' : 'report';
  const insightsUrl = `${config.reportBase}/${encodedSessionId}?view=insights`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} aria-label="Fermer" />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">Choisir le rapport</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {session.candidate_name || 'Candidat'} - {session.title || session.session_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <ReportOption
            href={`${config.reportBase}/${encodedSessionId}?view=${reportView}`}
            title={mainLabel}
            description={mainDescription}
            icon={<FileText className="h-5 w-5" />}
            onClick={onClose}
          />
          <ReportOption
            href={insightsUrl}
            title="Insight"
            description="Tableau de bord des insights visuels, vocaux et stress dans un nouvel onglet."
            icon={<Gauge className="h-5 w-5" />}
            onClick={onClose}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportOption({
  href,
  title,
  description,
  icon,
  onClick,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl border border-border bg-background p-4 transition hover:border-violet-200 hover:bg-violet-50/60"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition group-hover:bg-violet-500/10 group-hover:text-violet-700">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-foreground">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-violet-700" />
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  index,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone: 'blue' | 'emerald' | 'violet' | 'amber' | 'cyan';
  index: number;
}) {
  const toneClasses = {
    blue: 'bg-blue-500/10 text-blue-600 ring-blue-200/60',
    emerald: 'bg-emerald-500/10 text-emerald-600 ring-emerald-200/60',
    violet: 'bg-violet-500/10 text-violet-600 ring-violet-200/60',
    amber: 'bg-amber-500/10 text-amber-600 ring-amber-200/60',
    cyan: 'bg-cyan-500/10 text-cyan-600 ring-cyan-200/60',
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, delay: index * 0.06 }}
      whileHover={{ y: -3, transition: { duration: 0.16 } }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <motion.p
            key={value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="mt-1 text-3xl font-bold text-foreground"
          >
            {value}
          </motion.p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClasses}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

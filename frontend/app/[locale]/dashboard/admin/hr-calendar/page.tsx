'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAdminUsers } from '@/hooks/api/useAdmin';
import {
  createAdminHrInterview,
  deleteAdminHrInterview,
  fetchAdminHrInterviews,
  updateAdminHrInterview,
  type HrCalendarPayload,
} from '@/services/adminHrCalendar';
import type { ScheduledInterview } from '@/hr-coach/lib/interviewCalendar';

const ROWS_PER_PAGE = 5;

type AdminUserOption = {
  id: number;
  name?: string;
  email?: string;
};

type FormState = {
  candidateName: string;
  candidateEmail: string;
  date: string;
  time: string;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getDefaultForm(): FormState {
  const next = new Date();
  next.setHours(next.getHours() + 2, 0, 0, 0);
  return {
    candidateName: '',
    candidateEmail: '',
    date: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`,
    time: `${pad(next.getHours())}:00`,
  };
}

function toForm(interview: ScheduledInterview): FormState {
  const date = new Date(interview.scheduledAt);
  const fallback = getDefaultForm();
  if (Number.isNaN(date.getTime())) return fallback;
  return {
    candidateName: interview.candidateName || '',
    candidateEmail: interview.candidateEmail || '',
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function toPayload(form: FormState): HrCalendarPayload {
  return {
    candidateName: form.candidateName,
    candidateEmail: form.candidateEmail,
    role: 'HR Coach',
    scheduledAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
  };
}

function looksLikeEmail(value: string) {
  const clean = value.trim();
  const [local, domain] = clean.split('@');
  return Boolean(local && domain && domain.includes('.') && !clean.includes(' '));
}

function formatDate(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function formatDay(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function formatTime(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--:--';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function statusLabel(status: ScheduledInterview['status']) {
  if (status === 'completed') return 'Termine';
  if (status === 'cancelled') return 'Annule';
  return 'Planifie';
}

function statusClasses(status: ScheduledInterview['status']) {
  if (status === 'completed') return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
  if (status === 'cancelled') return 'bg-rose-500/10 text-rose-700 border-rose-200';
  return 'bg-violet-500/10 text-violet-700 border-violet-200';
}

export default function AdminHrCalendarPage() {
  const params = useParams();
  const locale = params?.locale === 'en' ? 'en-US' : 'fr-FR';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<ScheduledInterview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduledInterview | null>(null);
  const [selectedInterviewIds, setSelectedInterviewIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(() => getDefaultForm());

  const { data: usersPage } = useAdminUsers({ page: 1, limit: 250 });
  const users = (usersPage?.data || []) as AdminUserOption[];

  const interviewsQuery = useQuery({
    queryKey: ['admin', 'hr-calendar', 'interviews'],
    queryFn: fetchAdminHrInterviews,
    refetchOnWindowFocus: true,
  });

  const interviews = useMemo(
    () => [...(interviewsQuery.data?.interviews || [])].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [interviewsQuery.data?.interviews],
  );

  const filteredInterviews = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return interviews;
    return interviews.filter((item) =>
      [item.candidateName, item.candidateEmail, item.status, formatDate(item.scheduledAt, locale)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [interviews, locale, search]);

  const now = Date.now();
  const planned = interviews.filter((item) => item.status === 'planned');
  const upcoming = planned.filter((item) => new Date(item.scheduledAt).getTime() >= now);
  const cancelled = interviews.filter((item) => item.status === 'cancelled');
  const nextInterview = upcoming[0];
  const totalPages = Math.max(1, Math.ceil(filteredInterviews.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const firstItem = filteredInterviews.length ? (currentPage - 1) * ROWS_PER_PAGE + 1 : 0;
  const lastItem = Math.min(currentPage * ROWS_PER_PAGE, filteredInterviews.length);
  const paginatedInterviews = filteredInterviews.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
  const allInterviewsOnPageSelected =
    paginatedInterviews.length > 0 && paginatedInterviews.every((item) => selectedInterviewIds.has(item.id));

  const invalidateCalendar = () => queryClient.invalidateQueries({ queryKey: ['admin', 'hr-calendar', 'interviews'] });

  const closeForm = () => {
    setFormOpen(false);
    setEditingInterview(null);
    setSelectedUserId('');
    setForm(getDefaultForm());
  };

  const createMutation = useMutation({
    mutationFn: createAdminHrInterview,
    onSuccess: async () => {
      toast.success('Entretien HR Coach ajoute');
      closeForm();
      await invalidateCalendar();
    },
    onError: (error: Error) => toast.error(error.message || "Impossible d'ajouter l'entretien"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: HrCalendarPayload }) => updateAdminHrInterview(id, payload),
    onSuccess: async () => {
      toast.success('Entretien modifie');
      closeForm();
      await invalidateCalendar();
    },
    onError: (error: Error) => toast.error(error.message || "Impossible de modifier l'entretien"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminHrInterview,
    onSuccess: async () => {
      toast.success('Entretien supprime');
      setDeleteTarget(null);
      await invalidateCalendar();
    },
    onError: (error: Error) => toast.error(error.message || "Impossible de supprimer l'entretien"),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const bulkDeleteDisabled = bulkDeleting || deleteMutation.isPending || selectedInterviewIds.size === 0;

  const toggleInterviewSelection = (id: string) => {
    setSelectedInterviewIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllInterviewsOnPage = () => {
    setSelectedInterviewIds((current) => {
      const next = new Set(current);
      if (allInterviewsOnPageSelected) {
        paginatedInterviews.forEach((item) => next.delete(item.id));
      } else {
        paginatedInterviews.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedInterviewIds);
    if (!ids.length) return;
    if (!confirm('Supprimer les entretiens selectionnes ?')) return;
    setBulkDeleting(true);
    try {
      await Promise.all(ids.map((id) => deleteAdminHrInterview(id)));
      setSelectedInterviewIds(new Set());
      toast.success('Entretiens supprimes');
      await invalidateCalendar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression groupée impossible');
    } finally {
      setBulkDeleting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingInterview(null);
    setSelectedUserId('');
    setForm(getDefaultForm());
    setFormOpen(true);
  };

  const openEditDialog = (interview: ScheduledInterview) => {
    setEditingInterview(interview);
    setSelectedUserId('');
    setForm(toForm(interview));
    setFormOpen(true);
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const selected = users.find((user) => String(user.id) === userId);
    if (!selected) return;
    setForm((current) => ({
      ...current,
      candidateName: selected.name || selected.email || '',
      candidateEmail: selected.email || '',
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.candidateName.trim() || !form.candidateEmail.trim()) {
      toast.error('Nom et email du candidat sont obligatoires.');
      return;
    }
    if (!looksLikeEmail(form.candidateEmail)) {
      toast.error('Email candidat invalide.');
      return;
    }
    const scheduledAt = new Date(`${form.date}T${form.time}:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      toast.error('Choisissez une date et une heure futures.');
      return;
    }

    const payload = toPayload(form);
    if (editingInterview) {
      updateMutation.mutate({ id: editingInterview.id, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">HR Coach</p>
              <p className="truncate text-sm text-muted-foreground">
                {nextInterview ? `Prochain entretien: ${formatDate(nextInterview.scheduledAt, locale)}` : 'Aucun entretien a venir'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => interviewsQuery.refetch()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${interviewsQuery.isFetching ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={openCreateDialog}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-bold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleteDisabled}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer
            </button>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard index={0} label="Tous les entretiens" value={interviews.length} icon={<Users className="h-5 w-5" />} tone="violet" />
        <StatCard index={1} label="Planifies" value={planned.length} icon={<CalendarCheck className="h-5 w-5" />} tone="blue" />
        <StatCard index={2} label="A venir" value={upcoming.length} icon={<Clock className="h-5 w-5" />} tone="emerald" />
        <StatCard index={3} label="Annules" value={cancelled.length} icon={<X className="h-5 w-5" />} tone="rose" />
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Entretiens planifies</h2>
            <p className="text-sm text-muted-foreground">{filteredInterviews.length} resultat(s) affiches</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 sm:w-80">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Rechercher nom, email, statut..."
              />
            </div>
            <button
              type="button"
              onClick={() => interviewsQuery.refetch()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
            >
              <RefreshCw className={`h-4 w-4 ${interviewsQuery.isFetching ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse border border-border">
            <thead>
              <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-12 border-b border-r border-border px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allInterviewsOnPageSelected}
                    onChange={toggleAllInterviewsOnPage}
                    aria-label="Selectionner tous les entretiens affiches"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                </th>
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Candidat</th>
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Jour</th>
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Heure</th>
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Statut</th>
                <th className="border-b border-r border-border px-5 py-3 font-semibold">Rappel</th>
                <th className="border-b border-border px-5 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {interviewsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-muted-foreground">
                    Chargement des entretiens...
                  </td>
                </tr>
              ) : filteredInterviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-muted-foreground">
                    Aucun entretien trouve.
                  </td>
                </tr>
              ) : (
                paginatedInterviews.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: Math.min(index * 0.045, 0.35) }}
                    className="bg-background transition even:bg-muted/20 hover:bg-muted/40"
                  >
                    <td className="border-b border-r border-border/70 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedInterviewIds.has(item.id)}
                        onChange={() => toggleInterviewSelection(item.id)}
                        aria-label="Selectionner cet entretien"
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </td>
                    <td className="border-b border-r border-border/70 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-bold text-violet-700">
                          {(item.candidateName || item.candidateEmail || 'C').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-foreground">{item.candidateName || 'Candidat'}</div>
                          <div className="truncate text-sm text-muted-foreground">{item.candidateEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-r border-border/70 px-5 py-4 text-sm font-medium text-foreground">{formatDay(item.scheduledAt, locale)}</td>
                    <td className="border-b border-r border-border/70 px-5 py-4 text-sm text-muted-foreground">{formatTime(item.scheduledAt, locale)}</td>
                    <td className="border-b border-r border-border/70 px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="border-b border-r border-border/70 px-5 py-4 text-sm text-muted-foreground">
                      {item.reminderSentAt ? 'Envoye' : `${item.reminderMinutesBefore || 60} min avant`}
                    </td>
                    <td className="border-b border-border/70 px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDialog(item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                          aria-label="Supprimer"
                          title="Supprimer"
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
          <span>Affichage {firstItem}-{lastItem} de {filteredInterviews.length} entretiens</span>
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

      {formOpen ? (
        <InterviewFormDialog
          editing={Boolean(editingInterview)}
          form={form}
          users={users}
          selectedUserId={selectedUserId}
          isSaving={isSaving}
          onClose={closeForm}
          onSubmit={handleSubmit}
          onSelectUser={handleSelectUser}
          onChange={setForm}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteInterviewDialog
          interview={deleteTarget}
          locale={locale}
          isDeleting={deleteMutation.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      ) : null}
    </div>
  );
}

function InterviewFormDialog({
  editing,
  form,
  users,
  selectedUserId,
  isSaving,
  onClose,
  onSubmit,
  onSelectUser,
  onChange,
}: {
  editing: boolean;
  form: FormState;
  users: AdminUserOption[];
  selectedUserId: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onSelectUser: (userId: string) => void;
  onChange: (form: FormState) => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} aria-label="Fermer" />
      <form onSubmit={onSubmit} className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
              {editing ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <h2 className="mt-3 text-xl font-bold text-foreground">
              {editing ? "Modifier l'entretien" : "Ajouter un entretien"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choisissez un utilisateur Subul ou renseignez les informations du candidat.
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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">Utilisateur Subul</span>
            <select
              value={selectedUserId}
              onChange={(event) => onSelectUser(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              <option value="">Saisie manuelle</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email} - {user.email}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">Nom candidat</span>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <input
                value={form.candidateName}
                onChange={(event) => onChange({ ...form, candidateName: event.target.value })}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Nom complet"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">Email candidat</span>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={form.candidateEmail}
                onChange={(event) => onChange({ ...form, candidateEmail: event.target.value })}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="email@subul.uk"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(event) => onChange({ ...form, date: event.target.value })}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">Heure</span>
            <input
              type="time"
              value={form.time}
              onChange={(event) => onChange({ ...form, time: event.target.value })}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
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
            type="submit"
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-bold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editing ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isSaving ? 'Enregistrement...' : editing ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteInterviewDialog({
  interview,
  locale,
  isDeleting,
  onClose,
  onConfirm,
}: {
  interview: ScheduledInterview;
  locale: string;
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
        <h2 className="mt-4 text-xl font-bold text-foreground">Supprimer cet entretien ?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette action supprimera le rendez-vous HR Coach du calendrier.
        </p>
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
          <p className="font-semibold text-foreground">{interview.candidateName || 'Candidat'}</p>
          <p className="text-sm text-muted-foreground">{interview.candidateEmail}</p>
          <p className="mt-2 text-sm font-medium text-foreground">{formatDate(interview.scheduledAt, locale)}</p>
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

function StatCard({
  label,
  value,
  icon,
  index,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  index: number;
  tone: 'violet' | 'blue' | 'emerald' | 'rose';
}) {
  const toneClasses = {
    violet: 'bg-violet-500/10 text-violet-600 ring-violet-200/60',
    blue: 'bg-blue-500/10 text-blue-600 ring-blue-200/60',
    emerald: 'bg-emerald-500/10 text-emerald-600 ring-emerald-200/60',
    rose: 'bg-rose-500/10 text-rose-600 ring-rose-200/60',
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.34, delay: index * 0.08 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 opacity-0 transition-opacity group-hover:opacity-100" />
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

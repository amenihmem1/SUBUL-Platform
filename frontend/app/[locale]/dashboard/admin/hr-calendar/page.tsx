'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  Clock,
  Edit3,
  Mail,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { useAdminUsers } from '@/hooks/api/useAdmin';
import {
  createAdminHrInterview,
  deleteAdminHrInterview,
  fetchAdminHrInterviews,
  updateAdminHrInterview,
  type HrCalendarPayload,
} from '@/services/adminHrCalendar';
import type { ScheduledInterview } from '@/hr-coach/lib/interviewCalendar';

type AdminUserOption = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
};

type FormState = {
  candidateName: string;
  candidateEmail: string;
  role: string;
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
    role: 'HR Coach',
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
    role: interview.role || 'HR Coach',
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function toPayload(form: FormState): HrCalendarPayload {
  return {
    candidateName: form.candidateName,
    candidateEmail: form.candidateEmail,
    role: form.role,
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
  const [editingInterview, setEditingInterview] = useState<ScheduledInterview | null>(null);
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
      [item.candidateName, item.candidateEmail, item.role, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [interviews, search]);

  const now = Date.now();
  const planned = interviews.filter((item) => item.status === 'planned');
  const upcoming = planned.filter((item) => new Date(item.scheduledAt).getTime() >= now);
  const cancelled = interviews.filter((item) => item.status === 'cancelled');
  const nextInterview = upcoming[0];

  const invalidateCalendar = () => queryClient.invalidateQueries({ queryKey: ['admin', 'hr-calendar', 'interviews'] });

  const createMutation = useMutation({
    mutationFn: createAdminHrInterview,
    onSuccess: async () => {
      toast.success("Entretien HR Coach ajoute");
      setForm(getDefaultForm());
      setSelectedUserId('');
      await invalidateCalendar();
    },
    onError: (error: Error) => toast.error(error.message || "Impossible d'ajouter l'entretien"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: HrCalendarPayload }) => updateAdminHrInterview(id, payload),
    onSuccess: async () => {
      toast.success('Entretien modifie');
      setEditingInterview(null);
      setForm(getDefaultForm());
      setSelectedUserId('');
      await invalidateCalendar();
    },
    onError: (error: Error) => toast.error(error.message || "Impossible de modifier l'entretien"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminHrInterview,
    onSuccess: async () => {
      toast.success('Entretien supprime');
      await invalidateCalendar();
    },
    onError: (error: Error) => toast.error(error.message || "Impossible de supprimer l'entretien"),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

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

  const handleEdit = (interview: ScheduledInterview) => {
    setEditingInterview(interview);
    setSelectedUserId('');
    setForm(toForm(interview));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingInterview(null);
    setSelectedUserId('');
    setForm(getDefaultForm());
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
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              <CalendarCheck className="h-3.5 w-3.5" />
              HR Coach
            </div>
            <h1 className="mt-3 text-2xl font-bold text-foreground">Calendrier des entretiens HR Coach</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Consultez tous les entretiens planifies, ajoutez un entretien pour un utilisateur Subul, puis modifiez ou supprimez les rendez-vous.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
            <p className="text-muted-foreground">Prochain entretien</p>
            <p className="mt-1 font-semibold text-foreground">
              {nextInterview ? formatDate(nextInterview.scheduledAt, locale) : 'Aucun entretien a venir'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Tous les entretiens" value={interviews.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Planifies" value={planned.length} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label="A venir" value={upcoming.length} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Annules" value={cancelled.length} icon={<X className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {editingInterview ? "Modifier l'entretien" : "Ajouter un entretien"}
              </h2>
              <p className="text-sm text-muted-foreground">Selectionnez un user ou remplissez les champs manuellement.</p>
            </div>
            {editingInterview ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Annuler
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">Utilisateur Subul</span>
              <select
                value={selectedUserId}
                onChange={(event) => handleSelectUser(event.target.value)}
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
                  onChange={(event) => setForm((current) => ({ ...current, candidateName: event.target.value }))}
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
                  onChange={(event) => setForm((current) => ({ ...current, candidateEmail: event.target.value }))}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="email@subul.uk"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">Titre / role</span>
              <input
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder="Ex: Entretien RH"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-foreground">Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-foreground">Heure</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-bold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingInterview ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isSaving ? 'Enregistrement...' : editingInterview ? 'Modifier entretien' : 'Ajouter entretien'}
            </button>
          </div>
        </form>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Entretiens planifies</h2>
              <p className="text-sm text-muted-foreground">{filteredInterviews.length} resultat(s)</p>
            </div>
            <div className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 md:w-80">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Rechercher nom, email, statut..."
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Candidat</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {interviewsQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Chargement des entretiens...
                    </td>
                  </tr>
                ) : filteredInterviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Aucun entretien trouve.
                    </td>
                  </tr>
                ) : (
                  filteredInterviews.map((item) => (
                    <tr key={item.id} className="border-t border-border/60 transition hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">{item.candidateName || 'Candidat'}</div>
                        <div className="text-sm text-muted-foreground">{item.candidateEmail}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground">{formatDate(item.scheduledAt, locale)}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{item.role || 'HR Coach'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Modifier"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Supprimer cet entretien ?')) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

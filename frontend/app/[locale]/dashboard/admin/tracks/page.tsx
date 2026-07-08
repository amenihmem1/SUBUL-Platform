'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cloud, Shield, Brain, Tag, CheckSquare, Square, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAdminLabs, updateLab, type LabDto } from '@/services/labs';
import { getAdminCourses, updateAdminCourse, type AdminCourseListItem } from '@/services/admin-courses';

// ─── Constants ────────────────────────────────────────────────────────────────

type Track = 'cloud' | 'cyber' | 'ai';

const TRACKS: { value: Track; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { value: 'cloud', label: 'Cloud & DevOps',            color: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Cloud  className="h-3.5 w-3.5" /> },
  { value: 'cyber', label: 'Cybersécurité',             color: 'text-red-700',    bg: 'bg-red-100',    icon: <Shield className="h-3.5 w-3.5" /> },
  { value: 'ai',    label: 'Intelligence Artificielle', color: 'text-violet-700', bg: 'bg-violet-100', icon: <Brain  className="h-3.5 w-3.5" /> },
];

const TRACK_MAP = Object.fromEntries(TRACKS.map((t) => [t.value, t]));

function TrackBadge({ track }: { track?: Track | null }) {
  if (!track) return <span className="text-xs text-slate-400 italic">—</span>;
  const meta = TRACK_MAP[track];
  if (!meta) return <span className="text-xs text-slate-400">{track}</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function TrackSelect({
  current,
  onChange,
  disabled,
}: {
  current?: Track | null;
  onChange: (v: Track | null) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={current ?? ''}
      disabled={disabled}
      onChange={(e) => onChange((e.target.value || null) as Track | null)}
      className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
    >
      <option value="">— aucun —</option>
      {TRACKS.map((t) => (
        <option key={t.value} value={t.value}>{t.label}</option>
      ))}
    </select>
  );
}

// ─── Query keys ───────────────────────────────────────────────────────────────

const adminTrackKeys = {
  labs: ['admin', 'labs', 'list'] as const,
  courses: ['admin', 'courses', 'tracks-all'] as const,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTracksPage() {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';
  const [tab, setTab] = useState<'labs' | 'courses'>('labs');

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Tag className="h-6 w-6 text-primary" />
          Assign Tracks
        </h1>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mt-1">
          <Link href={`/${locale}/dashboard/admin`} className="hover:text-slate-900">Admin</Link>
          <span aria-hidden>/</span>
          <span className="text-slate-900 font-medium">Tracks</span>
        </nav>
        <p className="text-sm text-slate-500 mt-2">
          Tag each lab and course with its learning track (<strong>cloud</strong>, <strong>cyber</strong>, <strong>ai</strong>).
          Learners will see only content matching their detected profile by default.
        </p>
      </div>

      {/* Track legend */}
      <div className="flex flex-wrap gap-3">
        {TRACKS.map((t) => (
          <span key={t.value} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium ${t.bg} ${t.color}`}>
            {t.icon} {t.label}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['labs', 'courses'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'labs' ? 'Labs' : 'Courses'}
          </button>
        ))}
      </div>

      {tab === 'labs'    && <LabsTrackTable    locale={locale} />}
      {tab === 'courses' && <CoursesTrackTable locale={locale} />}
    </div>
  );
}

// ─── Labs table ───────────────────────────────────────────────────────────────

function LabsTrackTable({ locale: _locale }: { locale: string }) {
  const queryClient = useQueryClient();
  const { data: labs = [], isLoading } = useQuery({
    queryKey: adminTrackKeys.labs,
    queryFn: getAdminLabs,
  });

  const updateMut = useMutation({
    mutationFn: ({ slug, track }: { slug: string; track: Track | null }) =>
      updateLab(slug, { track: track ?? undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminTrackKeys.labs }),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTrack, setBulkTrack] = useState<Track | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const allSelected = labs.length > 0 && selected.size === labs.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(labs.map((l) => l.slug)));
  const toggleOne = (slug: string) =>
    setSelected((s) => { const n = new Set(s); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });

  const applyBulk = async () => {
    if (!selected.size) return;
    setSaving(true);
    try {
      await Promise.all(
        [...selected].map((slug) => updateMut.mutateAsync({ slug, track: bulkTrack }))
      );
      setToast({ type: 'ok', msg: `Track updated for ${selected.size} lab(s)` });
      setSelected(new Set());
    } catch {
      setToast({ type: 'err', msg: 'Some updates failed — check console' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <TrackSelect current={bulkTrack} onChange={setBulkTrack} />
          <Button size="sm" onClick={applyBulk} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Apply to selected
          </Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-400 hover:text-slate-700">
            Clear
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${toast.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {toast.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 w-10">
                <button type="button" onClick={toggleAll} className="flex items-center">
                  {allSelected
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4 text-slate-400" />}
                </button>
              </th>
              <th className="text-left p-4 font-medium text-slate-600">Lab</th>
              <th className="text-left p-4 font-medium text-slate-600">Provider</th>
              <th className="text-left p-4 font-medium text-slate-600">Current Track</th>
              <th className="text-left p-4 font-medium text-slate-600">Set Track</th>
            </tr>
          </thead>
          <tbody>
            {labs.map((lab) => (
              <LabRow
                key={lab.slug}
                lab={lab}
                checked={selected.has(lab.slug)}
                onCheck={() => toggleOne(lab.slug)}
                onUpdate={(track) => updateMut.mutate({ slug: lab.slug, track })}
                saving={updateMut.isPending && updateMut.variables?.slug === lab.slug}
              />
            ))}
          </tbody>
        </table>
        {labs.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">No labs found.</div>
        )}
      </div>
    </div>
  );
}

function LabRow({
  lab, checked, onCheck, onUpdate, saving,
}: {
  lab: LabDto; checked: boolean; onCheck: () => void;
  onUpdate: (t: Track | null) => void; saving: boolean;
}) {
  return (
    <tr className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${checked ? 'bg-primary/5' : ''}`}>
      <td className="p-4">
        <button type="button" onClick={onCheck}>
          {checked ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-slate-300" />}
        </button>
      </td>
      <td className="p-4">
        <div className="font-medium text-slate-900 line-clamp-1">{lab.title ?? lab.slug}</div>
        <div className="text-xs text-slate-400 font-mono">{lab.slug}</div>
      </td>
      <td className="p-4 text-slate-600 text-xs">{lab.provider ?? '—'}</td>
      <td className="p-4"><TrackBadge track={lab.track as Track | null} /></td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <TrackSelect current={lab.track as Track | null} onChange={onUpdate} disabled={saving} />
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
        </div>
      </td>
    </tr>
  );
}

// ─── Courses table ─────────────────────────────────────────────────────────────

function CoursesTrackTable({ locale: _locale }: { locale: string }) {
  const queryClient = useQueryClient();

  // Fetch all courses (large limit to avoid pagination on this management page)
  const { data: paginatedData, isLoading } = useQuery({
    queryKey: adminTrackKeys.courses,
    queryFn: () => getAdminCourses(undefined, { page: 1, limit: 200 }),
  });
  const courses = paginatedData?.data ?? [];

  const updateMut = useMutation({
    mutationFn: ({ id, track }: { id: number | string; track: Track | null }) =>
      updateAdminCourse(id, { track: track ?? undefined } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminTrackKeys.courses }),
  });

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTrack, setBulkTrack] = useState<Track | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const allSelected = courses.length > 0 && selected.size === courses.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(courses.map((c) => c.id)));
  const toggleOne = (id: number) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const applyBulk = async () => {
    if (!selected.size) return;
    setSaving(true);
    try {
      await Promise.all(
        [...selected].map((id) => updateMut.mutateAsync({ id, track: bulkTrack }))
      );
      setToast({ type: 'ok', msg: `Track updated for ${selected.size} course(s)` });
      setSelected(new Set());
    } catch {
      setToast({ type: 'err', msg: 'Some updates failed — check console' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <TrackSelect current={bulkTrack} onChange={setBulkTrack} />
          <Button size="sm" onClick={applyBulk} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Apply to selected
          </Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-400 hover:text-slate-700">
            Clear
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${toast.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {toast.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 w-10">
                <button type="button" onClick={toggleAll}>
                  {allSelected
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4 text-slate-400" />}
                </button>
              </th>
              <th className="text-left p-4 font-medium text-slate-600">Course</th>
              <th className="text-left p-4 font-medium text-slate-600">Level</th>
              <th className="text-left p-4 font-medium text-slate-600">Current Track</th>
              <th className="text-left p-4 font-medium text-slate-600">Set Track</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                checked={selected.has(course.id)}
                onCheck={() => toggleOne(course.id)}
                onUpdate={(track) => updateMut.mutate({ id: course.id, track })}
                saving={updateMut.isPending && updateMut.variables?.id === course.id}
              />
            ))}
          </tbody>
        </table>
        {courses.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">No courses found.</div>
        )}
      </div>
    </div>
  );
}

function CourseRow({
  course, checked, onCheck, onUpdate, saving,
}: {
  course: AdminCourseListItem; checked: boolean; onCheck: () => void;
  onUpdate: (t: Track | null) => void; saving: boolean;
}) {
  return (
    <tr className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${checked ? 'bg-primary/5' : ''}`}>
      <td className="p-4">
        <button type="button" onClick={onCheck}>
          {checked ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-slate-300" />}
        </button>
      </td>
      <td className="p-4">
        <div className="font-medium text-slate-900 line-clamp-1">{course.title}</div>
        <div className="text-xs text-slate-400 font-mono">{course.courseId}</div>
      </td>
      <td className="p-4 text-slate-600 text-xs">{course.level ?? '—'}</td>
      <td className="p-4"><TrackBadge track={course.track as Track | null} /></td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <TrackSelect current={course.track as Track | null} onChange={onUpdate} disabled={saving} />
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
        </div>
      </td>
    </tr>
  );
}

// ─── Shared skeleton ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-pulse">
      <div className="h-12 bg-slate-50 border-b border-slate-200" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 border-t border-slate-100 flex items-center px-4 gap-4">
          <div className="h-4 w-4 rounded bg-slate-200" />
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="h-4 w-16 rounded bg-slate-200 ml-auto" />
        </div>
      ))}
    </div>
  );
}

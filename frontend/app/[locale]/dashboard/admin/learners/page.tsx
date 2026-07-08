'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { useToast, Button } from '@/components/ui';
import { useAdminLearners, useBulkAssignContent } from '@/hooks/api/useAdminLearners';
import { LearnerContentType } from '@/services/adminLearners';

const DEFAULT_PAGE_SIZE = 20;

export default function AdminLearnersPage() {
  const { locale } = useParams<{ locale: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [track, setTrack] = useState('all');
  const [plan, setPlan] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [bulkType, setBulkType] = useState<LearnerContentType>('course');
  const [bulkRef, setBulkRef] = useState('');
  const [bulkNote, setBulkNote] = useState('');

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      search: search || undefined,
      track: track !== 'all' ? track : undefined,
      plan: plan !== 'all' ? plan : undefined,
    }),
    [search, track, plan],
  );

  const { data, isLoading, isFetching } = useAdminLearners(queryParams);
  const bulkAssign = useBulkAssignContent();
  const learners = data?.data ?? [];

  const toggleUser = (id: number) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllVisible = () => {
    if (!learners.length) return;
    const allVisibleSelected = learners.every((l) => selectedUserIds.includes(l.id));
    if (allVisibleSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !learners.some((l) => l.id === id)));
      return;
    }
    setSelectedUserIds((prev) => [...new Set([...prev, ...learners.map((l) => l.id)])]);
  };

  const handleBulkAssign = async () => {
    if (!selectedUserIds.length || !bulkRef.trim()) {
      showToast(String(t('admin.learners.bulkAssignValidation') || 'Select learners and content ID'), 'warning');
      return;
    }
    try {
      const result = await bulkAssign.mutateAsync({
        userIds: selectedUserIds,
        contentType: bulkType,
        contentRef: bulkRef.trim(),
        note: bulkNote.trim() || undefined,
      });
      showToast(
        `${t('admin.learners.bulkAssignSuccess') as string} (${result.assigned} assigned, ${result.skipped} skipped)`,
        'success',
      );
      setBulkRef('');
      setBulkNote('');
    } catch {
      showToast(String(t('errors.somethingWentWrong')), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{String(t('admin.learners.title') || 'Learner Management')}</h1>
        {isFetching && <span className="text-sm text-muted-foreground">{String(t('common.loading'))}</span>}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          className="rounded-lg border border-border px-3 py-2"
          placeholder={String(t('admin.learners.search') || 'Search learners...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-lg border border-border px-3 py-2" value={track} onChange={(e) => setTrack(e.target.value)}>
          <option value="all">{String(t('common.all'))}</option>
          <option value="cloud">Cloud</option>
          <option value="cyber">Cyber</option>
          <option value="ai">AI</option>
        </select>
        <select className="rounded-lg border border-border px-3 py-2" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="all">{String(t('common.all'))}</option>
          <option value="free">Free</option>
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
        </select>
        <Button variant="outline" onClick={() => { setSearch(''); setTrack('all'); setPlan('all'); }}>
          {String(t('common.reset') || 'Reset')}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{String(t('admin.learners.bulkAssign') || 'Bulk Assign')}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            className="rounded-lg border border-border px-3 py-2"
            value={bulkType}
            onChange={(e) => setBulkType(e.target.value as LearnerContentType)}
          >
            <option value="course">{String(t('admin.learners.course') || 'Course')}</option>
            <option value="lab">{String(t('admin.learners.lab') || 'Lab')}</option>
            <option value="certification">{String(t('admin.learners.certification') || 'Certification')}</option>
          </select>
          <input
            className="rounded-lg border border-border px-3 py-2"
            placeholder={String(t('admin.learners.contentRef') || 'Content ID / Slug')}
            value={bulkRef}
            onChange={(e) => setBulkRef(e.target.value)}
          />
          <input
            className="rounded-lg border border-border px-3 py-2"
            placeholder={String(t('admin.learners.note') || 'Note (optional)')}
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
          />
          <Button onClick={handleBulkAssign} disabled={bulkAssign.isPending}>
            {String(t('admin.learners.bulkAssign') || 'Bulk Assign')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={learners.length > 0 && learners.every((l) => selectedUserIds.includes(l.id))}
                  onChange={toggleAllVisible}
                />
              </th>
              <th className="p-3 text-left">{String(t('common.name'))}</th>
              <th className="p-3 text-left">{String(t('common.email'))}</th>
              <th className="p-3 text-left">{String(t('admin.learners.track') || 'Track')}</th>
              <th className="p-3 text-left">{String(t('admin.learners.plan') || 'Plan')}</th>
              <th className="p-3 text-left">{String(t('admin.learners.completedCourses') || 'Completed')}</th>
              <th className="p-3 text-left">{String(t('admin.learners.lastActive') || 'Last Active')}</th>
              <th className="p-3 text-left">{String(t('common.actions'))}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="p-4" colSpan={8}>{String(t('common.loading'))}</td></tr>
            ) : learners.length === 0 ? (
              <tr><td className="p-4 text-muted-foreground" colSpan={8}>{String(t('common.noData'))}</td></tr>
            ) : (
              learners.map((learner) => (
                <tr key={learner.id} className="border-b border-border/60">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(learner.id)}
                      onChange={() => toggleUser(learner.id)}
                    />
                  </td>
                  <td className="p-3">{learner.fullName}</td>
                  <td className="p-3">{learner.email}</td>
                  <td className="p-3">{learner.track ?? '-'}</td>
                  <td className="p-3">{learner.effectivePlanSlug}</td>
                  <td className="p-3">{learner.completedCoursesCount}</td>
                  <td className="p-3">{learner.lastActiveAt ? new Date(learner.lastActiveAt).toLocaleString() : '-'}</td>
                  <td className="p-3">
                    <Link className="text-primary underline-offset-4 hover:underline" href={`/${locale}/dashboard/admin/learners/${learner.id}`}>
                      {String(t('common.view'))}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

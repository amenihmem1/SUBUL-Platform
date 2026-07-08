'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, useToast } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAdminLearner, useAssignContent, useRemoveAssignment } from '@/hooks/api/useAdminLearners';
import { LearnerContentType } from '@/services/adminLearners';

export default function AdminLearnerDetailPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const userId = useMemo(() => Number.parseInt(id, 10), [id]);
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [contentType, setContentType] = useState<LearnerContentType>('course');
  const [contentRef, setContentRef] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');

  const { data, isLoading } = useAdminLearner(userId);
  const assignContent = useAssignContent(userId);
  const removeAssignment = useRemoveAssignment(userId);

  const handleAssign = async () => {
    if (!contentRef.trim()) {
      showToast(String(t('admin.learners.assignValidation') || 'Content reference is required'), 'warning');
      return;
    }
    try {
      await assignContent.mutateAsync({
        contentType,
        contentRef: contentRef.trim(),
        expiresAt: expiresAt || undefined,
        note: note || undefined,
      });
      showToast(String(t('admin.learners.assignSuccess') || 'Content assigned successfully'), 'success');
      setContentRef('');
      setExpiresAt('');
      setNote('');
    } catch {
      showToast(String(t('errors.somethingWentWrong')), 'error');
    }
  };

  const handleRemove = async (assignmentId: number) => {
    try {
      await removeAssignment.mutateAsync(assignmentId);
      showToast(String(t('admin.learners.removeSuccess') || 'Assignment removed'), 'success');
    } catch {
      showToast(String(t('errors.somethingWentWrong')), 'error');
    }
  };

  if (isLoading) {
    return <div>{String(t('common.loading'))}</div>;
  }

  if (!data) {
    return <div>{String(t('errors.notFound'))}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.fullName}</h1>
          <p className="text-muted-foreground">{data.email}</p>
        </div>
        <Link href={`/${locale}/dashboard/admin/learners`} className="text-sm text-primary hover:underline">
          {String(t('common.back'))}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={String(t('admin.learners.enrolledCourses') || 'Enrolled courses')} value={data.stats.enrolledCourses} />
        <StatCard label={String(t('admin.learners.completedCourses') || 'Completed courses')} value={data.stats.completedCourses} />
        <StatCard label={String(t('admin.learners.completedLabs') || 'Completed labs')} value={data.stats.labsCompleted} />
        <StatCard label={String(t('admin.learners.certificates') || 'Certificates')} value={data.stats.certificates} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{String(t('admin.learners.assign') || 'Assign content')}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <select
            className="rounded-lg border border-border px-3 py-2"
            value={contentType}
            onChange={(e) => setContentType(e.target.value as LearnerContentType)}
          >
            <option value="course">{String(t('admin.learners.course') || 'Course')}</option>
            <option value="lab">{String(t('admin.learners.lab') || 'Lab')}</option>
            <option value="certification">{String(t('admin.learners.certification') || 'Certification')}</option>
          </select>
          <input
            className="rounded-lg border border-border px-3 py-2"
            placeholder={String(t('admin.learners.contentRef') || 'Content ID / Slug')}
            value={contentRef}
            onChange={(e) => setContentRef(e.target.value)}
          />
          <input
            type="date"
            className="rounded-lg border border-border px-3 py-2"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <input
            className="rounded-lg border border-border px-3 py-2"
            placeholder={String(t('admin.learners.note') || 'Note (optional)')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button onClick={handleAssign} disabled={assignContent.isPending}>
            {String(t('admin.learners.assign') || 'Assign')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="p-3 text-left">{String(t('admin.learners.contentType') || 'Type')}</th>
              <th className="p-3 text-left">{String(t('admin.learners.contentRef') || 'Content')}</th>
              <th className="p-3 text-left">{String(t('admin.learners.expiresAt') || 'Expires')}</th>
              <th className="p-3 text-left">{String(t('admin.learners.note') || 'Note')}</th>
              <th className="p-3 text-left">{String(t('common.actions'))}</th>
            </tr>
          </thead>
          <tbody>
            {data.assignments.length === 0 ? (
              <tr><td className="p-4 text-muted-foreground" colSpan={5}>{String(t('common.noData'))}</td></tr>
            ) : (
              data.assignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-border/60">
                  <td className="p-3">{assignment.contentType}</td>
                  <td className="p-3">{assignment.contentRef}</td>
                  <td className="p-3">{assignment.expiresAt ? new Date(assignment.expiresAt).toLocaleString() : '-'}</td>
                  <td className="p-3">{assignment.note ?? '-'}</td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(assignment.id)}
                      disabled={removeAssignment.isPending}
                    >
                      {String(t('common.delete'))}
                    </Button>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui';
import {
  createAdminPracticeExam,
  deleteAdminPracticeExam,
  getAdminPracticeExams,
  importPracticeExamsJson,
  updateAdminPracticeExam,
} from '@/services/practice-exams';
import { ImportResultPanel, type ImportResultLike } from '@/components/admin/import/ImportResultPanel';
import { IndexingBanner } from '@/components/admin/import/IndexingBanner';
import { PRACTICE_EXAMS_TEMPLATE, downloadJson } from '@/components/admin/import/import-templates';
import { Download } from 'lucide-react';

export default function AdminContentPracticeExamsPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResultLike | null>(null);
  const [showIndexingBanner, setShowIndexingBanner] = useState(false);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-content-practice-exams'],
    queryFn: () => getAdminPracticeExams({ page: 1, limit: 100 }),
  });
  const rows = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminPracticeExam({
        slug,
        title,
        description,
        status: 'draft',
        questions: [{ prompt: 'Sample question', options: ['A', 'B'], correct: ['A'] }],
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-content-practice-exams'] });
      setSlug('');
      setTitle('');
      setDescription('');
      showToast('Practice exam created.', 'success');
    },
  });

  const runImport = async (dryRun: boolean) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showToast('Choose a JSON file first.', 'error');
      return;
    }
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload)) {
        showToast('Practice exams payload must be an array.', 'error');
        return;
      }
      const res = await importPracticeExamsJson(payload, dryRun);
      setImportResult(res as ImportResultLike);
      if (!dryRun) {
        await qc.invalidateQueries({ queryKey: ['admin-content-practice-exams'] });
        setShowIndexingBanner(true);
      }
    } catch (err: any) {
      showToast(err?.message ?? 'Import failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Practice Exams</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Practice Exam</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Input placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !slug || !title}>
            Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Import Practice Exams JSON</CardTitle>
          <Button variant="outline" size="sm" onClick={() => downloadJson('subul-practice-exams-template.json', PRACTICE_EXAMS_TEMPLATE)}>
            <Download className="h-4 w-4 mr-2" /> Template
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input ref={fileInputRef} type="file" accept="application/json" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runImport(true)}>Preview (dry-run)</Button>
            <Button onClick={() => runImport(false)}>Import</Button>
          </div>
          <ImportResultPanel result={importResult} />
          <IndexingBanner visible={showIndexingBanner} onClose={() => setShowIndexingBanner(false)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Practice Exams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((row: any) => (
            <div key={row.slug} className="rounded border p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">{row.slug}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await updateAdminPracticeExam(row.slug, { status: row.status === 'published' ? 'draft' : 'published' });
                    await qc.invalidateQueries({ queryKey: ['admin-content-practice-exams'] });
                  }}
                >
                  {row.status === 'published' ? 'Unpublish' : 'Publish'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await deleteAdminPracticeExam(row.slug);
                    await qc.invalidateQueries({ queryKey: ['admin-content-practice-exams'] });
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

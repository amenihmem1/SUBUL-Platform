'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui';
import { importCertificationPathsJson } from '@/services/content-import';
import { ImportResultPanel, type ImportResultLike } from '@/components/admin/import/ImportResultPanel';
import { IndexingBanner } from '@/components/admin/import/IndexingBanner';
import { CERTIFICATION_PATHS_TEMPLATE, downloadJson } from '@/components/admin/import/import-templates';
import { Download } from 'lucide-react';

export default function AdminContentCertificationPathsPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResultLike | null>(null);
  const [showIndexingBanner, setShowIndexingBanner] = useState(false);

  const runImport = async (dryRun: boolean) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showToast('Choose a JSON file first.', 'error');
      return;
    }
    try {
      const rawPayload = JSON.parse(await file.text());
      const normalizedPaths = (
        Array.isArray(rawPayload)
          ? rawPayload
          : rawPayload && typeof rawPayload === 'object' && Array.isArray((rawPayload as { paths?: unknown }).paths)
            ? (rawPayload as { paths: unknown[] }).paths
            : null
      )?.map((entry) => {
        const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
        const certificationObj =
          row.certification && typeof row.certification === 'object'
            ? (row.certification as Record<string, unknown>)
            : null;

        const certificationExternalId =
          (typeof row.certificationExternalId === 'string' && row.certificationExternalId) ||
          (typeof row.certification_external_id === 'string' && row.certification_external_id) ||
          (typeof row.externalId === 'string' && row.externalId) ||
          (typeof certificationObj?.externalId === 'string' && certificationObj.externalId) ||
          undefined;

        const certificationId =
          typeof row.certificationId === 'number'
            ? row.certificationId
            : typeof row.certification_id === 'number'
              ? row.certification_id
              : typeof certificationObj?.id === 'number'
                ? certificationObj.id
                : undefined;

        return {
          ...row,
          certificationExternalId,
          certificationId,
        };
      });

      const payload = normalizedPaths ? { paths: normalizedPaths } : null;

      if (!payload) {
        showToast('Invalid certification paths JSON. Expected { "paths": [...] } or a raw array of path objects.', 'error');
        return;
      }

      const res = await importCertificationPathsJson(payload, dryRun);
      setImportResult(res as ImportResultLike);
      if (!dryRun) setShowIndexingBanner(true);
    } catch (err: any) {
      showToast(err?.message ?? 'Import failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Certification Paths</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Import Certification Paths JSON</CardTitle>
          <Button variant="outline" size="sm" onClick={() => downloadJson('subul-certification-paths-template.json', CERTIFICATION_PATHS_TEMPLATE)}>
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
    </div>
  );
}

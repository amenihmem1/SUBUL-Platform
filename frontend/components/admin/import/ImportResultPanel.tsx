'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

type EntityCounts = { created?: number; updated?: number; skipped?: number };

export interface ImportResultLike {
  dryRun?: boolean;
  // Nested (courses-json) shape
  import?: {
    mode?: string;
    sourceVersion?: string;
    certifications?: EntityCounts;
    courses?: EntityCounts;
    modules?: EntityCounts;
    lessons?: EntityCounts;
    quizzes?: EntityCounts;
    labs?: EntityCounts;
    errors?: Array<{ path: string; message: string }>;
  };
  // Flat (labs / cert-flat) shape
  created?: number;
  updated?: number;
  skipped?: number;
  paths?: EntityCounts;
  steps?: EntityCounts;
  exams?: EntityCounts;
  questions?: EntityCounts;
  errors?: Array<{ index?: number; slug?: string; externalId?: string; reason?: string; path?: string; message?: string }>;
  indexing?: { status: 'pending' | 'completed' | 'failed'; details?: unknown };
}

const ROW_DEFS: Array<[keyof NonNullable<ImportResultLike['import']>, string]> = [
  ['certifications', 'Certifications'],
  ['courses', 'Courses'],
  ['modules', 'Modules'],
  ['lessons', 'Lessons'],
  ['quizzes', 'Quizzes'],
  ['labs', 'Course labs'],
];

function CountCell({ value, tone }: { value?: number; tone: 'created' | 'updated' | 'skipped' }) {
  const v = value ?? 0;
  const cls =
    v === 0
      ? 'text-slate-400'
      : tone === 'created'
        ? 'text-emerald-600 font-semibold'
        : tone === 'updated'
          ? 'text-blue-600 font-semibold'
          : 'text-amber-600 font-semibold';
  return <span className={cls}>{v}</span>;
}

export function ImportResultPanel({ result }: { result: ImportResultLike | null }) {
  if (!result) return null;

  const isNested = !!result.import;
  const dryRun = result.dryRun ?? result.import?.mode === 'admin_upsert' ? result.dryRun : result.dryRun;

  const errors = isNested
    ? result.import?.errors ?? []
    : (result.errors ?? []).map((e) => ({
        path: e.path ?? (e.slug ? `labs[${e.slug}]` : e.externalId ? `certifications[${e.externalId}]` : `items[${e.index ?? '?'}]`),
        message: e.message ?? e.reason ?? 'Unknown error',
      }));

  const totalRows: Array<{ label: string; counts: EntityCounts }> = isNested
    ? ROW_DEFS.map(([key, label]) => ({ label, counts: (result.import?.[key] ?? {}) as EntityCounts }))
    : result.paths || result.steps || result.exams || result.questions
      ? [
          ...(result.paths ? [{ label: 'Paths', counts: result.paths }] : []),
          ...(result.steps ? [{ label: 'Path steps', counts: result.steps }] : []),
          ...(result.exams ? [{ label: 'Practice exams', counts: result.exams }] : []),
          ...(result.questions ? [{ label: 'Exam questions', counts: result.questions }] : []),
        ]
    : [
        {
          label: 'Items',
          counts: {
            created: result.created ?? 0,
            updated: result.updated ?? 0,
            skipped: result.skipped ?? 0,
          },
        },
      ];

  const totals = totalRows.reduce(
    (acc, row) => {
      acc.created += row.counts.created ?? 0;
      acc.updated += row.counts.updated ?? 0;
      acc.skipped += row.counts.skipped ?? 0;
      return acc;
    },
    { created: 0, updated: 0, skipped: 0 },
  );

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {dryRun ? (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
            <Info className="w-3 h-3 mr-1" /> Dry-run preview (no DB writes)
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Import committed
          </Badge>
        )}
        <span className="text-xs text-slate-500">
          {totals.created} created · {totals.updated} updated · {totals.skipped} skipped
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-2.5 font-medium">Entity</th>
              <th className="text-right p-2.5 font-medium">Created</th>
              <th className="text-right p-2.5 font-medium">Updated</th>
              <th className="text-right p-2.5 font-medium">Skipped</th>
            </tr>
          </thead>
          <tbody>
            {totalRows.map((row) => (
              <tr key={row.label} className="border-t border-slate-100">
                <td className="p-2.5 text-slate-800">{row.label}</td>
                <td className="p-2.5 text-right tabular-nums"><CountCell value={row.counts.created} tone="created" /></td>
                <td className="p-2.5 text-right tabular-nums"><CountCell value={row.counts.updated} tone="updated" /></td>
                <td className="p-2.5 text-right tabular-nums"><CountCell value={row.counts.skipped} tone="skipped" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
            <AlertCircle className="w-4 h-4" />
            {errors.length} validation issue{errors.length === 1 ? '' : 's'}
          </div>
          <ul className="space-y-1 max-h-56 overflow-y-auto pr-2 text-xs font-mono">
            {errors.map((err, i) => (
              <li key={`${err.path}-${i}`} className="text-amber-900">
                <span className="text-amber-700">{err.path || '$'}</span>
                <span className="text-amber-500"> — </span>
                <span>{err.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ImportResultPanel;

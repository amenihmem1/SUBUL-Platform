'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAdminContentIndexerStatus,
  useRunAdminContentIndexerSync,
} from '@/hooks/api/useAdminContentIndexer';

type LocalState = 'idle' | 'running' | 'done' | 'failed' | 'dismissed';

/**
 * Shown after a successful (non-dryRun) content import.
 * Asks the admin whether they want to push freshly-imported content into
 * Azure Cognitive Search so the AI Tutor can retrieve it.
 *
 * `visible` is controlled by the parent so it appears only after a
 * successful import; the parent should set it back to false on next import.
 */
export function IndexingBanner({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose?: () => void;
}) {
  const { data: status } = useAdminContentIndexerStatus();
  const sync = useRunAdminContentIndexerSync();
  const [local, setLocal] = useState<LocalState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!visible || local === 'dismissed') return null;

  const pendingTotal = status?.pending?.total ?? 0;

  const handleSync = async () => {
    setLocal('running');
    setErrorMsg(null);
    try {
      await sync.mutateAsync(false);
      setLocal('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sync failed');
      setLocal('failed');
    }
  };

  const dismiss = () => {
    setLocal('dismissed');
    onClose?.();
  };

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-fuchsia-50 to-purple-50 p-4 flex items-start gap-3">
      <div className="rounded-lg bg-purple-100 p-2 text-purple-700 shrink-0">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-purple-900">
            Content imported successfully. AI Tutor indexing is pending.
          </p>
          <button
            onClick={dismiss}
            className="text-purple-400 hover:text-purple-700"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-purple-700">
          {pendingTotal > 0
            ? `${pendingTotal} item${pendingTotal === 1 ? '' : 's'} waiting to be indexed in Azure Cognitive Search.`
            : 'Run sync to make the new content searchable by the AI Tutor.'}
        </p>

        {local === 'idle' && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={handleSync} disabled={sync.isPending}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sync now
            </Button>
            <Button size="sm" variant="outline" onClick={dismiss}>
              Later
            </Button>
          </div>
        )}

        {local === 'running' && (
          <div className="flex items-center gap-2 text-xs text-purple-700 font-medium">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Indexing started…
          </div>
        )}

        {local === 'done' && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Indexed successfully. The AI Tutor knows about the new content now.
          </div>
        )}

        {local === 'failed' && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-red-700 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" /> Indexing failed.
            </div>
            {errorMsg && <p className="text-xs text-red-600 font-mono">{errorMsg}</p>}
            <Button size="sm" variant="outline" onClick={handleSync}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry sync
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default IndexingBanner;

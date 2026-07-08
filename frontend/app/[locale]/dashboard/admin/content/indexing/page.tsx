'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui';
import {
  useAdminContentIndexerStatus,
  useRunAdminContentIndexerSync,
  useAdminCoursesIndexStatus,
  useAdminLabsIndexStatus,
  useAdminCertificationsIndexStatus,
  useReindexCourse,
  useReindexLab,
  useReindexCertification,
  useTestRetrievalCourse,
  useTestRetrievalLab,
  useTestRetrievalCertification,
} from '@/hooks/api/useAdminContentIndexer';
import type { RetrievalTestResult, ReindexResult } from '@/services/content-indexer-admin';
import {
  Loader2, RefreshCw, Search, AlertTriangle, CheckCircle2,
  BookOpen, FlaskConical, Award, Zap, Database, Clock,
  TrendingUp, XCircle, RotateCcw, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkeletonBlock } from '@/components/ui/loading';

// ─── Types ───────────────────────────────────────────────────────────────────

type TestScope = 'course' | 'lab' | 'certification';
interface TestState {
  open: boolean;
  scope: TestScope;
  scopeKey: string;
  scopeLabel: string;
  query: string;
  loading: boolean;
  result: RetrievalTestResult | null;
  error?: string;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminContentIndexingPage() {
  const { showToast } = useToast();
  const { data: status, isLoading: statusLoading } = useAdminContentIndexerStatus();
  const syncMutation = useRunAdminContentIndexerSync();

  const [test, setTest] = useState<TestState>({
    open: false, scope: 'course', scopeKey: '', scopeLabel: '',
    query: '', loading: false, result: null,
  });

  const openTest = (scope: TestScope, key: string, title: string) =>
    setTest({ open: true, scope, scopeKey: key, scopeLabel: title, query: title, loading: false, result: null });

  const reportReindexResult = (label: string, r: ReindexResult) => {
    if (r.ok) {
      showToast(`✅ ${label} indexé — ${r.uploaded} chunks en ${Math.round(r.durationMs / 100) / 10}s`, 'success');
    } else {
      showToast(`❌ Échec d'indexation : ${label} — ${r.error ?? 'erreur inconnue'}`, 'error');
    }
  };

  const handleSync = (force: boolean) => {
    syncMutation.mutate(force, {
      onSuccess: () => showToast(force ? '✅ Synchronisation complète terminée' : '✅ Synchronisation incrémentale terminée', 'success'),
      onError: (e) => showToast(`❌ Sync échouée : ${e instanceof Error ? e.message : 'erreur inconnue'}`, 'error'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <HeroHeader status={status} isLoading={statusLoading} onSync={handleSync} isSyncing={syncMutation.isPending} />

      {/* Content tabs */}
      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 h-auto gap-1">
          <TabsTrigger value="courses" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-none">
            <BookOpen className="h-4 w-4" />Cours
          </TabsTrigger>
          <TabsTrigger value="labs" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-none">
            <FlaskConical className="h-4 w-4" />Labs
          </TabsTrigger>
          <TabsTrigger value="certifications" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-none">
            <Award className="h-4 w-4" />Certifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <ContentTable
            type="course"
            onTest={(key, title) => openTest('course', key, title)}
            reportReindexResult={reportReindexResult}
          />
        </TabsContent>
        <TabsContent value="labs">
          <ContentTable
            type="lab"
            onTest={(key, title) => openTest('lab', key, title)}
            reportReindexResult={reportReindexResult}
          />
        </TabsContent>
        <TabsContent value="certifications">
          <ContentTable
            type="certification"
            onTest={(key, title) => openTest('certification', key, title)}
            reportReindexResult={reportReindexResult}
          />
        </TabsContent>
      </Tabs>

      <TestRetrievalDialog state={test} setState={setTest} onClose={() => setTest((s) => ({ ...s, open: false }))} />
    </div>
  );
}

// ─── Hero header ──────────────────────────────────────────────────────────────

function HeroHeader({
  status,
  isLoading,
  onSync,
  isSyncing,
}: {
  status: any;
  isLoading: boolean;
  onSync: (force: boolean) => void;
  isSyncing: boolean;
}) {
  const pendingTotal = status?.pending?.total ?? 0;
  const totalItems =
    (status?.pending?.courses ?? 0) +
    (status?.pending?.labs ?? 0) +
    (status?.pending?.certifications ?? 0) +
    (status?.indexed?.total ?? 0);

  const indexedTotal = status?.indexed?.total ?? 0;
  const pct = totalItems > 0 ? Math.round((indexedTotal / totalItems) * 100) : 0;
  const hasEmbeddingsError = status?.embeddingsConfigured === false;
  const hasSchemaError = status?.schema?.checked === false;
  const hasWarning = hasEmbeddingsError || hasSchemaError;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      {/* Top gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500" />

      <div className="px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: title + meta */}
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Base de connaissances IA</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Gestion de l&apos;indexation Azure Cognitive Search pour le tuteur IA
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-400">
                  Dernière sync :{' '}
                  {isLoading ? '…' : status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('fr-FR') : 'Jamais'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={() => onSync(false)}
              disabled={isSyncing || hasEmbeddingsError}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Sync maintenant
            </Button>
            <Button
              variant="outline"
              onClick={() => onSync(true)}
              disabled={isSyncing || hasEmbeddingsError}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Sync complète
            </Button>
          </div>
        </div>

        {/* Warnings */}
        <AnimatePresence>
          {hasWarning && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex flex-wrap gap-2"
            >
              {hasEmbeddingsError && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Embeddings non configurés — vérifiez TUTOR_AZURE_OPENAI_* dans le .env et docker-compose.yml
                </div>
              )}
              {hasSchemaError && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Schéma d&apos;index non encore créé — lancez une sync complète
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats grid */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="En attente"
            value={isLoading ? '…' : String(pendingTotal)}
            icon={<TrendingUp className="h-4 w-4" />}
            color="amber"
            isLoading={isLoading}
          />
          <StatCard
            label="Cours"
            value={isLoading ? '…' : String(status?.pending?.courses ?? 0)}
            icon={<BookOpen className="h-4 w-4" />}
            color="violet"
            isLoading={isLoading}
          />
          <StatCard
            label="Labs"
            value={isLoading ? '…' : String(status?.pending?.labs ?? 0)}
            icon={<FlaskConical className="h-4 w-4" />}
            color="indigo"
            isLoading={isLoading}
          />
          <StatCard
            label="Certifications"
            value={isLoading ? '…' : String(status?.pending?.certifications ?? 0)}
            icon={<Award className="h-4 w-4" />}
            color="emerald"
            isLoading={isLoading}
          />
        </div>

        {/* Progress bar */}
        {!isLoading && totalItems > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">{pct}% indexé</span>
              <span className="text-xs text-slate-400">{indexedTotal} / {totalItems} éléments</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-violet-500' : 'bg-amber-500',
                )}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Recent errors */}
        {status?.lastErrors?.length ? (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" />Erreurs récentes
            </p>
            <ul className="space-y-1">
              {status.lastErrors.slice(-5).reverse().map((e: any, i: number) => (
                <li key={i} className="text-xs text-red-600">
                  <span className="font-mono bg-red-100 rounded px-1 mr-1">{e.scope}/{e.scopeKey}</span>
                  {e.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, isLoading,
}: {
  label: string; value: string; icon: React.ReactNode;
  color: 'violet' | 'indigo' | 'amber' | 'emerald'; isLoading: boolean;
}) {
  const colors = {
    violet: 'bg-violet-50 text-violet-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center gap-3">
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', colors[color])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        {isLoading ? (
          <div className="h-5 w-10 rounded bg-slate-200 animate-pulse mt-0.5" />
        ) : (
          <p className="text-lg font-bold text-slate-800 leading-none mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

// ─── Content table (courses / labs / certs) ───────────────────────────────────

type ContentTableType = 'course' | 'lab' | 'certification';

function ContentTable({
  type,
  onTest,
  reportReindexResult,
}: {
  type: ContentTableType;
  onTest: (key: string, title: string) => void;
  reportReindexResult: (label: string, r: ReindexResult) => void;
}) {
  const coursesQ = useAdminCoursesIndexStatus();
  const labsQ = useAdminLabsIndexStatus();
  const certsQ = useAdminCertificationsIndexStatus();
  const reindexCourse = useReindexCourse();
  const reindexLab = useReindexLab();
  const reindexCert = useReindexCertification();

  const { data, isLoading, refetch } =
    type === 'course' ? coursesQ : type === 'lab' ? labsQ : certsQ;

  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'indexed' | 'pending' | 'never' | 'error'>('all');

  const allRows = (data ?? []) as any[];

  const getKey = (r: any): string =>
    type === 'course' ? r.courseId : type === 'lab' ? r.slug : String(r.id);
  const getTitle = (r: any): string => r.title ?? r.slug ?? String(r.id);

  const reindexMutation = type === 'course' ? reindexCourse : type === 'lab' ? reindexLab : reindexCert;

  const filteredRows = useMemo(() => {
    let rows = allRows;
    const f = filter.trim().toLowerCase();
    if (f) {
      rows = rows.filter((r) => {
        const key = getKey(r).toLowerCase();
        const title = getTitle(r).toLowerCase();
        return title.includes(f) || key.includes(f);
      });
    }
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => {
        if (statusFilter === 'error') return !!r.lastError;
        if (statusFilter === 'indexed') return r.indexed && !r.pending && !r.lastError;
        if (statusFilter === 'pending') return r.pending;
        if (statusFilter === 'never') return !r.indexed;
        return true;
      });
    }
    return rows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, filter, statusFilter]);

  const stats = useMemo(() => ({
    indexed: allRows.filter((r) => r.indexed && !r.pending && !r.lastError).length,
    pending: allRows.filter((r) => r.pending).length,
    never: allRows.filter((r) => !r.indexed).length,
    error: allRows.filter((r) => !!r.lastError).length,
    total: allRows.length,
  }), [allRows]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="border-b border-slate-100 px-5 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder={type === 'course' ? 'Filtrer par titre ou course ID…' : type === 'lab' ? 'Filtrer par titre ou slug…' : 'Filtrer par titre ou fournisseur…'}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 border-slate-200 focus:border-violet-300 focus:ring-violet-100"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </Button>
        </div>

        {/* Status filter pills */}
        {!isLoading && allRows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'all', label: `Tous (${stats.total})` },
              { key: 'indexed', label: `✅ Indexés (${stats.indexed})` },
              { key: 'pending', label: `🟡 En attente (${stats.pending})` },
              { key: 'never', label: `⭕ Jamais (${stats.never})` },
              ...(stats.error > 0 ? [{ key: 'error', label: `❌ Erreur (${stats.error})` }] : []),
            ] as { key: typeof statusFilter; label: string }[]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setStatusFilter(opt.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === opt.key
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table body */}
      {isLoading ? (
        <div className="p-5">
          <SkeletonBlock rows={6} />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
          <Database className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Aucun élément trouvé</p>
          {filter && <p className="text-xs">Essayez un terme de recherche différent</p>}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredRows.map((r) => {
            const key = getKey(r);
            const title = getTitle(r);
            const isReindexing = reindexMutation.isPending && (reindexMutation.variables as any) === (type === 'certification' ? r.id : key);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors',
                  r.lastError && 'bg-red-50/30',
                )}
              >
                {/* Status dot */}
                <StatusDot indexed={r.indexed} pending={r.pending} hasError={!!r.lastError} />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 truncate">{title}</span>
                    <StatusBadge indexed={r.indexed} pending={r.pending} hasError={!!r.lastError} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs font-mono text-slate-400">{key}</span>
                    {r.documentCount > 0 && (
                      <span className="text-xs text-slate-400">{r.documentCount} chunks</span>
                    )}
                    {r.lastIndexedAt && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(r.lastIndexedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {r.lastError && (
                      <span className="text-xs text-red-600 truncate max-w-xs">{r.lastError}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      reindexMutation.mutate(
                        (type === 'certification' ? String((r as { id: unknown }).id) : key) as never,
                        { onSuccess: (res: ReindexResult) => reportReindexResult(title, res) },
                      )
                    }
                    disabled={isReindexing}
                    className="h-8 gap-1.5 text-xs border-slate-200 hover:border-violet-300 hover:text-violet-700"
                  >
                    {isReindexing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Re-indexer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onTest(key, title)}
                    className="h-8 gap-1.5 text-xs text-slate-500 hover:text-violet-700"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Tester
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!isLoading && filteredRows.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400 flex items-center justify-between">
          <span>{filteredRows.length} résultat{filteredRows.length > 1 ? 's' : ''}{filter ? ` pour "${filter}"` : ''}</span>
          <span>{stats.indexed} / {stats.total} indexés</span>
        </div>
      )}
    </div>
  );
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ indexed, pending, hasError }: { indexed: boolean; pending: boolean; hasError: boolean }) {
  if (hasError) return <div className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />;
  if (!indexed) return <div className="h-2.5 w-2.5 rounded-full bg-slate-300 shrink-0" />;
  if (pending) return <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />;
  return <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ indexed, pending, hasError }: { indexed: boolean; pending: boolean; hasError: boolean }) {
  if (hasError) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-semibold">
      <XCircle className="h-3 w-3" />Erreur
    </span>
  );
  if (!indexed) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-semibold">
      Jamais indexé
    </span>
  );
  if (pending) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Mise à jour en attente
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
      <CheckCircle2 className="h-3 w-3" />Indexé
    </span>
  );
}

// ─── Test retrieval dialog ────────────────────────────────────────────────────

function TestRetrievalDialog({
  state, setState, onClose,
}: {
  state: TestState;
  setState: React.Dispatch<React.SetStateAction<TestState>>;
  onClose: () => void;
}) {
  const courseM = useTestRetrievalCourse();
  const labM = useTestRetrievalLab();
  const certM = useTestRetrievalCertification();

  const run = async () => {
    setState((s) => ({ ...s, loading: true, result: null, error: undefined }));
    try {
      let res: RetrievalTestResult;
      if (state.scope === 'course') res = await courseM.mutateAsync({ courseId: state.scopeKey, query: state.query });
      else if (state.scope === 'lab') res = await labM.mutateAsync({ slug: state.scopeKey, query: state.query });
      else res = await certM.mutateAsync({ id: Number(state.scopeKey), query: state.query });
      setState((s) => ({ ...s, loading: false, result: res }));
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-violet-600" />
            Test de récupération
          </DialogTitle>
          <DialogDescription>
            Simule la recherche vectorielle du tuteur IA pour{' '}
            <strong className="text-slate-700">{state.scopeLabel}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Requête de test</label>
            <Textarea
              value={state.query}
              onChange={(e) => setState((s) => ({ ...s, query: e.target.value }))}
              rows={2}
              className="border-slate-200 focus:border-violet-300 text-sm"
              placeholder="Entrez une question comme un étudiant la poserait…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            <Button
              onClick={run}
              disabled={state.loading || !state.query.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Lancer le test
            </Button>
          </div>

          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {state.error}
            </div>
          )}

          {state.result && (
            <div className="space-y-3">
              <Verdict result={state.result} />
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Filtre :</span>
                <code className="bg-slate-100 rounded px-1.5 py-0.5">{state.result.filterApplied ?? '(aucun)'}</code>
                {state.result.fallbackUsed && (
                  <span className="text-amber-600">— recherche globale utilisée (contenu non scopé)</span>
                )}
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {state.result.results.map((r, i) => (
                  <div key={r.id ?? i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="flex justify-between text-slate-400 mb-1.5">
                      <span className="font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5">{r.id}</span>
                      <span className="font-semibold text-violet-600">score {r.score?.toFixed(3) ?? '—'}</span>
                    </div>
                    {r.sourceFile && (
                      <div className="font-mono text-[10px] text-slate-400 mb-1.5">{r.sourceFile}</div>
                    )}
                    <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">{r.snippet || '(vide)'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

function Verdict({ result }: { result: RetrievalTestResult }) {
  if (!result.indexHealthy) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Index ou embeddings non configurés</p>
          <p className="text-xs mt-0.5">Le tuteur ne peut pas récupérer de contenu.</p>
        </div>
      </div>
    );
  }
  if (result.totalReturned === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <XCircle className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Aucun contenu trouvé</p>
          <p className="text-xs mt-0.5">Le tuteur ne peut pas répondre — relancez l&apos;indexation.</p>
        </div>
      </div>
    );
  }
  if (result.fallbackUsed) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Réponse possible, mais sans scope</p>
          <p className="text-xs mt-0.5">Re-indexez pour activer la recherche scopée à ce contenu.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <CheckCircle2 className="h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Tuteur opérationnel</p>
        <p className="text-xs mt-0.5">{result.totalReturned} chunks scopés récupérés — réponses précises garanties.</p>
      </div>
    </div>
  );
}

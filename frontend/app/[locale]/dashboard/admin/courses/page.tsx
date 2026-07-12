'use client';

import { useRef, useState } from 'react';
import { GraduationCap, Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, TrendingUp, Download, ShieldCheck, Upload } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  useAdminCourses,
  useDeleteAdminCourse,
  useImportCoursesJson,
} from '@/hooks/api/useAdminCourses';
import { Card, useToast } from '@/components/ui';
import { CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { validateCoursesJson } from '@/services/admin-courses';
import { ImportResultPanel, type ImportResultLike } from '@/components/admin/import/ImportResultPanel';
import { IndexingBanner } from '@/components/admin/import/IndexingBanner';
import { COURSES_TEMPLATE, downloadJson } from '@/components/admin/import/import-templates';

const ITEMS_PER_PAGE = 10;

const coursesCopy = {
  fr: {
    courses: 'Cours',
    newCourse: 'Nouveau cours',
    totalCourses: 'Total des cours',
    deleteConfirm: 'Supprimer ce cours ? Tous les modules, lecons et labs associes seront supprimes.',
    chooseJson: 'Choisissez d abord un fichier JSON.',
    invalidJson: 'Fichier JSON invalide',
    parseError: 'Erreur de lecture JSON',
    validationOk: 'Validation OK - la structure JSON est valide.',
    validationIssues: 'probleme(s) de validation trouve(s).',
    validationFailed: 'La validation a echoue',
    previewGenerated: 'Apercu genere - verifiez les compteurs et erreurs ci-dessous.',
    importCommitted: 'Import effectue avec succes.',
    importFailed: 'Import echoue',
    templateDownloaded: 'Modele JSON des cours telecharge.',
    loadingError: 'Erreur lors du chargement des cours.',
    importTitle: 'Importer les cours / certifications JSON',
    importHelp: 'Meme structure imbriquee que certif_courses.json. Importez, validez, previsualisez, puis appliquez. Reimporter le meme fichier met a jour les elements existants sans duplication.',
    downloadTemplate: 'Telecharger le modele',
    validate: 'Valider',
    preview: 'Apercu (simulation)',
    import: 'Importer',
    noCourses: 'Aucun cours pour le moment',
    noCoursesHelp: 'Creez un cours pour le proposer aux apprenants. Vous pouvez ajouter modules, lecons et labs en une seule fois.',
    createCourse: 'Creer un cours',
    certifications: 'Certifications',
    course: 'Cours',
    level: 'Niveau',
    certificationId: 'ID certification',
    actions: 'Actions',
    showing: 'Affichage',
    of: 'sur',
    page: 'Page',
  },
  en: {
    courses: 'Courses',
    newCourse: 'New course',
    totalCourses: 'Total courses',
    deleteConfirm: 'Delete this course? All associated modules, lessons and labs will be removed.',
    chooseJson: 'Choose a JSON file first.',
    invalidJson: 'Invalid JSON file',
    parseError: 'JSON parse error',
    validationOk: 'Validation OK - JSON shape is valid.',
    validationIssues: 'validation issue(s) found.',
    validationFailed: 'Validation request failed',
    previewGenerated: 'Preview generated - review the counts and errors below.',
    importCommitted: 'Import committed successfully.',
    importFailed: 'Import failed',
    templateDownloaded: 'Courses JSON template downloaded.',
    loadingError: 'Error loading courses.',
    importTitle: 'Import Courses / Certifications JSON',
    importHelp: 'Same nested shape as certif_courses.json. Upload, validate, preview, then import. Re-importing the same file will update existing items, not duplicate them.',
    downloadTemplate: 'Download template',
    validate: 'Validate',
    preview: 'Preview (dry-run)',
    import: 'Import',
    noCourses: 'No courses yet',
    noCoursesHelp: 'Create a course to offer it to learners. You can add modules, lessons and labs in one go.',
    createCourse: 'Create course',
    certifications: 'Certifications',
    course: 'Course',
    level: 'Level',
    certificationId: 'Certification ID',
    actions: 'Actions',
    showing: 'Showing',
    of: 'of',
    page: 'Page',
  },
} as const;

export default function AdminCoursesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';
  const copy = coursesCopy[locale === 'fr' ? 'fr' : 'en'];
  const [currentPage, setCurrentPage] = useState(1);

  const { data: paginatedData, isLoading, isError } = useAdminCourses(undefined, currentPage, ITEMS_PER_PAGE);
  const deleteCourse = useDeleteAdminCourse();
  const importCourses = useImportCoursesJson();
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [importResult, setImportResult] = useState<ImportResultLike | null>(null);
  const [validating, setValidating] = useState(false);
  const [showIndexingBanner, setShowIndexingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const courses = paginatedData?.data ?? [];
  const totalCourses = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const handleDelete = async (id: number | string) => {
    if (!confirm(copy.deleteConfirm)) return;
    setDeletingId(id);
    try {
      await deleteCourse.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const readPayload = async (): Promise<Record<string, unknown> | null> => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showToast(copy.chooseJson, 'error');
      return null;
    }
    try {
      const text = await file.text();
      return JSON.parse(text) as Record<string, unknown>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : copy.invalidJson;
      showToast(`${copy.parseError}: ${msg}`, 'error');
      return null;
    }
  };

  const handleValidate = async () => {
    const payload = await readPayload();
    if (!payload) return;
    setValidating(true);
    try {
      const res = await validateCoursesJson(payload);
      setImportResult({
        dryRun: true,
        import: {
          mode: 'validate-only',
          certifications: { created: 0, updated: 0, skipped: 0 },
          courses: { created: 0, updated: 0, skipped: 0 },
          modules: { created: 0, updated: 0, skipped: 0 },
          lessons: { created: 0, updated: 0, skipped: 0 },
          quizzes: { created: 0, updated: 0, skipped: 0 },
          labs: { created: 0, updated: 0, skipped: 0 },
          errors: res.errors,
        },
      });
      if (res.valid) {
        showToast(copy.validationOk, 'success');
      } else {
        showToast(`${res.errors.length} ${copy.validationIssues}`, 'error');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.message ?? err?.message ?? copy.validationFailed;
      showToast(status ? `${status} - ${detail}` : detail, 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async (dryRun: boolean) => {
    const payload = await readPayload();
    if (!payload) return;
    try {
      const result = await importCourses.mutateAsync({ payload, dryRun });
      setImportResult(result as ImportResultLike);
      if (dryRun) {
        showToast(copy.previewGenerated, 'success');
      } else {
        showToast(copy.importCommitted, 'success');
        setShowIndexingBanner(true);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const detail = (Array.isArray(data?.message) ? data.message.join(', ') : data?.message) ?? err?.message ?? copy.importFailed;
      showToast(status ? `${status} - ${detail}` : detail, 'error');
    }
  };

  const handleDownloadTemplate = () => {
    downloadJson('subul-courses-template.json', COURSES_TEMPLATE);
    showToast(copy.templateDownloaded, 'success');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/${locale}/dashboard/admin`} className="hover:text-foreground">Admin</Link>
          <span aria-hidden>/</span>
          <span className="text-foreground font-medium">Courses</span>
        </nav>
        <Card>
          <CardContent className="space-y-4 py-8">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-9 w-32" />
            </div>
            {[1,2,3,4,5].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/${locale}/dashboard/admin`} className="hover:text-foreground">Admin</Link>
          <span aria-hidden>/</span>
          <span className="text-foreground font-medium">Courses</span>
        </nav>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-destructive">
            <p>Error loading courses.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: 'Total Courses', value: totalCourses, change: '', icon: GraduationCap, color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mt-1">
            <Link href={`/${locale}/dashboard/admin`} className="hover:text-slate-900">Admin</Link>
            <span aria-hidden>/</span>
            <span className="text-slate-900 font-medium">Courses</span>
          </nav>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/${locale}/dashboard/admin/courses/new`}>
              <Plus className="h-4 w-4 mr-2" /> New course
            </Link>
          </Button>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {stats.map((stat, index) => {
          const StatIcon = stat.icon;
          return (
          <motion.div
            key={index}
            className="bg-card rounded-2xl p-6 border border-border shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.color}`}>
                <StatIcon className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="w-3 h-3" />
                {stat.change}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <motion.h3
                  className="text-3xl font-extrabold tracking-tight text-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {stat.value}
                </motion.h3>
                <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
              </div>
            </div>
          </motion.div>
          );
        })}
      </motion.div>

      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Import Courses / Certifications JSON</h2>
              <p className="text-xs text-muted-foreground">
                Same nested shape as <code className="font-mono">certif_courses.json</code>. Upload, validate, preview, then import. Re-importing the same file will update existing items, not duplicate them.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Download template
            </Button>
          </div>

          <Input ref={fileInputRef} type="file" accept="application/json" />

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleValidate} disabled={validating || importCourses.isPending}>
              {validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Validate
            </Button>
            <Button variant="outline" onClick={() => handleImport(true)} disabled={importCourses.isPending}>
              {importCourses.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Preview (dry-run)
            </Button>
            <Button onClick={() => handleImport(false)} disabled={importCourses.isPending}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>

          <ImportResultPanel result={importResult} />

          <IndexingBanner visible={showIndexingBanner} onClose={() => setShowIndexingBanner(false)} />
        </CardContent>
      </Card>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50">
            <GraduationCap className="h-16 w-16 text-slate-400 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No courses yet</h2>
            <p className="text-slate-500 mb-6 max-w-md">
              Create a course to offer it to learners. You can add modules, lessons and labs in one go.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href={`/${locale}/dashboard/admin/courses/new`}>Create course</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/dashboard/admin/certifications`}>Certifications</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left p-4 font-medium text-slate-600">Course</th>
                    <th className="text-left p-4 font-medium text-slate-600">Level</th>
                    <th className="text-left p-4 font-medium text-slate-600">Certification ID</th>
                    <th className="text-right p-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-sm">
                            {c.title.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-slate-900 block">{c.title}</span>
                            <span className="text-xs text-slate-500 font-mono">{c.courseId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-700">{c.level ?? '—'}</td>
                      <td className="p-4 text-slate-700">{c.certificationId ?? '—'}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/${locale}/dashboard/admin/courses/${c.id}`}>
                              <Pencil className="h-4 w-4 text-slate-600" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                          >
                            {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Showing {totalCourses === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCourses)} of {totalCourses}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-slate-700 px-2">
                  Page {currentPage} / {Math.max(1, totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

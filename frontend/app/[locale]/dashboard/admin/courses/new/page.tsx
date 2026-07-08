'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Plus, ChevronDown, ChevronRight, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCreateAdminCourse } from '@/hooks/api/useAdminCourses';
import { useCertifications } from '@/hooks/api/useCertifications';
import type { CreateCoursePayload, AdminCourseModule } from '@/services/admin-courses';
import { COURSE_LEVELS } from '@/lib/constants/course-level';
import {
  CourseModuleEditor,
  emptyModule,
  parseLines,
  type ModuleForm,
} from '@/components/admin/CourseModuleEditor';
import { useTranslation } from '@/contexts/LanguageContext';

export default function AdminNewCoursePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';
  const createCourse = useCreateAdminCourse();
  const { data: certifications = [], isLoading: certificationsLoading } = useCertifications();
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('Fundamentals');
  const [certificationId, setCertificationId] = useState<string>('');
  const [modules, setModules] = useState<ModuleForm[]>([]);
  const [moduleOpen, setModuleOpen] = useState<Record<number, boolean>>({});

  const addModule = () => {
    setModules((m) => [...m, emptyModule()]);
    setModuleOpen((o) => ({ ...o, [modules.length]: true }));
  };
  const removeModule = (index: number) => {
    setModules((m) => m.filter((_, i) => i !== index));
    setModuleOpen((o) => {
      const next: Record<number, boolean> = {};
      Object.entries(o).forEach(([k, v]) => {
        const i = parseInt(k, 10);
        if (i < index) next[i] = v;
        if (i > index) next[i - 1] = v;
      });
      return next;
    });
  };
  const toggleModuleOpen = (index: number) => setModuleOpen((o) => ({ ...o, [index]: !o[index] }));
  const setModule = (index: number, upd: Partial<ModuleForm> | ((prev: ModuleForm) => ModuleForm)) => {
    setModules((m) =>
      m.map((mod, i) => (i === index ? (typeof upd === 'function' ? upd(mod) : { ...mod, ...upd }) : mod))
    );
  };

  const buildPayload = (): CreateCoursePayload => {
    const payloadModules: AdminCourseModule[] = modules.map((mod, mi) => ({
      moduleOrder: mi + 1,
      title: mod.title.trim() || `Module ${mi + 1}`,
      icon: mod.icon.trim() || undefined,
      lessons: mod.lessons.map((l, li) => ({
        lessonOrder: li + 1,
        title: l.title.trim() || `Lesson ${li + 1}`,
        content: l.content.trim() || undefined,
        bullets: parseLines(l.bullets),
      })),
      labs: mod.labs.map((lab, li) => ({
        labOrder: li + 1,
        title: lab.title.trim() || `Lab ${li + 1}`,
        labId: lab.labId.trim() || undefined,
        objective: lab.objective.trim() || undefined,
        learningObjectives: parseLines(lab.learningObjectives),
        durationMinutes: lab.durationMinutes ? parseInt(lab.durationMinutes, 10) : undefined,
        difficultyLevel: lab.difficultyLevel.trim() || undefined,
      })),
    }));
    return {
      courseId: courseId.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      level: level.trim() || undefined,
      certificationId: certificationId ? parseInt(certificationId, 10) : undefined,
      modules: payloadModules,
    };
  };

  const validate = (): boolean => {
    if (!courseId.trim() || !title.trim()) return false;
    for (const mod of modules) {
      if (mod.lessons.some((l) => !l.title.trim())) return false;
      if (mod.labs.some((l) => !l.title.trim())) return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) {
      setError(String(t('adminCourse.validationError')));
      return;
    }
    try {
      await createCourse.mutateAsync(buildPayload());
      router.push(`/${locale}/dashboard/admin/courses`);
    } catch (err: unknown) {
      const data =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
      const raw = data?.message;
      const message =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw) && raw.length > 0
            ? raw[0]
            : String(t('adminCourse.createError'));
      setError(message);
    }
  };

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-8 text-white shadow-lg"
      >
        <div className="relative z-10">
          <nav className="flex items-center gap-2 text-sm text-white/70 mb-4 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
            <Link href={`/${locale}/dashboard/admin`} className="hover:text-white transition-colors">{String(t('adminCourse.breadcrumbAdmin'))}</Link>
            <span className="opacity-50">/</span>
            <Link href={`/${locale}/dashboard/admin/courses`} className="hover:text-white transition-colors">{String(t('adminCourse.breadcrumbCourses'))}</Link>
            <span className="opacity-50">/</span>
            <span className="text-white font-medium">{String(t('adminCourse.newPageTitle'))}</span>
          </nav>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{String(t('adminCourse.newPageTitle'))}</h1>
              <p className="text-white/80 mt-1">{String(t('adminCourse.newSubtitle'))}</p>
            </div>
            <div className="flex gap-4 p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 shadow-inner border border-white/10">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span className="text-sm font-medium">{String(t('adminCourse.stepDetails'))}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 text-white/60">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs">2</span>
                <span className="text-sm">{String(t('adminCourse.stepCurriculum'))}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-accent/20 rounded-full blur-2xl" />
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Course Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Save className="w-4 h-4 text-primary" />
                  </div>
                  {String(t('adminCourse.courseInfo'))}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold mb-1.5 block">{String(t('adminCourse.courseId'))}</label>
                    <p className="text-xs text-muted-foreground mb-2">{String(t('adminCourse.courseIdHint'))}</p>
                    <Input
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      placeholder="ex: AZ-900-UNIFIED"
                      className="h-11 focus-visible:ring-primary/20"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold mb-1.5 block">{String(t('adminCourse.titleLabel'))}</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={String(t('adminCourse.titlePlaceholder'))}
                      className="h-11 focus-visible:ring-primary/20"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold mb-1.5 block">{String(t('adminCourse.description'))}</label>
                    <textarea
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={String(t('adminCourse.descriptionPlaceholder'))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1.5 block">{String(t('adminCourse.level'))}</label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-11 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="">{String(t('adminCourse.levelPlaceholder'))}</option>
                      {COURSE_LEVELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1.5 block">{String(t('adminCourse.certification'))}</label>
                    <select
                      value={certificationId}
                      onChange={(e) => setCertificationId(e.target.value)}
                      disabled={certificationsLoading}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-11 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                      aria-describedby="certification-helper"
                    >
                      <option value="">{String(t('adminCourse.certificationNone'))}</option>
                      {certifications.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.title} (ID: {c.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-accent" />
                    </div>
                    {String(t('adminCourse.curriculum'))}
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addModule} className="hover:bg-accent hover:text-white transition-all">
                    <Plus className="h-4 w-4 mr-2" />
                    {String(t('adminCourse.addModule'))}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {modules.length === 0 && (
                    <div className="text-center py-12 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <Plus className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">{String(t('adminCourse.noModules'))}</p>
                      <p className="text-xs text-muted-foreground mt-1">{String(t('adminCourse.noModulesHint'))}</p>
                      <Button type="button" variant="link" onClick={addModule} className="mt-2 text-primary">
                        {String(t('adminCourse.addNow'))}
                      </Button>
                    </div>
                  )}
                  {modules.map((mod, modIndex) => {
                    const isOpen = moduleOpen[modIndex] !== false;
                    return (
                      <motion.div
                        key={modIndex}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-xl border border-border shadow-sm overflow-hidden bg-white dark:bg-slate-900"
                      >
                        <button
                          type="button"
                          className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                          onClick={() => toggleModuleOpen(modIndex)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {String(t('adminCourse.moduleLabel', { index: modIndex + 1 }))}
                                {mod.title.trim() ? `: ${mod.title.trim()}` : ''}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground bg-muted md:px-2 py-0.5 rounded">
                                  {String(t('adminCourse.lessonsCount', { count: mod.lessons.length }))}
                                </span>
                                <span className="text-xs text-muted-foreground bg-muted md:px-2 py-0.5 rounded">
                                  {String(t('adminCourse.labsCount', { count: mod.labs.length }))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="p-4 border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/50">
                            <CourseModuleEditor
                              module={mod}
                              onUpdate={(upd) => setModule(modIndex, upd)}
                              onRemove={() => removeModule(modIndex)}
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Actions */}
          <div className="space-y-6">
            <Card className="sticky top-6 shadow-md border-primary/20 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary to-accent" />
              <CardHeader>
                <CardTitle className="text-lg">{String(t('adminCourse.actions'))}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  type="submit" 
                  disabled={createCourse.isPending}
                  className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  {createCourse.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {String(t('adminCourse.createCourse'))}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  asChild 
                  className="w-full h-11 hover:bg-muted transition-colors"
                >
                  <Link href={`/${locale}/dashboard/admin/courses`}>{String(t('adminCourse.cancel'))}</Link>
                </Button>

                {error && (
                  <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold uppercase text-xs tracking-wider mb-1">{String(t('adminCourse.errorTitle'))}</p>
                      <p className="leading-relaxed">{error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-dashed">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">{String(t('adminCourse.tipsTitle'))}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• {String(t('adminCourse.tipUniqueId'))}</p>
                <p>• {String(t('adminCourse.tipModules'))}</p>
                <p>• {String(t('adminCourse.tipCertOptional'))}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

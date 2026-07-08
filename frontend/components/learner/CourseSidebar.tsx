'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, CheckCircle, MessageSquare, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type CourseModule } from '@/services/courses';

export type LessonRef = {
  moduleId: number;
  lessonId: number;
  moduleTitle: string;
  moduleIcon: string;
  lesson: {
    title: string;
    id: number;
    content: string;
    bullets: string[];
    examTips: string[];
  };
  globalIndex: number;
};

type CourseSidebarProps = {
  courseCode: string;
  courseTitle: string;
  currentLevel: 'beginner' | 'intermediate';
  onLevelChange: (level: 'beginner' | 'intermediate') => void;
  detectedLevel?: 'beginner' | 'intermediate' | null;
  modules: CourseModule[];
  allLessons: LessonRef[];
  currentRef: LessonRef | null;
  completedSet: Set<number>;
  expandedModules: Set<number>;
  toggleModule: (id: number) => void;
  onSelectLesson: (ref: LessonRef) => void;
  onOpenAssistant?: () => void;
};

export default function CourseSidebar({
  courseCode,
  courseTitle,
  currentLevel,
  onLevelChange,
  detectedLevel,
  modules,
  allLessons,
  currentRef,
  completedSet,
  expandedModules,
  toggleModule,
  onSelectLesson,
  onOpenAssistant,
}: CourseSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const lessonProgress = allLessons.length > 0
    ? Math.round((completedSet.size / allLessons.length) * 100)
    : 0;

  const matchesSearch = useCallback((text: string) =>
    text.toLowerCase().includes(searchQuery.toLowerCase()),
  [searchQuery]);

  const filteredModules = searchQuery
    ? modules.filter((mod) =>
        matchesSearch(mod.title) ||
        mod.lessons.some((l) => matchesSearch(l.title)),
      )
    : modules;

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex flex-col border-r border-slate-100 bg-white overflow-hidden shrink-0"
      style={{ minWidth: 0 }}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-100 shrink-0 space-y-3">
        {/* Course identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-500/20 shrink-0 text-lg">
            📚
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest truncate" title={courseCode}>
              {courseCode}
            </p>
            <p className="text-xs font-bold text-slate-900 leading-tight truncate" title={courseTitle}>
              {courseTitle}
            </p>
          </div>
        </div>

        {/* Level indicator / switcher */}
        {detectedLevel ? (
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-full',
              detectedLevel === 'beginner' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700',
            )}>
              {detectedLevel === 'beginner' ? 'Débutant' : 'Intermédiaire'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Niveau détecté</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['beginner', 'intermediate'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => onLevelChange(lvl)}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all',
                  currentLevel === lvl
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {lvl === 'beginner' ? 'Débutant' : 'Intermédiaire'}
              </button>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progression du cours</span>
            <span className="text-[10px] font-bold text-violet-600 tabular-nums">{lessonProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${lessonProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans le cours"
            className="w-full pl-9 pr-16 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-300 focus:bg-white transition-colors placeholder:text-slate-400"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 select-none pointer-events-none">
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* ── Modules list ── */}
      <div className="flex-1 overflow-y-auto py-3 px-3">
        {filteredModules.length === 0 ? (
          <p className="px-2 py-4 text-xs text-slate-400 text-center">Aucun résultat pour &quot;{searchQuery}&quot;</p>
        ) : (
          <div className="space-y-0.5">
            {filteredModules.map((mod, modIndex) => {
              const isExpanded = expandedModules.has(mod.id);
              const moduleLessons = allLessons.filter((l) => l.moduleId === mod.id);
              const doneCount = moduleLessons.filter((l) => completedSet.has(l.globalIndex)).length;
              const allDone = doneCount === mod.lessons.length && mod.lessons.length > 0;

              const filteredLessons = searchQuery
                ? moduleLessons.filter((ref) => matchesSearch(ref.lesson.title))
                : moduleLessons;
              const showLessons = searchQuery ? filteredLessons.length > 0 : isExpanded;

              return (
                <div key={mod.id}>
                  {/* Module header */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className={cn(
                      'group flex w-full items-center gap-2.5 px-2.5 py-2.5 rounded-xl transition-all text-left',
                      isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50',
                    )}
                  >
                    <span className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
                      allDone ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-50 text-violet-600',
                    )}>
                      {allDone ? '✓' : modIndex + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{mod.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                        {doneCount}/{mod.lessons.length} terminé{doneCount > 1 ? 's' : ''}
                      </p>
                    </div>

                    {allDone ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {/* Lessons */}
                  <AnimatePresence initial={false}>
                    {showLessons && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 pl-3 border-l-2 border-slate-100 mt-0.5 mb-1 space-y-0.5">
                          {(searchQuery ? filteredLessons : moduleLessons).map((ref) => {
                            const isActive = currentRef?.globalIndex === ref.globalIndex;
                            const isDone = completedSet.has(ref.globalIndex);
                            const posInModule = moduleLessons.findIndex((l) => l.globalIndex === ref.globalIndex);

                            return (
                              <button
                                key={ref.globalIndex}
                                onClick={() => onSelectLesson(ref)}
                                className={cn(
                                  'w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all',
                                  isActive
                                    ? 'bg-violet-600 shadow-md shadow-violet-500/20'
                                    : 'hover:bg-slate-50',
                                )}
                              >
                                <div className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                  isActive
                                    ? 'bg-white text-violet-700'
                                    : isDone
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-100 text-slate-500',
                                )}>
                                  {isDone && !isActive ? '✓' : posInModule + 1}
                                </div>
                                <span className={cn(
                                  'text-xs font-medium truncate leading-snug',
                                  isActive ? 'text-white font-semibold'
                                    : isDone ? 'text-slate-400'
                                    : 'text-slate-700',
                                )}>
                                  {ref.lesson.title}
                                </span>
                                {isActive && (
                                  <span className="ml-auto shrink-0 h-1.5 w-1.5 rounded-full bg-white/60" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer: Besoin d'aide? ── */}
      <div className="shrink-0 border-t border-slate-100 px-4 py-3 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <MessageSquare className="h-4 w-4 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800">Besoin d&apos;aide ?</p>
            <p className="text-[10px] text-slate-400 leading-tight">Posez vos questions à l&apos;Assistant IA</p>
          </div>
        </div>
        <button
          onClick={onOpenAssistant}
          className="mt-2.5 w-full text-left text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
        >
          Ouvrir l&apos;Assistant →
        </button>
      </div>
    </motion.aside>
  );
}

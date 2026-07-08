'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Circle, Lock, PlayCircle, BookOpen,
  Target, TrendingUp, Clock, ChevronRight, Star, Zap,
  Brain, Cloud, Shield, Rocket, Trophy, Sparkles,
  Medal, Gem, Crown, ArrowRight, Lightbulb, BarChart3,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRoadmapAnalytics, useRoadmapRecommendations } from '@/hooks/api/useRoadmap';
import { useLearnerCourses } from '@/hooks/api/useCourses';
import { useLearnerCertificationsStatus } from '@/hooks/api/useCertifications';
import { getModuleIcon } from '@/services/roadmap';
import type { RoadmapModule } from '@/services/roadmap';

const LEVELS = [
  { name: 'Beginner', icon: Star, minXP: 0, gradient: 'from-slate-400 to-slate-500', unlocks: 'Access to fundamentals' },
  { name: 'Apprentice', icon: Medal, minXP: 100, gradient: 'from-emerald-400 to-emerald-600', unlocks: 'Intermediate modules' },
  { name: 'Expert', icon: Gem, minXP: 300, gradient: 'from-blue-400 to-blue-600', unlocks: 'Advanced labs & projects' },
  { name: 'Master', icon: Crown, minXP: 600, gradient: 'from-violet-400 to-purple-600', unlocks: 'Certification prep' },
  { name: 'Legend', icon: Trophy, minXP: 1000, gradient: 'from-amber-400 to-orange-600', unlocks: 'All content unlocked' },
];

function getLevelFromXP(xp: number) {
  let lvl = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) { lvl = i; break; }
  }
  return lvl;
}

const PROFILE_META: Record<string, { label: string; icon: typeof Cloud; color: string }> = {
  cloud: { label: 'Cloud & DevOps', icon: Cloud, color: 'text-sky-500' },
  cyber: { label: 'Cybersecurity', icon: Shield, color: 'text-rose-500' },
  ai: { label: 'AI / ML', icon: Brain, color: 'text-violet-500' },
  devops: { label: 'DevOps', icon: Rocket, color: 'text-emerald-500' },
};

const STATUS_CONFIG = {
  completed: { ring: 'ring-emerald-400/50 border-emerald-400', icon: CheckCircle, iconColor: 'text-emerald-500', label: 'Completed', badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  current: { ring: 'ring-primary/40 border-primary', icon: PlayCircle, iconColor: 'text-primary', label: 'In Progress', badgeCls: 'bg-primary/10 text-primary border-primary/20' },
  upcoming: { ring: 'ring-border border-border', icon: Circle, iconColor: 'text-muted-foreground', label: 'Upcoming', badgeCls: 'bg-muted text-muted-foreground border-border' },
  locked: { ring: 'ring-border/50 border-border/50', icon: Lock, iconColor: 'text-muted-foreground/50', label: 'Locked', badgeCls: 'bg-muted/50 text-muted-foreground/60 border-border/50' },
};

function RoadmapSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 rounded-2xl" />
      <div className="grid grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-10 w-48 rounded-xl" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'fr';

  const { data: analytics, isLoading: analyticsLoading } = useRoadmapAnalytics();
  const { data: recommendations } = useRoadmapRecommendations();
  const { data: coursesData } = useLearnerCourses();
  const { data: certStatus } = useLearnerCertificationsStatus();

  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const roadmap = analytics?.roadmap;
  const stats = analytics?.analytics;
  const modules: RoadmapModule[] = roadmap?.modules ?? [];
  const userLevel = roadmap?.userLevel ?? 0;
  const totalXP = roadmap?.totalXP ?? 0;
  const totalProgress = roadmap?.totalProgress ?? 0;
  const userProfile = roadmap?.userProfile;

  const enrolledCourses = coursesData?.enrolled ?? [];
  const completedCourses = coursesData?.completed ?? [];

  const derivedLevel = getLevelFromXP(totalXP);
  const currentLevel = LEVELS[derivedLevel];
  const nextLevel = LEVELS[Math.min(derivedLevel + 1, LEVELS.length - 1)];
  const xpInCurrentLevel = totalXP - currentLevel.minXP;
  const xpForNextLevel = nextLevel.minXP - currentLevel.minXP;
  const progressToNext = xpForNextLevel > 0 ? Math.min((xpInCurrentLevel / xpForNextLevel) * 100, 100) : 100;

  const profileKey = userProfile?.primaryProfile?.toLowerCase() ?? '';
  const profile = PROFILE_META[profileKey];

  if (analyticsLoading) {
    return <RoadmapSkeleton />;
  }

  if (!roadmap || modules.length === 0) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7C4DFF] via-[#9C27B0] to-[#C2185B] p-8 shadow-lg-blue text-white">
          <div className="absolute inset-0 bg-white/[0.03]" />
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/[0.06] blur-3xl" />
          <div className="relative z-10 flex flex-col items-center text-center gap-6 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
              <Target className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-2 max-w-lg">
              <h1 className="text-3xl font-bold">Your Learning Roadmap</h1>
              <p className="text-white/70 text-lg">
                Take a quick assessment to get a personalized learning path tailored to your goals and current skill level.
              </p>
            </div>
            <Button
              onClick={() => router.push(`/${locale}/dashboard/learner`)}
              className="h-12 bg-white text-[#7C4DFF] hover:bg-white/95 font-semibold text-base gap-2 shadow-md px-8 rounded-xl border-0"
            >
              <GraduationCap className="h-5 w-5" />
              Take Assessment
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Still show course stats even without roadmap */}
        {(enrolledCourses.length > 0 || completedCourses.length > 0) && (
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <h2 className="text-base font-semibold text-foreground mb-4">Your Current Progress</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{completedCourses.length}</div>
                <p className="text-sm text-muted-foreground">Courses Completed</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center">
                <div className="text-2xl font-bold text-primary">{enrolledCourses.length}</div>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{certStatus?.earned?.length ?? 0}</div>
                <p className="text-sm text-muted-foreground">Certifications Earned</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const completedModuleCount = stats?.completedModules ?? modules.filter(m => m.status === 'completed').length;
  const totalModuleCount = stats?.totalModules ?? modules.length;
  const estimatedHoursLeft = (stats?.estimatedTotalHours ?? 0) - (stats?.completedHours ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7C4DFF] via-[#9C27B0] to-[#C2185B] p-6 md:p-8 shadow-lg-blue text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/[0.06] blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/[0.04] blur-2xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-white/70" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">Learning Roadmap</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Level {derivedLevel + 1}: {currentLevel.name}
              </h1>
              {profile && (
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <profile.icon className="h-4 w-4" />
                  <span>{profile.label} track</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <div className="rounded-xl bg-white/[0.12] border border-white/[0.15] backdrop-blur-md px-4 py-3 text-center">
                <div className="text-2xl font-bold">{totalProgress}%</div>
                <div className="text-[11px] text-white/50 font-medium">Overall</div>
              </div>
              <div className="rounded-xl bg-white/[0.12] border border-white/[0.15] backdrop-blur-md px-4 py-3 text-center">
                <div className="text-2xl font-bold">{totalXP}</div>
                <div className="text-[11px] text-white/50 font-medium">Total XP</div>
              </div>
            </div>
          </div>

          {/* XP progress to next level */}
          <div className="rounded-xl bg-white/[0.1] border border-white/[0.12] backdrop-blur-md p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/70">Progress to {nextLevel.name}</span>
              <span className="font-semibold">{totalXP} / {nextLevel.minXP} XP</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white/20">
              <motion.div
                className="h-2.5 rounded-full bg-gradient-to-r from-white/80 to-white"
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Modules Done', value: completedModuleCount, icon: CheckCircle },
              { label: 'Total Modules', value: totalModuleCount, icon: BookOpen },
              { label: 'Hours Left', value: `${Math.round(estimatedHoursLeft)}h`, icon: Clock },
              { label: 'Certifications', value: certStatus?.earned?.length ?? 0, icon: Trophy },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl bg-white/[0.08] border border-white/[0.1] px-3.5 py-2.5">
                <s.icon className="h-4 w-4 text-white/50 shrink-0" />
                <div className="min-w-0">
                  <div className="text-lg font-bold leading-none">{s.value}</div>
                  <div className="text-[11px] text-white/50 mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LEVEL LADDER ── */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Level Progression
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {LEVELS.map((level, i) => {
            const Icon = level.icon;
            const isActive = i === derivedLevel;
            const isReached = i <= derivedLevel;
            return (
              <div
                key={level.name}
                className={cn(
                  'relative rounded-2xl border p-4 text-center transition-all duration-200',
                  isActive
                    ? 'border-primary bg-primary/5 shadow-brand ring-1 ring-primary/20'
                    : isReached
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-border/60 bg-muted/30 opacity-60',
                )}
              >
                {isActive && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                    YOU
                  </div>
                )}
                <div className={cn(
                  'mx-auto flex h-10 w-10 items-center justify-center rounded-xl',
                  isReached ? `bg-gradient-to-br ${level.gradient} text-white` : 'bg-muted text-muted-foreground',
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground">{level.name}</div>
                <div className="text-[11px] text-muted-foreground">{level.minXP} XP</div>
                <div className="mt-1.5 text-[10px] text-muted-foreground/70 leading-tight">{level.unlocks}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DOMAIN SCORES ── */}
      {userProfile?.scores && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Skill Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'cloud', label: 'Cloud & DevOps', pct: userProfile.scores.cloudPercentage, icon: Cloud, color: 'from-sky-400 to-blue-500' },
              { key: 'cyber', label: 'Cybersecurity', pct: userProfile.scores.cyberPercentage, icon: Shield, color: 'from-rose-400 to-red-500' },
              { key: 'ai', label: 'AI / ML', pct: userProfile.scores.aiPercentage, icon: Brain, color: 'from-violet-400 to-purple-500' },
            ].map((d) => (
              <div key={d.key} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white', d.color)}>
                    <d.icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{d.label}</div>
                  </div>
                  <div className="text-lg font-bold text-foreground">{d.pct}%</div>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODULE TIMELINE ── */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
        <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Learning Modules
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {completedModuleCount}/{totalModuleCount} completed
          </span>
        </h2>

        <div className="relative space-y-3">
          {/* Vertical line */}
          <div className="absolute left-5 top-6 bottom-6 w-px bg-border hidden sm:block" />

          {modules.map((mod, i) => {
            const cfg = STATUS_CONFIG[mod.status];
            const StatusIcon = cfg.icon;
            const ModIcon = getModuleIcon(mod.icon);
            const isExpanded = expandedModule === mod.id;
            const isLocked = mod.status === 'locked';

            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className={cn(
                    'group relative rounded-2xl border p-4 sm:pl-14 transition-all duration-200 cursor-pointer',
                    isExpanded ? 'ring-1 shadow-card-hover' : 'hover:shadow-card-hover',
                    isLocked ? 'opacity-60 border-border/40' : 'border-border/60',
                    mod.status === 'current' && 'ring-1 ring-primary/20 border-primary/40',
                  )}
                  onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                >
                  {/* Timeline dot (desktop) */}
                  <div className={cn(
                    'hidden sm:flex absolute left-2.5 top-5 h-5 w-5 items-center justify-center rounded-full border-2 bg-card',
                    mod.status === 'completed' ? 'border-emerald-400' :
                    mod.status === 'current' ? 'border-primary' : 'border-border',
                  )}>
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      mod.status === 'completed' ? 'bg-emerald-400' :
                      mod.status === 'current' ? 'bg-primary' : 'bg-muted-foreground/30',
                    )} />
                  </div>

                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                      mod.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                      mod.status === 'current' ? 'bg-primary/10 text-primary' :
                      'bg-muted text-muted-foreground',
                    )}>
                      <ModIcon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn('text-sm font-semibold', isLocked ? 'text-muted-foreground' : 'text-foreground')}>
                          {mod.title}
                        </h3>
                        <Badge className={cn('text-[10px] h-5 border', cfg.badgeCls)}>
                          {cfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {mod.difficulty}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{mod.description}</p>

                      {mod.status === 'current' && mod.progress != null && (
                        <div className="mt-2 max-w-xs">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span className="font-semibold text-primary">{mod.progress}%</span>
                          </div>
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${mod.progress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{mod.estimatedHours}h</span>
                      </div>
                      {mod.status === 'completed' && (
                        <div className="text-xs font-semibold text-emerald-600">+{mod.estimatedHours * 2} XP</div>
                      )}
                      <StatusIcon className={cn('h-5 w-5', cfg.iconColor)} />
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
                          {mod.topics.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1.5">Topics</div>
                              <div className="flex flex-wrap gap-1.5">
                                {mod.topics.map((t, j) => (
                                  <span key={j} className="text-xs bg-muted rounded-lg px-2.5 py-1 text-muted-foreground">{t}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {mod.skills.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1.5">Skills</div>
                              <div className="flex flex-wrap gap-1.5">
                                {mod.skills.map((s, j) => (
                                  <Badge key={j} variant="secondary" className="text-[11px]">{s}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {mod.prerequisites && mod.prerequisites.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1.5">Prerequisites</div>
                              <div className="flex flex-wrap gap-1.5">
                                {mod.prerequisites.map((p, j) => {
                                  const prereqMod = modules.find(m => m.id === p);
                                  return (
                                    <span key={j} className="text-xs bg-muted rounded-lg px-2.5 py-1 text-muted-foreground flex items-center gap-1">
                                      {prereqMod ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <Lock className="h-3 w-3" />}
                                      {prereqMod?.title ?? p}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            {mod.status === 'current' && (
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/dashboard/learner/cours`); }}
                                className="gap-1.5"
                              >
                                <PlayCircle className="h-4 w-4" />
                                Continue Learning
                              </Button>
                            )}
                            {mod.status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/dashboard/learner/cours`); }}
                                className="gap-1.5"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Review
                              </Button>
                            )}
                            {mod.status === 'upcoming' && (
                              <Button variant="outline" size="sm" disabled className="gap-1.5">
                                <Clock className="h-4 w-4" />
                                Available Soon
                              </Button>
                            )}
                            {mod.status === 'locked' && (
                              <Button variant="outline" size="sm" disabled className="gap-1.5">
                                <Lock className="h-4 w-4" />
                                Complete prerequisites first
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── RECOMMENDATIONS ── */}
      {recommendations && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Current Focus */}
          {recommendations.currentFocus && recommendations.currentFocus.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Current Focus
              </h2>
              <div className="space-y-2.5">
                {recommendations.currentFocus.map((focus, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
                      <Target className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-foreground">{focus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Topics */}
          {recommendations.suggestedTopics && recommendations.suggestedTopics.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-violet-500" />
                Suggested Next
              </h2>
              <div className="space-y-2.5">
                {recommendations.suggestedTopics.map((topic, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-foreground">{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {recommendations.strengths && recommendations.strengths.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-emerald-500" />
                Your Strengths
              </h2>
              <div className="flex flex-wrap gap-2">
                {recommendations.strengths.map((s, i) => (
                  <Badge key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Estimated time */}
          {recommendations.estimatedCompletionTime && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Estimated time to complete roadmap</div>
                <div className="text-xl font-bold text-foreground">{recommendations.estimatedCompletionTime}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: CheckCircle, label: 'Completed', value: completedModuleCount, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { icon: PlayCircle, label: 'In Progress', value: modules.filter(m => m.status === 'current').length, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
          { icon: Clock, label: 'Hours Invested', value: `${stats?.completedHours ?? 0}h`, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
          { icon: Trophy, label: 'XP Earned', value: totalXP, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0', stat.iconBg)}>
                <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

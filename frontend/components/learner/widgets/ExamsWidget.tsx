'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Clock, Calendar, BookOpen, Award, Trophy, Target, 
  ArrowRight, Sparkles, Zap, Flame, 
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Progress } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

import { useTranslation } from '@/contexts/LanguageContext';
import { motion, AnimatePresence, useReducedMotion, Variants } from 'framer-motion';
import Confetti from 'react-confetti';
import { useExams } from '@/hooks/api/useExams';

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}

export function ExamsWidget() {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { data, isLoading, isError } = useExams();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'results'>('upcoming');
  const [showConfetti, setShowConfetti] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { width, height } = useWindowSize();

  const upcomingExams = data?.upcoming ?? [];
  const completedExams = data?.completed ?? [];
  const apiStats = data?.stats;
  const streak = data?.streak ?? 0;
  const stats = {
    upcoming: apiStats?.upcoming ?? 0,
    completed: apiStats?.completed ?? 0,
    passed: apiStats?.passed ?? 0,
    avgScore: apiStats?.avgScore ?? 0,
    total: apiStats?.total ?? 0,
    streak,
  };

  useEffect(() => {
    if (activeTab === 'completed' && stats.passed > 0 && !shouldReduceMotion) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4500);
      return () => clearTimeout(timer);
    }
  }, [activeTab, stats.passed, shouldReduceMotion]);

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.7, staggerChildren: 0.12 }
    }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.96 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { duration: shouldReduceMotion ? 0 : 0.5, type: 'spring', stiffness: 100 }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Target className="w-12 h-12 text-destructive mx-auto opacity-60" />
          <p className="text-destructive font-semibold">{t('learnerExams.errorLoading') ?? 'Erreur lors du chargement des examens.'}</p>
          <p className="text-muted-foreground text-sm">{t('learnerExams.tryAgainLater') ?? 'Veuillez réessayer plus tard.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-28 relative overflow-hidden">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={280}
          gravity={0.15}
          tweenDuration={4200}
          recycle={false}
          className="fixed inset-0 z-50 pointer-events-none"
        />
      )}

      <div className="relative overflow-hidden bg-card border-b border-border">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22noiseFilter%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.65%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />

        <div className="relative w-full px-3 sm:px-5 lg:px-6 xl:px-8 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: -25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.7, ease: "easeOut" }}
            className="max-w-4xl mx-auto text-center"
            role="banner"
            aria-label={`${t('learnerExams.title')}`}
          >
            {stats.streak > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                whileHover={!shouldReduceMotion ? { scale: 1.05 } : {}}
                className="inline-flex items-center gap-2 sm:gap-2.5 mb-4 sm:mb-6 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-brand-light border border-primary/20 transition-colors"
                role="status"
                aria-live="polite"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-indigo-800">
                  {t('learnerExams.streak', { count: stats.streak })}
                </span>
              </motion.div>
            )}

            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-foreground mb-2 sm:mb-3 md:mb-4 lg:mb-6 leading-tight">
              {t('learnerExams.title')}
            </h1>

            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground font-medium max-w-2xl sm:max-w-3xl mx-auto leading-relaxed">
              {t('learnerExams.subtitle')}{' '}
              <Flame className="inline-block h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-warning align-middle animate-[flicker_1.5s_infinite]" />
            </p>
          </motion.div>
        </div>

      </div>

      <div className="w-full px-3 sm:px-5 lg:px-6 xl:px-8 mt-6">
        <motion.div 
          className="grid grid-cols-2 xs:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          role="region"
          aria-label="Exam Statistics"
        >
          {[
            { 
              icon: Calendar, 
              label: t('learnerExams.upcoming'), 
              value: stats.upcoming, 
              accentClasses: 'bg-primary/10 text-primary',
              extra: stats.upcoming > 0 ? (
                <span className="text-[10px] font-medium text-primary/90 mt-0.5 block">
                  {upcomingExams[0]?.date}
                </span>
              ) : null
            },
            { 
              icon: Trophy, 
              label: t('learnerExams.passed'), 
              value: stats.passed, 
              accentClasses: 'bg-success-muted text-success-text',
              extra: (
                <span className="text-[10px] font-medium text-success mt-0.5 block">
                  {t('learnerDashboard.keepItUpMsg')}
                </span>
              )
            },
            { 
              icon: Target, 
              label: t('learnerExams.averageScore'), 
              value: `${stats.avgScore}%`, 
              accentClasses: 'bg-primary/10 text-primary',
              extra: stats.avgScore >= 80 ? (
                <Zap className="w-4 h-4 text-warning inline-block animate-pulse" />
              ) : null
            },
            { 
              icon: Award, 
              label: t('learnerExams.total'), 
              value: stats.total, 
              accentClasses: 'bg-secondary/50 text-secondary-foreground'
            },
          ].map((item, i) => (
            <motion.div 
              key={i}
              variants={cardVariants}
              className={cn(
                "bg-card border border-border rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-2.5 md:p-3 text-center",
                "transition-all duration-300 ease-out",
                "hover:border-primary/30",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "group relative overflow-hidden"
              )}
              whileHover={!shouldReduceMotion ? { y: -4, scale: 1.02 } : {}}
              tabIndex={0}
              role="article"
              aria-label={`${item.label}: ${item.value}`}
            >
              <div className={cn(
                "w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg mx-auto mb-1 sm:mb-1.5 md:mb-2 flex items-center justify-center",
                item.accentClasses
              )}>
                <item.icon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" strokeWidth={1.8} />
              </div>

              <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold text-foreground tracking-tight mb-0.5 sm:mb-1">
                {item.value}
              </div>

              <div className="text-xs sm:text-xs md:text-sm font-semibold text-muted-foreground mb-0.5 sm:mb-1">
                {item.label}
              </div>

              {item.extra && item.extra}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="w-full px-3 sm:px-5 lg:px-6 xl:px-8 mt-8 sm:mt-12 md:mt-16">
        <motion.nav 
          className="inline-flex bg-card border border-border p-1 sm:p-1.5 rounded-lg sm:rounded-xl md:rounded-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
          role="tablist"
          aria-label="Exam Tabs"
        >
          {(['upcoming', 'completed', 'results'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm md:text-base font-semibold rounded-md sm:rounded-lg md:rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                activeTab === tab
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
            >
              <span className="hidden sm:inline">
                {tab === 'upcoming' ? t('learnerExams.upcoming') 
                 : tab === 'completed' ? t('learnerExams.completedTab') 
                 : t('learnerExams.results')}
              </span>
              <span className="sm:hidden">
                {tab === 'upcoming' ? 'Upcoming' 
                 : tab === 'completed' ? 'Done' 
                 : 'Results'}
              </span>
            </button>
          ))}
        </motion.nav>
      </div>

      <div className="w-full px-3 sm:px-5 lg:px-6 xl:px-8 mt-6 sm:mt-8 md:mt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {activeTab === 'upcoming' && (
              <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
                {upcomingExams.length === 0 ? (
                  <motion.div variants={cardVariants} className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center">
                    <Calendar className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-2 sm:mb-3 md:mb-4 opacity-80" />
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-1 sm:mb-2 md:mb-3">{t('learnerExams.noUpcomingExams')}</h3>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground">{t('learnerExams.comeBackLater')}</p>
                  </motion.div>
                ) : (
                  upcomingExams.map((exam) => (
                    <motion.div 
                      key={exam.id}
                      variants={cardVariants}
                      className="bg-card border border-border rounded-2xl p-4 sm:p-6 md:p-7 hover:border-primary/30 transition-colors duration-400 group focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                      tabIndex={0}
                      role="article"
                      aria-label={`Upcoming exam: ${exam.title}`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground group-hover:text-indigo-700 transition-colors leading-tight">
                              {exam.title}
                            </h3>
                            <Badge className="bg-brand-light text-primary border-primary/20 px-2 sm:px-3 py-1 text-xs sm:text-sm flex-shrink-0">
                              {t('learnerExams.scheduled')}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground mb-3 sm:mb-5 font-medium text-sm sm:text-base">{exam.course}</p>

                          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm mb-3 sm:mb-4 md:mb-6">
                            <div className="flex items-center gap-1.5 sm:gap-2.5">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary" />
                              <span className="truncate">{exam.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2.5">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary" />
                              <span className="truncate">{exam.duration}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2.5">
                              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary" />
                              <span>{exam.questions} {t('learnerExams.questions')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2.5">
                              <Award className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary" />
                              <span>≥ {exam.passingScore}%</span>
                            </div>
                          </div>

                          <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
                            <div className="flex justify-between text-xs sm:text-sm font-medium">
                              <span className="text-muted-foreground">Readiness</span>
                              <span className={cn(
                                exam.readiness >= 75 ? "text-emerald-600" :
                                exam.readiness >= 50 ? "text-amber-600" : "text-red-600"
                              )}>
                                {exam.readiness}%
                              </span>
                            </div>
                            <Progress 
                              value={exam.readiness} 
                              className="h-1.5 sm:h-2 md:h-2.5 bg-muted"
                              indicatorClassName={cn(
                                exam.readiness >= 75 ? "bg-success" :
                                exam.readiness >= 50 ? "bg-warning" :
                                "bg-destructive",
                                exam.readiness < 50 && !shouldReduceMotion ? "animate-pulse" : ""
                              )}
                            />
                          </div>
                        </div>

                        <Button 
                          size="lg"
                          type="button"
                          onClick={() => router.push(`/${locale}/dashboard/learner/examens/${exam.id}/take`)}
                          className="bg-primary hover:bg-primary/90 min-w-[120px] sm:min-w-[140px] md:min-w-[180px] h-9 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base font-semibold gap-1.5 sm:gap-2 hover:scale-105 transition-transform"
                        >
                          <span className="hidden sm:inline">{t('learnerExams.startExam')}</span>
                          <span className="sm:hidden">Start</span>
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'completed' && (
              <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
                {completedExams.length === 0 ? (
                  <motion.div variants={cardVariants} className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center">
                    <Trophy className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-2 sm:mb-3 md:mb-4 opacity-80" />
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-1 sm:mb-2 md:mb-3">{t('learnerExams.noCompletedExams', { defaultValue: 'No completed exams yet' })}</h3>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground">{t('learnerExams.completeExamsToSeeHere', { defaultValue: 'Complete exams to see your results here.' })}</p>
                  </motion.div>
                ) : (
                completedExams.map((exam) => {
                  const isPassed = exam.status === 'passed';
                  return (
                    <motion.div 
                      key={exam.id}
                      variants={cardVariants}
                      className="bg-card border border-border rounded-2xl p-4 sm:p-6 md:p-7 hover:border-primary/30 transition-colors duration-400 group focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                      tabIndex={0}
                      role="article"
                      aria-label={`Completed exam: ${exam.title}, score ${exam.score}%`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
                        <div className="flex-1">
                          <div className="flex flex-col gap-2 mb-3 sm:mb-4">
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground group-hover:text-indigo-700 transition-colors leading-tight">
                              {exam.title}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge 
                                className={cn(
                                  "px-2 sm:px-3 py-1 text-xs sm:text-sm transition-transform hover:scale-105",
                                  isPassed 
                                    ? "bg-success text-white" 
                                    : "bg-destructive text-destructive-foreground"
                                )}
                              >
                                {isPassed ? t('learnerExams.passed') : t('learnerExams.failed')}
                              </Badge>
                              {exam.streakBonus && (
                                <Badge className="bg-warning/10 text-warning transition-transform hover:scale-105 text-xs sm:text-sm">
                                  <span className="hidden sm:inline">Streak Bonus! </span>
                                  <span className="sm:hidden">Bonus! </span>
                                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 inline ml-1" />
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-muted-foreground mb-3 sm:mb-5 font-medium text-sm sm:text-base">{exam.course}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-1.5 sm:gap-2.5">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary" />
                              <span className="truncate">{exam.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2.5">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary" />
                              <span className="truncate">{exam.timeSpent}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2.5">
                              <Award className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary" />
                              <span className={cn(
                                isPassed ? "text-success font-bold" : "text-destructive font-bold"
                              )}>
                                {exam.score}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
                )}
              </motion.div>
            )}

            {activeTab === 'results' && (
              <motion.div 
                variants={cardVariants}
                className="bg-card rounded-2xl sm:rounded-3xl border border-border p-6 sm:p-8 md:p-10 lg:p-16 text-center"
                role="region"
                aria-label="Performance Analysis"
              >
                <motion.div 
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 sm:mb-6 md:mb-8"
                  whileHover={!shouldReduceMotion ? { rotate: 5, scale: 1.05 } : {}}
                >
                  <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary-foreground" />
                </motion.div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2 sm:mb-3">{t('learnerExams.performanceAnalysis')}</h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-4 sm:mb-6 leading-relaxed">
                  {t('learnerExams.performanceDescription')}
                </p>
                <Button 
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-sm sm:text-base md:text-lg px-4 sm:px-6 py-2 sm:py-3 hover:scale-105 transition-transform"
                >
                  {t('learnerExams.requestReport')}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Custom CSS for flame flicker (add to global styles if needed)
const styles = `
@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
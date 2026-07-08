'use client';

import { useState, useEffect } from 'react';
import {
  Target, Calendar, Award, CheckCircle2,
  Plus, Edit2, Trash2, Search,
  ChevronRight, Star, Zap, Flag, Briefcase, BookOpen,
  X, Save, Sparkles, Trophy, Rocket
} from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Textarea } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGoals,
  useTodayDailyGoals,
  useCurrentWeeklyGoals,
  useGoalStats,
  useDailyStats,
  useWeeklyStats,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useToggleDailyGoalComplete,
  useCreateDailyGoal,
  useUpdateDailyGoal,
  useDeleteDailyGoal,
  useCreateWeeklyGoal,
  useUpdateWeeklyGoal,
  useDeleteWeeklyGoal,
  useUpdateWeeklyGoalProgress,
} from '@/hooks/api/useGoals';
import type { Goal, DailyGoal, WeeklyGoal } from '@/services/goals';

const DEFAULT_FORM_DATA: {
  title: string;
  description: string;
  category: Goal['category'];
  priority: Goal['priority'];
  successCriteria: string;
  deadline: string;
  motivation: string;
  milestones: string[];
} = {
  title: '',
  description: '',
  category: 'certification',
  priority: 'medium',
  successCriteria: '',
  deadline: '',
  motivation: '',
  milestones: [],
};

export function GoalsWidget() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: goals = [], error: goalsError, isLoading: goalsLoading } = useGoals();
  const { data: dailyGoals = [], isLoading: dailyLoading } = useTodayDailyGoals();
  const { data: weeklyGoals = [], isLoading: weeklyLoading } = useCurrentWeeklyGoals();
  const { data: goalStats = { total: 0, completed: 0, onTrack: 0, behind: 0 } } = useGoalStats();
  const { data: dailyStats = { total: 0, completed: 0, points: 0 } } = useDailyStats();
  const { data: weeklyStats = { total: 0, completed: 0, averageProgress: 0 } } = useWeeklyStats();

  const createGoal = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();
  const toggleDaily = useToggleDailyGoalComplete();
  const createDaily = useCreateDailyGoal();
  const updateDaily = useUpdateDailyGoal();
  const deleteDaily = useDeleteDailyGoal();
  const createWeekly = useCreateWeeklyGoal();
  const updateWeekly = useUpdateWeeklyGoal();
  const deleteWeekly = useDeleteWeeklyGoal();
  const updateWeeklyProgressMutation = useUpdateWeeklyGoalProgress();

  const loading = goalsLoading || dailyLoading || weeklyLoading;
  const error = goalsError;

  const [showDailyEditModal, setShowDailyEditModal] = useState(false);
  const [selectedDailyGoal, setSelectedDailyGoal] = useState<DailyGoal | null>(null);
  const [dailyFormData, setDailyFormData] = useState({
    title: '',
    points: 5,
    completed: false
  });

  const [showWeeklyEditModal, setShowWeeklyEditModal] = useState(false);
  const [selectedWeeklyGoal, setSelectedWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [weeklyFormData, setWeeklyFormData] = useState<{
    title: string;
    progress: number;
    target: number;
    category: 'certification' | 'course' | 'skill' | 'career';
    description: string;
  }>({
    title: '',
    progress: 0,
    target: 100,
    category: 'course',
    description: ''
  });

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<typeof DEFAULT_FORM_DATA>({ ...DEFAULT_FORM_DATA });

  // Stats from API
  const totalGoals = goalStats.total;
  const completedGoals = goalStats.completed;
  const onTrackGoals = goalStats.onTrack;
  const dailyCompleted = dailyStats.completed;
  const dailyPoints = dailyStats.points;
  const weeklyAvgProgress = weeklyStats.averageProgress;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-white';
      case 'low': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'certification': return <Award className="h-5 w-5" />;
      case 'course': return <BookOpen className="h-5 w-5" />;
      case 'skill': return <Zap className="h-5 w-5" />;
      case 'career': return <Briefcase className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'bg-success text-white';
      case 'behind': return 'bg-destructive text-destructive-foreground';
      case 'completed': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const toggleDailyGoal = async (id: number) => {
    if (id && !isNaN(id)) {
      try {
        await toggleDaily.mutateAsync(id);
      } catch {
        showToast(t('learnerGoals.toastUpdateError'), 'error');
      }
    }
  };

  const openDailyEditModal = (goal?: DailyGoal) => {
    if (goal) {
      setSelectedDailyGoal(goal);
      setDailyFormData({
        title: goal.title,
        points: goal.points,
        completed: goal.completed
      });
    } else {
      setSelectedDailyGoal(null);
      setDailyFormData({
        title: '',
        points: 5,
        completed: false
      });
    }
    setShowDailyEditModal(true);
  };

  const closeDailyEditModal = () => {
    setShowDailyEditModal(false);
    setSelectedDailyGoal(null);
  };

  const handleUpdateDailyGoal = async () => {
    try {
      if (selectedDailyGoal && selectedDailyGoal.id && !isNaN(selectedDailyGoal.id)) {
        await updateDaily.mutateAsync({ id: selectedDailyGoal.id, data: dailyFormData });
        showToast(t('learnerGoals.toastDailyUpdated'), 'success');
      } else {
        await createDaily.mutateAsync(dailyFormData);
        showToast(t('learnerGoals.toastDailyCreated'), 'success');
      }
      closeDailyEditModal();
    } catch {
      showToast(t('learnerGoals.toastDailySaveError'), 'error');
    }
  };

  const handleDeleteDailyGoal = async (id: number) => {
    if (confirm(String(t('confirm_delete_daily'))) && id && !isNaN(id)) {
      try {
        await deleteDaily.mutateAsync(id);
        showToast(t('learnerGoals.toastDailyDeleted'), 'success');
      } catch {
        showToast(t('learnerGoals.toastDeleteError'), 'error');
      }
    }
  };

  const openUpdateModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description,
      category: goal.category,
      priority: goal.priority,
      successCriteria: goal.successCriteria,
      deadline: goal.deadline,
      motivation: goal.motivation,
      milestones: goal.milestones
    });
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedGoal(null);
  };

  const handleUpdateGoal = async () => {
    try {
      if (selectedGoal && selectedGoal.id && !isNaN(selectedGoal.id)) {
        await updateGoalMutation.mutateAsync({ id: selectedGoal.id, data: formData });
        showToast(t('learnerGoals.toastGoalUpdated'), 'success');
        closeUpdateModal();
      }
    } catch {
      showToast(t('learnerGoals.toastUpdateError'), 'error');
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (confirm(String(t('confirm_delete_goal'))) && id && !isNaN(id)) {
      try {
        await deleteGoalMutation.mutateAsync(id);
        showToast(t('learnerGoals.toastGoalDeleted'), 'success');
      } catch {
        showToast(t('learnerGoals.toastDeleteError'), 'error');
      }
    }
  };

  const handleNewGoal = async () => {
    try {
      await createGoal.mutateAsync(formData);
      showToast(t('learnerGoals.toastGoalCreated'), 'success');
      setShowNewGoalModal(false);
      setFormData({ ...DEFAULT_FORM_DATA });
    } catch {
      showToast(t('learnerGoals.toastGoalCreateError'), 'error');
    }
  };

  const updateWeeklyProgress = async (id: number, delta: number) => {
    if (id && !isNaN(id)) {
      try {
        await updateWeeklyProgressMutation.mutateAsync({ id, delta });
      } catch {
        showToast(t('learnerGoals.toastUpdateError'), 'error');
      }
    }
  };

  const openWeeklyEditModal = (goal?: WeeklyGoal) => {
    if (goal) {
      setSelectedWeeklyGoal(goal);
      setWeeklyFormData({
        title: goal.title,
        progress: goal.progress,
        target: goal.target,
        category: goal.category,
        description: goal.description
      });
    } else {
      setSelectedWeeklyGoal(null);
      setWeeklyFormData({
        title: '',
        progress: 0,
        target: 100,
        category: 'course',
        description: ''
      });
    }
    setShowWeeklyEditModal(true);
  };

  const closeWeeklyEditModal = () => {
    setShowWeeklyEditModal(false);
    setSelectedWeeklyGoal(null);
  };

  const handleUpdateWeeklyGoal = async () => {
    try {
      if (selectedWeeklyGoal && selectedWeeklyGoal.id && !isNaN(selectedWeeklyGoal.id)) {
        await updateWeekly.mutateAsync({ id: selectedWeeklyGoal.id, data: weeklyFormData });
        showToast(t('learnerGoals.toastWeeklyUpdated'), 'success');
      } else {
        await createWeekly.mutateAsync(weeklyFormData);
        showToast(t('learnerGoals.toastWeeklyUpdated'), 'success');
      }
      closeWeeklyEditModal();
    } catch {
      showToast(t('learnerGoals.toastUpdateError'), 'error');
    }
  };

  const handleDeleteWeeklyGoal = async (id: number) => {
    if (confirm(String(t('confirm_delete_weekly'))) && id && !isNaN(id)) {
      try {
        await deleteWeekly.mutateAsync(id);
        showToast(t('learnerGoals.toastWeeklyDeleted'), 'success');
      } catch {
        showToast(t('learnerGoals.toastDeleteError'), 'error');
      }
    }
  };

  const filteredGoals = goals.filter(goal => {
    const matchesFilter = selectedFilter === 'all' || 
      goal.category === selectedFilter || 
      goal.priority === selectedFilter;
    const matchesSearch = goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         goal.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const motivationalQuotes = t.raw('learnerGoals.quotes', { returnObjects: true }) as string[];
  const [randomQuote, setRandomQuote] = useState('');

  useEffect(() => {
    if (motivationalQuotes?.length) {
      setRandomQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statStyles: Record<string, {
    overlay: string;
    iconWrap: string;
    icon: string;
  }> = {
    indigo: {
      overlay: 'bg-primary/5',
      iconWrap: 'bg-brand-light',
      icon: 'text-primary',
    },
    emerald: {
      overlay: 'bg-success-muted/50',
      iconWrap: 'bg-success-muted',
      icon: 'text-success-text',
    },
    amber: {
      overlay: 'bg-warning/10',
      iconWrap: 'bg-warning/10',
      icon: 'text-warning',
    },
    purple: {
      overlay: 'bg-secondary/50',
      iconWrap: 'bg-secondary',
      icon: 'text-secondary-foreground',
    },
  };

  return (
    <TooltipProvider>
  
        <div className="space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <div className="flex items-center">
                <div className="text-red-600">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error?.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
              <div>
              <div className="mb-8 md:mb-12 text-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4 tracking-tight">
                  {t('learnerGoals.pageTitle')}
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-warning animate-pulse" />
                  {randomQuote}
                </p>
              </div>

              <motion.div 
                className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, staggerChildren: 0.1 }}
              >
                {[
                  { icon: Target, value: totalGoals, label: t('learnerGoals.statTotalGoals'), color: "indigo" },
                  { icon: Trophy, value: completedGoals, label: t('learnerGoals.statCompleted'), color: "emerald" },
                  { icon: Rocket, value: `${dailyCompleted}/${dailyStats.total}`, label: t('learnerGoals.statDaily'), color: "amber" },
                  { icon: Star, value: dailyPoints, label: t('learnerGoals.statPointsEarned'), color: "purple" }
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  const styles = statStyles[stat.color] ?? statStyles.indigo;
                  return (
                    <motion.div
                      key={index}
                      className={`bg-white/70 backdrop-blur-xl rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/30 overflow-hidden relative`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`absolute inset-0 ${styles.overlay} opacity-50`} />
                      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className={`p-1.5 sm:p-2 md:p-3 ${styles.iconWrap} rounded-full`}>
                          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${styles.icon}`} />
                        </div>
                        <div className="text-right">
                          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground block">{stat.value}</span>
                        </div>
                      </div>
                      <p className="mt-1.5 sm:mt-2 md:mt-3 text-xs sm:text-sm md:text-base text-muted-foreground text-center sm:text-left">{stat.label}</p>
                    </motion.div>
                  );
                })}
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
                <motion.div 
                  className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-5 md:p-6 lg:p-8 border border-white/30"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{t('learnerGoals.dailyTitle')}</h2>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <Badge className="bg-success-muted text-success-text border-success/30 text-xs sm:text-sm">
                        {t('learnerGoals.dailyDoneCount', { done: String(dailyStats.completed), total: String(dailyStats.total) })}
                      </Badge>
                      <Badge className="bg-secondary/50 text-secondary-foreground border-secondary/50 text-xs sm:text-sm">
                        {dailyStats.points} pts
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => openDailyEditModal()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('learnerGoals.dailyAddTooltip')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <AnimatePresence>
                    <div className="space-y-3">
                      {dailyGoals.map(goal => (
                        <motion.div
                          key={goal.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`flex items-center justify-between p-2.5 sm:p-3 md:p-4 rounded-xl border transition-all group ${
                            goal.completed 
                              ? 'bg-success-muted/50 border-success/30' 
                              : 'bg-muted/50 border-border hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3 flex-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    if (goal.id && !isNaN(goal.id)) {
                                      toggleDailyGoal(goal.id);
                                    } else {
                                      console.error('Invalid goal ID in toggle:', goal.id);
                                    }
                                  }}
                                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
                                    goal.completed
                                      ? 'bg-success border-success'
                                      : 'border-border hover:border-success/50'
                                  }`}
                                >
                                  {goal.completed && (
                                    <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{goal.completed ? t('learnerGoals.dailyMarkUndone') : t('learnerGoals.dailyMarkDone')}</TooltipContent>
                            </Tooltip>
                            <div className="flex-1">
                              <span className={`text-xs sm:text-sm md:text-base ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                                {goal.title}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">+{goal.points} pts</Badge>
                                {goal.completed && (
                                  <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="flex items-center gap-1 text-success text-xs font-medium"
                                  >
                                    <Trophy className="h-3 w-3" />
                                    <span>{t('learnerGoals.bravo')}</span>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openDailyEditModal(goal)}
                                >
                                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('learnerGoals.editTooltip')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600"
                                  onClick={() => handleDeleteDailyGoal(goal.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('learnerGoals.deleteTooltip')}</TooltipContent>
                            </Tooltip>
                          </div>
                        </motion.div>
                      ))}
                      {dailyGoals.length === 0 && (
                        <motion.div 
                          className="text-center py-12 text-muted-foreground"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <Target className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-base font-medium">{t('learnerGoals.dailyEmpty')}</p>
                          <p className="text-sm mt-2">{t('learnerGoals.dailyEmptyHint')}</p>
                        </motion.div>
                      )}
                    </div>
                  </AnimatePresence>
                </motion.div>

                <motion.div 
                  className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-5 md:p-6 lg:p-8 border border-white/30"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex flex-col gap-3 sm:gap-4 mb-5 md:mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">{t('learnerGoals.weeklyTitle')}</h2>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-sm">
                        {t('learnerGoals.weeklyAverage', { avg: String(weeklyStats.averageProgress) })}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => openWeeklyEditModal()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('learnerGoals.weeklyAddTooltip')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <AnimatePresence>
                    <div className="space-y-4">
                      {weeklyGoals.map(goal => (
                        <motion.div 
                          key={goal.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-semibold text-foreground">{goal.title}</h4>
                              <Badge variant="outline" className="text-xs capitalize">{goal.category}</Badge>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      if (goal.id && !isNaN(goal.id)) {
                                        toggleDailyGoal(goal.id);
                                      } else {
                                        console.error('Invalid goal ID in toggle:', goal.id);
                                      }
                                    }}
                                  >
                                    <ChevronRight className="h-4 w-4 rotate-180" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('learnerGoals.weeklyDecreaseTooltip')}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      if (goal.id && !isNaN(goal.id)) {
                                        updateWeeklyProgress(goal.id, 10);
                                      } else {
                                        console.error('Invalid goal ID in progress update:', goal.id);
                                      }
                                    }}
                                    disabled={goal.progress >= 100}
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('learnerGoals.weeklyIncreaseTooltip')}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openWeeklyEditModal(goal)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('learnerGoals.editTooltip')}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600"
                                    onClick={() => handleDeleteWeeklyGoal(goal.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('learnerGoals.deleteTooltip')}</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                          <div className="progress-bar-track !h-3 overflow-hidden rounded-full">
                            <div
                              className="progress-bar-fill !h-3 rounded-full"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                            <span>{goal.progress}% / {goal.target}%</span>
                            {goal.progress >= 100 && (
                              <motion.span 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-1 text-success font-medium"
                              >
                                <Trophy className="h-4 w-4" />
                                {t('learnerGoals.completedBadge')}
                              </motion.span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {weeklyGoals.length === 0 && (
                        <motion.div 
                          className="text-center py-12 text-muted-foreground"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <Calendar className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-base font-medium">{t('learnerGoals.weeklyEmpty')}</p>
                          <p className="text-sm mt-2">{t('learnerGoals.weeklyEmptyHint')}</p>
                        </motion.div>
                      )}
                    </div>
                  </AnimatePresence>
                </motion.div>
              </div>

              <motion.div 
                className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-white/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-4 sm:p-5 md:p-6 border-b border-border flex flex-col gap-4">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">{t('learnerGoals.activeTitle')}</h2>
                  <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('learnerGoals.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-xl"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
                          <SelectValue placeholder={t('learnerGoals.filterPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('learnerGoals.filterAll')}</SelectItem>
                          <SelectItem value="certification">{t('learnerGoals.filterCertifications')}</SelectItem>
                          <SelectItem value="course">{t('learnerGoals.filterCourses')}</SelectItem>
                          <SelectItem value="skill">{t('learnerGoals.filterSkills')}</SelectItem>
                          <SelectItem value="high">{t('learnerGoals.filterHighPriority')}</SelectItem>
                          <SelectItem value="medium">{t('learnerGoals.filterMediumPriority')}</SelectItem>
                          <SelectItem value="low">{t('learnerGoals.filterLowPriority')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={() => {
                          setFormData({ ...DEFAULT_FORM_DATA });
                          setShowNewGoalModal(true);
                        }}
                        className="bg-primary hover:bg-primary/90 rounded-xl whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{t('learnerGoals.newGoalBtn')}</span>
                        <span className="sm:hidden">{t('learnerGoals.addBtn')}</span>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-5 md:p-6">
                  <AnimatePresence>
                    {filteredGoals.length === 0 ? (
                      <motion.div 
                        className="text-center py-16 text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Flag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-base font-medium">{t('learnerGoals.emptyGoals')}</p>
                        <p className="text-sm mt-2">{t('learnerGoals.emptyGoalsHint')}</p>
                      </motion.div>
                    ) : (
                      <div className="space-y-6">
                        {filteredGoals.map(goal => (
                          <motion.div 
                            key={goal.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card border border-border rounded-2xl p-5 md:p-6 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2 sm:p-3 bg-brand-light rounded-full shrink-0">
                                    {getCategoryIcon(goal.category)}
                                  </div>
                                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground truncate">{goal.title}</h3>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <Badge className={getPriorityColor(goal.priority)}>{goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}</Badge>
                                  <Badge className={getStatusColor(goal.status)}>{goal.status.replace('-', ' ').charAt(0).toUpperCase() + goal.status.replace('-', ' ').slice(1)}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{goal.description}</p>
                                <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="truncate">{goal.deadline}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="truncate">{goal.motivation}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1 sm:gap-2 ml-2 shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => openUpdateModal(goal)} className="h-8 w-8">
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('learnerGoals.editTooltip')}</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteGoal(goal.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('learnerGoals.deleteTooltip')}</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>

                            <div className="mb-4">
                              <div className="flex justify-between text-xs sm:text-sm mb-2">
                                <span className="font-medium text-muted-foreground">{t('learnerGoals.progressionLabel')}</span>
                                <span className="font-bold text-foreground">{goal.progress}%</span>
                              </div>
                              <div className="progress-bar-track overflow-hidden rounded-full !h-2 sm:!h-3">
                                <div
                                  className="progress-bar-fill rounded-full !h-2 sm:!h-3"
                                  style={{ width: `${goal.progress}%` }}
                                />
                              </div>
                            </div>

                            <div className="mb-4">
                              <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2">{t('learnerGoals.successCriteriaLabel')}</h4>
                              <div className="bg-muted/50 rounded-xl p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground border border-border">
                                {goal.successCriteria}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-3">{t('learnerGoals.milestonesLabel')}</h4>
                              <div className="space-y-2">
                                {Array.isArray(goal.milestones) && goal.milestones.map((milestone, index) => (
                                  <div
                                    key={index}
                                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl text-xs sm:text-sm ${
                                      Array.isArray(goal.completedMilestones) && goal.completedMilestones.includes(milestone)
                                        ? 'bg-success-muted/50 text-success-text border border-success/30'
                                        : 'bg-muted/50 text-muted-foreground border border-border'
                                    }`}
                                  >
                                    {Array.isArray(goal.completedMilestones) && goal.completedMilestones.includes(milestone) ? (
                                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0" />
                                    ) : (
                                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-border rounded-full flex-shrink-0" />
                                    )}
                                    <span className="truncate">{milestone}</span>
                                  </div>
                                ))}
                                {(!Array.isArray(goal.milestones) || goal.milestones.length === 0) && (
                                  <p className="text-xs sm:text-sm text-muted-foreground italic">{t('learnerGoals.noMilestones')}</p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          )}
        </div>
    

      {/* Update Goal Modal */}
      <AnimatePresence>
        {showUpdateModal && selectedGoal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('learnerGoals.updateGoalTitle')}</h3>
                  <p className="text-sm text-gray-600">{t('learnerGoals.updateGoalSubtitle')}</p>
                </div>
                <Button variant="ghost" onClick={closeUpdateModal} className="shrink-0">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelTitle')}</label>
                  <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelDescription')}</label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelCategory')}</label>
                    <Select value={formData.category} onValueChange={(v: 'certification' | 'course' | 'skill' | 'career') => setFormData({...formData, category: v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="certification">{t('learnerGoals.catCertification')}</SelectItem>
                        <SelectItem value="course">{t('learnerGoals.catCourse')}</SelectItem>
                        <SelectItem value="skill">{t('learnerGoals.catSkill')}</SelectItem>
                        <SelectItem value="career">{t('learnerGoals.catCareer')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelPriority')}</label>
                    <Select value={formData.priority} onValueChange={(v: 'high' | 'medium' | 'low') => setFormData({...formData, priority: v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">{t('learnerGoals.prioHigh')}</SelectItem>
                        <SelectItem value="medium">{t('learnerGoals.prioMedium')}</SelectItem>
                        <SelectItem value="low">{t('learnerGoals.prioLow')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelSuccessCriteria')}</label>
                  <Input value={formData.successCriteria} onChange={(e) => setFormData({...formData, successCriteria: e.target.value})} className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelDeadline')}</label>
                  <Input type="date" value={formData.deadline} onChange={(e) => setFormData({...formData, deadline: e.target.value})} className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelMotivation')}</label>
                  <Input value={formData.motivation} onChange={(e) => setFormData({...formData, motivation: e.target.value})} className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelMilestones')}</label>
                  <Textarea value={formData.milestones.join('\n')} onChange={(e) => setFormData({...formData, milestones: e.target.value.split('\n').filter(m => m.trim())})} rows={4} className="rounded-xl" placeholder={t('learnerGoals.milestonePlaceholder')} />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={closeUpdateModal}>{t('learnerGoals.cancelBtn')}</Button>
                  <Button className="bg-primary hover:bg-primary/90 rounded-xl w-full sm:w-auto" onClick={handleUpdateGoal}>
                    <Save className="h-4 w-4 mr-2" />{t('learnerGoals.updateBtn')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Goal Modal */}
      <AnimatePresence>
        {showNewGoalModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('learnerGoals.newGoalTitle')}</h3>
                  <p className="text-sm text-gray-600">{t('learnerGoals.newGoalSubtitle')}</p>
                </div>
                <Button variant="ghost" onClick={() => setShowNewGoalModal(false)} className="shrink-0">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelTitle')}</label>
                  <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelDescription')}</label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelCategory')}</label>
                    <Select value={formData.category} onValueChange={(v: 'certification' | 'course' | 'skill' | 'career') => setFormData({...formData, category: v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="certification">{t('learnerGoals.catCertification')}</SelectItem>
                        <SelectItem value="course">{t('learnerGoals.catCourse')}</SelectItem>
                        <SelectItem value="skill">{t('learnerGoals.catSkill')}</SelectItem>
                        <SelectItem value="career">{t('learnerGoals.catCareer')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelPriority')}</label>
                    <Select value={formData.priority} onValueChange={(v: 'high' | 'medium' | 'low') => setFormData({...formData, priority: v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">{t('learnerGoals.prioHigh')}</SelectItem>
                        <SelectItem value="medium">{t('learnerGoals.prioMedium')}</SelectItem>
                        <SelectItem value="low">{t('learnerGoals.prioLow')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelSuccessCriteria')}</label>
                  <Input value={formData.successCriteria} onChange={(e) => setFormData({...formData, successCriteria: e.target.value})} className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelDeadline')}</label>
                  <Input type="date" value={formData.deadline} onChange={(e) => setFormData({...formData, deadline: e.target.value})} className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelMotivation')}</label>
                  <Input value={formData.motivation} onChange={(e) => setFormData({...formData, motivation: e.target.value})} className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelMilestones')}</label>
                  <Textarea value={formData.milestones.join('\n')} onChange={(e) => setFormData({...formData, milestones: e.target.value.split('\n').filter(m => m.trim())})} rows={4} className="rounded-xl" placeholder={t('learnerGoals.milestonePlaceholder')} />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={() => setShowNewGoalModal(false)}>{t('learnerGoals.cancelBtn')}</Button>
                  <Button className="bg-primary hover:bg-primary/90 rounded-xl w-full sm:w-auto" onClick={handleNewGoal}>
                    <Plus className="h-4 w-4 mr-2" />{t('learnerGoals.createBtn')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Goal Modal */}
      <AnimatePresence>
        {showDailyEditModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl sm:rounded-3xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    {selectedDailyGoal ? t('learnerGoals.dailyModalEditTitle') : t('learnerGoals.dailyModalNewTitle')}
                  </h3>
                  <p className="text-sm text-gray-600">{t('learnerGoals.dailyModalSubtitle')}</p>
                </div>
                <Button variant="ghost" onClick={closeDailyEditModal} className="shrink-0">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelTitle')}</label>
                  <Input value={dailyFormData.title} onChange={(e) => setDailyFormData({...dailyFormData, title: e.target.value})} className="rounded-xl" placeholder={t('learnerGoals.titlePlaceholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelPoints')}</label>
                  <Input type="number" min={1} max={50} value={dailyFormData.points} onChange={(e) => setDailyFormData({...dailyFormData, points: Number(e.target.value)})} className="rounded-xl" />
                </div>
                {selectedDailyGoal && (
                  <div className="flex items-center gap-2">
                    <Input type="checkbox" id="daily-completed" checked={dailyFormData.completed} onChange={(e) => setDailyFormData({...dailyFormData, completed: e.target.checked})} className="h-4 w-4" />
                    <label htmlFor="daily-completed" className="text-sm text-gray-700">{t('learnerGoals.labelDone')}</label>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={closeDailyEditModal}>{t('learnerGoals.cancelBtn')}</Button>
                  <Button className="bg-primary hover:bg-primary/90 rounded-xl w-full sm:w-auto" onClick={handleUpdateDailyGoal}>
                    <Save className="h-4 w-4 mr-2" />
                    {selectedDailyGoal ? t('learnerGoals.updateBtn') : t('learnerGoals.addBtn')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weekly Goal Modal */}
      <AnimatePresence>
        {showWeeklyEditModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    {selectedWeeklyGoal ? t('learnerGoals.weeklyModalEditTitle') : t('learnerGoals.weeklyModalNewTitle')}
                  </h3>
                  <p className="text-sm text-gray-600">{t('learnerGoals.weeklyModalSubtitle')}</p>
                </div>
                <Button variant="ghost" onClick={closeWeeklyEditModal} className="shrink-0">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelTitle')}</label>
                  <Input value={weeklyFormData.title} onChange={(e) => setWeeklyFormData({...weeklyFormData, title: e.target.value})} className="rounded-xl" placeholder={t('learnerGoals.weeklyTitlePlaceholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelDescription')}</label>
                  <Textarea value={weeklyFormData.description} onChange={(e) => setWeeklyFormData({...weeklyFormData, description: e.target.value})} rows={2} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelCategory')}</label>
                    <Select value={weeklyFormData.category} onValueChange={(v: 'certification' | 'course' | 'skill' | 'career') => setWeeklyFormData({...weeklyFormData, category: v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="certification">{t('learnerGoals.catCertification')}</SelectItem>
                        <SelectItem value="course">{t('learnerGoals.catCourse')}</SelectItem>
                        <SelectItem value="skill">{t('learnerGoals.catSkill')}</SelectItem>
                        <SelectItem value="career">{t('learnerGoals.catCareer')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelProgressPct')}</label>
                    <Input type="number" min={0} max={100} value={weeklyFormData.progress} onChange={(e) => setWeeklyFormData({...weeklyFormData, progress: Number(e.target.value)})} className="rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('learnerGoals.labelTargetPct')}</label>
                  <Input type="number" min={1} max={100} value={weeklyFormData.target} onChange={(e) => setWeeklyFormData({...weeklyFormData, target: Number(e.target.value)})} className="rounded-xl" />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={closeWeeklyEditModal}>{t('learnerGoals.cancelBtn')}</Button>
                  <Button className="bg-primary hover:bg-primary/90 rounded-xl w-full sm:w-auto" onClick={handleUpdateWeeklyGoal}>
                    <Save className="h-4 w-4 mr-2" />
                    {selectedWeeklyGoal ? t('learnerGoals.updateBtn') : t('learnerGoals.addBtn')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}

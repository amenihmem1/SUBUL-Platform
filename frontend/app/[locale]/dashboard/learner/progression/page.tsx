'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  TrendingUp,
  Award,
  Clock,
  BookOpen,
  BarChart3,
  CheckCircle,
  Zap,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

import { useTranslation } from '@/contexts/LanguageContext';
import { useLearnerDashboard } from '@/hooks/api/useLearnerDashboard';

function parseStudyHours(value: string | undefined): number {
  if (!value) return 0;
  const m = value.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Math.round(parseFloat(m[1].replace(',', '.'))) : 0;
}

export default function ProgressionPage() {
  const { t } = useTranslation();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'fr';
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'achievements' | 'analytics'>('overview');

  const { data, isLoading, isError, error, refetch } = useLearnerDashboard();

  const stats = useMemo(() => {
    const s = data?.stats;
    const completedCourses = s?.coursesCompleted ?? 0;
    const inProgressCourses = s?.inProgress ?? 0;
    const totalCourses = completedCourses + inProgressCourses;
    const completedHours = parseStudyHours(s?.totalStudyTime);
    const totalHours = completedHours > 0
      ? Math.max(completedHours, Math.ceil(completedHours / 0.72))
      : 0;
    return {
      totalCourses,
      completedCourses,
      inProgressCourses,
      totalHours,
      completedHours,
    };
  }, [data?.stats]);

  const overallProgress = useMemo(() => {
    if (stats.completedHours > 0 && stats.totalHours > 0) {
      return Math.min(100, Math.round((stats.completedHours / stats.totalHours) * 100));
    }
    if (stats.totalCourses > 0) {
      return Math.round((stats.completedCourses / stats.totalCourses) * 100);
    }
    return 0;
  }, [stats]);

  const courses = useMemo(
    () =>
      (data?.activeCourses ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        progress: c.progress,
        timeSpent: c.duration,
        color: c.color,
      })),
    [data?.activeCourses],
  );

  const achievements: { id: number; title: string; desc: string; icon: typeof Zap; unlocked: boolean; date?: string; progress?: number }[] = useMemo(
    () => [
      {
        id: 1,
        title: t('learnerProgression.completed'),
        desc: `${stats.completedCourses} ${t('learnerProgression.courses')}`,
        icon: Zap,
        unlocked: stats.completedCourses > 0,
        progress: stats.totalCourses > 0 ? Math.round((stats.completedCourses / stats.totalCourses) * 100) : 0,
      },
      {
        id: 2,
        title: t('learnerDashboard.certificates'),
        desc: `${data?.stats.certificatesCount ?? 0} ${t('learnerDashboard.certificates')}`,
        icon: Award,
        unlocked: (data?.stats.certificatesCount ?? 0) > 0,
        progress: (data?.stats.certificatesCount ?? 0) > 0 ? 100 : 0,
      },
    ],
    [data?.stats.certificatesCount, stats.completedCourses, stats.totalCourses, t]
  );

  return (
    <div className="learner-page-shell min-h-screen pb-10 md:pb-14">
      {/* Hero Header – bleu moderne & pro */}
      <div className="bg-gradient-to-br from-indigo-700 via-blue-700 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              {t('learnerProgression.title')}
            </h1>
            <p className="mt-3 text-lg sm:text-xl text-blue-100/90 font-medium">
              {t('learnerProgression.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 -mt-10">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-10 w-72 rounded-xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-16 flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" aria-hidden />
          <p className="text-gray-800 font-medium">{t('common.error')}</p>
          <p className="text-sm text-gray-600 max-w-md">
            {error instanceof Error ? error.message : String(error ?? '')}
          </p>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <>
      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 -mt-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: BookOpen,    label: t('learnerProgression.courses'),    value: stats.totalCourses,      color: 'blue' },
            { icon: CheckCircle, label: t('learnerProgression.completed'),  value: stats.completedCourses,  color: 'emerald' },
            { icon: TrendingUp,  label: t('learnerProgression.inProgress'), value: stats.inProgressCourses, color: 'indigo' },
            { icon: Clock,       label: t('learnerProgression.hours'),      value: stats.completedHours,    color: 'cyan' },
          ].map((item, i) => (
            <div 
              key={i}
              className={cn(
                "bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/70 p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5",
                false
              )}
            >
              <item.icon className={`w-7 h-7 mx-auto mb-2 text-${item.color}-600`} />
              <div className="text-2xl font-bold text-gray-900">
                {item.value}
              </div>
              <div className="text-xs text-gray-600 mt-1 font-medium">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 mt-10">
        <div className="inline-flex bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-xl border border-gray-200">
          {(['overview', 'courses', 'achievements', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 sm:px-6 py-2.5 text-sm font-medium rounded-lg transition-all",
                activeTab === tab
                  ? "bg-white shadow-sm text-indigo-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              )}
            >
              {t(`learnerProgression.tabs.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 mt-8">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid gap-6">
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">{t('learnerProgression.overallProgress')}</h3>
                  <Badge variant="outline" className="text-indigo-700 border-indigo-200 bg-indigo-50">
                    {overallProgress}% {t('learnerProgression.done')}
                  </Badge>
                </div>
                
                <Progress 
                  value={overallProgress} 
                  className="h-3 mb-6" 
                  indicatorClassName="bg-gradient-to-r from-indigo-500 to-blue-600" 
                />
                
                <div className="grid sm:grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-gray-600">{t('learnerProgression.timeInvested')}</p>
                    <p className="text-xl font-semibold text-gray-900 mt-1">
                      {data?.stats.totalStudyTime ??
                        `${stats.completedHours} ${t('learnerProgression.hoursUnit')}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">{t('learnerProgression.timeRemaining')}</p>
                    <p className="text-xl font-semibold text-gray-900 mt-1">
                      {Math.max(0, stats.totalHours - stats.completedHours)} {t('learnerProgression.hoursUnit')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 md:p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-5">{t('learnerProgression.recentActivity')}</h3>
                {courses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">{t('learnerProgression.noRecentActivity')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courses.slice(0, 3).map((course) => (
                      <div key={course.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{course.title}</p>
                          <p className="text-xs text-gray-500">{course.timeSpent}</p>
                        </div>
                        <Badge variant="outline">{course.progress}%</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* COURSES */}
        {activeTab === 'courses' && (
          <div className="space-y-5 md:space-y-6">
            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-10 text-center text-gray-600">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-indigo-400" aria-hidden />
                <p className="font-medium text-gray-900">{t('common.noData')}</p>
                <Button
                  className="mt-6 bg-gradient-to-r from-indigo-600 to-blue-600"
                  onClick={() => router.push(`/${locale}/dashboard/learner/cours`)}
                >
                  {t('learnerDashboard.continue') ?? 'Continue'}
                </Button>
              </div>
            ) : null}
            {courses.map((course) => (
              <div 
                key={course.id} 
                className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-6 md:p-7 hover:shadow-md transition-all duration-200 hover:border-indigo-200/60 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                    {course.title}
                  </h3>
                  <Badge className={cn(
                    "bg-gradient-to-r text-white border-none px-4 py-1.5 text-sm font-medium",
                    course.color
                  )}>
                    {course.progress}% 
                  </Badge>
                </div>

                <Progress 
                  value={course.progress} 
                  className="h-2.5 mb-5" 
                  indicatorClassName={`bg-gradient-to-r ${course.color}`} 
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div>
                    <p className="text-gray-600">{t('learnerProgression.timeSpent')}</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{course.timeSpent}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 gap-2 group"
                    onClick={() => router.push(`/${locale}/dashboard/learner/cours`)}
                  >
                    {t('learnerProgression.continueLearning')}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ACHIEVEMENTS */}
        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Badge variant="outline" className="text-xs font-normal text-gray-500 border-gray-200 bg-gray-50">
                {t('certifications.comingSoon')}
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={cn(
                  "bg-white rounded-2xl shadow-sm border p-6 text-center transition-all duration-300",
                  ach.unlocked 
                    ? "border-indigo-200 hover:shadow-lg hover:border-indigo-300 scale-[1.01]" 
                    : "opacity-70 border-gray-200 hover:opacity-90"
                )}
              >
                <div className="text-5xl mb-5">
                  <ach.icon className={ach.unlocked ? "text-indigo-600" : "text-gray-400"} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{ach.title}</h3>
                <p className="text-sm text-gray-600 mb-5 min-h-[2.5rem]">{ach.desc}</p>
                
                {ach.unlocked ? (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                    Débloqué • {ach.date}
                  </Badge>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">Progression : {ach.progress}%</div>
                    <Progress value={ach.progress} className="h-2" indicatorClassName="bg-indigo-400" />
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-10 md:p-16 text-center">
            <BarChart3 className="w-20 h-20 text-indigo-500/80 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">{t('learnerProgression.advancedAnalytics')}</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              {t('learnerProgression.analyticsComingSoon')}
            </p>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
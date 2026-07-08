'use client';

import { useState, useMemo } from 'react';
import {
  Search, Filter, Eye, X,
  Users, TrendingUp, Award, Activity,
  BookOpen, ChevronLeft, ChevronRight, Inbox, AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { useLearnerProgression } from '@/hooks/api';

interface Course {
  name: string;
  progress: number;
  score: number;
  status: 'completed' | 'in-progress' | 'not-started';
  lastAccess: string;
}

interface Learner {
  id: number;
  name: string;
  email: string;
  avatar: string;
  courses: Course[];
  globalProgress: number;
  averageScore: number;
  lastActivity: string;
  enrolledCourses: number;
}

const ITEMS_PER_PAGE = 6;
export default function AdminProgression() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { data: progressionData, isLoading: loading, isError: progressionQueryError, error: queryError, refetch, isFetching } = useLearnerProgression();
  const learners = (progressionData ?? []) as Learner[];
  const error = progressionQueryError
    ? (queryError instanceof Error ? queryError.message : String(t('progression.loadError')))
    : null;

  const totalLearners = learners.length;
  const avgProgress = totalLearners > 0
    ? Math.round(learners.reduce((acc, l) => acc + l.globalProgress, 0) / totalLearners)
    : 0;
  const completionsThisMonth = learners.reduce((acc, l) => acc + l.courses.filter(c => c.status === 'completed').length, 0);
  const activeLearners = learners.filter(l => l.globalProgress > 0 && l.globalProgress < 100).length;

  const stats = [
    { label: t('progression.totalLearners'), value: totalLearners, icon: Users, color: 'bg-primary/10 text-primary' },
    { label: t('progression.averageProgress'), value: `${avgProgress}%`, icon: TrendingUp, color: 'bg-green-50 text-green-700' },
    { label: t('progression.completionsThisMonth'), value: completionsThisMonth, icon: Award, color: 'bg-purple-50 text-purple-700' },
    { label: t('progression.activeLearners'), value: activeLearners, icon: Activity, color: 'bg-emerald-50 text-emerald-700' },
  ];

  const filteredLearners = useMemo(() => {
    return learners.filter(learner => {
      const matchesSearch = learner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           learner.email.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesLevel = true;
      if (filterLevel === 'high') matchesLevel = learner.globalProgress > 75;
      else if (filterLevel === 'medium') matchesLevel = learner.globalProgress >= 40 && learner.globalProgress <= 75;
      else if (filterLevel === 'low') matchesLevel = learner.globalProgress < 40;

      return matchesSearch && matchesLevel;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterLevel, learners]);

  const totalPages = Math.ceil(filteredLearners.length / ITEMS_PER_PAGE);
  const paginatedLearners = filteredLearners.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFilterApply = () => {
    setCurrentPage(1);
    setShowFilters(false);
  };

  const handleViewLearner = (learner: Learner) => {
    setSelectedLearner(learner);
    setShowDetailModal(true);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    if (progress >= 40) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    return 'bg-gradient-to-r from-amber-500 to-orange-500';
  };

  const getStatusBadge = (status: Course['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">{t('progression.completed')}</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-primary/10 text-primary">{t('progression.inProgress')}</Badge>;
      case 'not-started':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">{t('progression.notStarted')}</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
        <p className="text-sm text-destructive">{String(t('progression.loadError'))}</p>
        {queryError instanceof Error && queryError.message ? (
          <p className="text-xs text-muted-foreground">{queryError.message}</p>
        ) : null}
        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {String(t('common.retry'))}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">{stat.value}</p>
              <p className="text-sm text-slate-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`${t('common.search')}...`}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" /> {t('common.filter')}
            </Button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('progression.progressLevel')}</label>
                    <select
                      value={filterLevel}
                      onChange={(e) => setFilterLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">{t('common.all')}</option>
                      <option value="high">{t('progression.high')} (&gt;75%)</option>
                      <option value="medium">{t('progression.medium')} (40-75%)</option>
                      <option value="low">{t('progression.low')} (&lt;40%)</option>
                    </select>
                  </div>
                  <Button size="sm" className="w-full" onClick={handleFilterApply}>{t('progression.apply')}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

  
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {t('progression.learnersList')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('progression.learner')}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('progression.enrolledCourses')}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('progression.globalProgress')}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('progression.averageScore')}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('progression.lastActivity')}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium text-slate-800">{String(t('progression.emptyStateTitle'))}</p>
                    <p className="text-sm text-slate-500 mt-1">{String(t('progression.emptyStateHint'))}</p>
                  </td>
                </tr>
              ) : (
                paginatedLearners.map((learner) => (
                <tr key={learner.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                        {learner.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{learner.name}</p>
                        <p className="text-sm text-slate-500">{learner.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-700">{learner.enrolledCourses}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-[120px]">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`${getProgressColor(learner.globalProgress)} h-2 rounded-full transition-all`}
                            style={{ width: `${learner.globalProgress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 min-w-[40px]">{learner.globalProgress}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-slate-700">{learner.averageScore}%</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-slate-500">{learner.lastActivity}</span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleViewLearner(learner)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      {t('common.view')}
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

       
        {filteredLearners.length > 0 && (
        <div className="flex items-center justify-between p-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            {t('progression.showing')} {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredLearners.length)} {t('progression.of')} {filteredLearners.length} {t('progression.learnersLabel')}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? 'bg-primary hover:bg-primary/90' : ''}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        )}
      </div>

      
      {showDetailModal && selectedLearner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
         
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {selectedLearner.avatar}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedLearner.name}</h2>
                  <p className="text-slate-500">{selectedLearner.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-sm text-slate-500">{t('progression.globalProgress')}</p>
                <p className="text-xl font-bold text-slate-900">{selectedLearner.globalProgress}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-sm text-slate-500">{t('progression.averageScore')}</p>
                <p className="text-xl font-bold text-slate-900">{selectedLearner.averageScore}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-sm text-slate-500">{t('progression.enrolledCourses')}</p>
                <p className="text-xl font-bold text-slate-900">{selectedLearner.enrolledCourses}</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('progression.courseDetails')}</h3>
            <div className="space-y-4">
              {selectedLearner.courses.map((course, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900">{course.name}</h4>
                    {getStatusBadge(course.status)}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-600">{t('progression.progressLabel')}</span>
                        <span className="text-sm font-semibold text-slate-900">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">{t('progression.score')}</span>
                      <span className="text-sm font-semibold text-slate-900">{course.score}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">{t('progression.lastAccess')}</span>
                      <span className="text-sm text-slate-500">{course.lastAccess}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
                                     

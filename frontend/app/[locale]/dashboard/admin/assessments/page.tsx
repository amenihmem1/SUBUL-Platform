'use client';

import { useState } from 'react';
import { ClipboardList, Award, User, Calendar, Filter, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { api, API_PATHS } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 10;

interface AssessmentRow {
  id: number;
  userId: number;
  user?: { id: number; email?: string; fullName?: string };
  primaryProfile?: string;
  domain?: string;
  scores?: { cloudPercentage: number; cyberPercentage: number; aiPercentage: number };
  attemptNumber: number;
  completedAt: string;
}

interface QuizLevelRow {
  id: number;
  userId: number;
  user?: { id: number; email?: string; fullName?: string };
  domain: string;
  level: string;
  score?: { percentage: number };
  completedAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function fetchAdminAssessments(page: number, limit: number): Promise<PaginatedResponse<AssessmentRow>> {
  const { data } = await api.get<PaginatedResponse<AssessmentRow>>(
    `${API_PATHS.admin('quiz-results/assessments')}?page=${page}&limit=${limit}`
  );
  return data;
}

async function fetchAdminQuizLevels(domain: string, page: number, limit: number): Promise<PaginatedResponse<QuizLevelRow>> {
  const url = `${API_PATHS.admin('quiz-results/quiz-levels')}?page=${page}&limit=${limit}${domain ? `&domain=${domain}` : ''}`;
  const { data } = await api.get<PaginatedResponse<QuizLevelRow>>(url);
  return data;
}

export default function AdminAssessmentsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'assessments' | 'levels'>('assessments');
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [assessmentsPage, setAssessmentsPage] = useState(1);
  const [quizLevelsPage, setQuizLevelsPage] = useState(1);

  const { data: assessmentsData, isLoading: loadingAssessments } = useQuery({
    queryKey: ['admin', 'quiz-results', 'assessments', assessmentsPage],
    queryFn: () => fetchAdminAssessments(assessmentsPage, ITEMS_PER_PAGE),
  });

  const { data: quizLevelsData, isLoading: loadingLevels } = useQuery({
    queryKey: ['admin', 'quiz-results', 'quiz-levels', domainFilter, quizLevelsPage],
    queryFn: () => fetchAdminQuizLevels(domainFilter, quizLevelsPage, ITEMS_PER_PAGE),
  });

  const assessments = assessmentsData?.data ?? [];
  const quizLevels = quizLevelsData?.data ?? [];
  const totalAssessments = assessmentsData?.total ?? 0;
  const totalQuizLevels = quizLevelsData?.total ?? 0;
  const totalAssessmentsPages = assessmentsData?.totalPages ?? 1;
  const totalQuizLevelsPages = quizLevelsData?.totalPages ?? 1;

  const stats = [
    { label: t('admin.assessments.profileAssessments') || 'Profile Assessments', value: totalAssessments, change: '', icon: ClipboardList, color: 'bg-primary/10 text-primary' },
    { label: t('admin.assessments.quizDeNiveau') || 'Quiz de Niveau', value: totalQuizLevels, change: '', icon: Award, color: 'bg-green-50 text-green-700' },
  ];

  return (
    <div className="space-y-6 p-1">
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6"
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

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('navigation.assessments') || 'Assessments & Quiz de Niveau'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === 'assessments' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('assessments')}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          {t('admin.assessments.profileAssessments') || 'Profile Assessments'} ({totalAssessments})
        </Button>
        <Button
          variant={tab === 'levels' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('levels')}
        >
          <Award className="w-4 h-4 mr-2" />
          {t('admin.assessments.quizDeNiveau') || 'Quiz de Niveau'} ({totalQuizLevels})
        </Button>
      </div>

      {tab === 'assessments' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loadingAssessments ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Utilisateur</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Profil / Domaine</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Scores</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Tentative</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          {t('common.noData') || 'No assessment results yet.'}
                        </td>
                      </tr>
                    ) : (
                      assessments.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="p-4">
                            <span className="font-medium text-slate-900">{row.user?.fullName || row.user?.email || `User #${row.userId}`}</span>
                            {row.user?.email && (
                              <span className="block text-xs text-slate-500">{row.user.email}</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-700">{row.primaryProfile || row.domain || '—'}</td>
                          <td className="p-4 text-slate-700">
                            {row.scores
                              ? `Cloud ${row.scores.cloudPercentage}% · Cyber ${row.scores.cyberPercentage}% · AI ${row.scores.aiPercentage}%`
                              : '—'}
                          </td>
                          <td className="p-4 text-slate-700">{row.attemptNumber ?? '—'}</td>
                          <td className="p-4 text-slate-700 whitespace-nowrap">
                            {row.completedAt
                              ? new Date(row.completedAt).toLocaleString(undefined, {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Affichage {totalAssessments === 0 ? 0 : ((assessmentsPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(assessmentsPage * ITEMS_PER_PAGE, totalAssessments)} de {totalAssessments} résultats
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssessmentsPage(p => Math.max(1, p - 1))}
                    disabled={assessmentsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-slate-700 px-2">
                    Page {assessmentsPage} / {Math.max(1, totalAssessmentsPages)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssessmentsPage(p => Math.min(totalAssessmentsPages, p + 1))}
                    disabled={assessmentsPage === totalAssessmentsPages || totalAssessmentsPages === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'levels' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">{t('common.filter') || 'Filtrer'}:</span>
            <select
              value={domainFilter}
              onChange={(e) => { setDomainFilter(e.target.value); setQuizLevelsPage(1); }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('common.all') || 'Tous les domaines'}</option>
              <option value="devops">DevOps</option>
              <option value="ai">AI</option>
              <option value="cyber">Cyber</option>
            </select>
          </div>
          {loadingLevels ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Utilisateur</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Domaine</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Niveau</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Score</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizLevels.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          {t('common.noData') || 'No quiz-level results yet.'}
                        </td>
                      </tr>
                    ) : (
                      quizLevels.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="p-4">
                            <span className="font-medium text-slate-900">{row.user?.fullName || row.user?.email || `User #${row.userId}`}</span>
                            {row.user?.email && (
                              <span className="block text-xs text-slate-500">{row.user.email}</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-700">{row.domain || '—'}</td>
                          <td className="p-4 text-slate-700">{row.level || '—'}</td>
                          <td className="p-4 font-medium text-slate-900">{row.score?.percentage != null ? `${row.score.percentage}%` : '—'}</td>
                          <td className="p-4 text-slate-700 whitespace-nowrap">
                            {row.completedAt
                              ? new Date(row.completedAt).toLocaleString(undefined, {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Affichage {totalQuizLevels === 0 ? 0 : ((quizLevelsPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(quizLevelsPage * ITEMS_PER_PAGE, totalQuizLevels)} de {totalQuizLevels} résultats
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuizLevelsPage(p => Math.max(1, p - 1))}
                    disabled={quizLevelsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-slate-700 px-2">
                    Page {quizLevelsPage} / {Math.max(1, totalQuizLevelsPages)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuizLevelsPage(p => Math.min(totalQuizLevelsPages, p + 1))}
                    disabled={quizLevelsPage === totalQuizLevelsPages || totalQuizLevelsPages === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

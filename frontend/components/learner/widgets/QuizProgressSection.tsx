'use client';

import { useState, useMemo, useEffect } from 'react';
import { Brain, Target, RotateCw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import QuizFlowManager from '@/components/learner/QuizFlowManager';
import { useLatestAssessment, useQuizLevelHistory } from '@/hooks/api/useQuizResults';
import type { AssessmentResult } from '@/services/quiz-results';
import { DOMAIN_CONFIG } from '@/data/learnerDashboardData';
import { Skeleton } from '@/components/ui/skeleton';

const DOMAIN_COLORS: Record<string, { bar: string; badge: string; bg: string; ring: string }> = {
  cloud:  { bar: 'from-violet-400 to-rose-400',    badge: 'bg-violet-50 text-violet-700',  bg: 'bg-violet-50', ring: '#7c3aed' },
  cyber:  { bar: 'from-violet-500 to-rose-500',   badge: 'bg-violet-50 text-violet-700',  bg: 'bg-violet-50', ring: '#7c3aed' },
  ai:     { bar: 'from-rose-500 to-violet-500',   badge: 'bg-rose-50 text-rose-700',      bg: 'bg-rose-50',   ring: '#f43f5e' },
  devops: { bar: 'from-violet-600 to-rose-400',   badge: 'bg-violet-50 text-violet-700',  bg: 'bg-violet-50', ring: '#7c3aed' },
};

function ProgressBar({ pct }: { pct: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${width}%` }} />
    </div>
  );
}

const getDominantDomain = (
  scores: AssessmentResult['scores'],
  primaryProfile: string
): 'devops' | 'ai' | 'cyber' => {
  const p = (primaryProfile || '').toLowerCase();
  if (p.includes('cyber') || p.includes('security')) return 'cyber';
  if (p.includes('ai') || p.includes('artificial') || p.includes('machine')) return 'ai';
  if (p.includes('cloud') || p.includes('devops')) return 'devops';
  if (!scores) return 'devops';
  const { cloudPercentage, aiPercentage, cyberPercentage } = scores;
  if (cyberPercentage >= aiPercentage && cyberPercentage >= cloudPercentage) return 'cyber';
  if (aiPercentage >= cloudPercentage) return 'ai';
  return 'devops';
};

export function QuizProgressSection() {
  const [showModal, setShowModal] = useState(false);
  const { t } = useTranslation();
  const {
    data: assessment = null,
    refetch: refetchAssessment,
    isLoading,
  } = useLatestAssessment();

  const dominant = useMemo(
    () =>
      assessment
        ? getDominantDomain(assessment.scores, assessment.primaryProfile)
        : null,
    [assessment]
  );
  const { data: levelResults = [], refetch: refetchLevel } = useQuizLevelHistory(dominant ?? '');

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5">
        <div className="flex justify-between items-center mb-5">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('learnerDashboard.quizProgress')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {assessment ? 'Assessment complete — keep improving your scores' : 'Take your first assessment'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchAssessment(); refetchLevel(); }}
            className="h-8 gap-1.5 rounded-xl border-border text-xs text-muted-foreground hover:border-violet-200 hover:text-violet-600"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="h-8 gap-1.5 rounded-xl bg-violet-600 px-4 text-xs text-white hover:bg-violet-700"
          >
            <Brain className="h-3.5 w-3.5" />
            {t('learnerDashboard.takeQuiz')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
        {/* Assessment Profile */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {t('learnerDashboard.assessmentProfile')}
            </h3>
            {assessment ? (
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                ✓ {t('learnerDashboard.completed')}
              </span>
            ) : (
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600">
                {t('learnerDashboard.todo')}
              </span>
            )}
          </div>

          {assessment?.scores ? (
            <div className="space-y-4">
              {assessment.primaryProfile && (
                <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold ${
                  DOMAIN_COLORS[dominant ?? 'devops']?.badge ?? 'bg-violet-50 text-violet-700'
                }`}>
                  <span className="text-base">
                    {DOMAIN_CONFIG[dominant ?? 'devops']?.icon ?? '🎯'}
                  </span>
                  {assessment.primaryProfile}
                  <span className="text-[10px] font-medium opacity-60">Dominant</span>
                </div>
              )}

              <div className="space-y-3.5">
                {[
                  { label: 'Cloud', pct: assessment.scores.cloudPercentage },
                  { label: 'Cybersecurity', pct: assessment.scores.cyberPercentage },
                  { label: 'AI / ML', pct: assessment.scores.aiPercentage },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-muted-foreground">{item.label}</span>
                      <span className="font-bold text-foreground">{item.pct}%</span>
                    </div>
                    <ProgressBar pct={item.pct} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
                <Brain className="h-6 w-6 text-violet-500" />
              </div>
              <p className="mb-1 text-sm font-semibold text-foreground">Discover your profile</p>
              <p className="mb-4 max-w-[180px] text-xs text-muted-foreground">
                Take the assessment to reveal your strengths.
              </p>
              <Button
                size="sm"
                onClick={() => setShowModal(true)}
                className="gap-2 rounded-xl bg-violet-600 text-xs text-white hover:bg-violet-700"
              >
                Start Assessment
              </Button>
            </div>
          )}
        </div>

        {/* Level Quiz */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {t('learnerDashboard.levelQuizzes')}
            </h3>
            {assessment && dominant && (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                DOMAIN_COLORS[dominant]?.badge ?? 'bg-violet-50 text-violet-700'
              }`}>
                {DOMAIN_CONFIG[dominant]?.name ?? dominant}
              </span>
            )}
          </div>

          {assessment && dominant ? (
            (() => {
              const config = DOMAIN_CONFIG[dominant];
              const result = levelResults.find((r) => r.domain === dominant) ?? null;
              const levelColors: Record<string, string> = {
                Expert: 'bg-rose-50 text-rose-700',
                'Intermédiaire': 'bg-violet-50 text-violet-700',
                Débutant: 'bg-violet-50 text-violet-600',
              };

              return (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    {t('learnerDashboard.focusedOnDomain') || 'Based on your assessment result'}
                  </p>

                  <div className={`flex items-center gap-3 rounded-xl p-3.5 ${DOMAIN_COLORS[dominant]?.bg ?? 'bg-muted/50'}`}>
                    <div className="text-2xl shrink-0">{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{config.name}</p>
                      {result ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Level: <span className="font-semibold text-foreground">{result.level}</span>
                          {' · '}{result.score.percentage}%
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-muted-foreground/70">Not completed yet</p>
                      )}
                    </div>
                    {result ? (
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        levelColors[result.level] ?? 'bg-violet-50 text-violet-700'
                      }`}>
                        {result.level}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowModal(true)}
                        className="h-8 shrink-0 rounded-xl border-violet-200 text-xs text-violet-600 hover:bg-violet-50"
                      >
                        Start
                      </Button>
                    )}
                  </div>

                  {result && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Score</span>
                        <span className="font-bold text-foreground">{result.score.percentage}%</span>
                      </div>
                      <ProgressBar pct={result.score.percentage} />
                    </div>
                  )}

                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-violet-600 transition-colors hover:text-violet-700"
                  >
                    Take another quiz
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
                <Target className="h-6 w-6 text-violet-400" />
              </div>
              <p className="mb-1 text-sm font-semibold text-foreground">Complete assessment first</p>
              <p className="mb-4 max-w-[180px] text-xs text-muted-foreground">
                Your level quizzes unlock after the assessment.
              </p>
              <Button
                size="sm"
                onClick={() => setShowModal(true)}
                variant="outline"
                className="gap-2 rounded-xl border-violet-200 text-xs text-violet-600 hover:bg-violet-50"
              >
                Start Assessment
              </Button>
            </div>
          )}
        </div>
      </div>

      <QuizFlowManager open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}

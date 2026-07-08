'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trophy,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  AlertCircle,
} from 'lucide-react';
import {
  submitLearnerPracticeExam,
  getLearnerPracticeExamAttempts,
  getLearnerPracticeExamSession,
} from '@/services/practice-exams';
import { useTranslation } from '@/contexts/LanguageContext';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function optionLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  intermediate: 'text-amber-700 bg-amber-50 border-amber-200',
  advanced: 'text-rose-700 bg-rose-50 border-rose-200',
};

/* ─── score ring ───────────────────────────────────────────────────────────── */

function ScoreRing({ score, passed, size = 120 }: { score: number; passed: boolean; size?: number }) {
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  const color = passed ? '#10b981' : '#f43f5e';
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - dash }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

/* ─── main page ───────────────────────────────────────────────────────────── */

export default function LearnerPracticeExamPage() {
  const params = useParams();
  const pathname = usePathname();
  const slug = String(params.slug ?? '');
  const locale = pathname.split('/')[1] || 'fr';
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['learner-practice-exam-session', slug, locale],
    queryFn: () => getLearnerPracticeExamSession(slug, locale),
    enabled: !!slug,
  });
  const { data: attemptsData } = useQuery({
    queryKey: ['learner-practice-exam-attempts', slug],
    queryFn: () => getLearnerPracticeExamAttempts(slug),
    enabled: !!slug,
  });
  const submitMutation = useMutation({
    mutationFn: () =>
      submitLearnerPracticeExam(slug, {
        answers,
        timeSpent: session?.exam?.durationMinutes
          ? String(session.exam.durationMinutes * 60 - (timeLeft ?? 0))
          : undefined,
      }),
    onSuccess: async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      await qc.invalidateQueries({ queryKey: ['learner-practice-exam-attempts', slug] });
    },
  });

  const questions = useMemo(() => session?.questions ?? [], [session]);
  const isSubmitted = !!submitMutation.data;
  const result = submitMutation.data;

  useEffect(() => {
    if (!session?.exam?.durationMinutes || isSubmitted) return;
    const total = session.exam.durationMinutes * 60;
    setTimeLeft(total);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          submitMutation.mutate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleAnswer = useCallback(
    (qId: string, optId: string) => {
      if (isSubmitted) return;
      setAnswers((prev) => ({ ...prev, [qId]: optId }));
    },
    [isSubmitted],
  );

  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const allAnswered = answeredCount === totalCount && totalCount > 0;
  const currentQ = questions[currentIndex];

  /* ── loading / not found ── */
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
          <p className="text-sm text-slate-500">{t('practiceExam.loading')}</p>
        </div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-rose-500" />
          <p className="text-slate-600">{t('practiceExam.notFound')}</p>
        </div>
      </div>
    );
  }

  const diffStyle =
    DIFFICULTY_STYLES[session.exam?.difficulty ?? ''] ?? 'text-slate-600 bg-slate-50 border-slate-200';

  /* ── results screen ── */
  if (isSubmitted && result) {
    const passed = result.status === 'passed';
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {/* top band */}
          <div
            className={`px-8 py-10 text-center ${
              passed
                ? 'bg-gradient-to-br from-emerald-50 to-green-50/50'
                : 'bg-gradient-to-br from-rose-50 to-pink-50/50'
            }`}
            style={{ borderBottom: '1px solid #e2e8f0' }}
          >
            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                passed ? 'bg-emerald-100' : 'bg-rose-100'
              }`}
            >
              <Trophy className={`h-6 w-6 ${passed ? 'text-emerald-600' : 'text-rose-500'}`} />
            </div>
            <h1 className="mt-4 text-2xl font-black text-slate-900">{t('practiceExam.results.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{session.exam.title}</p>

            {/* score ring */}
            <div className="relative mx-auto mt-6 flex h-[120px] w-[120px] items-center justify-center">
              <ScoreRing score={result.score} passed={passed} size={120} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900">{result.score}%</span>
                <span className="text-[10px] text-slate-400">{t('practiceExam.results.scoreLabel')}</span>
              </div>
            </div>

            {/* pass/fail badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
              className={`mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                passed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {passed ? t('practiceExam.results.passed') : t('practiceExam.results.failed')}
            </motion.div>

            <p className="mt-4 text-sm text-slate-600">
              {passed ? t('practiceExam.results.congratulations') : t('practiceExam.results.keepPracticing')}
            </p>
            {session.exam.passingScore != null && (
              <p className="mt-1 text-xs text-slate-400">
                {t('practiceExam.results.passThreshold')}: {session.exam.passingScore}%
              </p>
            )}
          </div>

          {/* actions */}
          <div className="flex flex-col gap-3 px-8 py-6 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setCurrentIndex(0);
                setShowReview(false);
                submitMutation.reset();
                setTimeLeft(session.exam.durationMinutes ? session.exam.durationMinutes * 60 : null);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:shadow-sm"
            >
              <RotateCcw className="h-4 w-4" />
              {t('practiceExam.results.retake')}
            </button>
            <button
              type="button"
              onClick={() => setShowReview((v) => !v)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition"
              style={{ background: 'linear-gradient(135deg, #c026d3 0%, #7c3aed 100%)' }}
            >
              <BookOpen className="h-4 w-4" />
              {showReview ? t('practiceExam.results.hideReview') : t('practiceExam.results.reviewAnswers')}
            </button>
          </div>

          {/* review */}
          <AnimatePresence>
            {showReview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-slate-100 px-8 pb-8"
              >
                <div className="mt-6 space-y-4">
                  {questions.map((q: any, i: number) => {
                    const chosen = answers[String(q.id)];
                    const correct = Array.isArray(q.correct) ? q.correct[0] : q.correct;
                    const isCorrect = String(chosen) === String(correct);
                    return (
                      <div
                        key={q.id}
                        className={`rounded-2xl border p-5 ${
                          isCorrect
                            ? 'border-emerald-200 bg-emerald-50/50'
                            : 'border-rose-200 bg-rose-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {isCorrect ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {i + 1}. {q.prompt}
                            </p>
                            <div className="mt-3 space-y-1.5">
                              {(q.options as any[]).map((opt: any, j: number) => {
                                const optId = typeof opt === 'object' ? opt.id : opt;
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                const isChosen = String(chosen) === String(optId);
                                const isRightAnswer = String(correct) === String(optId);
                                return (
                                  <div
                                    key={`rev-${q.id}-${optId}`}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                                      isRightAnswer
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isChosen
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'text-slate-500'
                                    }`}
                                  >
                                    <span className="shrink-0 font-mono font-bold">{optionLabel(j)}.</span>
                                    <span>{optText}</span>
                                    {isRightAnswer && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-600" />}
                                    {isChosen && !isRightAnswer && <XCircle className="ml-auto h-3.5 w-3.5 text-rose-500" />}
                                  </div>
                                );
                              })}
                            </div>
                            {q.explanation && (
                              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                                <span className="font-semibold text-violet-600">
                                  {t('practiceExam.review.explanation')}:
                                </span>{' '}
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AttemptHistory attemptsData={attemptsData} showHistory={showHistory} setShowHistory={setShowHistory} t={t} />
      </div>
    );
  }

  /* ── exam screen ── */
  return (
    <div className="mx-auto max-w-3xl space-y-4 py-4">
      {/* sticky progress header */}
      <div className="sticky top-0 z-30 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* counter */}
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Target className="h-3.5 w-3.5 text-violet-500" />
            <span className="font-black text-slate-900">{currentIndex + 1}</span>
            <span className="text-slate-400">/</span>
            <span>{totalCount}</span>
          </div>

          {/* dot progress */}
          <div className="flex flex-1 items-center gap-1 overflow-x-auto py-0.5">
            {questions.map((_: any, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`h-2 shrink-0 rounded-full transition-all duration-200 ${
                  i === currentIndex
                    ? 'w-6 bg-violet-600'
                    : answers[String(questions[i]?.id)]
                      ? 'w-2 bg-fuchsia-500'
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`${t('practiceExam.question')} ${i + 1}`}
              />
            ))}
          </div>

          {/* difficulty */}
          {session.exam.difficulty && (
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${diffStyle}`}>
              {t(`practiceExam.difficulty.${session.exam.difficulty}`)}
            </span>
          )}

          {/* timer */}
          {timeLeft !== null && (
            <div
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-mono font-semibold ${
                timeLeft < 60
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* exam title + progress text */}
      <div>
        <h1 className="text-xl font-black text-slate-900">{session.exam.title}</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          {allAnswered
            ? t('practiceExam.allAnswered')
            : t('practiceExam.unanswered', { count: String(totalCount - answeredCount) })}
        </p>
      </div>

      {/* question card */}
      <AnimatePresence mode="wait">
        {currentQ && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            {/* question badge */}
            <div className="mb-4 flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg, #c026d3, #7c3aed)' }}
              >
                {currentIndex + 1}
              </span>
              <span className="text-xs text-slate-400">
                {t('practiceExam.question')} {currentIndex + 1} {t('practiceExam.of')} {totalCount}
              </span>
            </div>

            {/* prompt */}
            <p className="text-base font-semibold leading-relaxed text-slate-900">{currentQ.prompt}</p>

            {/* options */}
            <div className="mt-5 space-y-2.5">
              {(currentQ.options as any[]).map((opt: any, j: number) => {
                const optId = typeof opt === 'object' ? opt.id : opt;
                const optText = typeof opt === 'object' ? opt.text : opt;
                const selected = answers[String(currentQ.id)] === String(optId);
                return (
                  <button
                    key={`${currentQ.id}-${optId}`}
                    type="button"
                    onClick={() => handleAnswer(String(currentQ.id), String(optId))}
                    className={`group w-full rounded-xl border p-4 text-left transition-all duration-150 ${
                      selected
                        ? 'border-violet-400 bg-violet-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-all ${
                          selected
                            ? 'text-white'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-700'
                        }`}
                        style={selected ? { background: 'linear-gradient(135deg, #c026d3, #7c3aed)' } : {}}
                      >
                        {optionLabel(j)}
                      </span>
                      <span className={`text-sm leading-snug ${selected ? 'font-semibold text-violet-900' : 'text-slate-700'}`}>
                        {optText}
                      </span>
                      {selected && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-violet-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={t('practiceExam.navigation.previous')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 text-center text-xs text-slate-400">
          {answeredCount}/{totalCount}
        </div>

        {currentIndex < totalCount - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.min(totalCount - 1, i + 1))}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            {t('practiceExam.navigation.next')}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !allAnswered}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c026d3 0%, #7c3aed 100%)' }}
          >
            {submitMutation.isPending ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />
                {t('practiceExam.submitting')}
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                {t('practiceExam.navigation.finish')}
              </>
            )}
          </button>
        )}
      </div>

      {/* full submit button when all answered but not on last q */}
      {allAnswered && currentIndex < totalCount - 1 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-all"
            style={{ background: 'linear-gradient(135deg, #c026d3 0%, #7c3aed 100%)' }}
          >
            {submitMutation.isPending ? t('practiceExam.submitting') : t('practiceExam.submit')}
          </button>
        </motion.div>
      )}

      <AttemptHistory attemptsData={attemptsData} showHistory={showHistory} setShowHistory={setShowHistory} t={t} />
    </div>
  );
}

/* ─── attempt history ──────────────────────────────────────────────────────── */

function AttemptHistory({
  attemptsData,
  showHistory,
  setShowHistory,
  t,
}: {
  attemptsData: any;
  showHistory: boolean;
  setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
  t: (key: string, opts?: Record<string, string>) => any;
}) {
  const attempts: any[] = attemptsData?.attempts ?? [];
  return (
    <div className="pb-4">
      <button
        type="button"
        onClick={() => setShowHistory((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-violet-500" />
          {t('practiceExam.history.title')}
          {attempts.length > 0 && (
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-bold text-violet-700">
              {attempts.length}
            </span>
          )}
        </span>
        {showHistory ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {attempts.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-400">
                  {t('practiceExam.history.empty')}
                </p>
              ) : (
                attempts.map((a: any, i: number) => {
                  const passed = a.status === 'passed';
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                          passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {attempts.length - i}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {a.score}%{' '}
                          <span className={`text-xs font-medium ${passed ? 'text-emerald-600' : 'text-rose-500'}`}>
                            · {passed ? t('practiceExam.history.passed') : t('practiceExam.history.failed')}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(a.createdAt).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

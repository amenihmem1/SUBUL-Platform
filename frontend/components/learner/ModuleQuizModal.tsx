'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, CheckCircle2, XCircle, ChevronRight, Trophy,
  BookOpen, Brain, AlertCircle, RotateCcw, Sparkles, Target,
  Clock, List, Flag, Check,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useQuizGenerate, useQuizEvaluate } from '@/hooks/api/useQuizAgent';
import { reportQuizQuestion, type FeedbackReason } from '@/services/quiz-feedback';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: number;
  type: 'qcm' | 'vrai_faux';
  question: string;
  options: Record<string, string>;
  bonne_reponse: string;
  explication_correcte: string;
}

interface QuizData {
  statut: string;
  sujet: string;
  source_rag: string;
  questions: QuizQuestion[];
}

interface AnswerRecord {
  questionIndex: number;
  selected: string;
  correct: boolean;
  feedback: string | null;
  explication: string | null;
}

interface Props {
  isOpen: boolean;
  moduleTitle: string;
  moduleIcon: string;
  lessonContent?: string;
  lang?: string;
  userId: string;
  sessionId: string;
  courseId?: string;
  onClose: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreLabel(correct: number, total: number, lang = 'fr'): string {
  if (total === 0) return lang === 'fr' ? 'Aucune réponse' : 'No answers';
  const pct = correct / total;
  if (lang === 'fr') {
    if (pct === 1) return 'Score parfait ! 🏆';
    if (pct >= 0.7) return 'Excellent travail ! 🎉';
    if (pct >= 0.5) return 'Bonne progression ! 💪';
    return 'Continue à pratiquer ! 📚';
  }
  if (pct === 1) return 'Perfect score! 🏆';
  if (pct >= 0.7) return 'Excellent work! 🎉';
  if (pct >= 0.5) return 'Good progress! 💪';
  return 'Keep practicing! 📚';
}

function scoreColor(correct: number, total: number) {
  if (total === 0) return 'from-slate-400 to-slate-500';
  const pct = correct / total;
  if (pct === 1) return 'from-emerald-400 to-teal-500';
  if (pct >= 0.7) return 'from-primary to-accent';
  if (pct >= 0.5) return 'from-amber-400 to-orange-500';
  return 'from-red-400 to-rose-500';
}

// Circular score ring
function ScoreRing({ correct, total }: { correct: number; total: number }) {
  const pct = total > 0 ? correct / total : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="absolute w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none"
          stroke="url(#scoreGrad)" strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B1CC8" />
            <stop offset="100%" stopColor="#E8177D" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center z-10">
        <div className="text-xl font-bold text-slate-800">{correct}/{total}</div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          {total > 0 ? `${Math.round(pct * 100)}%` : '–'}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ModuleQuizModal({
  isOpen,
  moduleTitle,
  moduleIcon,
  lessonContent,
  lang = 'fr',
  userId,
  sessionId,
  courseId,
  onClose,
}: Props) {
  const [phase, setPhase] = useState<'loading' | 'error' | 'quiz' | 'review'>('loading');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [explication, setExplication] = useState<string | null>(null);

  // answers[i] is the record for question i — the source of truth for score
  const [answers, setAnswers] = useState<(AnswerRecord | null)[]>([]);

  // Report state: null = not open, 'open' = picker showing, 'sent' = confirmed
  const [reportState, setReportState] = useState<null | 'open' | 'sent'>(null);
  const [reportReason, setReportReason] = useState<FeedbackReason>('not_in_course');
  const [reportComment, setReportComment] = useState('');
  const [reportSending, setReportSending] = useState(false);

  const quizGenerate = useQuizGenerate();
  const quizEvaluate = useQuizEvaluate();

  // ── Reset on open ──────────────────────────────────────────────────────────

  const resetQuizState = useCallback(() => {
    setCurrentIndex(0);
    setSelected(null);
    setSubmitted(false);
    setFeedback(null);
    setExplication(null);
    setAnswers([]);
    setPhase('loading');
    setError(null);
    setQuiz(null);
  }, []);

  const fetchQuiz = useCallback(async () => {
    resetQuizState();
    try {
      const data = await quizGenerate.mutateAsync({
        sujet: moduleTitle,
        nb_questions: 4,
        user_id: userId,
        session_id: sessionId,
        lang,
        lesson_content: lessonContent,
      });
      if (!data.questions?.length) throw new Error(
        lang === 'fr' ? 'Aucune question générée.' : 'No questions generated.'
      );
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(null));
      setPhase('quiz');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : (lang === 'fr' ? 'Erreur inconnue' : 'Unknown error'));
      setPhase('error');
    }
  }, [moduleTitle, userId, sessionId, lang, lessonContent, resetQuizState, quizGenerate.mutateAsync]);

  useEffect(() => {
    if (isOpen) fetchQuiz();
  }, [isOpen]); // only re-fetch when modal opens

  // ── Submit answer ──────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!quiz || !selected || submitted) return;
    const question = quiz.questions[currentIndex];

    // 1. Local correctness — never depends on API
    const isCorrect = selected.toUpperCase() === question.bonne_reponse.toUpperCase();

    // Optimistically record the answer so score is always tracked
    const record: AnswerRecord = {
      questionIndex: currentIndex,
      selected,
      correct: isCorrect,
      feedback: null,
      explication: null,
    };
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = record;
      return next;
    });
    setSubmitted(true);

    // 2. API for rich feedback (best-effort — failures don't affect score)
    setFeedbackLoading(true);
    try {
      const data = await quizEvaluate.mutateAsync({
        question,
        reponse_apprenant: selected,
        user_id: userId,
        session_id: sessionId,
        lang,
      });
      const fb = data.feedback ?? null;
      const exp = data.explication_agent03 ?? null;
      setFeedback(fb);
      setExplication(exp);
      // Update record with rich feedback
      setAnswers((prev) => {
        const next = [...prev];
        if (next[currentIndex]) next[currentIndex] = { ...next[currentIndex]!, feedback: fb, explication: exp };
        return next;
      });
    } catch {
      // Use built-in explanation as fallback
      const fallback = isCorrect
        ? (lang === 'fr' ? '✅ Bonne réponse !' : '✅ Correct!')
        : (lang === 'fr'
          ? `❌ La bonne réponse était ${question.bonne_reponse}. ${question.explication_correcte}`
          : `❌ Correct answer was ${question.bonne_reponse}. ${question.explication_correcte}`);
      setFeedback(fallback);
      setAnswers((prev) => {
        const next = [...prev];
        if (next[currentIndex]) next[currentIndex] = { ...next[currentIndex]!, feedback: fallback };
        return next;
      });
    } finally {
      setFeedbackLoading(false);
    }
  }, [quiz, selected, submitted, currentIndex, userId, sessionId, lang, quizEvaluate.mutateAsync]);

  // ── Navigate ───────────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (!quiz) return;
    setReportState(null);
    setReportComment('');
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setSubmitted(false);
      setFeedback(null);
      setExplication(null);
    } else {
      setPhase('review');
    }
  }, [quiz, currentIndex]);

  // ── Derived score (computed from answers array — single source of truth) ───

  const answeredCount = answers.filter(Boolean).length;
  const correctCount = answers.filter((a) => a?.correct).length;

  if (!isOpen) return null;

  const question = quiz?.questions[currentIndex] ?? null;
  const optionEntries = question ? Object.entries(question.options) : [];
  const progressPct = quiz ? Math.round(((currentIndex + (submitted ? 1 : 0)) / quiz.questions.length) * 100) : 0;

  return (
    <AnimatePresence>
      <motion.div
        key="quiz-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '90vh' }}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="shrink-0 bg-gradient-to-r from-primary to-accent px-5 py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">
              {moduleIcon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                {phase === 'review'
                  ? (lang === 'fr' ? 'Résultats' : 'Results')
                  : (lang === 'fr' ? 'Quiz de fin de module' : 'End-of-module Quiz')}
              </p>
              <h2 className="text-sm font-bold text-white leading-tight truncate">{moduleTitle}</h2>
            </div>
            {phase === 'quiz' && quiz && (
              <span className="shrink-0 text-xs font-bold text-white/80 bg-white/15 rounded-full px-2.5 py-1">
                {currentIndex + 1} / {quiz.questions.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="shrink-0 h-8 w-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Progress bar ────────────────────────────────────────────────── */}
          {phase === 'quiz' && quiz && (
            <div className="shrink-0 h-1 bg-slate-100">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}

          {/* ── Body ────────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* Loading */}
            {phase === 'loading' && (
              <div className="flex flex-col items-center gap-4 py-16">
                <div className="relative">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <Brain className="absolute inset-0 m-auto h-5 w-5 text-primary/40" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  {lang === 'fr' ? 'Génération du quiz…' : 'Generating quiz…'}
                </p>
              </div>
            )}

            {/* Error */}
            {phase === 'error' && (
              <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center">
                  <AlertCircle className="h-7 w-7 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {lang === 'fr' ? 'Impossible de charger le quiz' : 'Failed to load quiz'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{error}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={fetchQuiz} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    {lang === 'fr' ? 'Réessayer' : 'Retry'}
                  </Button>
                  <Button onClick={onClose}>
                    {lang === 'fr' ? 'Continuer' : 'Continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Quiz question */}
            {phase === 'quiz' && question && (
              <div className="p-5 space-y-4">
                {/* Question type badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase tracking-wider">
                    <Target className="h-3.5 w-3.5" />
                    {question.type === 'vrai_faux'
                      ? (lang === 'fr' ? 'Vrai / Faux' : 'True / False')
                      : 'QCM'}
                  </span>

                  {/* 🚩 Report button */}
                  {reportState !== 'sent' ? (
                    <button
                      type="button"
                      onClick={() => setReportState(reportState === 'open' ? null : 'open')}
                      className={cn(
                        'ml-auto flex items-center gap-1 text-[11px] transition-colors',
                        reportState === 'open' ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'
                      )}
                    >
                      <Flag className="h-3 w-3" />
                      {lang === 'fr' ? 'Signaler' : 'Report'}
                    </button>
                  ) : (
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-500">
                      <Check className="h-3 w-3" />
                      {lang === 'fr' ? 'Signalement envoyé' : 'Reported'}
                    </span>
                  )}

                  {submitted && (
                    <span className={cn(
                      'ml-auto inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5',
                      answers[currentIndex]?.correct
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-red-50 text-red-600'
                    )}>
                      {answers[currentIndex]?.correct ? (
                        <><CheckCircle2 className="h-3 w-3" />{lang === 'fr' ? 'Correct' : 'Correct'}</>
                      ) : (
                        <><XCircle className="h-3 w-3" />{lang === 'fr' ? 'Incorrect' : 'Incorrect'}</>
                      )}
                    </span>
                  )}
                </div>

                {/* Question text */}
                <p className="text-[15px] font-semibold text-slate-800 leading-relaxed">
                  {question.question}
                </p>

                {/* 🚩 Report panel */}
                <AnimatePresence>
                  {reportState === 'open' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2.5">
                        <p className="text-xs font-semibold text-amber-800">
                          {lang === 'fr' ? 'Pourquoi signalez-vous cette question ?' : 'Why are you reporting this question?'}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {([
                            ['not_in_course', lang === 'fr' ? 'Pas dans le cours' : 'Not in the course'],
                            ['off_topic', lang === 'fr' ? 'Hors sujet' : 'Off topic'],
                            ['wrong_answer', lang === 'fr' ? 'Mauvaise réponse' : 'Wrong answer'],
                            ['unclear', lang === 'fr' ? 'Question confuse' : 'Unclear question'],
                          ] as [FeedbackReason, string][]).map(([val, label]) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setReportReason(val)}
                              className={cn(
                                'text-[11px] font-medium rounded-lg px-2 py-1.5 border transition-all text-left',
                                reportReason === val
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-white text-amber-700 border-amber-200 hover:border-amber-400'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="w-full text-xs rounded-lg border border-amber-200 bg-white p-2 resize-none text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          rows={2}
                          placeholder={lang === 'fr' ? 'Commentaire optionnel…' : 'Optional comment…'}
                          value={reportComment}
                          onChange={(e) => setReportComment(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={reportSending}
                            onClick={async () => {
                              setReportSending(true);
                              try {
                                await reportQuizQuestion({
                                  courseId,
                                  moduleTitle,
                                  questionText: question.question,
                                  questionType: question.type,
                                  correctAnswer: question.bonne_reponse,
                                  reason: reportReason,
                                  comment: reportComment || undefined,
                                });
                                setReportState('sent');
                              } catch {
                                // silent — don't block quiz
                                setReportState(null);
                              } finally {
                                setReportSending(false);
                              }
                            }}
                            className="flex-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-1.5 transition-colors disabled:opacity-50"
                          >
                            {reportSending
                              ? (lang === 'fr' ? 'Envoi…' : 'Sending…')
                              : (lang === 'fr' ? 'Envoyer le signalement' : 'Send report')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReportState(null)}
                            className="text-xs text-amber-600 hover:text-amber-800 px-2"
                          >
                            {lang === 'fr' ? 'Annuler' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Options */}
                <div className="space-y-2">
                  {optionEntries.map(([letter, text]) => {
                    const isSelected = selected === letter;
                    const isCorrectAnswer = submitted && letter === question.bonne_reponse;
                    const isWrongSelected = submitted && isSelected && letter !== question.bonne_reponse;

                    return (
                      <button
                        key={letter}
                        disabled={submitted}
                        onClick={() => !submitted && setSelected(letter)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all duration-150 disabled:cursor-default',
                          // Not submitted
                          !submitted && isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : !submitted
                            ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            : '',
                          // Submitted
                          isCorrectAnswer
                            ? 'border-emerald-400 bg-emerald-50'
                            : isWrongSelected
                            ? 'border-red-400 bg-red-50'
                            : submitted
                            ? 'border-slate-200 bg-slate-50 opacity-50'
                            : ''
                        )}
                      >
                        <span className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                          !submitted && isSelected
                            ? 'bg-primary text-white'
                            : !submitted
                            ? 'border border-slate-200 text-slate-500 bg-white'
                            : isCorrectAnswer
                            ? 'bg-emerald-500 text-white'
                            : isWrongSelected
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-200 text-slate-400'
                        )}>
                          {submitted && isCorrectAnswer ? <CheckCircle2 className="h-4 w-4" />
                            : submitted && isWrongSelected ? <XCircle className="h-4 w-4" />
                            : letter}
                        </span>
                        <span className={cn(
                          'text-sm font-medium',
                          !submitted && isSelected ? 'text-primary'
                            : submitted && isCorrectAnswer ? 'text-emerald-800'
                            : submitted && isWrongSelected ? 'text-red-800'
                            : 'text-slate-700'
                        )}>
                          {text}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback after submit */}
                <AnimatePresence>
                  {submitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      {/* Feedback box */}
                      {feedbackLoading ? (
                        <div className="rounded-2xl p-3 bg-slate-50 border border-slate-200 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 text-slate-400 animate-spin shrink-0" />
                          <p className="text-sm text-slate-400">
                            {lang === 'fr' ? 'Analyse en cours…' : 'Analyzing…'}
                          </p>
                        </div>
                      ) : feedback && (
                        <div className={cn(
                          'rounded-2xl p-3.5 flex items-start gap-2.5',
                          answers[currentIndex]?.correct
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-amber-50 border border-amber-200'
                        )}>
                          <span className="text-base shrink-0">
                            {answers[currentIndex]?.correct ? '✅' : '💡'}
                          </span>
                          <p className={cn(
                            'text-sm leading-relaxed',
                            answers[currentIndex]?.correct ? 'text-emerald-800' : 'text-amber-800'
                          )}>
                            {feedback}
                          </p>
                        </div>
                      )}

                      {/* Built-in explanation (always shown if wrong) */}
                      {!answers[currentIndex]?.correct && !feedbackLoading && question.explication_correcte && (
                        <div className="rounded-2xl p-3.5 bg-slate-50 border border-slate-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              {lang === 'fr' ? 'Explication' : 'Explanation'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {question.explication_correcte}
                          </p>
                        </div>
                      )}

                      {/* Agent explanation */}
                      {explication && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl p-3.5 bg-primary/5 border border-primary/20"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
                              CloudTutor
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{explication}</p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Review / Score screen */}
            {phase === 'review' && quiz && (
              <div className="p-5 space-y-5">
                {/* Score ring + label */}
                <div className="flex flex-col items-center gap-3 pt-2">
                  <ScoreRing correct={correctCount} total={answeredCount} />
                  <div className="text-center">
                    <p className="font-bold text-slate-800 text-base">
                      {scoreLabel(correctCount, answeredCount, lang)}
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {lang === 'fr'
                        ? `${correctCount} bonne${correctCount !== 1 ? 's' : ''} réponse${correctCount !== 1 ? 's' : ''} sur ${answeredCount}`
                        : `${correctCount} correct answer${correctCount !== 1 ? 's' : ''} out of ${answeredCount}`}
                    </p>
                  </div>
                </div>

                {/* Per-question review */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <List className="h-3.5 w-3.5" />
                    {lang === 'fr' ? 'Revue des questions' : 'Question review'}
                  </p>
                  {quiz.questions.map((q, i) => {
                    const ans = answers[i];
                    return (
                      <div key={q.id} className={cn(
                        'rounded-2xl border p-3.5',
                        ans?.correct
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : 'border-red-200 bg-red-50/60'
                      )}>
                        <div className="flex items-start gap-2.5">
                          <span className={cn(
                            'shrink-0 h-5 w-5 rounded-full flex items-center justify-center mt-0.5',
                            ans?.correct ? 'bg-emerald-500' : 'bg-red-500'
                          )}>
                            {ans?.correct
                              ? <CheckCircle2 className="h-3 w-3 text-white" />
                              : <XCircle className="h-3 w-3 text-white" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">
                              {q.question}
                            </p>
                            {ans && (
                              <div className="flex gap-3 mt-1 text-xs">
                                <span className={ans.correct ? 'text-emerald-600' : 'text-red-600'}>
                                  {lang === 'fr' ? 'Votre réponse :' : 'Your answer:'}{' '}
                                  <strong>{ans.selected}</strong>
                                </span>
                                {!ans.correct && (
                                  <span className="text-emerald-600">
                                    {lang === 'fr' ? 'Bonne réponse :' : 'Correct:'}{' '}
                                    <strong>{q.bonne_reponse}</strong>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-slate-100 px-5 py-3.5 flex items-center gap-3 bg-slate-50/50">
            {phase === 'quiz' && question && (
              <>
                <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm px-2">
                  {lang === 'fr' ? 'Passer' : 'Skip'}
                </Button>
                <div className="flex-1" />
                {!submitted ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!selected}
                    className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:opacity-40 rounded-xl"
                  >
                    {lang === 'fr' ? 'Valider' : 'Submit'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={feedbackLoading}
                    className={cn(
                      'gap-2 font-semibold shadow-sm text-white rounded-xl',
                      currentIndex === (quiz?.questions.length ?? 0) - 1
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90'
                        : 'bg-primary hover:bg-primary/90'
                    )}
                  >
                    {feedbackLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : currentIndex === (quiz?.questions.length ?? 0) - 1 ? (
                      <><Trophy className="h-4 w-4" />{lang === 'fr' ? 'Voir mes résultats' : 'See results'}</>
                    ) : (
                      <>{lang === 'fr' ? 'Question suivante' : 'Next question'}<ChevronRight className="h-4 w-4" /></>
                    )}
                  </Button>
                )}
              </>
            )}

            {phase === 'review' && (
              <>
                <Button
                  variant="outline"
                  onClick={fetchQuiz}
                  className="gap-2 flex-1 border-slate-200 rounded-xl"
                >
                  <RotateCcw className="h-4 w-4" />
                  {lang === 'fr' ? 'Rejouer' : 'Replay'}
                </Button>
                <Button
                  onClick={onClose}
                  className="gap-2 flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold shadow-sm rounded-xl"
                >
                  <ChevronRight className="h-4 w-4" />
                  {lang === 'fr' ? 'Module suivant' : 'Next module'}
                </Button>
              </>
            )}

            {phase === 'error' && null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useExamSession, useSubmitExamMutation } from '@/hooks/api/useExams';
import { isAxiosError } from 'axios';

function parseDurationToSeconds(duration: string): number {
  const s = duration.trim();
  const min = s.match(/^(\d+)\s*(?:min|minutes?)$/i);
  if (min) return Math.max(60, parseInt(min[1], 10) * 60);
  const h = s.match(/^(\d+)\s*(?:h|hr|hours?)$/i);
  if (h) return Math.max(60, parseInt(h[1], 10) * 3600);
  return 45 * 60;
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTimeSpentLabel(startedAt: number): string {
  const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  return `${mins} min`;
}

export default function TakeExamRunner({ examId }: { examId: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'en';

  const { data, isLoading, isError, error } = useExamSession(examId, true);
  const submitMutation = useSubmitExamMutation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const timerSeconds = useMemo(() => {
    if (!data?.exam.duration) return 45 * 60;
    return parseDurationToSeconds(data.exam.duration);
  }, [data?.exam.duration]);

  useEffect(() => {
    if (!data?.questions?.length) return;
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
    setSecondsLeft(timerSeconds);
  }, [data?.questions?.length, timerSeconds]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null || s <= 0) return s;
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  const handleSubmit = useCallback(async () => {
    if (!data?.questions?.length || submittedRef.current) return;
    submittedRef.current = true;
    const answersPayload: Record<string, string> = {};
    for (const q of data.questions) {
      const sel = answers[q.id];
      if (sel) answersPayload[String(q.id)] = sel;
    }
    const timeSpent = startedAtRef.current ? formatTimeSpentLabel(startedAtRef.current) : undefined;
    try {
      await submitMutation.mutateAsync({ examId, answers: answersPayload, timeSpent });
      router.push(`/${locale}/dashboard/learner/examens`);
    } catch {
      submittedRef.current = false;
    }
  }, [answers, data?.questions, examId, locale, router, submitMutation]);

  useEffect(() => {
    if (secondsLeft === 0 && data?.questions?.length && !submitMutation.isPending) {
      void handleSubmit();
    }
  }, [secondsLeft, data?.questions?.length, handleSubmit, submitMutation.isPending]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submitMutation.isSuccess || submittedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [submitMutation.isSuccess]);

  const questions = data?.questions ?? [];
  const total = questions.length;
  const q = questions[currentIndex];

  if (isLoading || secondsLeft === null) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm">{t('learnerExams.takeExamLoading')}</p>
      </div>
    );
  }

  if (isError || !data) {
    const already =
      isAxiosError(error) && error.response?.status === 409;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-destructive font-medium">
          {already ? t('learnerExams.takeExamAlreadyDone') : t('learnerExams.takeExamLoadError')}
        </p>
        <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/dashboard/learner/examens`)}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{data.exam.course}</p>
            <h1 className="text-lg font-bold text-foreground line-clamp-2">{data.exam.title}</h1>
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono font-semibold',
              secondsLeft <= 120 ? 'border-destructive text-destructive' : 'border-border text-foreground',
            )}
          >
            <Clock className="h-4 w-4" />
            {formatSeconds(secondsLeft)}
          </div>
        </div>
        <div className="h-1.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${total ? ((currentIndex + 1) / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <p className="text-sm text-muted-foreground">
          {t('learnerExams.takeExamPassing')}: {data.exam.passingScore}%
        </p>

        {q && (
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-primary shrink-0">Q{currentIndex + 1}/{total}</span>
              <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">{q.prompt}</p>
            </div>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                    className={cn(
                      'w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50',
                    )}
                  >
                    <span className="font-semibold mr-2">{opt.id}.</span>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {questions.map((_, i) => (
            <button
              key={questions[i].id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'h-9 w-9 rounded-lg text-xs font-semibold border',
                i === currentIndex
                  ? 'border-primary bg-primary text-primary-foreground'
                  : answers[questions[i].id]
                    ? 'border-success/50 bg-success-muted text-success-text'
                    : 'border-border text-muted-foreground',
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${locale}/dashboard/learner/examens`)}
            disabled={submitMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('common.previous')}
            </Button>
            {currentIndex < total - 1 ? (
              <Button type="button" onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}>
                {t('common.next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" onClick={() => void handleSubmit()} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('learnerExams.takeExamSubmit')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useParams } from 'next/navigation';
import TakeExamRunner from '@/components/learner/exams/TakeExamRunner';
import { LearnerPageShell } from '@/components/learner/design/LearnerPageShell';

export default function TakeExamPage() {
  const params = useParams();
  const raw = params.examId;
  const examId = Number.parseInt(typeof raw === 'string' ? raw : Array.isArray(raw) ? (raw[0] ?? '') : '', 10);
  if (!Number.isFinite(examId) || examId < 1) {
    return (
      <LearnerPageShell className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm p-6">
        Invalid exam.
      </LearnerPageShell>
    );
  }
  return (
    <LearnerPageShell>
      <TakeExamRunner examId={examId} />
    </LearnerPageShell>
  );
}

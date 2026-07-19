'use client';

import { useState, useEffect } from 'react';
import { api, API_PATHS } from '@/lib/api/client';
import { useQuizAssessmentQuestions } from '@/hooks/api/useQuizAssessment';
import { X, Loader2, Trophy, ArrowLeft, ChevronRight, CheckCircle, XCircle, Brain, Cloud, Shield } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'quiz' | 'evaluating' | 'results' | 'error';

interface Question {
  id: string | number;
  question: string;
  options: { label: string; text: string }[];
  correct: string;
  difficulty: string;
  explanation?: string;
}

export interface LevelData {
  niveau: string;
  score: { obtenu: number; total: number; pourcentage: number };
  analyse?: string;
  points_forts?: string[];
  points_a_renforcer?: string[];
}

/** Map Roadmap Agent profile to API level domain. API level results only accept devops|ai|cyber; cloud profile is stored as devops. */
const PROFILE_TO_DOMAIN: Record<string, 'devops' | 'ai' | 'cyber'> = {
  cloud: 'devops',
  cyber: 'cyber',
  ai: 'ai',
};

interface Props {
  open: boolean;
  onClose: () => void;
  profile: string;
  profileData?: any;
  onLevelComplete: (levelData: LevelData, questions: Question[]) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROFILE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cloud: { label: 'Cloud & DevOps',          icon: <Cloud  className="h-5 w-5" />, color: 'text-blue-600'   },
  cyber: { label: 'Cybersecurity',            icon: <Shield className="h-5 w-5" />, color: 'text-red-600'    },
  ai:    { label: 'Artificial Intelligence',  icon: <Brain  className="h-5 w-5" />, color: 'text-violet-600' },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-orange-100 text-orange-700',
  hard:   'bg-red-100 text-red-700',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard',
};

const LEVEL_STYLE: Record<string, { color: string; bg: string }> = {
  'Débutant':       { color: 'text-green-600',  bg: 'bg-green-50'  },
  'Intermédiaire':  { color: 'text-orange-500', bg: 'bg-orange-50' },
  'Expert':         { color: 'text-red-600',    bg: 'bg-red-50'    },
  'Beginner':       { color: 'text-green-600',  bg: 'bg-green-50'  },
  'Intermediate':   { color: 'text-orange-500', bg: 'bg-orange-50' },
  'Advanced':       { color: 'text-red-600',    bg: 'bg-red-50'    },
};

const LEVEL_LABEL: Record<string, string> = {
  'Débutant': 'Beginner',
  'Intermédiaire': 'Intermediate',
  'Expert': 'Expert',
  'Beginner': 'Beginner',
  'Intermediate': 'Intermediate',
  'Advanced': 'Advanced',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizNiv({ open, onClose, profile, profileData, onLevelComplete }: Props) {
  const {
    data: assessmentData,
    isLoading: assessmentLoading,
    error: assessmentError,
    refetch: refetchQuestions,
  } = useQuizAssessmentQuestions(open && !!profile, profile);
  const [phase, setPhase]           = useState<Phase>('loading');
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const [levelData, setLevelData]   = useState<LevelData | null>(null);
  const [errorMsg, setErrorMsg]     = useState('');

  const [userId, setUserId]    = useState('anonymous');
  const [sessionId] = useState('level_session');

  // Set real userId from localStorage after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const realUserId = localStorage.getItem('subul_user_id') || 'anonymous';
      if (realUserId !== userId) {
        // This will trigger a re-render but won't cause hydration mismatch
        setUserId(realUserId);
      }
    }
  }, []);

  // Retry function for error state
  const handleRetry = () => {
    setPhase('loading');
    setErrorMsg('');
  };

  useEffect(() => {
    if (!open) return;
    setQuestions([]);
    setOriginalQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setLevelData(null);
    setErrorMsg('');
    setPhase('loading');
  }, [open]);

  useEffect(() => {
    if (!open || !assessmentData) return;
    if (assessmentError) {
      setErrorMsg('Unable to load questions. Please try again.');
      setPhase('error');
      return;
    }
    const domain = PROFILE_TO_DOMAIN[profile] || 'devops';
    const raw = assessmentData[domain] || [];
    
    // Store original questions for evaluation (RoadmapAgent format)
    // Use originalQuestions from assessmentData if available, otherwise use transformed data
    setOriginalQuestions(assessmentData.originalQuestions || raw);
    
    // Transform questions for UI display
    const qs: Question[] = raw.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options.map((o) => ({ label: o.label, text: o.text })),
      correct: q.options.find((o) => o.correct)?.label ?? '',
      difficulty: q.difficulty,
      explanation: q.explanation,
    }));
    
    if (qs.length === 0) {
      setErrorMsg('No questions are available for this profile.');
      setPhase('error');
      return;
    }
    setQuestions(qs);
    setPhase('quiz');
  }, [open, profile, assessmentData, assessmentError]);

  // ── Handle answer selection ───────────────────────────────────────────────

  const handleAnswer = (label: string) => {
    const qid = String(questions[currentIndex].id);
    const newAnswers = { ...answers, [qid]: label };
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      evaluate(newAnswers);
    }
  };

  // ── Submit evaluation ─────────────────────────────────────────────────────

  const evaluate = async (finalAnswers: Record<string, string>) => {
    setPhase('evaluating');
    try {
      const { data } = await api.post<LevelData>('/api/roadmap/level/evaluate', {
        profile,
        questions: originalQuestions,
        answers: finalAnswers,
        user_id: userId,
        session_id: sessionId,
        lang: 'en',
      });
      setLevelData(data);
      setPhase('results');
    } catch (err) {
      console.error('[QuizNiv] evaluate error:', err);
      setErrorMsg('Unable to evaluate your answers. Please try again.');
      setPhase('error');
    }
  };

  if (!open) return null;

  const meta  = PROFILE_META[profile] || PROFILE_META['cloud'];
  const q     = questions[currentIndex];
  const lvl   = levelData ? (LEVEL_STYLE[levelData.niveau] || { color: 'text-gray-700', bg: 'bg-gray-50' }) : null;
  const levelLabel = levelData ? (LEVEL_LABEL[levelData.niveau] || levelData.niveau) : '';
  const pct   = questions.length > 0 ? Math.round((currentIndex / questions.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
           style={{ height: '600px' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center ${meta.color}`}>
              {meta.icon}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Level test - {meta.label}</p>
              <p className="text-xs text-gray-400">
                {phase === 'loading'    && 'Generating questions...'}
                {phase === 'quiz'       && `Question ${currentIndex + 1} / ${questions.length}`}
                {phase === 'evaluating' && 'Evaluating...'}
                {phase === 'results'    && 'Results'}
                {phase === 'error'      && 'Error'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Loading / Evaluating */}
          {(phase === 'loading' || phase === 'evaluating') && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
              <p className="text-gray-600 text-sm font-medium">
                {phase === 'loading'    ? 'Generating personalized questions...' : 'Evaluating your answers...'}
              </p>
              <p className="text-xs text-gray-400">
                {phase === 'loading' ? 'AI is preparing a test tailored to your profile' : 'AI is analyzing your answers'}
              </p>
            </div>
          )}

          {/* Quiz */}
          {phase === 'quiz' && q && (
            <div className="px-6 py-5">
              {/* Progress bar */}
              <div className="mb-5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300"
                     style={{ width: `${pct}%` }} />
              </div>

              {/* Difficulty badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${DIFFICULTY_COLOR[q.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                  {DIFFICULTY_LABEL[q.difficulty] || q.difficulty}
                </span>
                <span className="text-xs text-gray-400">Question {currentIndex + 1} / {questions.length}</span>
              </div>

              {/* Question */}
              <p className="text-sm font-semibold text-gray-900 mb-5 leading-relaxed">{q.question}</p>

              {/* Options */}
              <div className="space-y-2.5">
                {q.options.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleAnswer(opt.label)}
                    className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-100 hover:border-violet-300 hover:bg-violet-50 transition-all text-sm flex items-start gap-3 group active:scale-[0.99]"
                  >
                    <span className="w-6 h-6 rounded-lg bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors">
                      {opt.label}
                    </span>
                    <span className="text-gray-700 leading-snug">{opt.text}</span>
                  </button>
                ))}
              </div>

              {/* Back button */}
              {currentIndex > 0 && (
                <button
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  className="mt-4 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Previous question
                </button>
              )}
            </div>
          )}

          {/* Results */}
          {phase === 'results' && levelData && lvl && (
            <div className="px-6 py-5 space-y-5">

              {/* Level badge */}
              <div className={`rounded-2xl p-5 ${lvl.bg} text-center`}>
                <Trophy className={`h-10 w-10 mx-auto mb-2 ${lvl.color}`} />
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Your level</p>
                <p className={`text-3xl font-bold mt-1 ${lvl.color}`}>{levelLabel}</p>
                <p className="text-sm text-gray-500 mt-1">Score: {levelData.score?.pourcentage ?? 0}%</p>
              </div>

              {/* Analyse */}
              {levelData.analyse && (
                <p className="text-sm text-gray-600 leading-relaxed">{levelData.analyse}</p>
              )}

              {/* Points forts */}
              {(levelData.points_forts?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Strengths</p>
                  <ul className="space-y-1.5">
                    {(levelData.points_forts ?? []).map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Points à renforcer */}
              {(levelData.points_a_renforcer?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">To improve</p>
                  <ul className="space-y-1.5">
                    {(levelData.points_a_renforcer ?? []).map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <XCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => onLevelComplete(levelData, questions)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                Generate my personalized roadmap
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
              <XCircle className="h-12 w-12 text-red-400" />
              <p className="text-gray-700 font-medium text-center">{errorMsg}</p>
              <button
                onClick={() => {
                  setPhase('loading');
                  setErrorMsg('');
                  refetchQuestions();
                }}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

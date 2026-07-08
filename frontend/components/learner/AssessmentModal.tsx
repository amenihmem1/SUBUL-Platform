'use client';

import { useState, useEffect } from 'react';
import { api, API_PATHS } from '@/lib/api/client';
import { X, Brain, Cloud, Shield, Loader2, ChevronRight, Star, ArrowLeft, XCircle } from 'lucide-react';
import { normalizeScores, getPrimaryProfile } from '@/data/assessmentData';
import { updateTrack } from '@/services/user';
import { useQueryClient } from '@tanstack/react-query';
import { userKeys } from '@/hooks/api/useUsers';

/** Assessment calls go through the backend (proxies to roadmap agent). No direct agent URL needed in deployment. */
const assessmentApi = api;

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'quiz' | 'analyzing' | 'profile' | 'error';

interface AssessQuestion {
  id: number;
  question: string;
  options: Record<string, string>;       // { A: '...', B: '...', C: '...' }
  domain_mapping: Record<string, string>; // { A: 'cloud', B: 'cyber', C: 'ai' }
}

export interface ProfileData {
  profile: string;
  confidence: number;
  scores: { cloud: number; cyber: number; ai: number };
  hybrid: string | null;
  summary_fr: string;
  summary_en: string;
  strengths: string[];
  recommended_first_certification: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAssessmentComplete: (profile: string, profileData: ProfileData) => void;
}

// ─── Profile meta ─────────────────────────────────────────────────────────────

const PROFILE_META: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string; bar: string }> = {
  cloud: { icon: <Cloud  className="h-6 w-6" />, label: 'Cloud & DevOps',           color: 'text-blue-600',   bg: 'bg-blue-50',   bar: 'bg-blue-500'   },
  cyber: { icon: <Shield className="h-6 w-6" />, label: 'Cybersécurité',             color: 'text-red-600',    bg: 'bg-red-50',    bar: 'bg-red-500'    },
  ai:    { icon: <Brain  className="h-6 w-6" />, label: 'Intelligence Artificielle', color: 'text-violet-600', bg: 'bg-violet-50', bar: 'bg-violet-500' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentModal({ open, onClose, onAssessmentComplete }: Props) {
  const queryClient = useQueryClient();
  const [phase, setPhase]             = useState<Phase>('loading');
  const [questions, setQuestions]     = useState<AssessQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]         = useState<Record<string, string>>({});  // { "1": "A", "2": "C", ... }
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [errorMsg, setErrorMsg]       = useState('');

  const [userId, setUserId]    = useState('anonymous');
  const [sessionId] = useState('assess_session');

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

  // ── Fetch questions on open ───────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setPhase('loading');
      setQuestions([]);
      setCurrentIndex(0);
      setAnswers({});
      setProfileData(null);
      setErrorMsg('');
      fetchQuestions();
    }
  }, [open]);

  const fetchQuestions = async () => {
    try {
      const { data } = await assessmentApi.post(API_PATHS.roadmap('assess/questions'), {
        lang: 'fr',
        user_id: userId,
        session_id: sessionId,
      });
      const qs: AssessQuestion[] = data.questions || [];
      if (qs.length === 0) throw new Error('Aucune question reçue');
      setQuestions(qs);
      setPhase('quiz');
    } catch (err) {
      console.error('[AssessmentModal] fetch error:', err);
      setErrorMsg('Impossible de charger les questions. Veuillez réessayer.');
      setPhase('error');
    }
  };

  // ── Handle answer click ───────────────────────────────────────────────────

  const handleAnswer = (label: string) => {
    const qid = String(questions[currentIndex].id);
    const newAnswers = { ...answers, [qid]: label };
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      analyzeProfile(newAnswers);
    }
  };

  // ── Analyze profile from answers ──────────────────────────────────────────

  const analyzeProfile = async (finalAnswers: Record<string, string>) => {
    setPhase('analyzing');

    // Format answers as conversation history for the analyze endpoint
    const history = questions.map(q => {
      const chosenLabel = finalAnswers[String(q.id)] || 'A';
      const chosenText  = q.options[chosenLabel] || '';
      return [
        { role: 'assistant', content: `${q.question}\nA) ${q.options['A']}\nB) ${q.options['B']}\nC) ${q.options['C']}` },
        { role: 'user',      content: `${chosenLabel}) ${chosenText}` },
      ];
    }).flat();

    try {
      const { data } = await assessmentApi.post<ProfileData>(API_PATHS.roadmap('assess/analyze'), {
        history,
        user_id: userId,
        session_id: sessionId,
      });

      // ── Normalize scores ─────────────────────────────────────────────────
      // The backend may return raw per-domain scores (e.g. cloud:40, cyber:80,
      // ai:60 — summing to 180) rather than percentages that add up to 100.
      // normalizeScores() proportionally redistributes them to exactly 100%.
      const scores = normalizeScores({
        cloud: data.scores?.cloud ?? 0,
        cyber: data.scores?.cyber ?? 0,
        ai:    data.scores?.ai    ?? 0,
      });

      // Derive the primary profile from normalized scores so it always matches
      // the highest bar, regardless of what the LLM returned.
      const detectedProfile = getPrimaryProfile(scores);

      // Confidence = normalized primary score expressed as a decimal [0, 1]
      // so the UI's `Math.round(confidence * 100)` renders the correct value.
      const confidence = scores[detectedProfile] / 100;

      const safeData: ProfileData = {
        ...data,
        profile:    detectedProfile,
        scores,
        confidence,
        strengths:  data.strengths ?? [],
        hybrid:     data.hybrid    ?? null,
        summary_fr: data.summary_fr ?? '',
        summary_en: data.summary_en ?? '',
        recommended_first_certification: data.recommended_first_certification ?? '',
      };
      setProfileData(safeData);
      setPhase('profile');

      // Persist the detected track so labs/courses can be filtered for this learner
      updateTrack(detectedProfile as 'cloud' | 'cyber' | 'ai')
        .then((user) => {
          queryClient.setQueryData(userKeys.current(), user);
        })
        .catch(() => {
          // Non-blocking: failing to persist track doesn't break the quiz flow
        });
    } catch (err) {
      console.error('[AssessmentModal] analyze error:', err);
      setErrorMsg("Erreur lors de l'analyse. Veuillez réessayer.");
      setPhase('error');
    }
  };

  if (!open) return null;

  const q    = questions[currentIndex];
  const meta = profileData ? PROFILE_META[profileData.profile] : null;
  const pct  = questions.length > 0 ? Math.round((currentIndex / questions.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
           style={{ height: '600px' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Détection de profil</p>
            <p className="text-xs text-gray-400">
              {phase === 'loading'    && 'Génération des questions…'}
              {phase === 'quiz'       && `Question ${currentIndex + 1} / ${questions.length}`}
              {phase === 'analyzing'  && 'Analyse de votre profil…'}
              {phase === 'profile'    && 'Profil détecté ✓'}
              {phase === 'error'      && 'Erreur'}
            </p>
          </div>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Loading */}
          {(phase === 'loading' || phase === 'analyzing') && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
              <p className="text-gray-600 text-sm font-medium">
                {phase === 'loading' ? 'Génération des questions personnalisées…' : 'Analyse de votre profil…'}
              </p>
            </div>
          )}

          {/* Quiz */}
          {phase === 'quiz' && q && (
            <div className="px-6 py-5">
              {/* Progress bar */}
              <div className="mb-5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all duration-300"
                     style={{ width: `${pct}%` }} />
              </div>

              {/* Question number */}
              <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-2">
                Question {currentIndex + 1} sur {questions.length}
              </p>

              {/* Question text */}
              <p className="text-base font-semibold text-gray-900 mb-5 leading-relaxed">
                {q.question}
              </p>

              {/* Options */}
              <div className="space-y-2.5">
                {Object.entries(q.options).map(([label, text]) => (
                  <button
                    key={label}
                    onClick={() => handleAnswer(label)}
                    className="w-full text-left px-4 py-3.5 rounded-xl border-2 border-gray-100 hover:border-violet-300 hover:bg-violet-50 transition-all text-sm flex items-start gap-3 group active:scale-[0.99]"
                  >
                    <span className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-violet-100 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:text-violet-600 flex-shrink-0 mt-0.5 transition-colors">
                      {label}
                    </span>
                    <span className="text-gray-700 leading-snug">{text}</span>
                  </button>
                ))}
              </div>

              {/* Back */}
              {currentIndex > 0 && (
                <button
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  className="mt-4 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Question précédente
                </button>
              )}
            </div>
          )}

          {/* Profile result */}
          {phase === 'profile' && profileData && meta && (
            <div className="px-6 py-5 space-y-4">

              {/* Profile card */}
              <div className={`rounded-2xl p-5 ${meta.bg} flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center ${meta.color}`}>
                  {meta.icon}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Profil détecté</p>
                  <p className={`text-xl font-bold ${meta.color}`}>{meta.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Confiance : {Math.round(profileData.confidence * 100)}%</p>
                </div>
              </div>

              {/* Score bars */}
              <div className="space-y-2">
                {(['cloud', 'cyber', 'ai'] as const).map(key => {
                  const m     = PROFILE_META[key];
                  const score = profileData.scores[key] ?? 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{m.label}</span>
                        <span className="font-medium">{score}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${m.bar} rounded-full transition-all`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <p className="text-sm text-gray-600 leading-relaxed">{profileData.summary_fr}</p>

              {/* Strengths */}
              {profileData.strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Points forts</p>
                  <div className="flex flex-wrap gap-2">
                    {profileData.strengths.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                        <Star className="h-3 w-3 text-yellow-400" />{s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended cert */}
              {profileData.recommended_first_certification && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <span className="font-medium">1ère certification : </span>
                  {profileData.recommended_first_certification}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => onAssessmentComplete(profileData.profile, profileData)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                Commencer le test de niveau
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
                onClick={fetchQuestions}
                className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

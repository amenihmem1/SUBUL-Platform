'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { api, API_PATHS } from '@/lib/api/client';
import AssessmentModal, { ProfileData } from './AssessmentModal';
import QuizNiv from './QuizNiv';
import type { LevelData } from './QuizNiv';
import {
  Loader2, MapPin, CheckCircle, Sparkles, X,
  Clock, Trophy, Lock, ChevronRight, Star,
  Zap, BookOpen, Target, Award, TrendingUp,
  Cloud, Shield, Brain, ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowPhase = 'assessment' | 'quiz' | 'generating' | 'done';

interface CertificationItem {
  ordre: number;
  nom: string;
  code?: string;
  provider: 'Microsoft' | 'AWS';
  niveau_certif: 'Fondamental' | 'Associé' | 'Expert' | 'Professionnel' | 'Spécialité';
  duree_preparation_semaines: number;
  heures_etude: number;
  prerequis: string[];
  pourquoi_cette_certif: string;
  competences_acquises: string[];
  statut: 'current' | 'upcoming' | 'locked';
  xp_reward: number;
}

interface RoadmapPhase {
  phase_number: number;
  phase_name: string;
  phase_description: string;
  duration_weeks: number;
  level_tier?: string;
  certifications: CertificationItem[];
}

interface ParsedRoadmap {
  roadmap_title: string;
  roadmap_summary: string;
  total_estimated_weeks: number;
  total_certifications: number;
  user_level?: string;
  phases: RoadmapPhase[];
  conseil_final: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onRoadmapGenerated?: (roadmap: ParsedRoadmap, profileData: ProfileData, levelData: LevelData) => void;
  /** Called when the full flow (assessment + level + roadmap) is complete; e.g. for entry gate to close and refetch. */
  onComplete?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  Microsoft: {
    bg: 'rgba(0,120,212,0.08)',
    text: '#0078D4',
    border: 'rgba(0,120,212,0.2)',
    label: 'Azure',
  },
  AWS: {
    bg: 'rgba(232,119,34,0.08)',
    text: '#E87722',
    border: 'rgba(232,119,34,0.2)',
    label: 'AWS',
  },
};

const LEVEL_TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Fondamental:   { bg: 'rgba(16,185,129,.08)',   text: '#059669',  border: 'rgba(16,185,129,.2)'  },
  Associé:       { bg: 'rgba(59,130,246,.08)',    text: '#2563EB',  border: 'rgba(59,130,246,.2)'  },
  Expert:        { bg: 'rgba(233,30,140,.08)',    text: '#E91E8C',  border: 'rgba(233,30,140,.2)'  },
  Professionnel: { bg: 'rgba(123,47,190,.08)',    text: '#7B2FBE',  border: 'rgba(123,47,190,.2)'  },
  Spécialité:    { bg: 'rgba(245,158,11,.08)',    text: '#B45309',  border: 'rgba(245,158,11,.2)'  },
};

// Level order for sorting phases
const LEVEL_ORDER: Record<string, number> = {
  Fondamental: 0, Associé: 1, Expert: 2, Professionnel: 3, Spécialité: 4,
};

const PROFILE_ICONS: Record<string, any> = {
  cloud: Cloud, cyber: Shield, ai: Brain,
};

function ProviderBadge({ provider }: { provider: string }) {
  const s = PROVIDER_STYLES[provider] || PROVIDER_STYLES.AWS;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
    }}>
      {s.label === 'Azure' ? '🔷' : '🟠'} {s.label}
    </span>
  );
}

function LevelBadge({ level }: { level: string }) {
  const s = LEVEL_TIER_STYLES[level] || LEVEL_TIER_STYLES.Associé;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 99,
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      fontSize: 10, fontWeight: 700,
    }}>
      {level}
    </span>
  );
}

function XPBadge({ xp }: { xp: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 99,
      background: 'rgba(233,30,140,.07)', color: '#E91E8C',
      border: '1px solid rgba(233,30,140,.2)',
      fontSize: 10, fontWeight: 700,
    }}>
      <Star size={9} /> +{xp} XP
    </span>
  );
}

// ─── Certification Card ───────────────────────────────────────────────────────

function CertCard({ cert, index }: { cert: CertificationItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLocked   = cert.statut === 'locked';
  const isCurrent  = cert.statut === 'current';

  return (
    <div
      style={{
        background: isCurrent ? 'linear-gradient(135deg,rgba(233,30,140,.03),rgba(123,47,190,.04))'
          : isLocked ? 'rgba(248,246,254,0.6)'
          : '#FFFFFF',
        border: isCurrent
          ? '1.5px solid rgba(233,30,140,.25)'
          : isLocked
          ? '1px solid rgba(123,47,190,.07)'
          : '1px solid rgba(123,47,190,.1)',
        borderRadius: 14, padding: '16px 18px',
        transition: 'all .2s',
        opacity: isLocked ? 0.6 : 1,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* "Current" indicator stripe */}
      {isCurrent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg,#E91E8C,#7B2FBE)',
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        {/* Order number */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isCurrent ? 'linear-gradient(135deg,#E91E8C,#7B2FBE)' : 'rgba(123,47,190,.1)',
          color: isCurrent ? '#fff' : '#7B2FBE',
          fontSize: 11, fontWeight: 800,
        }}>
          {isLocked ? <Lock size={11} /> : cert.ordre}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6, alignItems: 'center' }}>
            <ProviderBadge provider={cert.provider} />
            <LevelBadge level={cert.niveau_certif} />
            {isCurrent && (
              <span style={{
                padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                background: 'rgba(233,30,140,.12)', color: '#E91E8C',
                border: '1px solid rgba(233,30,140,.3)',
              }}>
                Recommended
              </span>
            )}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1230', lineHeight: 1.3, marginBottom: 4 }}>
            {cert.nom}
            {cert.code && (
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: '#B0A8C8',
                fontFamily: 'monospace', background: 'rgba(123,47,190,.06)',
                padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(123,47,190,.12)' }}>
                {cert.code}
              </span>
            )}
          </div>

          <p style={{ fontSize: 12, color: '#7A6E99', lineHeight: 1.55, margin: '0 0 8px' }}>
            {cert.pourquoi_cette_certif}
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7A6E99' }}>
              <Clock size={11} /> {cert.duree_preparation_semaines} weeks
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7A6E99' }}>
              <BookOpen size={11} /> {cert.heures_etude}h study
            </span>
            <XPBadge xp={cert.xp_reward} />
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#B0A8C8', padding: 4, flexShrink: 0, marginTop: 2,
            transition: 'color .2s',
          }}
        >
          <ChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(123,47,190,.08)' }}>
          {cert.competences_acquises?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                color: '#B0A8C8', marginBottom: 8 }}>
                Skills gained
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {cert.competences_acquises.map((c, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 99,
                    background: 'rgba(123,47,190,.06)', border: '1px solid rgba(123,47,190,.12)',
                    color: '#7B2FBE',
                  }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {cert.prerequis?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                color: '#B0A8C8', marginBottom: 8 }}>
                Prerequisites
              </div>
              {cert.prerequis.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                  color: '#7A6E99', marginBottom: 4 }}>
                  <ChevronRight size={10} color="#E91E8C" />
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Phase Section ─────────────────────────────────────────────────────────────

function PhaseSection({ phase, userLevel }: { phase: RoadmapPhase; userLevel: string }) {
  const tier = phase.level_tier || phase.certifications[0]?.niveau_certif || 'Associé';
  const ts = LEVEL_TIER_STYLES[tier] || LEVEL_TIER_STYLES.Associé;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Phase header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
        paddingBottom: 12, borderBottom: '1px solid rgba(123,47,190,.08)',
      }}>
        {/* Phase number bubble */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${ts.bg}`, border: `1.5px solid ${ts.border}`,
          color: ts.text, fontSize: 14, fontWeight: 800,
        }}>
          {phase.phase_number}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1230', letterSpacing: '-.01em' }}>
              {phase.phase_name}
            </span>
            <span style={{
              padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: ts.bg, color: ts.text, border: `1px solid ${ts.border}`,
            }}>
              {tier}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#7A6E99', margin: '2px 0 0', lineHeight: 1.5 }}>
            {phase.phase_description}
          </p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          fontSize: 11, color: '#B0A8C8', fontWeight: 500,
        }}>
          <Clock size={11} /> {phase.duration_weeks} weeks
        </div>
      </div>

      {/* Certifications */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {phase.certifications.map((cert, i) => (
          <CertCard key={i} cert={cert} index={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Full Roadmap View ────────────────────────────────────────────────────────

function RoadmapView({
  roadmap, profile, levelData, onClose,
}: {
  roadmap: ParsedRoadmap;
  profile: string;
  levelData: LevelData | null;
  onClose: () => void;
}) {
  const ProfileIcon = PROFILE_ICONS[profile] || Target;
  const userLevel = roadmap.user_level || levelData?.niveau || 'Intermédiaire';

  // Sort phases by level tier (low → high based on user level)
  const sortedPhases = [...roadmap.phases].sort((a, b) => {
    const tierA = a.level_tier || a.certifications[0]?.niveau_certif || 'Associé';
    const tierB = b.level_tier || b.certifications[0]?.niveau_certif || 'Associé';
    return (LEVEL_ORDER[tierA] ?? 99) - (LEVEL_ORDER[tierB] ?? 99);
  });

  const levelLabel = {
    'Débutant': 'Beginner', 'Intermédiaire': 'Intermediate', 'Expert': 'Expert',
  }[userLevel] || userLevel;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* ── Sticky Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(123,47,190,.1)',
        padding: '14px 24px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg,#E91E8C,#7B2FBE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 14px rgba(233,30,140,.3)',
            }}>
              <MapPin size={18} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1230',
                letterSpacing: '-.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {roadmap.roadmap_title}
              </div>
              <div style={{ fontSize: 11, color: '#B0A8C8', marginTop: 1 }}>
                Azure · AWS · {roadmap.total_certifications} certifications · {roadmap.total_estimated_weeks} weeks
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(123,47,190,.08)', border: '1px solid rgba(123,47,190,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#7A6E99', transition: 'all .2s',
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* Summary card */}
        <div style={{
          background: 'linear-gradient(135deg,rgba(233,30,140,.04),rgba(123,47,190,.05))',
          border: '1px solid rgba(123,47,190,.12)',
          borderRadius: 16, padding: '18px 20px', marginBottom: 22,
        }}>
          {/* Level + profile badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: 'rgba(233,30,140,.1)', border: '1px solid rgba(233,30,140,.25)', color: '#E91E8C',
            }}>
              <ProfileIcon size={11} />
              {profile.charAt(0).toUpperCase() + profile.slice(1)}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: 'rgba(123,47,190,.08)', border: '1px solid rgba(123,47,190,.2)', color: '#7B2FBE',
            }}>
              <Trophy size={11} /> {levelLabel}
            </span>
          </div>

          <p style={{ fontSize: 13, color: '#7A6E99', lineHeight: 1.7, margin: 0 }}>
            {roadmap.roadmap_summary}
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { icon: Award, label: `${roadmap.total_certifications} certifications` },
              { icon: Clock, label: `${roadmap.total_estimated_weeks} weeks` },
              { icon: TrendingUp, label: `${roadmap.phases.length} phases` },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#7A6E99' }}>
                <Icon size={12} color="#E91E8C" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Level progression bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
            color: '#B0A8C8', marginBottom: 10 }}>
            Parcours niveau
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(123,47,190,.06)',
            borderRadius: 99, padding: '3px 4px', border: '1px solid rgba(123,47,190,.1)' }}>
            {['Fondamental', 'Associé', 'Expert', 'Professionnel'].map((lvl, i) => {
              const available = sortedPhases.some(p =>
                (p.level_tier || p.certifications[0]?.niveau_certif) === lvl
              );
              const ts = LEVEL_TIER_STYLES[lvl];
              return (
                <div key={lvl} style={{
                  flex: 1, textAlign: 'center', padding: '5px 4px', borderRadius: 99,
                  fontSize: 10, fontWeight: 700,
                  background: available ? ts.bg : 'transparent',
                  color: available ? ts.text : '#D1C9E8',
                  border: available ? `1px solid ${ts.border}` : '1px solid transparent',
                  transition: 'all .2s',
                }}>
                  {lvl}
                </div>
              );
            })}
          </div>
        </div>

        {/* Phases */}
        {sortedPhases.map((phase, i) => (
          <PhaseSection key={i} phase={phase} userLevel={userLevel} />
        ))}

        {/* Final advice */}
        {roadmap.conseil_final && (
          <div style={{
            background: 'linear-gradient(135deg,rgba(233,30,140,.05),rgba(123,47,190,.06))',
            border: '1.5px solid rgba(233,30,140,.2)',
            borderRadius: 16, padding: '16px 20px', marginTop: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Sparkles size={14} color="#E91E8C" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#E91E8C', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Final advice
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#7A6E99', lineHeight: 1.65, margin: 0 }}>
              {roadmap.conseil_final}
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        flexShrink: 0, padding: '14px 24px',
        borderTop: '1px solid rgba(123,47,190,.1)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#FFFFFF',
      }}>
        <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0 }} />
        <p style={{ flex: 1, fontSize: 12, color: '#7A6E99', margin: 0 }}>
          Roadmap saved. Certifications are ordered from the lowest level to the highest.
        </p>
        <button
          onClick={onClose}
          style={{
            padding: '9px 22px', borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#E91E8C,#7B2FBE)', border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(233,30,140,.3)', transition: 'all .2s',
          }}
        >
          Finish
        </button>
      </div>
    </div>
  );
}

// ─── QuizFlowManager ─────────────────────────────────────────────────────────

export default function QuizFlowManager({ open, onClose, onRoadmapGenerated, onComplete }: Props) {
  const [phase, setPhase]             = useState<FlowPhase>('assessment');
  const [profile, setProfile]         = useState<string>('cloud');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [levelData, setLevelData]     = useState<LevelData | null>(null);
  const [questions, setQuestions]     = useState<any[]>([]);
  const [roadmapText, setRoadmapText] = useState('');
  const [streaming, setStreaming]     = useState(false);
  const [parsedRoadmap, setParsedRoadmap] = useState<ParsedRoadmap | null>(null);
  const roadmapEndRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId]    = useState('anonymous');
  const [sessionId] = useState('flow_session');

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

  useEffect(() => {
    if (!open) {
      setPhase('assessment');
      setProfile('cloud');
      setProfileData(null);
      setLevelData(null);
      setQuestions([]);
      setRoadmapText('');
      setStreaming(false);
      setParsedRoadmap(null);
    }
  }, [open]);

  useEffect(() => {
    roadmapEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roadmapText]);

  // ── Phase 1 → 2 : Assessment complete ────────────────────────────────────

  const handleAssessmentComplete = async (detectedProfile: string, detectedProfileData: ProfileData) => {
    setProfile(detectedProfile);
    setProfileData(detectedProfileData);
    setPhase('quiz');

    // Persist assessment to backend immediately so the EntryAssessmentGate
    // won't re-appear if a later step errors or triggers a refetch.
    try {
      const token = typeof window !== 'undefined' ? (await import('@/lib/auth/token')).getToken() : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post(API_PATHS.quizResults('assessment'), {
        quizType: 'assessment',
        domain: detectedProfile,
        scores: {
          cloudPercentage: detectedProfileData.scores.cloud,
          cyberPercentage: detectedProfileData.scores.cyber,
          aiPercentage: detectedProfileData.scores.ai,
        },
        primaryProfile: detectedProfile,
        hybridProfiles: detectedProfileData.hybrid ? [detectedProfileData.hybrid] : [],
      }, { headers });
    } catch (err) {
      console.error('[QuizFlowManager] Early assessment save error (non-blocking):', err);
    }
  };

  // ── Phase 2 → 3 : Level quiz complete ────────────────────────────────────

  const handleLevelComplete = async (evaluatedLevel: LevelData, answeredQuestions: any[]) => {
    setLevelData(evaluatedLevel);
    setQuestions(answeredQuestions);
    setPhase('generating');
    await Promise.all([
      saveToNestJS(evaluatedLevel, answeredQuestions),
      streamRoadmapFromAgent(evaluatedLevel),
    ]);
  };

  // ── Save profile + level to NestJS DB (background) ───────────────────────

  const saveToNestJS = async (level: LevelData, answeredQuestions: any[] = []) => {
    try {
      const token = typeof window !== 'undefined' ? (await import('@/lib/auth/token')).getToken() : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // API level domain is devops|ai|cyber; map profile "cloud" → "devops" for level results
      const domain = profile === 'cloud' ? 'devops' : (profile || 'devops');
      
      // Assessment is already saved in handleAssessmentComplete; only save level result here.
      const levelData = {
        domain: domain,
        level: level.niveau,
        score: {
          score: level.score?.obtenu ?? 0,
          total: level.score?.total ?? 100,
          percentage: level.score?.pourcentage ?? 0,
        },
        answers: answeredQuestions.reduce((acc, q, index) => {
          if (q.selectedAnswer) acc[index + 1] = q.selectedAnswer;
          return acc;
        }, {} as Record<number, string>),
        questions: answeredQuestions.map(q => ({
          id: q.id,
          domain: profile === 'cloud' ? 'devops' : profile,
          question: q.question,
          difficulty: q.difficulty || 'moyen',
          points: q.points || 1,
          correct: q.isCorrect !== undefined ? q.isCorrect : (q.selectedAnswer === q.correctAnswer)
        })),
      };
      
      await api.post(API_PATHS.quizResults('level'), levelData, { headers });
      
      // Removed static roadmap generation - now using RoadmapAgent
    } catch (err) {
      console.error('[QuizFlowManager] NestJS save error (non-blocking):', err);
    }
  };

  // ── Phase 3 : Stream AI roadmap from agent ────────────────────────────────

  const streamRoadmapFromAgent = async (level: LevelData) => {
    if (!profileData) return;
    setStreaming(true);
    setRoadmapText('');
    try {
      const raw = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const backendUrl = raw.replace(/\/$/, '').replace(/\/api\/?$/, '');
      const token = typeof window !== 'undefined' ? (await import('@/lib/auth/token')).getToken() : null;
      const res = await fetch(`${backendUrl}/api/roadmap/agent/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          profile,
          niveau: level.niveau,
          profile_data: profileData,
          level_data: level,
          user_id: userId,
          session_id: sessionId,
          lang: 'en',
        }),
      });
      if (!res.body) throw new Error('No stream body');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split('\n').filter(l => l.trim())) {
          try {
            const evt = JSON.parse(line);
            if (evt.chunk) {
              fullText += evt.chunk;
              setRoadmapText(fullText);
            }
            if (evt.status === 'completed') {
              setStreaming(false);
              // Try to parse the JSON roadmap
              try {
                const parsed = JSON.parse(fullText);
                setParsedRoadmap(parsed);
                // Call the callback if roadmap is successfully parsed and we have all required data
                if (onRoadmapGenerated && profileData && levelData) {
                  onRoadmapGenerated(parsed, profileData, levelData);
                }
              } catch {
                // Not valid JSON yet, keep raw text
              }
              setPhase('done');
              onComplete?.();
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch (err) {
      console.error('[QuizFlowManager] roadmap stream error:', err);
      setStreaming(false);
      setPhase('done');
      onComplete?.();
    }
  };

  if (!open) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Phase 1 — Assessment conversationnel */}
      {phase === 'assessment' && (
        <AssessmentModal
          open
          onClose={onClose}
          onAssessmentComplete={handleAssessmentComplete}
        />
      )}

      {/* Phase 2 — Test de niveau IA */}
      {phase === 'quiz' && (
        <QuizNiv
          open
          onClose={onClose}
          profile={profile}
          profileData={profileData}
          onLevelComplete={handleLevelComplete}
        />
      )}

      {/* Phase 3 — Streaming + Roadmap Result */}
      {(phase === 'generating' || phase === 'done') && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          background: 'rgba(10,6,25,.55)',
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            boxShadow: '0 24px 60px rgba(123,47,190,.2)',
            width: '100%',
            maxWidth: phase === 'done' && parsedRoadmap ? 720 : 520,
            height: phase === 'done' && parsedRoadmap ? '88vh' : 'auto',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'max-width .4s ease',
            fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
          }}>

            {/* ── GENERATING phase: spinner ── */}
            {phase === 'generating' && (
              <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 20, textAlign: 'center' }}>
                <div style={{
                  width: 70, height: 70, borderRadius: 20,
                  background: 'linear-gradient(135deg,rgba(233,30,140,.1),rgba(123,47,190,.12))',
                  border: '1px solid rgba(123,47,190,.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={30} color="#E91E8C" style={{ animation: 'pulse 2s infinite' }} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1230', marginBottom: 6 }}>
                    Generating your roadmap...
                  </div>
                  <div style={{ fontSize: 13, color: '#B0A8C8', lineHeight: 1.6 }}>
                    AI is selecting the best Azure and AWS<br />
                    certifications for your profile
                  </div>
                </div>

                {/* Progress steps */}
                <div style={{ width: '100%', maxWidth: 360 }}>
                  {[
                    { label: 'Analyzing profile and level', done: true },
                    { label: 'Searching Azure & AWS certifications', done: !!roadmapText },
                    { label: 'Ordering by level', done: !!roadmapText },
                    { label: 'Generating personalized roadmap', done: false },
                  ].map(({ label, done }, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 14px', borderRadius: 10, marginBottom: 6,
                      background: done ? 'rgba(16,185,129,.05)' : 'rgba(123,47,190,.04)',
                      border: done ? '1px solid rgba(16,185,129,.2)' : '1px solid rgba(123,47,190,.1)',
                    }}>
                      <div style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {done
                          ? <CheckCircle size={15} color="#10B981" />
                          : <div style={{
                              width: 13, height: 13, borderRadius: '50%',
                              border: '2px solid rgba(233,30,140,.2)', borderTopColor: '#E91E8C',
                              animation: 'spin 0.7s linear infinite',
                            }} />
                        }
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: done ? '#059669' : '#7B2FBE' }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                <style>{`
                  @keyframes spin { to { transform: rotate(360deg); } }
                  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
                `}</style>
              </div>
            )}

            {/* ── DONE phase with parsed roadmap ── */}
            {phase === 'done' && parsedRoadmap && (
              <RoadmapView
                roadmap={parsedRoadmap}
                profile={profile}
                levelData={levelData}
                onClose={onClose}
              />
            )}

            {/* ── DONE phase but JSON parse failed (fallback raw text) ── */}
            {phase === 'done' && !parsedRoadmap && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px', borderBottom: '1px solid rgba(123,47,190,.08)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10,
                      background: 'linear-gradient(135deg,#E91E8C,#7B2FBE)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={15} color="#fff" />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1230' }}>
                      Your personalized roadmap
                    </span>
                  </div>
                  <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0A8C8' }}>
                    <X size={16} />
                  </button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: 12, color: '#7A6E99', lineHeight: 1.6 }}>
                    {roadmapText}
                  </pre>
                  <div ref={roadmapEndRef} />
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(123,47,190,.08)',
                  display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <CheckCircle size={15} color="#10B981" />
                  <span style={{ flex: 1, fontSize: 12, color: '#7A6E99' }}>Roadmap generated successfully.</span>
                  <button onClick={onClose} style={{
                    padding: '8px 18px', borderRadius: 10,
                    background: 'linear-gradient(135deg,#E91E8C,#7B2FBE)', border: 'none',
                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>
                    Finish
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}

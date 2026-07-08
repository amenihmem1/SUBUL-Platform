'use client';

import { useState } from 'react';
import { 
  CheckCircle, Clock, BookOpen, Award, Star, 
  ChevronDown, ChevronRight, Sparkles, Trophy,
  Lock, PlayCircle, Cloud, Shield
} from 'lucide-react';

// Types from QuizFlowManager
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

interface ProfileData {
  profile: string;
  scores: {
    cloud: number;
    cyber: number;
    ai: number;
  };
  hybrid?: string;
}

interface AIRoadmapViewProps {
  roadmap: ParsedRoadmap;
  profileData: ProfileData;
  levelData: any;
}

// Helper components
const ProviderBadge = ({ provider }: { provider: string }) => {
  const providerStyles = {
    Microsoft: {
      bg: 'rgba(0,120,212,0.08)',
      text: '#0078D4',
      border: 'rgba(0,120,212,0.2)',
      label: 'Azure',
      icon: Cloud
    },
    AWS: {
      bg: 'rgba(232,119,34,0.08)',
      text: '#E87722',
      border: 'rgba(232,119,34,0.2)',
      label: 'AWS',
      icon: Shield
    }
  };
  
  const style = providerStyles[provider as keyof typeof providerStyles] || providerStyles.AWS;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold" 
          style={{ 
            background: style.bg, 
            color: style.text, 
            border: `1px solid ${style.border}` 
          }}>
      <style.icon className="w-3 h-3" />
      {style.label}
    </span>
  );
};

const LevelBadge = ({ level }: { level: string }) => {
  const levelStyles = {
    Fondamental: { bg: 'rgba(16,185,129,.08)', text: '#059669', border: 'rgba(16,185,129,.2)' },
    Associé: { bg: 'rgba(59,130,246,.08)', text: '#2563EB', border: 'rgba(59,130,246,.2)' },
    Expert: { bg: 'rgba(233,30,140,.08)', text: '#E91E8C', border: 'rgba(233,30,140,.2)' },
    Professionnel: { bg: 'rgba(123,47,190,.08)', text: '#7B2FBE', border: 'rgba(123,47,190,.2)' },
    Spécialité: { bg: 'rgba(245,158,11,.08)', text: '#B45309', border: 'rgba(245,158,11,.2)' }
  };
  
  const style = levelStyles[level as keyof typeof levelStyles] || levelStyles.Associé;
  
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold"
          style={{ 
            background: style.bg, 
            color: style.text, 
            border: `1px solid ${style.border}` 
          }}>
      {level}
    </span>
  );
};

const XPBadge = ({ xp }: { xp: number }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
          style={{ 
            background: 'rgba(233,30,140,.07)', 
            color: '#E91E8C', 
            border: '1px solid rgba(233,30,140,.2)' 
          }}>
    <Star className="w-3 h-3" /> +{xp} XP
  </span>
);

// Certification card component
const CertCard = ({ cert, index }: { cert: CertificationItem; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const isLocked = cert.statut === 'locked';
  const isCurrent = cert.statut === 'current';

  return (
    <div 
      className={`rounded-xl border p-4 transition-all duration-200 ${
        isCurrent 
          ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200' 
          : isLocked 
          ? 'bg-gray-50 border-gray-200 opacity-60' 
          : 'bg-white border-gray-100 hover:border-purple-200'
      }`}
    >
      {/* Status indicator */}
      {isCurrent && (
        <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl" />
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Order number */}
        <div 
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            isCurrent 
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
              : 'bg-purple-100 text-purple-600'
          }`}
        >
          {isLocked ? <Lock className="w-3 h-3" /> : cert.ordre}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-2 items-center">
            <ProviderBadge provider={cert.provider} />
            <LevelBadge level={cert.niveau_certif} />
            {isCurrent && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-600 border border-purple-200">
                ▶ Recommandé
              </span>
            )}
          </div>

          <div className="text-sm font-bold text-gray-900 mb-1">
            {cert.nom}
            {cert.code && (
              <span className="ml-2 text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                {cert.code}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {cert.pourquoi_cette_certif}
          </p>

          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {cert.duree_preparation_semaines} sem.
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> {cert.heures_etude}h d'étude
            </span>
            <XPBadge xp={cert.xp_reward} />
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="mb-2">
            <h4 className="text-xs font-semibold text-gray-700 mb-1">Prérequis:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              {cert.prerequis.map((prereq, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                  {prereq}
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">Compétences acquises:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              {cert.competences_acquises.map((comp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Award className="w-3 h-3 text-purple-500 flex-shrink-0 mt-0.5" />
                  {comp}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Level tabs component
const LevelTabs = ({ currentLevel, onLevelChange, phases }: { 
  currentLevel: string | null; 
  onLevelChange: (level: string) => void;
  phases: RoadmapPhase[];
}) => {
  const levels = ['Fondamental', 'Associé', 'Expert', 'Professionnel'];
  
  return (
    <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 border border-gray-200">
      {levels.map((level) => {
        const hasContent = phases.some(phase => phase.level_tier === level);
        return (
          <button
            key={level}
            onClick={() => hasContent && onLevelChange(level)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentLevel === level
                ? 'bg-purple-500 text-white'
                : hasContent
                  ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!hasContent}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
};

// Phase component
const PhaseSection = ({ phase, isCurrent }: { phase: RoadmapPhase; isCurrent: boolean }) => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className={`mb-6 rounded-xl border ${
      isCurrent 
        ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200' 
        : 'bg-white border-gray-100'
    }`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{phase.phase_name}</h3>
            <p className="text-sm text-gray-600">{phase.phase_description}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {phase.duration_weeks} sem.
          </div>
        </div>
        
        <div className="space-y-3">
          {phase.certifications.map((cert, index) => (
            <CertCard key={index} cert={cert} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default function AIRoadmapView({ roadmap, profileData, levelData }: AIRoadmapViewProps) {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  
  // Filter phases by selected level
  const filteredPhases = selectedLevel 
    ? roadmap.phases.filter(phase => phase.level_tier === selectedLevel)
    : roadmap.phases;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-gray-900">{roadmap.roadmap_title}</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">{roadmap.roadmap_summary}</p>
        <div className="flex justify-center gap-4 text-sm text-gray-500">
          <span>🔷 Azure</span>
          <span>🟠 AWS</span>
          <span>{roadmap.total_certifications} certifications</span>
          <span>{roadmap.total_estimated_weeks} semaines</span>
        </div>
      </div>

      {/* Profile info */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Votre Profil</h3>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                {profileData?.profile?.toUpperCase()}
              </span>
              <div className="flex gap-2">
                <span className="text-gray-600">Cloud: {profileData?.scores?.cloud}%</span>
                <span className="text-gray-600">Cyber: {profileData?.scores?.cyber}%</span>
                <span className="text-gray-600">AI: {profileData?.scores?.ai}%</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">{levelData?.niveau}</div>
            <div className="text-sm text-gray-500">Niveau détecté</div>
          </div>
        </div>
      </div>

      {/* Level tabs */}
      <LevelTabs 
        currentLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        phases={roadmap.phases}
      />

      {/* Phases */}
      <div>
        {filteredPhases.map((phase, index) => (
          <PhaseSection 
            key={index} 
            phase={phase} 
            isCurrent={phase.level_tier === 'Associé' && index === 0}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-8">
        <p>Roadmap sauvegardé. Les certifications sont ordonnées du niveau le plus bas au plus élevé.</p>
        <button className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
          Terminer
        </button>
      </div>
    </div>
  );
}

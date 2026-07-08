'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Brain,Cloud, Shield, Server, ChevronRight, RotateCcw, Sparkles, Zap, Star, CheckCircle, Clock, Target, BarChart3 } from 'lucide-react';

// ─────────────────────────────────────────────
// 1. ASSESSMENT DATA
// ─────────────────────────────────────────────

type Domain = 'cloud' | 'cyber' | 'ai';
type Weights = Record<Domain, number>;

interface Option {
  text: string;
  weights: Weights;
}

interface Question {
  id: number;
  
  question: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    
    question: "Quand tu imagines ton futur métier idéal, tu te vois plutôt :",
    options: [
      { text: "Traquer des hackers, protéger des systèmes critiques et anticiper les cyberattaques", weights: { cloud: 0, cyber: 5, ai: 0 } },
      { text: "Créer des modèles qui apprennent, comprennent et génèrent de l'intelligence", weights: { cloud: 0, cyber: 0, ai: 5 } },
      { text: "Concevoir et optimiser des infrastructures cloud massives et résilientes", weights: { cloud: 5, cyber: 0, ai: 0 } },
    ]
  },
  {
    id: 2,
   
    question: "Ce qui t'excite vraiment techniquement, c'est :",
    options: [
      { text: "Trouver des failles dans des systèmes et les exploiter avant les attaquants", weights: { cloud: 0, cyber: 5, ai: 0 } },
      { text: "Entraîner des modèles sur des données et voir l'IA prendre des décisions autonomes", weights: { cloud: 0, cyber: 0, ai: 5 } },
      { text: "Automatiser le déploiement d'apps à grande échelle avec Kubernetes et Terraform", weights: { cloud: 5, cyber: 0, ai: 0 } },
    ]
  },
  {
    id: 3,
    
    question: "Le problème qui te motive à te lever le matin, c'est :",
    options: [
      { text: "Comment rendre un système impossible à pirater ?", weights: { cloud: 0, cyber: 5, ai: 0 } },
      { text: "Comment faire apprendre à une machine à faire ce que fait un humain ?", weights: { cloud: 0, cyber: 0, ai: 5 } },
      { text: "Comment garantir 99,99% de disponibilité pour des millions d'utilisateurs ?", weights: { cloud: 5, cyber: 0, ai: 0 } },
    ]
  },
  {
    id: 4,
   
    question: "Tu préfères travailler avec :",
    options: [
      { text: "Des pentests, des CTF, des outils comme Burp Suite, Kali Linux, Wireshark", weights: { cloud: 0, cyber: 5, ai: 0 } },
      { text: "Des notebooks Python, des datasets, des frameworks ML comme PyTorch ou TensorFlow", weights: { cloud: 0, cyber: 0, ai: 5 } },
      { text: "Des pipelines CI/CD, du code Infrastructure as Code, des dashboards de monitoring", weights: { cloud: 5, cyber: 0, ai: 0 } },
    ]
  },
  {
    id: 5,
    
    question: "Une news tech arrive dans ta feed. Tu cliques en priorité sur :",
    options: [
      { text: "\"Une nouvelle faille zero-day découverte dans un protocole SSL\"", weights: { cloud: 0, cyber: 5, ai: 0 } },
      { text: "\"GPT-5 vient de battre les humains sur un nouveau benchmark de raisonnement\"", weights: { cloud: 0, cyber: 0, ai: 5 } },
      { text: "\"AWS lance un nouveau service serverless pour les workloads à haute performance\"", weights: { cloud: 5, cyber: 0, ai: 0 } },
    ]
  },
  {
    id: 6,
    
    question: "Tu te sens dans ton élément quand :",
    options: [
      { text: "Tu identifies une vulnérabilité que personne d'autre n'a vue et tu proposes un patch", weights: { cloud: 0, cyber: 5, ai: 0 } },
      { text: "Ton modèle IA atteint une précision record et tu comprends pourquoi ça marche", weights: { cloud: 0, cyber: 0, ai: 5 } },
      { text: "Ton infrastructure tient la charge d'un pic de trafic sans une seule interruption", weights: { cloud: 5, cyber: 0, ai: 0 } },
    ]
  },
  {
    id: 7,
    
    question: "La phrase qui te correspond le plus :",
    options: [
      { text: "\"Je pense comme un attaquant pour mieux défendre\"", weights: { cloud: 0, cyber: 5, ai: 0 } },
      { text: "\"Je veux que les machines apprennent à comprendre le monde\"", weights: { cloud: 0, cyber: 0, ai: 5 } },
      { text: "\"Je construis les autoroutes numériques sur lesquelles tout repose\"", weights: { cloud: 5, cyber: 0, ai: 0 } },
    ]
  },
  {
    id: 8,
    
    question: "Si tu avais un week-end libre pour coder, tu construirais :",
    options: [
      { text: "Un honeypot qui logue les tentatives d'intrusion en temps réel", weights: { cloud: 0, cyber: 5, ai: 0 } },
      { text: "Un chatbot IA entraîné sur tes propres données pour répondre à tes questions", weights: { cloud: 0, cyber: 0, ai: 5 } },
      { text: "Un pipeline de déploiement automatisé pour tes projets personnels sur le cloud", weights: { cloud: 5, cyber: 0, ai: 0 } },
    ]
  },
  {
    id: 9,
    
    question: "Ce qui te stresse ou t'énerve le plus dans un projet tech :",
    options: [
      { text: "Un système avec des accès non contrôlés, des logs insuffisants et zéro monitoring de sécurité", weights: { cloud: 0, cyber: 5, ai: 0 } },
      { text: "Des données de mauvaise qualité qui faussent tous les résultats du modèle", weights: { cloud: 0, cyber: 0, ai: 5 } },
      { text: "Une infra non scalable qui plante dès que le trafic augmente un peu", weights: { cloud: 5, cyber: 0, ai: 0 } },
    ]
  },
  {
    id: 10,
    
    question: "En 2030, tu veux avoir contribué à :",
    options: [
      { text: "Protéger des infrastructures critiques contre des cyberattaques d'État", weights: { cloud: 0, cyber: 5, ai: 0 } },
      { text: "Développer une IA qui résout un problème médical ou scientifique majeur", weights: { cloud: 0, cyber: 0, ai: 5 } },
      { text: "Bâtir une infrastructure cloud qui alimente des millions de services mondiaux", weights: { cloud: 5, cyber: 0, ai: 0 } },
    ]
  },
];

// ─────────────────────────────────────────────
// 2. SCORING ENGINE
// ─────────────────────────────────────────────

interface ScoreMap extends Record<Domain, number> {}

function computeScores(answers: Record<number, Option>): ScoreMap {
  const raw: ScoreMap = { cloud: 0, cyber: 0, ai: 0 };
  Object.values(answers).forEach((opt) => {
    raw.cloud += opt.weights.cloud;
    raw.cyber += opt.weights.cyber;
    raw.ai += opt.weights.ai;
  });
  return raw;
}

function computePercentages(raw: ScoreMap): ScoreMap {
  const total = raw.cloud + raw.cyber + raw.ai;
  if (total === 0) return { cloud: 33, cyber: 33, ai: 34 };
  return {
    cloud: Math.round((raw.cloud / total) * 100),
    cyber: Math.round((raw.cyber / total) * 100),
    ai: Math.round((raw.ai / total) * 100),
  };
}

function getPrimaryProfile(pct: ScoreMap): Domain {
  return (Object.entries(pct) as [Domain, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

function getHybridProfiles(pct: ScoreMap): Domain[] {
  const sorted = (Object.entries(pct) as [Domain, number][]).sort((a, b) => b[1] - a[1]);
  const top = sorted[0][1];
  const second = sorted[1][1];
  if (top - second <= 12) return [sorted[0][0], sorted[1][0]];
  return [sorted[0][0]];
}

// ─────────────────────────────────────────────
// 3. PROFILE DATA
// ─────────────────────────────────────────────

interface ProfileData {
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  accentColor: string;
  accentLight: string;
  accentText: string;
  accentBorder: string;
  description: string;
  psychProfile: string;
  strengths: string[];
  skills: string[];
  learningPath: string[];
  radarLabels: readonly string[];
  radarValues: readonly number[];
}

const PROFILES = {
  cloud: {
    name: 'Cloud Architect',
    tagline: 'Bâtisseur d\'infrastructures à l\'échelle planétaire',
    icon: Server,
    gradient: 'from-sky-500 via-cyan-500 to-blue-500',
    accentColor: '#0ea5e9',
    accentLight: '#f0f9ff',
    accentText: '#0369a1',
    accentBorder: '#bae6fd',
    description: "Vous pensez en systèmes distribués. Votre instinct naturel vous pousse à concevoir des architectures élastiques, résilientes et économiquement optimisées.",
    psychProfile: "Profil analytique-systémique. Vous êtes à l'aise avec la complexité opérationnelle et prenez des décisions basées sur des compromis mesurés (latence vs coût, disponibilité vs cohérence).",
    strengths: ['Architecture distribuée', 'Pensée économique', 'Gestion de complexité', 'Automatisation', 'Optimisation des ressources'],
    skills: ['Infrastructure as Code', 'Container Orchestration', 'Multi-cloud strategy', 'FinOps', 'Site Reliability Engineering'],
    learningPath: ['AWS Cloud Practitioner → Solutions Architect', 'Azure Administrator (AZ-104)', 'Kubernetes CKA/CKAD', 'Terraform Associate', 'SRE & Observabilité'],
    radarLabels: ['Infrastructure', 'Scalabilité', 'Automatisation', 'Coût/Perf', 'Résilience', 'Sécurité'] as const,
    radarValues: [90, 85, 80, 78, 88, 60] as const,
  },
  cyber: {
    name: 'Cybersecurity Expert',
    tagline: 'Gardien des systèmes face à l\'adversité numérique',
    icon: Shield,
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    accentColor: '#f43f5e',
    accentLight: '#fff1f2',
    accentText: '#be123c',
    accentBorder: '#fecdd3',
    description: "Votre esprit fonctionne comme un adversaire — vous identifiez les failles avant qu'elles ne soient exploitées. La sécurité n'est pas pour vous une contrainte, c'est votre paradigme de pensée.",
    psychProfile: "Profil analytique-adversarial. Vous avez une pensée critique naturellement orientée vers la détection d'anomalies et l'anticipation des menaces. Rigoureux et curieux, vous aimez les zones d'ombre.",
    strengths: ['Pensée adversariale', 'Analyse de risque', 'Rigueur procédurale', 'Curiosité technique', 'Détection d\'anomalies'],
    skills: ['Penetration Testing', 'Threat Modeling', 'Incident Response', 'Forensics', 'Secure Architecture'],
    learningPath: ['CompTIA Security+ → CEH', 'eJPT → OSCP', 'CTF sur HackTheBox / TryHackMe', 'CISSP / CISM', 'Cloud Security (CCSP)'],
    radarLabels: ['Analyse menaces', 'Cryptographie', 'Forensics', 'Réseau', 'Détection', 'Résilience'] as const,
    radarValues: [92, 85, 80, 88, 90, 75] as const,
  },
  ai: {
    name: 'AI & ML Engineer',
    tagline: 'Architecte de l\'intelligence artificielle de demain',
    icon: Brain,
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    accentColor: '#8b5cf6',
    accentLight: '#f5f3ff',
    accentText: '#6d28d9',
    accentBorder: '#ddd6fe',
    description: "Vous êtes fasciné par les systèmes qui apprennent. Les données ne sont pas pour vous un simple stockage mais une source de connaissance à extraire. Votre pensée est probabiliste.",
    psychProfile: "Profil analytique-cognitif. Vous avez une forte appétence mathématique, une pensée abstraite développée et une capacité naturelle à relier des concepts de domaines différents.",
    strengths: ['Pensée probabiliste', 'Modélisation abstraite', 'Créativité algorithmique', 'Aptitude mathématique', 'Vision produit'],
    skills: ['Machine Learning', 'Deep Learning', 'NLP / LLMs', 'MLOps', 'Data Engineering'],
    learningPath: ['Python & Statistiques → ML Foundations', 'Deep Learning Specialization (Coursera)', 'Hugging Face NLP Course', 'MLOps avec MLflow', 'LLM Fine-tuning & RAG'],
    radarLabels: ['Maths/Stats', 'ML/DL', 'NLP', 'Data Eng.', 'MLOps', 'Créativité'] as const,
    radarValues: [90, 92, 85, 78, 75, 88] as const,
  },
} as const satisfies Record<Domain, ProfileData>;

const HYBRID_DESCRIPTIONS: Record<string, string> = {
  'cloud+cyber': "Profil **Cloud Security Architect** — Vous combinez la vision systémique du cloud avec la rigueur défensive de la cybersécurité. Le DevSecOps et la Zero Trust Architecture sont votre terrain naturel.",
  'cloud+ai': "Profil **MLOps & Cloud AI Engineer** — Vous déployez l'intelligence à l'échelle. Votre force est de concevoir des pipelines ML production-ready sur des infrastructures cloud robustes.",
  'cyber+ai': "Profil **AI Security Specialist** — Vous opérez à la frontière entre la sécurité et l'IA. Vous utilisez le ML pour renforcer la détection de menaces.",
  'cyber+cloud': "Profil **Cloud Security Architect** — Vous combinez la vision systémique du cloud avec la rigueur défensive de la cybersécurité.",
  'ai+cloud': "Profil **MLOps & Cloud AI Engineer** — Vous déployez l'intelligence à l'échelle.",
  'ai+cyber': "Profil **AI Security Specialist** — Vous opérez à la frontière entre la sécurité et l'IA.",
};

// ─────────────────────────────────────────────
// 4. RADAR CHART (pure SVG)
// ─────────────────────────────────────────────

function RadarChart({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
  const size = 220;
  const center = size / 2;
  const maxRadius = 82;
  const levels = 4;
  const n = labels.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const polarToCart = (r: number, i: number) => ({
    x: center + r * Math.cos(angle(i)),
    y: center + r * Math.sin(angle(i)),
  });

  const gridPolygon = (level: number) => {
    const r = (maxRadius / levels) * level;
    return Array.from({ length: n }, (_, i) => polarToCart(r, i))
      .map(p => `${p.x},${p.y}`)
      .join(' ');
  };

  const dataPoints = values.map((v, i) => polarToCart((v / 100) * maxRadius, i));
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const gradId = `radar-grad-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] mx-auto">
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </radialGradient>
      </defs>
      {/* Grid lines */}
      {Array.from({ length: levels }, (_, i) => (
        <polygon
          key={i}
          points={gridPolygon(i + 1)}
          fill="none"
          stroke="rgba(203,213,225,0.8)"
          strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {labels.map((_, i) => {
        const outer = polarToCart(maxRadius, i);
        return (
          <line key={i} x1={center} y1={center} x2={outer.x} y2={outer.y}
            stroke="rgba(203,213,225,0.6)" strokeWidth="1" />
        );
      })}
      {/* Data fill */}
      <polygon
        points={dataPolygon}
        fill={`url(#${gradId})`}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill={color} opacity="0.2" />
          <circle cx={p.x} cy={p.y} r="3" fill={color} />
        </g>
      ))}
      {/* Labels */}
      {labels.map((label, i) => {
        const pos = polarToCart(maxRadius + 20, i);
        return (
          <text
            key={i}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7.5"
            fill="#64748b"
            fontWeight="600"
            letterSpacing="0.3"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────
// 5. INTRO SCREEN
// ─────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] px-4 py-4 sm:py-6 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Hero icons — plus petit et moins de marge */}
      <div className="relative mb-5 sm:mb-6 scale-90 sm:scale-100">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/15 via-purple-400/15 to-pink-400/10 blur-2xl animate-pulse-slow opacity-70" />
        <div className="relative flex gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-100 flex items-center justify-center shadow-sm border border-sky-200 animate-float-slow delay-0">
            <Cloud className="w-7 h-7 sm:w-8 sm:h-8 text-sky-600" />
          </div>
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 flex items-center justify-center shadow-sm border border-rose-200 animate-float-slow delay-100">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600" />
          </div>
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-violet-100 flex items-center justify-center shadow-sm border border-violet-200 animate-float-slow delay-200">
            <Brain className="w-7 h-7 sm:w-8 sm:h-8 text-violet-600" />
          </div>
        </div>
      </div>

      {/* Titre & description — plus serré */}
      <div className="text-center space-y-3 sm:space-y-4 mb-6 sm:mb-8 max-w-md">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50/80 border border-indigo-100 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Test d'orientation Tech 2025
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
          Quel ingénieur
          <br />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            êtes-vous vraiment ?
          </span>
        </h1>

        <p className="text-gray-600 text-sm sm:text-base leading-relaxed px-2">
          10 questions pour révéler votre affinité naturelle entre
          <span className="font-semibold text-sky-600"> Cloud</span>,
          <span className="font-semibold text-rose-600"> Cybersécurité</span> et
          <span className="font-semibold text-violet-600"> IA</span>.
        </p>
      </div>

      {/* Stats — encore plus compact */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-xs sm:max-w-md mb-6 sm:mb-8">
        {[
          { Icon: BarChart3, text: '10 questions', color: 'text-indigo-600', bg: 'bg-indigo-50/70' },
          { Icon: Clock,      text: '~3 min',      color: 'text-emerald-600', bg: 'bg-emerald-50/70' },
          { Icon: Target,     text: 'Profil net',  color: 'text-violet-600',  bg: 'bg-violet-50/70' },
        ].map((item, i) => (
          <div
            key={i}
            className={`flex flex-col items-center py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-xl border ${item.bg} border-gray-100/50 backdrop-blur-sm transition hover:scale-105`}
          >
            <item.Icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 ${item.color}`} />
            <span className="text-xs sm:text-sm font-semibold text-gray-800">{item.text}</span>
          </div>
        ))}
      </div>

      {/* CTA — remonté */}
      <div className="w-full max-w-xs sm:max-w-sm space-y-3 mt-auto pb-4 sm:pb-6">
        <button
          onClick={onStart}
          className="group relative w-full py-4 sm:py-5 px-6 sm:px-8 rounded-2xl font-bold text-base sm:text-lg text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 group-hover:animate-pulse" />
            Découvrir mon profil
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
          </span>
        </button>

        <p className="text-center text-xs text-gray-500">
          100% anonyme · Résultat instantané
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 6. QUESTION SCREEN
// ─────────────────────────────────────────────


function QuestionScreen({
  question,
  current,
  total,
  onAnswer,
}: {
  question: Question;
  current: number;
  total: number;
  onAnswer: (opt: Option) => void;
}) {
  return (
    <div className="flex flex-col h-full px-4 sm:px-6 py-5 sm:py-7 bg-gradient-to-b from-gray-50 to-white">
      {/* Barre de progression fluide – même gradient que le CTA */}
      <div className="mb-6 sm:mb-7">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="font-medium text-gray-500">
            Question {current} sur {total}
          </span>
          <span className="font-semibold text-indigo-600">
            {Math.round((current / total) * 100)}%
          </span>
        </div>

        <div className="h-2.5 rounded-full bg-gray-100/70 backdrop-blur-sm overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full transition-all duration-[600ms] ease-out"
            style={{
              width: `${(current / total) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)',
            }}
          />
        </div>
      </div>

      {/* Numéro + question – style premium */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-start gap-4 sm:gap-5">
          <div
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-white text-2xl sm:text-3xl font-extrabold flex items-center justify-center shadow-xl shadow-indigo-500/20"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
            }}
          >
            {current}
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight pt-2 tracking-tight">
            {question.question}
          </h3>
        </div>
      </div>

      {/* Cartes réponses – effet verre + hover premium */}
      <div className="space-y-4 sm:space-y-5 flex-1">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onAnswer(opt)}
            className="
              group w-full text-left px-5 sm:px-6 py-5 sm:py-6 
              rounded-2xl border-2 border-gray-100/70 bg-white/75 backdrop-blur-md
              hover:border-indigo-400/60 hover:bg-indigo-50/40 
              hover:shadow-2xl hover:shadow-indigo-500/20
              active:scale-[0.98] transition-all duration-300
            "
          >
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Cercle lettre */}
              <div
                className="
                  flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl 
                  border-2 border-gray-200/60 group-hover:border-indigo-400/70
                  text-gray-500 group-hover:text-indigo-600
                  bg-white/80 group-hover:bg-indigo-50/50
                  text-lg sm:text-xl font-bold flex items-center justify-center
                  shadow-sm transition-all duration-300
                "
              >
                {String.fromCharCode(65 + i)}
              </div>

              {/* Texte */}
              <span className="text-base sm:text-lg font-medium text-gray-800 group-hover:text-gray-950 leading-snug flex-1">
                {opt.text}
              </span>

              {/* Flèche animée */}
              <ChevronRight
                className="
                  h-6 w-6 sm:h-7 sm:w-7 text-gray-300 
                  group-hover:text-indigo-500 group-hover:translate-x-2
                  transition-all duration-300
                "
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// 7. RESULTS SCREEN
// ─────────────────────────────────────────────

function ResultsScreen({
  answers,
  onReset,
}: {
  answers: Record<number, Option>;
  onReset: () => void;
}) {
  const raw = computeScores(answers);
  const pct = computePercentages(raw);
  const primary = getPrimaryProfile(pct);
  const hybrids = getHybridProfiles(pct);
  const isHybrid = hybrids.length > 1;
  const profile = PROFILES[primary];
  const hybridKey = hybrids.join('+');
  const hybridDesc = HYBRID_DESCRIPTIONS[hybridKey];

  const [activeTab, setActiveTab] = useState<'overview'  | 'path'>('overview');

  const domainOrder = (Object.entries(pct) as [Domain, number][]).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col space-y-6 pb-4">

      {/* Hero result card */}
      <div className={`relative rounded-3xl overflow-hidden p-8 shadow-2xl bg-gradient-to-br ${profile.gradient} transform transition-all duration-500 hover:scale-[1.02]`}
      >
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full -translate-y-24 translate-x-24 blur-3xl bg-white/20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full translate-y-16 -translate-x-12 blur-2xl bg-white/15 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full -translate-y-1/2 -translate-x-1/2 blur-xl bg-white/10 animate-pulse delay-500" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30">
              <profile.icon className="h-7 w-7 text-slate-800 drop-shadow-lg" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-700 mb-1">Votre profil dominant</p>
              <h2 className="text-3xl font-black text-slate-900">{profile.name}</h2>
            </div>
          </div>
          <p className="text-base text-slate-800 italic mb-6 leading-relaxed">{profile.tagline}</p>
          {isHybrid && hybridDesc && (
            <div className="px-5 py-3 rounded-xl text-sm text-slate-800 bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg">
              <Sparkles className="inline h-4 w-4 mr-2 text-amber-600" />
              <span dangerouslySetInnerHTML={{ __html: hybridDesc.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>') }} />
            </div>
          )}
        </div>
      </div>

      {/* Affinity bars */}
      <div className="rounded-2xl p-6 border border-gray-100 bg-white shadow-lg">
        <h3 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
            <Zap className="h-4 w-4 text-white" />
          </div>
          Répartition des affinités
        </h3>
        <div className="space-y-5">
          {domainOrder.map(([domain, score]) => {
            const p = PROFILES[domain];
            return (
              <div key={domain} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm border-2 border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <p.icon className="h-5 w-5" style={{ color: p.accentColor }} />
                    </div>
                    <span className="text-base font-bold text-gray-800">{p.name}</span>
                    {domain === primary && (
                      <span className="px-2 py-1 text-xs font-bold rounded-full" style={{ background: `${p.accentColor}20`, color: p.accentColor }}>
                        Principal
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-black" style={{ color: p.accentColor }}>{score}%</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden bg-gray-100 shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{
                      width: `${score}%`,
                      background: `linear-gradient(90deg, ${p.accentColor}dd, ${p.accentColor})`,
                    }}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Radar Chart */}
      <div className="rounded-2xl p-6 border border-gray-100 bg-white shadow-lg">
        <h3 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center shadow-md">
            <Star className="h-4 w-4 text-white" />
          </div>
          Carte de compétences
        </h3>
        <div className="flex justify-center">
          <RadarChart
            labels={[...profile.radarLabels]}
            values={[...profile.radarValues]}
            color={profile.accentColor}
          />
        </div>
      </div>

      {/* Content tabs */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden">
        
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gray-50 to-white p-5 rounded-xl border border-gray-100">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Brain className="h-3 w-3 text-indigo-600" />
                  </div>
                  Profil psychologique
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">{profile.psychProfile}</p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-white p-5 rounded-xl border border-gray-100">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Target className="h-3 w-3 text-emerald-600" />
                  </div>
                  Forces naturelles
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.strengths.map((s) => (
                    <span
                      key={s}
                      className="px-4 py-2 rounded-full text-sm font-semibold border shadow-sm hover:scale-105 transition-transform"
                      style={{ background: profile.accentLight, borderColor: profile.accentBorder, color: profile.accentText }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-white p-5 rounded-xl border border-gray-100">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-violet-600" />
                  </div>
                  Compétences clés
                </h4>
                <ul className="space-y-2">
                  {profile.skills.map((s) => (
                    <li key={s} className="flex items-center gap-3 text-sm text-gray-700 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: profile.accentColor }} />
                      <span className="font-medium">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* <div className="bg-gradient-to-r from-orange-50 to-white p-5 rounded-xl border border-gray-100">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Server className="h-3 w-3 text-orange-600" />
                  </div>
                  Stack recommandée
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.stack.map((s) => (
                    <span key={s} className="px-3 py-2 rounded-lg text-xs font-mono bg-gray-800 text-gray-100 border border-gray-700 shadow-sm">
                      {s}
                    </span>
                  ))}
                </div>
              </div> */}
            </div>
          )}

          {activeTab === 'path' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center">
                  <ChevronRight className="h-3 w-3 text-rose-600" />
                </div>
                Parcours d'apprentissage conseillé
              </h4>
              {profile.learningPath.map((step, i) => (
                <div key={step} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-10 h-10 rounded-full text-white text-sm font-bold flex items-center justify-center shadow-lg flex-shrink-0 transform transition-transform group-hover:scale-110"
                      style={{ background: `linear-gradient(135deg, ${profile.accentColor}, ${profile.accentColor}cc)` }}
                    >
                      {i + 1}
                    </div>
                    {i < profile.learningPath.length - 1 && (
                      <div className="w-1 h-8 bg-gradient-to-b from-gray-300 to-gray-200 mx-auto" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-sm font-medium text-gray-700 leading-snug bg-gray-50 p-4 rounded-xl border border-gray-100 group-hover:bg-gray-100 transition-colors">
                      {step}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      

      {/* Actions */}
      <div className="flex gap-4 pb-2">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-semibold border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-lg transition-all duration-300 group"
        >
          <RotateCcw className="h-5 w-5 text-gray-500 group-hover:text-gray-700 group-hover:rotate-180 transition-transform" />
          <span>Recommencer</span>
        </button>
        <button
          onClick={() => {
            // Save results to user profile (localStorage for now, can be connected to backend later)
            const assessmentData = {
              profileName: profile.name,
              tagline: profile.tagline,
              percentages: pct,
              primaryProfile: profile.name,
              strengths: profile.strengths,
              skills: profile.skills,
              learningPath: profile.learningPath,
              timestamp: new Date().toISOString()
            };
            
            // Save to localStorage
            localStorage.setItem('subul_assessment_result', JSON.stringify(assessmentData));
            
            // Show success message
            alert('Résultats sauvegardés dans votre profil ! 🎉');
          }}
          className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group"
          style={{ background: `linear-gradient(135deg, ${profile.accentColor}, ${profile.accentColor}cc)` }}
        >
          <Star className="h-5 w-5 text-white group-hover:rotate-180 transition-transform" />
          <span>Ajouter à mon profil</span>
        </button>
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────
// 8. MAIN MODAL COMPONENT
// ─────────────────────────────────────────────

interface AssessmentModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AssessmentModal({ open, onClose }: AssessmentModalProps) {
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'results'>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Option>>({});
  const [animating, setAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase('intro');
        setCurrentIndex(0);
        setAnswers({});
        setAnimating(false);
      }, 300);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentIndex, phase]);

  const handleStart = () => {
    setAnimating(true);
    setTimeout(() => { setPhase('quiz'); setAnimating(false); }, 250);
  };

  const handleAnswer = (opt: Option) => {
    const question = QUESTIONS[currentIndex];
    const newAnswers = { ...answers, [question.id]: opt };
    setAnswers(newAnswers);

    setAnimating(true);
    setTimeout(() => {
      if (currentIndex < QUESTIONS.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setPhase('results');
      }
      setAnimating(false);
    }, 250);
  };

  const handleReset = () => {
    setAnimating(true);
    setTimeout(() => {
      setPhase('intro');
      setCurrentIndex(0);
      setAnswers({});
      setAnimating(false);
    }, 250);
  };

  if (!open) return null;

  return (
    
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}

      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={phase === 'quiz' ? undefined : onClose}
      />

      {/* Modal card */}
      <div
        className="relative w-full max-w-2xl flex flex-col rounded-3xl shadow-2xl overflow-hidden bg-white"
        style={{ maxHeight: 'min(92vh, 900px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium tracking-wide">SUBUL Platform</p>
              <p className="text-sm font-bold text-gray-900">Career Path Assessment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {phase === 'quiz' && (
              <span className="text-xs text-gray-400 font-medium tabular-nums">
                {currentIndex + 1} / {QUESTIONS.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(6px)' : 'translateY(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          {phase === 'intro' && <IntroScreen onStart={handleStart} />}
          {phase === 'quiz' && (
            <QuestionScreen
              question={QUESTIONS[currentIndex]}
              current={currentIndex + 1}
              total={QUESTIONS.length}
              onAnswer={handleAnswer}
            />
          )}
          {phase === 'results' && (
            <ResultsScreen answers={answers} onReset={handleReset} />
          )}
        </div>

        {/* Footer hint on quiz */}
        {phase === 'quiz' && (
          <div className="flex-shrink-0 px-6 py-3 flex items-center justify-center gap-2 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-400">Cliquez sur une réponse pour avancer automatiquement</span>
          </div>
        )}
      </div>
    </div>
  );
}

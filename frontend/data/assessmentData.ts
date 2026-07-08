import { Server, Shield, Brain } from 'lucide-react';

export type Domain = 'cloud' | 'cyber' | 'ai';
export type Weights = Record<Domain, number>;

export interface Option {
  text: string;
  weights: Weights;
}

export interface Question {
  id: number;
  question: string;
  options: Option[];
}

export const QUESTIONS: Question[] = [
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

export interface ProfileData {
  name: string;
  tagline: string;
  icon: any; // Using any for the React component to avoid heavy type imports in pure data file
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

export const PROFILES = {
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

export const HYBRID_DESCRIPTIONS: Record<string, string> = {
  'cloud+cyber': "Profil **Cloud Security Architect** — Vous combinez la vision systémique du cloud avec la rigueur défensive de la cybersécurité. Le DevSecOps et la Zero Trust Architecture sont votre terrain naturel.",
  'cloud+ai': "Profil **MLOps & Cloud AI Engineer** — Vous déployez l'intelligence à l'échelle. Votre force est de concevoir des pipelines ML production-ready sur des infrastructures cloud robustes.",
  'cyber+ai': "Profil **AI Security Specialist** — Vous opérez à la frontière entre la sécurité et l'IA. Vous utilisez le ML pour renforcer la détection de menaces.",
  'cyber+cloud': "Profil **Cloud Security Architect** — Vous combinez la vision systémique du cloud avec la rigueur défensive de la cybersécurité.",
  'ai+cloud': "Profil **MLOps & Cloud AI Engineer** — Vous déployez l'intelligence à l'échelle.",
  'ai+cyber': "Profil **AI Security Specialist** — Vous opérez à la frontière entre la sécurité et l'IA.",
};

export interface ScoreMap extends Record<Domain, number> {}

// ─── Raw score accumulation ───────────────────────────────────────────────────

export function computeScores(answers: Record<number, Option>): ScoreMap {
  const raw: ScoreMap = { cloud: 0, cyber: 0, ai: 0 };
  Object.values(answers).forEach((opt) => {
    raw.cloud += opt.weights.cloud;
    raw.cyber += opt.weights.cyber;
    raw.ai += opt.weights.ai;
  });
  return raw;
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize arbitrary score values (any scale) to integer percentages that
 * sum to exactly 100.
 *
 * Safe against:
 *  - all-zero input  → equal split (33 / 33 / 34)
 *  - negative values → clamped to 0 before normalizing
 *  - rounding drift  → the highest bucket absorbs the remainder
 *
 * Example:
 *   normalizeScores({ cloud: 40, cyber: 80, ai: 60 })
 *   // total = 180
 *   // → { cloud: 22, cyber: 44, ai: 33 }  (sum = 99 → 100 after adjustment)
 */
export function normalizeScores(raw: { cloud: number; cyber: number; ai: number }): ScoreMap {
  const cloud = Math.max(0, raw.cloud ?? 0);
  const cyber = Math.max(0, raw.cyber ?? 0);
  const ai    = Math.max(0, raw.ai    ?? 0);
  const total = cloud + cyber + ai;

  // Edge case: all scores are 0 → equal distribution
  if (total === 0) return { cloud: 33, cyber: 33, ai: 34 };

  const pCloud = Math.round((cloud / total) * 100);
  const pCyber = Math.round((cyber / total) * 100);
  const pAi    = Math.round((ai    / total) * 100);

  const result: ScoreMap = { cloud: pCloud, cyber: pCyber, ai: pAi };

  // Fix rounding drift so the sum is always exactly 100
  const drift = pCloud + pCyber + pAi - 100;
  if (drift !== 0) {
    // Subtract drift from the bucket with the largest value
    const maxKey = (Object.keys(result) as Domain[]).reduce((a, b) =>
      result[a] >= result[b] ? a : b
    );
    result[maxKey] -= drift;
  }

  return result;
}

/**
 * Legacy alias kept for backward compatibility with local-only quiz flow.
 * Prefer `normalizeScores` which also clamps negatives.
 */
export function computePercentages(raw: ScoreMap): ScoreMap {
  return normalizeScores(raw);
}

// ─── Profile selection ────────────────────────────────────────────────────────

/** Returns the domain with the highest normalized percentage. */
export function getPrimaryProfile(pct: ScoreMap): Domain {
  return (Object.entries(pct) as [Domain, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Returns the top 1 or 2 domains. A hybrid is detected when the two
 * highest scores differ by 12 percentage points or fewer.
 */
export function getHybridProfiles(pct: ScoreMap): Domain[] {
  const sorted = (Object.entries(pct) as [Domain, number][]).sort((a, b) => b[1] - a[1]);
  const top    = sorted[0][1];
  const second = sorted[1][1];
  if (top - second <= 12) return [sorted[0][0], sorted[1][0]];
  return [sorted[0][0]];
}


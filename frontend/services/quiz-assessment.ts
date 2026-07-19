import { api } from '@/lib/api/client';

export type AssessmentDomain = 'devops' | 'ai' | 'cyber';

export interface AssessmentQuestionOption {
  label: string;
  text: string;
  correct: boolean;
}

export interface AssessmentQuestionItem {
  id: number;
  question: string;
  options: AssessmentQuestionOption[];
  explanation: string;
  difficulty: string;
  points: number;
}

export interface AssessmentQuestionsResponse {
  devops: AssessmentQuestionItem[];
  ai: AssessmentQuestionItem[];
  cyber: AssessmentQuestionItem[];
  originalQuestions?: any[];
}

function transformRoadmapQuestion(q: any): AssessmentQuestionItem {
  return {
    id: q.id,
    question: q.question,
    options: Object.entries(q.options || {}).map(([label, text]: [string, unknown]) => ({
      label,
      text: String(text),
      correct: label === q.bonne_reponse,
    })),
    explanation: q.explication,
    difficulty: q.difficulte,
    points: q.points,
  };
}

/** Map API profile to quiz domain bucket (matches QuizNiv PROFILE_TO_DOMAIN). */
function profileToDomain(profile: string): AssessmentDomain {
  if (profile === 'cyber') return 'cyber';
  if (profile === 'ai') return 'ai';
  return 'devops';
}

function normalizeQuestionDomain(raw: unknown): AssessmentDomain | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase();
  if (s === 'ai' || s === 'ml' || s === 'machine learning') return 'ai';
  if (s === 'cyber' || s === 'cybersecurity' || s === 'security') return 'cyber';
  if (s === 'devops' || s === 'cloud') return 'devops';
  return null;
}

interface TaggedQuestion {
  item: AssessmentQuestionItem;
  domain: AssessmentDomain | null;
}

const FALLBACK_QUESTIONS: Record<AssessmentDomain, any[]> = {
  devops: [
    {
      id: 101,
      domain: 'devops',
      question: 'Quel est le role principal de Docker dans une chaine DevOps ?',
      options: {
        A: 'Virtualiser le materiel physique',
        B: 'Emballer une application et ses dependances dans un conteneur',
        C: 'Remplacer Git pour le versioning',
        D: 'Superviser uniquement les couts cloud',
      },
      bonne_reponse: 'B',
      explication: 'Docker rend les environnements applicatifs reproductibles.',
      difficulte: 'easy',
      points: 1,
    },
    {
      id: 102,
      domain: 'devops',
      question: 'Dans un pipeline CI/CD, que signifie CI ?',
      options: {
        A: 'Continuous Integration',
        B: 'Cloud Infrastructure',
        C: 'Container Inspection',
        D: 'Code Isolation',
      },
      bonne_reponse: 'A',
      explication: 'La CI automatise integration, tests et validation du code.',
      difficulte: 'easy',
      points: 1,
    },
    {
      id: 103,
      domain: 'devops',
      question: 'Quel objet Kubernetes expose des pods via une adresse stable ?',
      options: { A: 'Secret', B: 'ConfigMap', C: 'Service', D: 'Namespace' },
      bonne_reponse: 'C',
      explication: 'Un Service fournit un point d acces stable vers des pods.',
      difficulte: 'medium',
      points: 2,
    },
  ],
  cyber: [
    {
      id: 201,
      domain: 'cyber',
      question: 'Quel est l objectif du principe du moindre privilege ?',
      options: {
        A: 'Donner tous les droits',
        B: 'Limiter les droits au strict necessaire',
        C: 'Supprimer les mots de passe',
        D: 'Desactiver les journaux',
      },
      bonne_reponse: 'B',
      explication: 'Limiter les droits reduit l impact d une compromission.',
      difficulte: 'easy',
      points: 1,
    },
    {
      id: 202,
      domain: 'cyber',
      question: 'Quelle attaque injecte des requetes dans une base de donnees ?',
      options: { A: 'Phishing', B: 'SQL injection', C: 'DDoS', D: 'Spoofing DNS' },
      bonne_reponse: 'B',
      explication: 'Une injection SQL exploite une entree mal controlee.',
      difficulte: 'easy',
      points: 1,
    },
    {
      id: 203,
      domain: 'cyber',
      question: 'Quel controle aide contre le vol de mot de passe seul ?',
      options: { A: 'MFA', B: 'Cache navigateur', C: 'Compression HTTP', D: 'Theme sombre' },
      bonne_reponse: 'A',
      explication: 'Le MFA ajoute un facteur supplementaire.',
      difficulte: 'medium',
      points: 2,
    },
  ],
  ai: [
    {
      id: 301,
      domain: 'ai',
      question: 'Quel est le but principal d un jeu de validation ?',
      options: {
        A: 'Entrainer le modele final uniquement',
        B: 'Evaluer le modele pendant le choix des hyperparametres',
        C: 'Remplacer les donnees de test',
        D: 'Stocker les prompts',
      },
      bonne_reponse: 'B',
      explication: 'Le jeu de validation aide a ajuster le modele sans toucher au test final.',
      difficulte: 'easy',
      points: 1,
    },
    {
      id: 302,
      domain: 'ai',
      question: 'Que signifie overfitting ?',
      options: {
        A: 'Le modele generalise parfaitement',
        B: 'Le modele memorise trop les donnees d entrainement',
        C: 'Le modele n apprend rien',
        D: 'Le dataset est crypte',
      },
      bonne_reponse: 'B',
      explication: 'L overfitting donne de bons resultats en entrainement mais generalise mal.',
      difficulte: 'medium',
      points: 2,
    },
    {
      id: 303,
      domain: 'ai',
      question: 'A quoi sert le prompt engineering avec un LLM ?',
      options: {
        A: 'Guider la reponse avec un contexte et des instructions',
        B: 'Modifier le processeur',
        C: 'Supprimer le modele',
        D: 'Changer TCP',
      },
      bonne_reponse: 'A',
      explication: 'Un bon prompt structure la demande et ameliore la qualite de sortie.',
      difficulte: 'medium',
      points: 2,
    },
  ],
};

function buildQuestionsResponse(profile: string, originalQuestions: any[]): AssessmentQuestionsResponse {
  const result: AssessmentQuestionsResponse = {
    devops: [],
    ai: [],
    cyber: [],
  };

  const tagged: TaggedQuestion[] = originalQuestions.map((q: any) => ({
    item: transformRoadmapQuestion(q),
    domain: normalizeQuestionDomain(q.domain ?? q.category),
  }));

  const anyDomainTag = tagged.some((t) => t.domain !== null);

  if (anyDomainTag) {
    const fallback = profileToDomain(profile);
    for (const { item, domain } of tagged) {
      const bucket: AssessmentDomain = domain ?? fallback;
      result[bucket].push(item);
    }
  } else {
    const bucket = profileToDomain(profile);
    result[bucket] = tagged.map((t) => t.item);
  }

  return {
    ...result,
    originalQuestions,
  };
}

export async function getAssessmentQuestions(profile: string): Promise<AssessmentQuestionsResponse> {
  try {
    const { data } = await api.post('/api/roadmap/level/questions', {
      profile,
      lang: 'en',
    });

    return buildQuestionsResponse(profile, data.questions || []);
  } catch (error: any) {
    if (error?.response?.status >= 500 || !error?.response) {
      const domain = profileToDomain(profile);
      console.warn('[QuizAssessment] Roadmap questions unavailable; using local fallback.');
      return buildQuestionsResponse(profile, FALLBACK_QUESTIONS[domain]);
    }
    throw error;
  }
}

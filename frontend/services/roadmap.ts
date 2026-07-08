import {
  Brain,
  Code,
  Zap,
  MessageSquare,
  Globe,
  Cloud,
  Trophy,
  Shield,
  Rocket,
  Users,
  Database,
} from 'lucide-react';
import { api, API_PATHS } from '@/lib/api/client';

/** Roadmap assessment/level endpoints go through the backend (proxies to agent). No direct agent URL needed in deployment. */
const roadmapBackendApi = api;

export interface LevelQuestion {
  id: string | number;

  question: string;

  options: { label: string; text: string }[];

  correct: string;

  difficulty: string;

  explanation?: string;

}



export interface AssessmentQuestionsRequest {

  lang?: string;

  user_id?: string;

  session_id?: string;

}

export interface AssessmentQuestion {

  id: string | number;

  question: string;

  options?: { label: string; text: string }[];

  type: 'multiple_choice' | 'open' | 'scale';

  category?: string;

}

export async function getAssessmentQuestions(
  body: AssessmentQuestionsRequest = {}
): Promise<{ questions: AssessmentQuestion[] }> {
  const { data } = await roadmapBackendApi.post<{ questions: AssessmentQuestion[] }>(
    '/api/roadmap/assess/questions',
    {
      lang: body.lang || 'fr',
      user_id: body.user_id,
      session_id: body.session_id
    }
  );
  return data;
}

export interface LevelQuestionsRequest {

  profile: string;

  lang?: string;

  user_id?: string;

  session_id?: string;

}



export async function getLevelQuestions(
  body: LevelQuestionsRequest
): Promise<{ questions: LevelQuestion[] }> {
  const { data } = await roadmapBackendApi.post<{ questions: LevelQuestion[] }>(
    '/api/roadmap/level/questions',
    {
      lang: body.lang || 'fr',
      profile: body.profile,
      user_id: body.user_id,
      session_id: body.session_id
    }
  );
  return data;
}



export interface RoadmapModule {

  id: string;

  title: string;

  description: string;

  status: 'completed' | 'current' | 'locked' | 'upcoming';

  duration: string;

  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';

  topics: string[];

  progress?: number;

  icon: string;

  color: string;

  prerequisites?: string[];

  estimatedHours: number;

  skills: string[];

  profile?: string;

  isBooster?: boolean;

}



export interface UserProfile {

  primaryProfile: string;

  hybridProfiles: string[];

  scores: {

    cloudPercentage: number;

    cyberPercentage: number;

    aiPercentage: number;

    devopsPercentage?: number;

  };

}



export interface UserRoadmap {

  id: number;

  userId: number;

  modules: RoadmapModule[];

  userProfile: UserProfile | null;

  totalProgress: number;

  userLevel: number;

  totalXP: number;

  createdAt: string;

  updatedAt: string;

}



export interface RoadmapAnalytics {

  roadmap: UserRoadmap;

  analytics: {

    completedModules: number;

    currentModules: number;

    totalModules: number;

    estimatedTotalHours: number;

    completedHours: number;

    averageQuizScore: number;

    strengths: string[];

    recommendedNextSteps: string[];

  };

}



export interface RoadmapRecommendations {

  currentFocus: string[];

  strengths: string[];

  suggestedTopics: string[];

  estimatedCompletionTime: string;

}



export interface QuizLevelResult {

  id: number;

  userId: number;

  domain: 'devops' | 'ai' | 'cyber';

  score: {

    percentage: number;

  };

  level: 'Débutant' | 'Intermédiaire' | 'Expert';

  completedAt: string;

}



const base = () => API_PATHS.roadmap();



export interface RoadmapConfig {

  levelProgression: Array<{ level: string; label: string; description: string; duration: string }>;

  careerGoals: string[];

  strengths: string[];

  challenges: string[];

}



export const getRoadmapConfig = (): Promise<RoadmapConfig | null> =>
  api
    .get<RoadmapConfig>(`${base()}/config`)
    .then((r) => r.data)
    .catch((err) => {
      if (err.response?.status === 410) {
        return null;
      }
      console.error('Failed to fetch roadmap config:', err);
      return null;
    });

/**
 * @deprecated Static roadmap GET was removed (410). Does not call the network.
 * Use {@link generateAIRoadmap} or agent/quiz flows instead.
 */
export const getRoadmap = (): Promise<UserRoadmap | null> => Promise.resolve(null);

/**
 * @deprecated Static roadmap POST `/generate` was removed (410). Does not call the network.
 * Use {@link generateAIRoadmap} instead.
 */
export const refreshRoadmap = (): Promise<UserRoadmap | null> => Promise.resolve(null);



// New AI-powered roadmap generation (streaming)

export const generateAIRoadmap = (): Promise<UserRoadmap | null> =>

  api

    .post('/api/roadmap/agent/generate', {

      lang: 'fr',

      include_assessment: true,

      include_level_quizzes: true

    }, {

      headers: {

        'Accept': 'application/x-ndjson'

      }

    })

    .then((response) => {

      // Handle NDJSON streaming response

      const lines: string[] = response.data.split('\n').filter((line: string) => line.trim());

      let finalRoadmap: UserRoadmap | null = null;

      

      lines.forEach((line: string) => {

        try {

          const data = JSON.parse(line);

          if (data.type === 'roadmap' || data.roadmap) {

            finalRoadmap = data.roadmap || data;

          }

        } catch (e) {

          // Skip invalid JSON lines

        }

      });

      

      return finalRoadmap;

    })

    .catch((err) => {

      console.error('Failed to generate AI roadmap:', err);

      if (err.response?.status === 401) {

        console.error('Authentication required for AI roadmap generation');

      } else if (err.response?.status === 403) {

        console.error('Access forbidden for AI roadmap generation');

      } else if (err.response?.status) {

        console.error(`AI roadmap generation failed with status ${err.response.status}:`, err.response.data);

      }

      return null;

    });



export const generatePersonalizedRoadmap = refreshRoadmap;



export const updateModuleProgress = (

  moduleId: string,

  progress: number,

  status: string

): Promise<UserRoadmap | null> =>

  api

    .put<UserRoadmap>(`${base()}/progress/${encodeURIComponent(moduleId)}`, {

      progress,

      status,

    })

    .then((r) => r.data)

    .catch((err) => {

      console.error('Failed to update module progress:', err);

      return null;

    });



export const getRoadmapAnalytics = (): Promise<RoadmapAnalytics | null> =>

  api

    .get<RoadmapAnalytics>(`${base()}/analytics`)

    .then((r) => r.data)

    .catch((err) => {

      console.error('Failed to fetch roadmap analytics:', err);

      return null;

    });



export const getModule = (moduleId: string): Promise<RoadmapModule | null> =>

  api

    .get<RoadmapModule>(`${base()}/module/${moduleId}`)

    .then((r) => r.data)

    .catch((err) => {

      console.error('Failed to fetch module:', err);

      return null;

    });



export const getRecommendations = (): Promise<RoadmapRecommendations | null> =>

  api

    .get<RoadmapRecommendations>(`${base()}/recommendations`)

    .then((r) => r.data)

    .catch((err) => {

      console.error('Failed to fetch recommendations:', err);

      return null;

    });



export interface CertificationRecommendations {

  currentFocus: Array<{ title: string; provider: string; domain: string; difficulty?: string; urgency?: 'high' }>;

  strengths: Array<{ title: string; provider: string; domain: string; reason: string }>;

  suggestedTopics: Array<{ title: string; provider: string; domain: string; description?: string }>;

  estimatedCompletionTime: string;

}



export const getCertificationRecommendations = (): Promise<CertificationRecommendations | null> =>

  api

    .get<CertificationRecommendations>('/api/roadmap/certification-recommendations')

    .then((r) => r.data)

    .catch((err) => {

      console.error('Failed to fetch certification recommendations:', err);

      return null;

    });



const iconMap: Record<string, any> = {

  Brain,

  Code,

  Zap,

  MessageSquare,

  Globe,

  Cloud,

  Trophy,

  Shield,

  Rocket,

  Users,

  Database,

};



export const getModuleIcon = (iconName: string) => iconMap[iconName] || Brain;



export const getModuleStatusIcon = (status: RoadmapModule['status']) => {

  switch (status) {

    case 'completed':

      return { type: 'completed', icon: 'CheckCircle', className: 'w-6 h-6 text-green-500' };

    case 'current':

      return { type: 'current', icon: 'PlayCircle', className: 'w-6 h-6 text-blue-500 animate-pulse' };

    case 'upcoming':

      return { type: 'upcoming', icon: 'Circle', className: 'w-6 h-6 text-gray-400' };

    case 'locked':

      return { type: 'locked', icon: 'Lock', className: 'w-6 h-6 text-gray-300' };

    default:

      return { type: 'upcoming', icon: 'Circle', className: 'w-6 h-6 text-gray-400' };

  }

};



export const getModuleDifficultyVariant = (

  difficulty: RoadmapModule['difficulty']

): 'default' | 'destructive' | 'outline' | 'secondary' => {

  const variantMap: Record<

    RoadmapModule['difficulty'],

    'default' | 'destructive' | 'outline' | 'secondary'

  > = {

    Beginner: 'default',

    Intermediate: 'secondary',

    Advanced: 'destructive',

  };

  return variantMap[difficulty] || 'default';

};



export const isBoosterModule = (module: RoadmapModule): boolean =>

  module.isBooster === true;



export const getBoosterBadge = (module: RoadmapModule) =>

  isBoosterModule(module) ? 'booster' : null;



// Assessment and level evaluation functions
export async function submitAssessmentAnswers(
  answers: Record<string, any>,
  sessionId?: string
): Promise<{ profile: string; scores: any }> {
  const { data } = await roadmapBackendApi.post<{ profile: string; scores: any }>(
    '/api/roadmap/assess/analyze',
    {
      answers,
      session_id: sessionId
    }
  );
  return data;
}

export async function submitLevelAnswers(
  domain: string,
  answers: Record<number, string>,
  sessionId?: string
): Promise<{ level: string; score: any }> {
  const { data } = await roadmapBackendApi.post<{ level: string; score: any }>(
    '/api/roadmap/level/evaluate',
    {
      domain,
      answers,
      session_id: sessionId
    }
  );
  return data;
}

export async function endRoadmapSession(
  sessionId?: string
): Promise<{ success: boolean }> {
  const { data } = await roadmapBackendApi.post<{ success: boolean }>(
    '/api/roadmap/session/end',
    {
      session_id: sessionId
    }
  );
  return data;
}

/** Backwards-compatible object for consumers expecting roadmapService */
export const roadmapService = {
  getRoadmap,
  refreshRoadmap,
  generatePersonalizedRoadmap,
  generateAIRoadmap, // New AI-powered roadmap generation
  updateModuleProgress,
  getRoadmapAnalytics,
  getModule,
  getRecommendations,
  getCertificationRecommendations, // Agent-based certification recommendations
  getModuleIcon,
  getModuleStatusIcon,
  getModuleDifficultyVariant,
  isBoosterModule,
  getBoosterBadge,
  // New agent-based functions
  getAssessmentQuestions,
  getLevelQuestions,
  submitAssessmentAnswers,
  submitLevelAnswers,
  endRoadmapSession,
};


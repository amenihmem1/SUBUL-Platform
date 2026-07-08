/**
 * Centralized agent base URLs. In production, all *_AGENT_URL must be set in env.
 * In development, fallbacks to localhost so the stack runs without extra env.
 */
export function getAgentUrls(env: { [k: string]: string | undefined }) {
  const isProd = env.NODE_ENV === 'production';
  const fallback = (port: number) => (isProd ? undefined : `http://localhost:${port}`);
  return {
    quiz: env.QUIZ_AGENT_URL || fallback(8001) || '',
    roadmap: env.ROADMAP_AGENT_URL || fallback(8002) || '',
    // Env historique: CV_BOOSTER_AGENT_URL (d'après .env)
    // Env possible: CV_BOOSTER_URL / CV_AGENT_URL (ancien nom)
    // In EKS: cv-booster-service exposes port 8006 (container runs on 8005)
    cvBooster:
      env.CV_BOOSTER_URL ||
      env.CV_AGENT_URL ||
      env.CV_BOOSTER_AGENT_URL ||
      fallback(8005) ||
      '',
    // In EKS: job-search-service exposes port 8005 (container runs on 8006)
    jobSearch: env.JOB_SEARCH_AGENT_URL || fallback(8006) || '',
    coach: env.COACH_AGENT_URL || fallback(8004) || '',
    cloudTutor: env.CLOUD_TUTOR_AGENT_URL || env.AGENT03_API_URL || fallback(8000) || '',
  };
}

export const AGENT_SLUGS = [
  'quiz',
  'roadmap',
  'cv_booster',
  'job_search',
  'coach',
  'cloud_tutor',
] as const;
export type AgentSlug = (typeof AGENT_SLUGS)[number];

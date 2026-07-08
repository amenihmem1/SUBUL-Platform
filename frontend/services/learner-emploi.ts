import { getAgentApiTimeoutMs } from '@/lib/agent-timeout';
import { api, API_PATHS } from '@/lib/api/client';

/** Origin of a job row in CV boost / learner emploi aggregation. */
export type CvJobOrigin = 'local' | 'job_search_agent' | 'cv_boost';

/** Normalized job card from platform job aggregation APIs. */
export interface CvPlatformJobCard {
  id?: string;
  title?: string;
  company?: string;
  location?: string;
  url?: string;
  match_score?: string | number;
  gap_matched?: string[];
  job_origin?: CvJobOrigin;
  source?: string;
  cv_overlap_score?: number;
  description?: string;
}

export interface PlatformJobsBySource {
  local: CvPlatformJobCard[];
  job_search_agent: CvPlatformJobCard[];
  cv_boost: CvPlatformJobCard[];
}

const LEARNER_EMPLOI_HTTP_TIMEOUT_MS = getAgentApiTimeoutMs();

/** GET /api/learner-emploi/jobs — same aggregation as CV boost without requiring a CV upload. */
export interface LearnerEmploiAggregatedJobsResponse {
  merged: CvPlatformJobCard[];
  bySource: PlatformJobsBySource;
}

export async function fetchLearnerEmploiAggregatedJobs(): Promise<LearnerEmploiAggregatedJobsResponse> {
  const { data } = await api.get<LearnerEmploiAggregatedJobsResponse>(API_PATHS.learnerEmploi('jobs'), {
    timeout: LEARNER_EMPLOI_HTTP_TIMEOUT_MS,
  });
  return {
    merged: Array.isArray(data?.merged) ? data.merged : [],
    bySource: data?.bySource ?? { local: [], job_search_agent: [], cv_boost: [] },
  };
}

export interface LearnerEmploiReview {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missing_sections: string[];
  suggested_improvements: string[];
}

export interface LearnerEmploiJob {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  posted_at?: string;
  salary?: string;
  description: string;
  tags: string[];
  ats_score: number;
}

export interface LearnerEmploiAtsResult {
  job_id: string;
  score: number;
  breakdown: {
    skills: number;
    role: number;
    experience: number;
    keyword_coverage: number;
  };
  missing_skills: string[];
  suggestions: string[];
}

export interface LearnerEmploiAnalyzeResponse {
  parsed_resume: {
    role_hint: string;
    years_experience: number;
    skills: string[];
    sections: Record<string, string[]>;
  };
  resume_review: LearnerEmploiReview;
  jobs: LearnerEmploiJob[];
  ats_by_job: LearnerEmploiAtsResult[];
  meta: {
    duration_ms: number;
    sources_used: string[];
    source_timings_ms: Record<string, number>;
    total_scraped: number;
    total_returned: number;
    warnings: string[];
    partial_failures?: string[];
    quality_flags?: string[];
  };
  canonical_score?: {
    overall_score: number;
    ats_score: number;
    job_fit_score: number;
    confidence: number;
    breakdown: {
      resume_quality: number;
      job_fit: number;
    };
    missing_skills: string[];
    next_actions: Array<{
      title: string;
      reason: string;
    }>;
  };
}

export interface LearnerEmploiAnalyzeParams {
  resume: File;
  targetRole?: string;
  locations?: string[];
  remoteOnly?: boolean;
  maxJobs?: number;
}

export async function analyzeLearnerEmploi(
  params: LearnerEmploiAnalyzeParams,
): Promise<LearnerEmploiAnalyzeResponse> {
  const form = new FormData();
  form.append('resume', params.resume);
  if (params.targetRole?.trim()) form.append('target_role', params.targetRole.trim());
  if (params.locations?.length) form.append('locations', params.locations.join(','));
  if (typeof params.remoteOnly === 'boolean') form.append('remote_only', String(params.remoteOnly));
  if (typeof params.maxJobs === 'number') form.append('max_jobs', String(params.maxJobs));

  const { data } = await api.post<LearnerEmploiAnalyzeResponse>(
    API_PATHS.learnerEmploi('analyze'),
    form,
    { timeout: LEARNER_EMPLOI_HTTP_TIMEOUT_MS },
  );
  return data;
}

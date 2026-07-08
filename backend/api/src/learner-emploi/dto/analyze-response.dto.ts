export interface ResumeReviewBreakdown {
  sections: number;
  skills: number;
  experience: number;
  formatting: number;
}

export interface ResumeReviewDto {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missing_sections: string[];
  suggested_improvements: string[];
  breakdown: ResumeReviewBreakdown;
}

export interface ParsedResumeDto {
  role_hint: string;
  years_experience: number;
  skills: string[];
  sections: Record<string, string[]>;
  parse_confidence: number;
}

export interface JobCardDto {
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

export interface JobAtsBreakdownDto {
  skills: number;
  role: number;
  experience: number;
  keyword_coverage: number;
}

export interface JobAtsResultDto {
  job_id: string;
  score: number;
  breakdown: JobAtsBreakdownDto;
  missing_skills: string[];
  suggestions: string[];
}

export interface AnalyzeMetaDto {
  duration_ms: number;
  sources_used: string[];
  source_timings_ms: Record<string, number>;
  total_scraped: number;
  total_returned: number;
  warnings: string[];
  partial_failures: string[];
  quality_flags: string[];
}

export interface CanonicalScoreDto {
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
}

export interface AnalyzeResponseDto {
  parsed_resume: ParsedResumeDto;
  resume_review: ResumeReviewDto;
  jobs: JobCardDto[];
  ats_by_job: JobAtsResultDto[];
  meta: AnalyzeMetaDto;
  canonical_score: CanonicalScoreDto;
}

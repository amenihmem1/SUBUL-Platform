export interface ParsedResume {
  rawText: string;
  sections: Record<string, string[]>;
  roleHint: string;
  skills: string[];
  yearsExperience: number;
  parseConfidence: number;
}

export interface ResumeReview {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  suggestedImprovements: string[];
  breakdown: {
    sections: number;
    skills: number;
    experience: number;
    formatting: number;
  };
}

export interface JobCard {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  postedAt?: string;
  salary?: string;
  description: string;
  tags: string[];
}

export interface SourceAggregationResult {
  jobs: JobCard[];
  warnings: string[];
  sourceTimingsMs: Record<string, number>;
  sourcesUsed: string[];
  totalScraped: number;
  partialFailures: string[];
  qualityFlags: string[];
}

export interface CanonicalScoreBreakdown {
  resumeQuality: number;
  jobFit: number;
}

export interface CanonicalNextAction {
  title: string;
  reason: string;
}

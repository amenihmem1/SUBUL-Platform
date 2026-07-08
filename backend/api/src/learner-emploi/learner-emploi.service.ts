import { Injectable, Logger } from '@nestjs/common';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';
import { ResumeParsingService } from './services/resume-parsing.service';
import { ResumeReviewService } from './services/resume-review.service';
import { JobAggregationService } from './services/job-aggregation.service';
import { AtsScoringService } from './services/ats-scoring.service';
import { AgentsService } from '../agents/agents.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class LearnerEmploiService {
  private readonly logger = new Logger(LearnerEmploiService.name);

  constructor(
    private readonly resumeParsingService: ResumeParsingService,
    private readonly resumeReviewService: ResumeReviewService,
    private readonly jobAggregationService: JobAggregationService,
    private readonly atsScoringService: AtsScoringService,
    private readonly agentsService: AgentsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /** Caps requested job count to plan entitlements (Standard=5, Premium/institutional=20, Free=0). */
  private async clampMaxJobsForUser(userId: number | undefined, requested?: number): Promise<number> {
    if (!userId) return requested ?? 50;
    const profile = await this.subscriptionsService.resolveAccessProfile(userId);
    const cap = this.subscriptionsService.maxJobOpportunities(profile);
    if (cap <= 0) return 0;
    const base = requested ?? 50;
    return Math.min(base, cap);
  }

  async analyze(
    file: { buffer: Buffer; mimetype: string; originalname: string },
    options: AnalyzeRequestDto,
    userId?: number,
  ): Promise<AnalyzeResponseDto> {
    if (userId) {
      const maxJobs = await this.clampMaxJobsForUser(userId, options.max_jobs);
      return this.analyzeWithAgents(file, userId, maxJobs);
    }

    const start = Date.now();
    const parsed = await this.resumeParsingService.parseResume(file);
    const review = this.resumeReviewService.review(parsed);
    const maxJobs = await this.clampMaxJobsForUser(userId, options.max_jobs);
    const aggregated = await this.jobAggregationService.aggregate(parsed.roleHint, { ...options, max_jobs: maxJobs }, userId);
    const atsResults = this.atsScoringService.scoreJobs(parsed, aggregated.jobs);

    const scoreByJob = new Map(atsResults.map((r) => [r.job_id, r.score]));
    const jobsSorted = [...aggregated.jobs].sort((a, b) => {
      const scoreDelta = (scoreByJob.get(b.id) || 0) - (scoreByJob.get(a.id) || 0);
      if (scoreDelta !== 0) return scoreDelta;
      return (b.postedAt || '').localeCompare(a.postedAt || '');
    });

    const atsByJob = atsResults.sort((a, b) => b.score - a.score);
    const atsMap = new Map(atsByJob.map((r) => [r.job_id, r]));
    const topAts = atsByJob.slice(0, 5);
    const averageTopAts = topAts.length > 0 ? Math.round(topAts.reduce((acc, row) => acc + row.score, 0) / topAts.length) : 0;
    const overallScore = Math.round(review.score * 0.55 + averageTopAts * 0.45);
    const missingSkills = Array.from(
      new Set(
        topAts
          .flatMap((row) => row.missing_skills)
          .filter(Boolean),
      ),
    ).slice(0, 8);
    const nextActions = [
      { title: 'Strengthen missing skills evidence', reason: missingSkills.length ? `Prioritize: ${missingSkills.slice(0, 3).join(', ')}` : 'Focus on measurable achievements for target jobs' },
      { title: 'Tailor role headline', reason: `Align CV summary with target role: ${parsed.roleHint}` },
      { title: 'Quantify experience bullets', reason: 'Use impact metrics to improve ATS and recruiter confidence' },
    ];
    const durationMs = Date.now() - start;
    this.logger.log(`Learner emploi analysis completed in ${durationMs}ms with ${jobsSorted.length} jobs`);

    return {
      parsed_resume: {
        role_hint: parsed.roleHint,
        years_experience: parsed.yearsExperience,
        skills: parsed.skills,
        sections: parsed.sections,
        parse_confidence: parsed.parseConfidence,
      },
      resume_review: {
        score: review.score,
        strengths: review.strengths,
        weaknesses: review.weaknesses,
        missing_sections: review.missingSections,
        suggested_improvements: review.suggestedImprovements,
        breakdown: review.breakdown,
      },
      jobs: jobsSorted.map((job) => ({
        id: job.id,
        source: job.source,
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        url: job.url,
        posted_at: job.postedAt,
        salary: job.salary,
        description: job.description,
        tags: job.tags,
        ats_score: atsMap.get(job.id)?.score ?? 0,
      })),
      ats_by_job: atsByJob,
      meta: {
        duration_ms: durationMs,
        sources_used: aggregated.sourcesUsed,
        source_timings_ms: aggregated.sourceTimingsMs,
        total_scraped: aggregated.totalScraped,
        total_returned: jobsSorted.length,
        warnings: aggregated.warnings,
        partial_failures: aggregated.partialFailures,
        quality_flags: aggregated.qualityFlags,
      },
      canonical_score: {
        overall_score: overallScore,
        ats_score: review.score,
        job_fit_score: averageTopAts,
        confidence: Math.round((parsed.parseConfidence + Math.max(20, 100 - aggregated.partialFailures.length * 20)) / 2),
        breakdown: {
          resume_quality: review.score,
          job_fit: averageTopAts,
        },
        missing_skills: missingSkills,
        next_actions: nextActions,
      },
    };
  }

  private async analyzeWithAgents(
    file: { buffer: Buffer; mimetype: string; originalname: string },
    userId: number,
    maxJobs: number,
  ): Promise<AnalyzeResponseDto> {
    const start = Date.now();
    const agentResult = await this.agentsService.proxyCvBoost(userId, file, {
      cv_format: 'ats',
      include_quiz: 'true',
    });
    const parsedCv = (agentResult.parsed_cv || {}) as Record<string, unknown>;
    const sections = (parsedCv.sections || {}) as Record<string, string[]>;
    const scoreAfter = Number(agentResult.score_after || 0);
    const scoreBefore = Number(agentResult.score_before || scoreAfter);
    const jobsRaw = Array.isArray(agentResult.platform_jobs) ? (agentResult.platform_jobs as Record<string, unknown>[]) : [];

    const jobs = jobsRaw
      .map((job, idx) => {
        const url = String(job.url || '').trim();
        const title = String(job.title || '').trim();
        if (!url || !title) return null;
        const score = Number.parseFloat(String(job.match_score || '0').replace('%', '')) || 0;
        return {
          id: String(job.id || `agent-${idx}`),
          source: String(job.source || 'job-search-agent'),
          title,
          company: String(job.company || 'Unknown'),
          location: String(job.location || 'Unknown'),
          remote: String(job.remote || '').toLowerCase().includes('remote'),
          url,
          posted_at: String(job.posted || job.posted_at || ''),
          salary: String(job.salary || ''),
          description: String(job.description || ''),
          tags: Array.isArray(job.gap_matched) ? (job.gap_matched as unknown[]).map((v) => String(v)).filter(Boolean) : [],
          ats_score: score,
        };
      })
      .filter((job): job is NonNullable<typeof job> => Boolean(job))
      .slice(0, Math.max(0, maxJobs));

    const atsByJob = jobs.map((job) => ({
      job_id: job.id,
      score: job.ats_score,
      breakdown: {
        skills: Math.round(job.ats_score * 0.35),
        role: Math.round(job.ats_score * 0.25),
        experience: Math.round(job.ats_score * 0.2),
        keyword_coverage: Math.round(job.ats_score * 0.2),
      },
      missing_skills: [],
      suggestions: [],
    }));

    const missingSections = Array.isArray(agentResult.missing_sections)
      ? (agentResult.missing_sections as unknown[]).map((v) => String(v))
      : [];
    const explanation = (agentResult.explanation || {}) as Record<string, unknown>;
    const strengths = Array.isArray(explanation.strengths) ? (explanation.strengths as unknown[]).map((v) => String(v)) : [];
    const weaknesses = Array.isArray(explanation.weaknesses) ? (explanation.weaknesses as unknown[]).map((v) => String(v)) : [];
    const suggestions = Array.isArray(explanation.suggestions) ? (explanation.suggestions as unknown[]).map((v) => String(v)) : [];
    const durationMs = Date.now() - start;

    return {
      parsed_resume: {
        role_hint: String(parsedCv.job_title || ''),
        years_experience: 0,
        skills: [],
        sections,
        parse_confidence: 80,
      },
      resume_review: {
        score: scoreAfter,
        strengths,
        weaknesses,
        missing_sections: missingSections,
        suggested_improvements: suggestions,
        breakdown: {
          sections: Math.round(scoreAfter * 0.3),
          skills: Math.round(scoreAfter * 0.3),
          experience: Math.round(scoreAfter * 0.25),
          formatting: Math.round(scoreAfter * 0.15),
        },
      },
      jobs,
      ats_by_job: atsByJob,
      meta: {
        duration_ms: durationMs,
        sources_used: ['cv-booster-agent', 'job-search-agent'],
        source_timings_ms: { agent_total: durationMs },
        total_scraped: jobs.length,
        total_returned: jobs.length,
        warnings: [],
        partial_failures: [],
        quality_flags: ['agent_orchestrated'],
      },
      canonical_score: {
        overall_score: scoreAfter,
        ats_score: scoreBefore,
        job_fit_score: jobs.length ? Math.round(jobs.reduce((acc, job) => acc + job.ats_score, 0) / jobs.length) : 0,
        confidence: 80,
        breakdown: {
          resume_quality: scoreAfter,
          job_fit: jobs.length ? Math.round(jobs.reduce((acc, job) => acc + job.ats_score, 0) / jobs.length) : 0,
        },
        missing_skills: [],
        next_actions: [
          { title: 'Run targeted agent scan', reason: 'Use target role and location filters for higher-quality matches' },
          { title: 'Enrich CV via agent suggestions', reason: 'Apply explanation suggestions to improve ranking consistency' },
          { title: 'Sync profile before searching', reason: 'Keep job-search agent context aligned with latest CV' },
        ],
      },
    };
  }
}

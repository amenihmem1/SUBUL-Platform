import { LearnerEmploiService } from './learner-emploi.service';
import { ResumeParsingService } from './services/resume-parsing.service';
import { ResumeReviewService } from './services/resume-review.service';
import { JobAggregationService } from './services/job-aggregation.service';
import { AtsScoringService } from './services/ats-scoring.service';
import { AgentsService } from '../agents/agents.service';

describe('LearnerEmploiService', () => {
  it('returns canonical scoring contract', async () => {
    const parsing = {
      parseResume: jest.fn().mockResolvedValue({
        rawText: 'resume',
        sections: { summary: ['x'] },
        roleHint: 'Backend Engineer',
        skills: ['node', 'postgresql'],
        yearsExperience: 3,
        parseConfidence: 82,
      }),
    } as unknown as ResumeParsingService;
    const review = {
      review: jest.fn().mockReturnValue({
        score: 74,
        strengths: ['good'],
        weaknesses: [],
        missingSections: [],
        suggestedImprovements: ['improve bullets'],
        breakdown: { sections: 20, skills: 20, experience: 20, formatting: 14 },
      }),
    } as unknown as ResumeReviewService;
    const aggregation = {
      aggregate: jest.fn().mockResolvedValue({
        jobs: [{
          id: 'j1',
          source: 'test',
          title: 'Backend Engineer',
          company: 'Acme',
          location: 'Remote',
          remote: true,
          url: 'https://example.com/job',
          description: 'Node postgres',
          tags: ['node', 'postgresql'],
        }],
        warnings: [],
        sourceTimingsMs: { test: 120 },
        sourcesUsed: ['test'],
        totalScraped: 1,
        partialFailures: [],
        qualityFlags: [],
      }),
    } as unknown as JobAggregationService;
    const ats = {
      scoreJobs: jest.fn().mockReturnValue([{
        job_id: 'j1',
        score: 80,
        breakdown: { skills: 30, role: 20, experience: 15, keyword_coverage: 15 },
        missing_skills: ['docker'],
        suggestions: ['add docker evidence'],
      }]),
    } as unknown as AtsScoringService;
    const agents = {
      proxyCvBoost: jest.fn().mockResolvedValue({
        parsed_cv: { job_title: 'Backend Engineer', sections: { summary: ['x'] } },
        score_before: 72,
        score_after: 79,
        explanation: { strengths: ['good'], weaknesses: [], suggestions: ['improve bullets'] },
        missing_sections: [],
        platform_jobs: [{ id: 'j1', title: 'Backend Engineer', company: 'Acme', source: 'agent', location: 'Remote', remote: 'Remote', url: 'https://example.com/job', match_score: '80%', description: 'Node', gap_matched: ['node'] }],
      }),
    } as unknown as AgentsService;

    const service = new LearnerEmploiService(parsing, review, aggregation, ats, agents);
    const response = await service.analyze(
      { buffer: Buffer.from('x'), mimetype: 'text/plain', originalname: 'cv.txt' },
      {},
      undefined,
    );

    expect(response.canonical_score).toBeDefined();
    expect(response.canonical_score.overall_score).toBeGreaterThan(0);
    expect(response.canonical_score.next_actions.length).toBeGreaterThan(0);
    expect(response.parsed_resume.parse_confidence).toBe(82);
    expect(response.meta.quality_flags).toEqual([]);
  });

  it('uses agent orchestration when user is authenticated', async () => {
    const parsing = {} as unknown as ResumeParsingService;
    const review = {} as unknown as ResumeReviewService;
    const aggregation = {} as unknown as JobAggregationService;
    const ats = {} as unknown as AtsScoringService;
    const agents = {
      proxyCvBoost: jest.fn().mockResolvedValue({
        parsed_cv: { job_title: 'Data Analyst', sections: { summary: ['x'] } },
        score_before: 60,
        score_after: 70,
        explanation: { strengths: ['s1'], weaknesses: ['w1'], suggestions: ['a1'] },
        missing_sections: ['education'],
        platform_jobs: [{ id: 'x1', title: 'Data Analyst', company: 'Subul', source: 'job-search-agent', location: 'Remote', remote: 'Remote', url: 'https://example.com/1', match_score: '75%', description: 'SQL', gap_matched: ['sql'] }],
      }),
    } as unknown as AgentsService;
    const service = new LearnerEmploiService(parsing, review, aggregation, ats, agents);
    const response = await service.analyze(
      { buffer: Buffer.from('x'), mimetype: 'text/plain', originalname: 'cv.txt' },
      {},
      22,
    );
    expect(response.meta.quality_flags).toContain('agent_orchestrated');
    expect(response.jobs.length).toBe(1);
    expect(response.canonical_score.overall_score).toBe(70);
  });
});

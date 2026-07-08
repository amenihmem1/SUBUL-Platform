import { AtsScoringService } from './ats-scoring.service';
import { JobCard, ParsedResume } from '../learner-emploi.types';

describe('AtsScoringService', () => {
  const service = new AtsScoringService();

  it('returns per-job ATS score with missing skills', () => {
    const parsed: ParsedResume = {
      rawText: 'Backend engineer with Node and PostgreSQL experience using Docker and AWS',
      roleHint: 'Backend Engineer',
      skills: ['node', 'postgresql', 'docker', 'aws'],
      yearsExperience: 4,
      parseConfidence: 80,
      sections: { header: ['Backend Engineer'], experience: ['4 years'] },
    };

    const jobs: JobCard[] = [
      {
        id: '1',
        source: 'test',
        title: 'Backend Engineer',
        company: 'Acme',
        location: 'Remote',
        remote: true,
        url: 'https://example.com/job',
        description: 'Need Node, PostgreSQL, Kubernetes and CI/CD experience',
        tags: ['node', 'postgresql', 'kubernetes', 'ci/cd'],
      },
    ];

    const [result] = service.scoreJobs(parsed, jobs);
    expect(result.score).toBeGreaterThan(0);
    expect(result.job_id).toBe('1');
    expect(result.missing_skills).toContain('kubernetes');
  });
});

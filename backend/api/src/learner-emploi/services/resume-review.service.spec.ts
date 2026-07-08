import { ResumeReviewService } from './resume-review.service';
import { ParsedResume } from '../learner-emploi.types';

describe('ResumeReviewService', () => {
  const service = new ResumeReviewService();

  it('scores a well-structured resume reasonably high', () => {
    const parsed: ParsedResume = {
      rawText: 'Senior Data Engineer\nExperience\n- Built ETL\nEducation\nSkills\nPython SQL AWS LinkedIn test@example.com',
      roleHint: 'Senior Data Engineer',
      yearsExperience: 5,
      parseConfidence: 90,
      skills: ['python', 'sql', 'aws', 'airflow', 'docker'],
      sections: {
        header: ['Senior Data Engineer'],
        summary: ['Data engineer with 5 years of experience'],
        experience: ['2019 - 2024 Company', '- Built ETL pipelines'],
        education: ['BSc Computer Science'],
        skills: ['Python, SQL, AWS'],
        projects: ['Migration project'],
      },
    };

    const result = service.review(parsed);
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(result.missingSections.length).toBe(0);
  });
});

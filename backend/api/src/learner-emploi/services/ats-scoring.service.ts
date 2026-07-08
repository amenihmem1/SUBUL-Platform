import { Injectable } from '@nestjs/common';
import { JobCard, ParsedResume } from '../learner-emploi.types';
import { JobAtsResultDto } from '../dto/analyze-response.dto';

@Injectable()
export class AtsScoringService {
  scoreJobs(parsed: ParsedResume, jobs: JobCard[]): JobAtsResultDto[] {
    const resumeSkills = new Set(parsed.skills.map((s) => s.toLowerCase()));
    const resumeWords = new Set(
      parsed.rawText
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((w) => w.length > 2),
    );

    return jobs.map((job) => {
      const jobText = `${job.title} ${job.description} ${job.tags.join(' ')}`.toLowerCase();
      const jobTokens = jobText.split(/[^a-z0-9+#.]+/).filter((w) => w.length > 2);
      const uniqueJobTokens = [...new Set(jobTokens)];

      const tagSkills = new Set(job.tags.map((t) => t.toLowerCase()));
      const matchedSkills = [...tagSkills].filter((skill) => this.skillCovered(skill, resumeSkills));
      const missingSkills = [...tagSkills].filter((skill) => !this.skillCovered(skill, resumeSkills)).slice(0, 8);

      const skillsScore = tagSkills.size > 0 ? Math.round((matchedSkills.length / tagSkills.size) * 35) : 15;
      const roleScore = this.roleSimilarity(parsed.roleHint, job.title);
      const experienceScore = this.experienceCompatibility(parsed.yearsExperience, jobText);
      const overlapCount = uniqueJobTokens.filter((token) => resumeWords.has(token)).length;
      const keywordCoverage = uniqueJobTokens.length > 0
        ? Math.round((overlapCount / uniqueJobTokens.length) * 25)
        : 0;

      const total = Math.max(0, Math.min(100, skillsScore + roleScore + experienceScore + keywordCoverage));

      const suggestions: string[] = [];
      if (missingSkills.length > 0) suggestions.push(`Add evidence for: ${missingSkills.join(', ')}`);
      if (roleScore < 15) suggestions.push('Align headline and summary with this role title');
      if (experienceScore < 10) suggestions.push('Highlight years of relevant experience with measurable achievements');
      if (suggestions.length === 0) suggestions.push('Strong fit, tailor bullets with job-specific outcomes');

      return {
        job_id: job.id,
        score: total,
        breakdown: {
          skills: skillsScore,
          role: roleScore,
          experience: experienceScore,
          keyword_coverage: keywordCoverage,
        },
        missing_skills: missingSkills,
        suggestions: suggestions.slice(0, 3),
      };
    });
  }

  private roleSimilarity(roleHint: string, jobTitle: string): number {
    const roleWords = new Set(roleHint.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
    const titleWords = new Set(jobTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
    if (titleWords.size === 0) return 0;
    const overlap = [...roleWords].filter((w) => titleWords.has(w)).length;
    return Math.min(20, Math.round((overlap / Math.max(1, titleWords.size)) * 20));
  }

  private experienceCompatibility(years: number, jobText: string): number {
    const reqMatch = jobText.match(/(\d{1,2})\+?\s*(years|yrs|ans)\b/);
    if (!reqMatch) return 15;
    const required = Number.parseInt(reqMatch[1], 10);
    if (!Number.isFinite(required)) return 15;
    if (years >= required) return 20;
    if (years + 1 >= required) return 14;
    if (years + 2 >= required) return 9;
    return 4;
  }

  private skillCovered(skill: string, resumeSkills: Set<string>): boolean {
    if (resumeSkills.has(skill)) return true;
    if (skill === 'nodejs' || skill === 'node.js') return resumeSkills.has('node');
    if (skill === 'postgres') return resumeSkills.has('postgresql');
    return [...resumeSkills].some((known) => known.includes(skill) || skill.includes(known));
  }
}

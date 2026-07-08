import { Injectable } from '@nestjs/common';
import { ParsedResume, ResumeReview } from '../learner-emploi.types';

@Injectable()
export class ResumeReviewService {
  review(parsed: ParsedResume): ResumeReview {
    const sectionScore = this.scoreSections(parsed.sections);
    const skillsScore = this.scoreSkills(parsed.skills);
    const experienceScore = this.scoreExperience(parsed);
    const formattingScore = this.scoreFormatting(parsed.rawText);
    const total = Math.max(0, Math.min(100, sectionScore + skillsScore + experienceScore + formattingScore));

    const missingSections = this.getMissingSections(parsed.sections);
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestedImprovements: string[] = [];

    if (sectionScore >= 24) strengths.push('Core sections are well-structured for ATS parsing');
    else weaknesses.push('Some key sections are missing or weakly populated');

    if (skillsScore >= 20) strengths.push('Technical skill coverage is strong');
    else weaknesses.push('Technical skills are not sufficiently explicit');

    if (experienceScore >= 22) strengths.push('Experience history appears measurable and relevant');
    else weaknesses.push('Experience section lacks quantifiable impact or clear timelines');

    if (formattingScore >= 16) strengths.push('Resume readability and layout seem ATS-friendly');
    else weaknesses.push('Formatting quality may reduce ATS readability');

    if (missingSections.length > 0) {
      suggestedImprovements.push(`Add missing sections: ${missingSections.join(', ')}`);
    }
    if (parsed.skills.length < 8) {
      suggestedImprovements.push('Expand skills section with role-specific tools and technologies');
    }
    if (parsed.yearsExperience === 0) {
      suggestedImprovements.push('Include explicit years of experience (e.g. "3+ years")');
    }
    if (parsed.parseConfidence < 60) {
      suggestedImprovements.push('Improve section headings and formatting for more reliable CV parsing');
    }
    if (suggestedImprovements.length === 0) {
      suggestedImprovements.push('Tailor summary and achievements to target roles for higher ATS relevance');
    }

    return {
      score: total,
      strengths,
      weaknesses,
      missingSections,
      suggestedImprovements,
      breakdown: {
        sections: sectionScore,
        skills: skillsScore,
        experience: experienceScore,
        formatting: formattingScore,
      },
    };
  }

  private scoreSections(sections: Record<string, string[]>): number {
    const keySections = ['summary', 'experience', 'education', 'skills', 'projects'];
    const present = keySections.filter((s) => (sections[s] || []).length > 0).length;
    return Math.round((present / keySections.length) * 30);
  }

  private scoreSkills(skills: string[]): number {
    return Math.min(25, Math.round((skills.length / 12) * 25));
  }

  private scoreExperience(parsed: ParsedResume): number {
    const lines = parsed.sections.experience || [];
    const hasBullets = lines.some((line) => /^[-•]/.test(line.trim()));
    const hasDates = lines.some((line) => /\b(19|20)\d{2}\b/.test(line));
    let score = 10;
    if (lines.length > 3) score += 8;
    if (hasDates) score += 5;
    if (hasBullets) score += 4;
    if (parsed.yearsExperience >= 2) score += 3;
    if (lines.some((line) => /\b(increased|reduced|improved|built|delivered)\b/i.test(line))) score += 2;
    return Math.min(25, score);
  }

  private scoreFormatting(text: string): number {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 10) return 4;
    const averageLength = lines.reduce((acc, l) => acc + l.length, 0) / lines.length;
    let score = 8;
    if (averageLength >= 20 && averageLength <= 120) score += 8;
    if (lines.some((line) => line.includes('@'))) score += 2;
    if (lines.some((line) => /linkedin\.com/i.test(line))) score += 2;
    if (lines.filter((line) => /^[-•]/.test(line)).length >= 3) score += 2;
    return Math.min(20, score);
  }

  private getMissingSections(sections: Record<string, string[]>): string[] {
    const required = ['summary', 'experience', 'education', 'skills'];
    return required.filter((section) => (sections[section] || []).length === 0);
  }
}

import { BadRequestException, Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import mammoth from 'mammoth';
import { ParsedResume } from '../learner-emploi.types';

const SKILL_LEXICON = [
  'python', 'java', 'javascript', 'typescript', 'node', 'react', 'angular', 'vue', 'nestjs',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'docker', 'kubernetes', 'aws', 'azure',
  'gcp', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'power bi', 'tableau', 'airflow',
  'spark', 'git', 'github', 'ci/cd', 'linux', 'terraform', 'ansible',
];
const ROLE_KEYWORDS = [
  'developer', 'developpeur', 'engineer', 'ingenieur', 'architect', 'fullstack',
  'backend', 'front', 'frontend', 'software', 'data', 'devops', 'mobile', 'web3',
];
const SKILL_SYNONYMS: Record<string, string[]> = {
  javascript: ['js', 'ecmascript'],
  typescript: ['ts'],
  node: ['nodejs', 'node.js'],
  'ci/cd': ['ci cd', 'cicd', 'continuous integration'],
  postgresql: ['postgres', 'postgresql'],
  'power bi': ['powerbi'],
};

@Injectable()
export class ResumeParsingService {
  async parseResume(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<ParsedResume> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Resume file is empty');
    }

    const text = (await this.extractText(file)).trim();
    if (text.length < 80) {
      throw new BadRequestException('Resume content is too short or unreadable');
    }

    const sections = this.parseSections(text);
    const skills = this.extractSkills(text);
    const roleHint = this.extractRoleHint(sections, text);
    const yearsExperience = this.extractYearsExperience(text);
    const parseConfidence = this.estimateParseConfidence(sections, skills, roleHint, text);

    return {
      rawText: text,
      sections,
      roleHint,
      skills,
      yearsExperience,
      parseConfidence,
    };
  }

  private async extractText(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<string> {
    const mime = file.mimetype.toLowerCase();
    const name = file.originalname.toLowerCase();

    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      const pdfParseModule = await import('pdf-parse');
      const PDFParseCtor = (
        pdfParseModule as unknown as {
          PDFParse?: new (options: { data: Uint8Array }) => { getText: () => Promise<{ text?: string }>; destroy?: () => Promise<void> };
          default?: { PDFParse?: new (options: { data: Uint8Array }) => { getText: () => Promise<{ text?: string }>; destroy?: () => Promise<void> } };
        }
      ).PDFParse
        ?? (
          pdfParseModule as unknown as {
            default?: { PDFParse?: new (options: { data: Uint8Array }) => { getText: () => Promise<{ text?: string }>; destroy?: () => Promise<void> } };
          }
        ).default?.PDFParse;

      if (!PDFParseCtor) {
        throw new BadRequestException('PDF parser module is unavailable');
      }

      const parser = new PDFParseCtor({ data: new Uint8Array(file.buffer) });
      try {
        const parsed = await parser.getText();
        return parsed?.text || '';
      } finally {
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      }
    }

    if (
      mime.includes('officedocument.wordprocessingml.document') ||
      name.endsWith('.docx')
    ) {
      const parsed = await mammoth.extractRawText({ buffer: file.buffer });
      return parsed.value || '';
    }

    if (mime.includes('text/plain') || name.endsWith('.txt')) {
      return file.buffer.toString('utf-8');
    }

    throw new UnsupportedMediaTypeException('Only PDF, DOCX, and TXT resumes are supported');
  }

  private parseSections(text: string): Record<string, string[]> {
    const sectionMatchers: Array<{ key: string; regex: RegExp }> = [
      { key: 'summary', regex: /^(summary|profile|about|objective)$/i },
      { key: 'experience', regex: /^(experience|work experience|employment)$/i },
      { key: 'education', regex: /^(education|academic background)$/i },
      { key: 'skills', regex: /^(skills|technical skills|core skills)$/i },
      { key: 'projects', regex: /^(projects|portfolio)$/i },
      { key: 'certifications', regex: /^(certifications|licenses)$/i },
      { key: 'languages', regex: /^(languages)$/i },
    ];

    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const sections: Record<string, string[]> = { header: [] };
    let current = 'header';

    for (const line of lines) {
      const match = sectionMatchers.find((m) => m.regex.test(line) && line.length <= 50);
      if (match) {
        current = match.key;
        if (!sections[current]) sections[current] = [];
        continue;
      }
      if (!sections[current]) sections[current] = [];
      sections[current].push(line);
    }

    return sections;
  }

  private extractSkills(text: string): string[] {
    const lower = text.toLowerCase();
    return SKILL_LEXICON.filter((skill) => {
      if (lower.includes(skill)) return true;
      return (SKILL_SYNONYMS[skill] || []).some((variant) => lower.includes(variant));
    }).sort();
  }

  private extractRoleHint(sections: Record<string, string[]>, text: string): string {
    const headerLines = (sections.header || [])
      .map((line) => line.trim())
      .filter((line) => Boolean(line) && line.length <= 100)
      .filter((line) => !/@|linkedin|github|\+?\d{2,}/i.test(line));

    const roleFromHeader = headerLines.find((line) => {
      const lower = line.toLowerCase();
      return ROLE_KEYWORDS.some((word) => lower.includes(word));
    });
    if (roleFromHeader) return roleFromHeader;

    const reasonableHeader = headerLines.find((line) => line.length >= 8 && line.length <= 80);
    if (reasonableHeader) return reasonableHeader;

    const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    return firstLine || 'Software Engineer';
  }

  private extractYearsExperience(text: string): number {
    const match = text.match(/(\d{1,2})\+?\s*(years|yrs|ans)\b/i);
    if (!match) return 0;
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? value : 0;
  }

  private estimateParseConfidence(
    sections: Record<string, string[]>,
    skills: string[],
    roleHint: string,
    rawText: string,
  ): number {
    const expectedSections = ['summary', 'experience', 'education', 'skills'];
    const presentSections = expectedSections.filter((key) => (sections[key] || []).length > 0).length;
    const sectionConfidence = Math.round((presentSections / expectedSections.length) * 40);
    const skillConfidence = Math.min(30, skills.length * 3);
    const roleConfidence = roleHint && roleHint.length >= 5 ? 20 : 0;
    const textConfidence = rawText.length >= 500 ? 10 : rawText.length >= 250 ? 6 : 2;
    return Math.max(0, Math.min(100, sectionConfidence + skillConfidence + roleConfidence + textConfidence));
  }
}

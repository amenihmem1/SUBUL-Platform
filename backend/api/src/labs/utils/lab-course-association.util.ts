import { LearnerTrack } from '../../certifications/utils/cert-domain.util';

/**
 * ILIKE patterns for `labs.slug` derived from platform `courses.course_id` (exam codes, etc.).
 * Keeps scoped learners seeing hands-on labs that match their enrollments even when `labs.track` is unset or mismatched.
 */
export function labSlugPatternsForCourseId(courseId: string): string[] {
  const raw = courseId.trim().toUpperCase();
  const out: string[] = [];

  if (/AZ[- ]?900|AZ900/.test(raw)) {
    out.push('azure-az900', 'az900-%');
  }
  if (/AI[- ]?900|AI900|AI[- ]?102|AIF-C01|AZURE-AI/i.test(raw)) {
    out.push('azure-ai%', 'ai900-%', 'sagemaker%');
  }
  if (/SC[- ]?900|SC900|MS[- ]?500|AZ[- ]?500|SC[- ]?200/.test(raw)) {
    out.push('sc900-%', 'azure-sc%');
  }
  if (
    /^AWS[- ]/i.test(courseId) ||
    /^CLF-|^SAA-|^AIF-|^DVA-|^DOP-|^ANS-|^SAP-|^SCS-|^DAS-/i.test(raw) ||
    /CLOUD\s*PRACTITIONER|SOLUTIONS?\s*ARCHITECT|DEVELOPER\s*ASSOCIATE/i.test(raw)
  ) {
    out.push('aws-ec2', 'aws-ec2-%');
  }
  if (/AWS|AMAZON|\bEC2\b/i.test(raw) && !out.some((p) => p.startsWith('aws-ec2'))) {
    out.push('aws-ec2', 'aws-ec2-%');
  }
  if (/GCP|GOOGLE|CLOUD\s*DIGITAL|GOOGLE\s*CLOUD/i.test(raw)) {
    out.push('gcp-%');
  }

  return [...new Set(out)];
}

/**
 * Maps interactive `labs.slug` to the learner course UI level (beginner | intermediate).
 * Hubs and unrecognized slugs appear in both levels.
 */
export function interactiveSlugToCourseUiLevel(
  slug: string,
): 'beginner' | 'intermediate' | 'both' {
  const s = slug.toLowerCase();
  if (s === 'azure-az900' || s === 'aws-ec2') {
    return 'both';
  }
  if (s.includes('intermediate')) {
    return 'intermediate';
  }
  if (s.includes('advanced')) {
    return 'intermediate';
  }
  if (s.includes('beginner')) {
    return 'beginner';
  }
  return 'both';
}

/** Default track for seeded interactive labs (slug-based heuristic). */
export function inferLabTrackFromInteractiveSlug(slug: string): LearnerTrack {
  const s = slug.toLowerCase();
  if (/bedrock|sagemaker|openai|azure-openai|machine-learning|nlp|genai|generative/.test(s)) {
    return 'ai';
  }
  if (/defender|sentinel|security|sc-900|sc900|cyber|defensible|threat/.test(s)) {
    return 'cyber';
  }
  return 'cloud';
}

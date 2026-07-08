/** Platform learning track used on users, courses, and interactive labs. */
export type LearnerTrack = 'cloud' | 'cyber' | 'ai';

const LEARNER_TRACKS: ReadonlySet<string> = new Set(['cloud', 'cyber', 'ai']);

export function isLearnerTrack(value: string | undefined | null): value is LearnerTrack {
  return value != null && LEARNER_TRACKS.has(value);
}

/**
 * Maps certification JSON / DB domain strings (e.g. ia, securite) to platform track.
 */
export function normalizeCertDomainToTrack(domain: string | null | undefined): LearnerTrack | null {
  if (domain == null || String(domain).trim() === '') return null;
  const d = String(domain).trim().toLowerCase();
  if (d === 'cloud' || d === 'data' || d === 'devops') return 'cloud';
  if (d === 'ia' || d === 'ai' || d === 'ml' || d === 'intelligence artificielle') return 'ai';
  if (d === 'securite' || d === 'cyber' || d === 'cybersecurity' || d === 'sécurité' || d === 'securité')
    return 'cyber';
  return null;
}

/** Maps assessment_quiz domain to LearnerTrack (devops → cloud until a fourth track exists). */
export function normalizeAssessmentDomainToTrack(
  domain: string | null | undefined,
): LearnerTrack | null {
  if (!domain) return null;
  const d = String(domain).trim().toLowerCase();
  if (d === 'devops') return 'cloud';
  if (isLearnerTrack(d)) return d;
  return null;
}

/**
 * Wrappers for academy JSON roots — keeps seed/import tolerant of schema wrappers.
 */

export function unwrapCoursesCertificationsPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('courses-certifications.json must be a JSON object');
  }
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.certifications)) {
    return r;
  }
  throw new Error('courses-certifications.json must contain a "certifications" array');
}

export function unwrapLabsPayload(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) {
    return raw as Array<Record<string, unknown>>;
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const labs = (raw as Record<string, unknown>).labs;
    if (Array.isArray(labs)) {
      return labs as Array<Record<string, unknown>>;
    }
  }
  throw new Error('interactive-labs.json must be an array or { "labs": [...] }');
}

export function unwrapPracticeExamsPayload(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) {
    return raw as Array<Record<string, unknown>>;
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const pe = (raw as Record<string, unknown>).practiceExams;
    if (Array.isArray(pe)) {
      return pe as Array<Record<string, unknown>>;
    }
  }
  throw new Error('practice-exams.json must be an array or { "practiceExams": [...] }');
}

export function unwrapCertificationPathsPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('certification-paths.json must be a JSON object');
  }
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.paths) || Array.isArray(r.certificationPaths)) {
    return r;
  }
  throw new Error('certification-paths.json must contain "paths" or "certificationPaths"');
}

/** Normalize academy interactive lab row → LabImportService row */
export function normalizeInteractiveLabRow(row: Record<string, unknown>): Record<string, unknown> {
  const slug = String(row.slug ?? '').trim();
  const title = String(row.title ?? '').trim();
  const tasksRaw = Array.isArray(row.tasks) ? row.tasks : [];
  const steps = tasksRaw.map((t: unknown, idx: number) => {
    if (!t || typeof t !== 'object') {
      return { title: `Step ${idx + 1}`, instruction: '' };
    }
    const o = t as Record<string, unknown>;
    return {
      title: String(o.title ?? `Step ${idx + 1}`),
      instruction: String(o.instructions ?? o.instruction ?? ''),
      validationNote: Array.isArray(o.validationHints) ? o.validationHints.join('\n') : undefined,
    };
  });
  const taskLabels = steps.map((s) => s.title).filter(Boolean);
  const provider = String(row.provider ?? 'aws').toLowerCase();
  const mappedProvider =
    provider === 'microsoft' || provider === 'azure'
      ? 'azure'
      : provider === 'google cloud' || provider === 'gcp'
        ? 'gcp'
        : provider === 'nvidia'
          ? 'nvidia'
          : 'aws';
  const level = String(row.level ?? row.difficulty ?? 'beginner').toLowerCase();
  const sourceMetadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const sourceTrack = String(row.track ?? sourceMetadata.track ?? 'cloud').toLowerCase();
  const track = ['cloud', 'cyber', 'ai'].includes(sourceTrack) ? sourceTrack : 'cloud';
  const difficulty =
    level === 'intermediate' || level.includes('intermediate')
      ? 'intermediate'
      : level === 'advanced' || level.includes('advanced')
        ? 'advanced'
        : 'beginner';

  return {
    slug,
    title,
    description: typeof row.description === 'string' ? row.description : undefined,
    provider: mappedProvider,
    difficulty,
    estimatedDurationMinutes:
      typeof row.durationMinutes === 'number' ? row.durationMinutes : undefined,
    status: row.status === 'published' ? 'published' : 'draft',
    tasks: taskLabels.length ? taskLabels : steps.map((_, i) => `Task ${i + 1}`),
    steps,
    track,
    metadata: {
      ...sourceMetadata,
      certificationExternalId: row.certificationExternalId,
      track,
      scenario: row.scenario,
      environment: row.environment,
      domainAlignment: row.domainAlignment,
      learningObjectives: Array.isArray(row.objectives) ? row.objectives : sourceMetadata.learningObjectives,
    },
  };
}

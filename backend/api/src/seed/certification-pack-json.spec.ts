import {
  unwrapLabsPayload,
  unwrapPracticeExamsPayload,
  unwrapCertificationPathsPayload,
  normalizeInteractiveLabRow,
} from './certification-pack-json';

describe('certification-pack-json', () => {
  it('unwrapLabsPayload accepts wrapped root', () => {
    const labs = unwrapLabsPayload({ labs: [{ slug: 'a', title: 'T' }] });
    expect(labs).toHaveLength(1);
    expect(labs[0].slug).toBe('a');
  });

  it('unwrapPracticeExamsPayload accepts wrapped root', () => {
    const exams = unwrapPracticeExamsPayload({
      practiceExams: [
        {
          slug: 'e',
          title: 'E',
          questions: [
            { question: 'Q1', options: ['a', 'b'], correct: 'a' },
          ],
        },
      ],
    });
    expect(exams).toHaveLength(1);
  });

  it('unwrapCertificationPathsPayload accepts certificationPaths', () => {
    const p = unwrapCertificationPathsPayload({
      certificationPaths: [{ certificationExternalId: 'x', steps: [] }],
    });
    expect(Array.isArray((p as any).certificationPaths)).toBe(true);
  });

  it('normalizeInteractiveLabRow builds steps from task objects', () => {
    const row = normalizeInteractiveLabRow({
      slug: 'lab-1',
      title: 'Lab',
      certificationExternalId: 'aws-certified-cloud-practitioner-clf-c02',
      track: 'cloud',
      scenario: 'Scenario',
      objectives: ['Objective'],
      metadata: { sequence: 1, nextSlug: 'lab-2' },
      tasks: [{ title: 'T1', instructions: '## Do thing', validationHints: ['ok'] }],
    });
    expect(Array.isArray(row.steps)).toBe(true);
    expect((row.steps as unknown[]).length).toBe(1);
    expect((row.steps as Array<Record<string, unknown>>)[0].instruction).toBe('## Do thing');
    expect(row.track).toBe('cloud');
    expect(row.metadata).toMatchObject({
      certificationExternalId: 'aws-certified-cloud-practitioner-clf-c02',
      sequence: 1,
      nextSlug: 'lab-2',
      scenario: 'Scenario',
      learningObjectives: ['Objective'],
    });
  });

  it('normalizes certification provider display names', () => {
    expect(normalizeInteractiveLabRow({ slug: 'az', title: 'Azure', provider: 'Microsoft', tasks: ['T'] }).provider).toBe('azure');
    expect(normalizeInteractiveLabRow({ slug: 'gcp', title: 'GCP', provider: 'Google Cloud', tasks: ['T'] }).provider).toBe('gcp');
  });
});

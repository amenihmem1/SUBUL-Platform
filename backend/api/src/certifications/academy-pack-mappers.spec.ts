import {
  expandCertificationCourses,
  normalizeCertificationIdentity,
  mapAcademyCourseModules,
} from './academy-pack-mappers';

describe('academy-pack-mappers', () => {
  it('normalizeCertificationIdentity prefers externalId', () => {
    const n = normalizeCertificationIdentity({ externalId: 'ext-1', title: 'T' });
    expect(n.id).toBe('ext-1');
  });

  it('expandCertificationCourses uses legacy modules when courses absent', () => {
    const mk = (c: Record<string, unknown>) => String(c.id ?? '').toUpperCase();
    const seg = expandCertificationCourses(
      {
        id: 'c1',
        title: 'Cert',
        modules: [{ title: 'M1', lessons: [{ title: 'L1', content: 'x' }] }],
      },
      mk,
    );
    expect(seg).toHaveLength(1);
    expect(seg[0].courseId).toBe('C1');
    expect(seg[0].modules[0].title).toBe('M1');
  });

  it('expandCertificationCourses expands academy courses array', () => {
    const mk = () => 'SHOULD-NOT-USE';
    const seg = expandCertificationCourses(
      {
        id: 'aws-x',
        title: 'AWS',
        courses: [
          {
            courseId: 'COURSE-A',
            title: 'Course A',
            modules: [
              {
                moduleId: 'm1',
                title: 'Mod',
                moduleOrder: 1,
                lessons: [{ lessonId: 'l1', title: 'Les', content: 'body' }],
              },
            ],
          },
        ],
      } as Record<string, unknown>,
      mk,
    );
    expect(seg).toHaveLength(1);
    expect(seg[0].courseId).toBe('COURSE-A');
    expect(seg[0].modules[0].lessons?.[0].title).toBe('Les');
  });

  it('mapAcademyCourseModules merges lesson quiz into module quiz', () => {
    const mods = mapAcademyCourseModules([
      {
        title: 'M',
        lessons: [
          {
            title: 'L',
            content: '',
            quiz: {
              question: 'Q?',
              options: ['a', 'b'],
              correctAnswer: 0,
            },
          },
        ],
      },
    ]);
    expect(mods[0].quiz?.length).toBeGreaterThanOrEqual(1);
  });
});

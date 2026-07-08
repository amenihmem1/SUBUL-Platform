import { CertifCoursesImportService } from './certif-courses-import.service';
import { CourseLevel } from '../courses/constants/course-level.enum';

describe('CertifCoursesImportService', () => {
  function createServiceHarness() {
    const certs: any[] = [];
    const courses: any[] = [];
    const modules: any[] = [];
    const lessons: any[] = [];
    const labs: any[] = [];
    let idSeq = 1;

    const manager = {
      findOne: jest.fn(async (entity: any, opts: any) => {
        const where = opts?.where;
        const rows =
          entity?.name === 'Certification'
            ? certs
            : entity?.name === 'Course'
              ? courses
              : entity?.name === 'CourseModule'
                ? modules
                : entity?.name === 'Lab'
                  ? labs
                  : lessons;
        const clauses = Array.isArray(where) ? where : [where];
        for (const clause of clauses) {
          const found = rows.find((row) =>
            Object.entries(clause || {}).every(([k, v]) => row[k] === v),
          );
          if (found) return found;
        }
        return null;
      }),
      create: jest.fn((_: any, payload: any) => ({ ...payload })),
      save: jest.fn(async (entity: any, payload: any) => {
        const collection =
          entity?.name === 'Certification'
            ? certs
            : entity?.name === 'Course'
              ? courses
              : entity?.name === 'CourseModule'
                ? modules
                : entity?.name === 'Lab'
                  ? labs
                : lessons;
        if (!payload.id) payload.id = idSeq++;
        const idx = collection.findIndex((r) => r.id === payload.id);
        if (idx >= 0) collection[idx] = { ...collection[idx], ...payload };
        else collection.push(payload);
        return payload;
      }),
    };

    const dataSource = {
      transaction: async (fn: (m: any) => Promise<void>) => fn(manager),
    } as any;

    const service = new CertifCoursesImportService(
      dataSource,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { service, certs, courses, modules, lessons, labs };
  }

  it('imports payload and maps levels/ids', async () => {
    const { service, certs, courses, modules, lessons } = createServiceHarness();
    const payload = {
      version: '1.0',
      certifications: [
        {
          id: 'az-900',
          exam_code: 'AZ-900',
          title: 'Azure Fundamentals',
          provider: 'Microsoft Azure',
          level: 'debutant',
          modules: [
            {
              id: 'm1',
              order: 1,
              title: 'Cloud basics',
              lessons: [{ id: 'l1', title: 'Intro', content: 'x', key_points: ['a'] }],
            },
          ],
        },
      ],
    };

    const result = await service.importFromPayload(payload as any);

    expect(result.certifications.created).toBe(1);
    expect(result.courses.created).toBe(1);
    expect(certs[0].externalId).toBe('az-900');
    expect(courses[0].courseId).toBe('AZ-900');
    expect(courses[0].level).toBe(CourseLevel.Fundamentals);
    expect(modules).toHaveLength(1);
    expect(lessons).toHaveLength(1);
  });

  it('is idempotent on second run', async () => {
    const { service, certs, courses, modules, lessons } = createServiceHarness();
    const payload = {
      version: '1.0',
      certifications: [
        {
          id: 'aws-clf-c02',
          exam_code: 'CLF-C02',
          title: 'AWS Cloud Practitioner',
          provider: 'Amazon Web Services',
          level: 'debutant',
          modules: [
            {
              id: 'mod-1',
              order: 1,
              title: 'Basics',
              lessons: [{ id: 'ls-1', title: 'Lesson 1' }],
            },
          ],
        },
      ],
    };

    const first = await service.importFromPayload(payload as any);
    const second = await service.importFromPayload(payload as any);

    expect(first.certifications.created).toBe(1);
    expect(second.certifications.created).toBe(0);
    expect(second.certifications.updated).toBe(1);
    expect(certs).toHaveLength(1);
    expect(courses).toHaveLength(1);
    expect(modules).toHaveLength(1);
    expect(lessons).toHaveLength(1);
  });

  it('imports module labs into course_labs upsert path', async () => {
    const { service, labs } = createServiceHarness();
    const payload = {
      version: '1.0',
      certifications: [
        {
          id: 'cisco-iot-dt',
          exam_code: 'N/A',
          title: 'Introduction to IoT and Digital Transformation',
          provider: 'Cisco Networking Academy',
          level: 'debutant',
          modules: [
            {
              id: 'iot-m1',
              order: 1,
              title: 'Everything is Connected',
              lessons: [{ id: 'iot-m1-l1', title: 'Intro' }],
              labs: [
                {
                  id: 'iot-lab-01',
                  order: 1,
                  title: 'How Connected are You?',
                  description: 'First IoT lab',
                  duration_min: 15,
                  difficulty: 'facile',
                  objectives: ['Identify connected devices'],
                },
              ],
            },
          ],
        },
      ],
    };

    const first = await service.importFromPayload(payload as any);
    const second = await service.importFromPayload(payload as any);

    expect(first.labs.created).toBe(1);
    expect(second.labs.updated).toBe(1);
    expect(labs).toHaveLength(1);
    expect(labs[0].labId).toBe('iot-lab-01');
    expect(labs[0].title).toBe('How Connected are You?');
    expect(labs[0].durationMinutes).toBe(15);
  });

  it('accepts module quiz with correctAnswer index and normalizes to correct text', async () => {
    const { service, modules } = createServiceHarness();
    const payload = {
      certifications: [
        {
          id: 'pack-quiz-shape',
          title: 'Pack quiz shape',
          provider: 'Test',
          modules: [
            {
              title: 'Module A',
              quiz: [
                {
                  question: 'Pick one?',
                  options: ['a', 'b', 'c'],
                  correctAnswer: 1,
                  explanation: 'because',
                },
              ],
              lessons: [{ title: 'L1', content: 'x' }],
            },
          ],
        },
      ],
    };

    const result = await service.importFromPayload(payload as any, 'admin_upsert');
    expect(result.errors.length).toBe(0);
    expect(modules[0].quiz[0].correct).toBe('b');
  });
});

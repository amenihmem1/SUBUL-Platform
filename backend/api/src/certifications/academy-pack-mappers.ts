export type CourseSegment = {
  courseId: string;
  title: string;
  description?: string;
  modules: AcademyModulePayload[];
  track?: 'cloud' | 'cyber' | 'ai';
};

/** Module/lesson shapes compatible with CertifCoursesImportService upsert loops. */
export type AcademyLessonPayload = {
  id?: string;
  title: string;
  content?: string;
  key_points?: string[];
  analogy?: string;
  comparison_table?: Record<string, unknown>;
};

export type AcademyModulePayload = {
  id?: string;
  order?: number;
  title: string;
  duration_min?: number;
  objectives?: string[];
  lessons?: AcademyLessonPayload[];
  labs?: unknown[];
  quiz?: unknown[];
};

/** Normalize legacy single-course payloads + academy `courses[]` multi-course payloads. */
export function normalizeCertificationIdentity(cert: Record<string, unknown>): Record<string, unknown> {
  const id = String(cert?.id ?? cert?.externalId ?? cert?.slug ?? '').trim();
  return { ...cert, id };
}

function convertLessonQuizObject(q: Record<string, unknown>): Record<string, unknown> {
  const options = Array.isArray(q.options) ? (q.options as string[]) : [];
  let correct: unknown = q.correct;
  if (
    (correct === undefined || correct === null) &&
    typeof q.correctAnswer === 'number' &&
    options[q.correctAnswer as number]
  ) {
    correct = options[q.correctAnswer as number];
  }
  return {
    question: String(q.question ?? ''),
    options,
    correct: correct as string,
    explanation: q.explanation,
  };
}

export function mapAcademyLesson(lesson: Record<string, unknown>): AcademyLessonPayload {
  const ct = (lesson.comparisonTable ?? lesson.comparison_table) as unknown;
  let comparison_table: Record<string, unknown> | undefined;
  if (Array.isArray(ct)) {
    comparison_table = { rows: ct as unknown[] };
  } else if (ct && typeof ct === 'object' && !Array.isArray(ct)) {
    comparison_table = ct as Record<string, unknown>;
  }
  return {
    id: String(lesson.lessonId ?? lesson.id ?? '').trim() || undefined,
    title: String(lesson.title ?? '').trim(),
    content: typeof lesson.content === 'string' ? lesson.content : '',
    key_points: (Array.isArray(lesson.keyPoints) ? lesson.keyPoints : lesson.key_points) as string[] | undefined,
    analogy: typeof lesson.analogy === 'string' ? lesson.analogy : undefined,
    comparison_table,
  };
}

function mapAcademyModule(m: Record<string, unknown>, moduleIndex: number): AcademyModulePayload {
  const lessonsRaw = Array.isArray(m.lessons) ? (m.lessons as Record<string, unknown>[]) : [];
  const lessons = lessonsRaw.map((l) => mapAcademyLesson(l));
  const quizFromLessons: Record<string, unknown>[] = [];
  for (const lr of lessonsRaw) {
    if (lr.quiz && typeof lr.quiz === 'object' && !Array.isArray(lr.quiz)) {
      quizFromLessons.push(convertLessonQuizObject(lr.quiz as Record<string, unknown>));
    }
  }
  const topQuiz = Array.isArray(m.quiz) ? (m.quiz as Record<string, unknown>[]) : [];
  const moduleQuiz = [...topQuiz, ...quizFromLessons];
  const objectives =
    (Array.isArray(m.objectives) ? m.objectives : undefined) ??
    (Array.isArray(m.learningObjectives) ? m.learningObjectives : undefined) ??
    (typeof m.summary === 'string' && m.summary.trim() ? [String(m.summary)] : []);

  return {
    id: String(m.moduleId ?? m.id ?? '').trim() || undefined,
    order: typeof m.moduleOrder === 'number' ? m.moduleOrder : typeof m.order === 'number' ? m.order : moduleIndex + 1,
    title: String(m.title ?? '').trim(),
    duration_min:
      typeof m.duration_min === 'number'
        ? m.duration_min
        : typeof m.estimatedMinutes === 'number'
          ? m.estimatedMinutes
          : undefined,
    objectives: objectives as string[],
    lessons,
    labs: Array.isArray(m.labs) ? (m.labs as unknown[]) : [],
    quiz: moduleQuiz.length ? moduleQuiz : [],
  };
}

export function mapAcademyCourseModules(modules: unknown): AcademyModulePayload[] {
  if (!Array.isArray(modules)) return [];
  return modules.map((m, idx) => mapAcademyModule(m as Record<string, unknown>, idx));
}

/**
 * Expand one certification into one or more course segments (stable courseId each).
 * Academy packs use `courses[]`; legacy JSON uses top-level `modules[]` on the certification.
 */
export function expandCertificationCourses(
  cert: Record<string, unknown>,
  makeCourseId: (c: Record<string, unknown>) => string,
): CourseSegment[] {
  const courses = cert.courses as Record<string, unknown>[] | undefined;
  if (Array.isArray(courses) && courses.length > 0) {
    const out: CourseSegment[] = [];
    for (const co of courses) {
      const courseId = String(co.courseId ?? '').trim();
      if (!courseId) continue;
      const title = String(co.title ?? cert.title ?? '').trim();
      const modules = mapAcademyCourseModules(co.modules);
      const tr = String(co.track ?? '').toLowerCase();
      const track =
        tr === 'cloud' || tr === 'cyber' || tr === 'ai' ? (tr as 'cloud' | 'cyber' | 'ai') : undefined;
      out.push({
        courseId,
        title: title || courseId,
        description: typeof co.description === 'string' ? co.description : undefined,
        modules,
        track,
      });
    }
    return out;
  }

  const modules = Array.isArray(cert.modules) ? (cert.modules as AcademyModulePayload[]) : [];
  return [
    {
      courseId: makeCourseId(cert),
      title: String(cert.title ?? ''),
      description: typeof cert.description === 'string' ? cert.description : undefined,
      modules,
    },
  ];
}

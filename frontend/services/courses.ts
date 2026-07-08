import { api, API_PATHS } from '@/lib/api/client';

/** Download course completion certificate PDF. Returns a blob URL for download. */
export async function downloadCourseCompletionCertificate(courseId: string): Promise<void> {
  const res = await api.get(`/api/learner/courses/${encodeURIComponent(courseId)}/certificate/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `certificate-${courseId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** Course content shape returned by GET /api/courses/:courseId (learner view with levels) */
export interface CourseContentResponse {
  title: string;
  description: string;
  levels: CourseLevel[];
}

export interface CourseLesson {
  id: number;
  title: string;
  content: string;
  bullets: string[];
  examTips?: string[];
}

export interface CourseModule {
  id: number;
  title: string;
  icon?: string;
  lessons: CourseLesson[];
}

export interface CourseLab {
  id: number;
  title: string;
  moduleTitle: string;
  tasks: string[];
  /** Interactive lab slug when sourced from the platform `labs` table */
  slug?: string;
}

export interface CourseLevel {
  level: string;
  label: string;
  objective: string;
  modules: CourseModule[];
  labs: CourseLab[];
}


export async function getCourseWithContent(courseId: string, locale = 'en'): Promise<CourseContentResponse> {
  const { data } = await api.get<CourseContentResponse>(API_PATHS.courses(courseId), {
    params: { locale },
  });
  return data;
}

interface BackendCourseItem {
  id: string;
  title: string;
  provider: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  level: string;
  nextLesson: string;
  description?: string;
  status: string;
  color?: string;
  track?: 'cloud' | 'cyber' | 'ai' | null;
  certificationId?: number | null;
}

export interface EnrolledCourseItem {
  id: string | number;
  title: string;
  provider: string;
  instructor: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  level: string;
  nextLesson: string;
  description?: string;
  color?: string;
  status?: string;
  track?: 'cloud' | 'cyber' | 'ai' | null;
  certificationId?: number | null;
}

export interface LearnerCoursesResponse {
  enrolled: EnrolledCourseItem[];
  completed: EnrolledCourseItem[];
}

function mapCourse(item: BackendCourseItem): EnrolledCourseItem {
  return {
    ...item,
    instructor: item.provider,
    status: item.status,
  };
}

export async function getLearnerCourses(): Promise<LearnerCoursesResponse> {
  const { data } = await api.get<BackendCourseItem[]>(API_PATHS.learner('courses'));
  const items = Array.isArray(data) ? data : [];
  const mapped = items.map(mapCourse);
  const enrolled = mapped.filter((c) => c.status !== 'completed');
  const completed = mapped.filter((c) => c.status === 'completed');
  return { enrolled, completed };
}

export type LearnerCatalogQuery = {
  /** When true, returns the full catalog (same as legacy unscoped list). */
  fullCatalog?: boolean;
  /** Optional single-track override (cloud|cyber|ai). */
  track?: string;
};

/** Catalog for learner: scoped to profile by default; pass fullCatalog for everything. */
export async function getLearnerCatalogCourses(
  opts?: LearnerCatalogQuery,
): Promise<EnrolledCourseItem[]> {
  const params: Record<string, string> = {};
  if (opts?.fullCatalog) params.fullCatalog = 'true';
  if (opts?.track) params.track = opts.track;
  const { data } = await api.get<BackendCourseItem[]>(API_PATHS.learner('catalog/courses'), {
    params: Object.keys(params).length ? params : undefined,
  });
  const items = Array.isArray(data) ? data : [];
  return items.map(mapCourse);
}

/** Progress for one course returned by GET /api/courses/:courseId/progress */
export interface CourseProgressResponse {
  completedLessons: string[];
  completedLabs: string[];
  currentModule: number;
  currentLesson: number;
  overallProgress: number;
  status: string;
}

export interface CompleteLessonDto {
  moduleOrder: number;
  lessonOrder: number;
}

export async function getCourseProgress(
  courseId: string,
): Promise<CourseProgressResponse> {
  const { data } = await api.get<CourseProgressResponse>(
    `${API_PATHS.courses(courseId)}/progress`,
  );
  return data ?? {
    completedLessons: [],
    completedLabs: [],
    currentModule: 1,
    currentLesson: 1,
    overallProgress: 0,
    status: 'not_started',
  };
}

export async function completeLesson(
  courseId: string,
  dto: CompleteLessonDto,
): Promise<Record<string, unknown>> {
  const { data } = await api.post<Record<string, unknown>>(
    `${API_PATHS.courses(courseId)}/complete-lesson`,
    dto,
  );
  return data;
}

export async function completeLab(
  courseId: string,
  labId: number,
): Promise<Record<string, unknown>> {
  const { data } = await api.post<Record<string, unknown>>(
    `${API_PATHS.courses(courseId)}/complete-lab`,
    { labId },
  );
  return data;
}

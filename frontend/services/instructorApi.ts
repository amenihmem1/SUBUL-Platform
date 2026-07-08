const STUB_WARN = 'Instructor API not yet implemented';

export interface InstructorCourse {
  id: string;
  title: string;
  provider: string;
  enrolledCount: number;
  completedCount: number;
  averageProgress: number;
  level: string;
}

export interface InstructorStudent {
  id: number;
  fullName?: string;
  email: string;
  enrolledCourses: string[];
  completedCourses: string[];
  averageProgress: number;
  lastActivity?: string;
}

export interface InstructorAssessment {
  id: number;
  courseId: string;
  courseTitle: string;
  studentId: number;
  studentName: string;
  score: number;
  completedAt: string;
  status: 'pending' | 'reviewed' | 'passed' | 'failed';
}

export interface InstructorMessage {
  id: number;
  from: string;
  subject: string;
  preview: string;
  createdAt: string;
  isRead: boolean;
}

export interface InstructorDashboard {
  totalStudents: number;
  activeCourses: number;
  pendingAssessments: number;
  unreadMessages: number;
  recentActivity: Array<{
    id: number;
    type: 'enrollment' | 'completion' | 'assessment';
    description: string;
    timestamp: string;
  }>;
}

export interface PaginatedCoursesResponse {
  data: InstructorCourse[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedStudentsResponse {
  data: InstructorStudent[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedAssessmentsResponse {
  data: InstructorAssessment[];
  total: number;
  page: number;
  limit: number;
}

export async function getInstructorDashboard(): Promise<InstructorDashboard> {
  console.warn(STUB_WARN);
  return {
    totalStudents: 0,
    activeCourses: 0,
    pendingAssessments: 0,
    unreadMessages: 0,
    recentActivity: [],
  };
}

export async function getInstructorCourses(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedCoursesResponse> {
  console.warn(STUB_WARN);
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  return { data: [], total: 0, page, limit };
}

export async function getInstructorCourse(id: string): Promise<InstructorCourse> {
  console.warn(STUB_WARN);
  return {
    id,
    title: '',
    provider: '',
    enrolledCount: 0,
    completedCount: 0,
    averageProgress: 0,
    level: '',
  };
}

export async function getInstructorStudents(params?: {
  page?: number;
  limit?: number;
  search?: string;
  courseId?: string;
}): Promise<PaginatedStudentsResponse> {
  console.warn(STUB_WARN);
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  return { data: [], total: 0, page, limit };
}

export async function getInstructorStudent(id: number): Promise<InstructorStudent> {
  console.warn(STUB_WARN);
  return {
    id,
    fullName: '',
    email: '',
    enrolledCourses: [],
    completedCourses: [],
    averageProgress: 0,
  };
}

export async function getInstructorAssessments(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaginatedAssessmentsResponse> {
  console.warn(STUB_WARN);
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  return { data: [], total: 0, page, limit };
}

export async function updateAssessment(
  id: number,
  body: { score?: number; feedback?: string; status?: string }
): Promise<InstructorAssessment> {
  console.warn(STUB_WARN);
  return {
    id,
    courseId: '',
    courseTitle: '',
    studentId: 0,
    studentName: '',
    score: body.score ?? 0,
    completedAt: new Date().toISOString(),
    status: (body.status as InstructorAssessment['status']) ?? 'pending',
  };
}

export async function getInstructorMessages(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<{ data: InstructorMessage[]; total: number }> {
  console.warn(STUB_WARN);
  return { data: [], total: 0 };
}

export async function markMessageRead(id: number): Promise<void> {
  console.warn(STUB_WARN);
}

export async function getInstructorAnalytics(params?: {
  startDate?: string;
  endDate?: string;
  courseId?: string;
}): Promise<{
  enrollmentsByDay: Array<{ date: string; count: number }>;
  completionsByDay: Array<{ date: string; count: number }>;
  averageScores: Array<{ courseId: string; courseTitle: string; average: number }>;
  topStudents: Array<{ id: number; name: string; completedCourses: number }>;
}> {
  console.warn(STUB_WARN);
  return {
    enrollmentsByDay: [],
    completionsByDay: [],
    averageScores: [],
    topStudents: [],
  };
}

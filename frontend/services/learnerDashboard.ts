import { api, API_PATHS } from '@/lib/api/client';

export interface ActiveCourseDto {
  id: string;
  title: string;
  instructor: string;
  progress: number;
  next: string;
  duration: string;
  color: string;
}

export interface UpcomingDeadlineDto {
  title: string;
  course: string;
  due: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CertificateDto {
  id: number;
  title: string;
  date: string;
  level: string;
}

export interface LearnerDashboardStats {
  coursesCompleted: number;
  inProgress: number;
  totalStudyTime: string;
  certificatesCount: number;
}

export interface LearnerDashboardDto {
  activeCourses: ActiveCourseDto[];
  upcomingDeadlines: UpcomingDeadlineDto[];
  certificates: CertificateDto[];
  stats: LearnerDashboardStats;
}

export const getLearnerDashboard = (): Promise<LearnerDashboardDto> =>
  api.get<LearnerDashboardDto>(`${API_PATHS.learner('dashboard')}`).then((r) => r.data);

export const getLearnerCourses = (): Promise<any[]> =>
  api.get<any[]>(`${API_PATHS.learner('courses')}`).then((r) => r.data);

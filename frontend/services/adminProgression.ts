import { api, API_PATHS } from '@/lib/api/client';

export interface LearnerCourse {
  name: string;
  progress: number;
  score: number;
  status: 'completed' | 'in-progress' | 'not-started';
  lastAccess: string;
}

export interface LearnerProgression {
  id: number;
  name: string;
  email: string;
  avatar: string;
  courses: LearnerCourse[];
  globalProgress: number;
  averageScore: number;
  lastActivity: string;
  enrolledCourses: number;
}

export function getLearnerProgression(): Promise<LearnerProgression[]> {
  return api
    .get<LearnerProgression[]>(API_PATHS.admin('progression'))
    .then((r) => r.data);
}

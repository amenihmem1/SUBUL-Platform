export interface UserProfileResponse {
  id: number;
  email: string;
  fullName?: string;
  profilePicture?: string;
  isEmailVerified: boolean;
  role?: string;
  status: string;
  companyName?: string;
  companyId?: number;
  phone?: string;
  address?: string;
  bio?: string;
  auth0Sub?: string;
  lastLogin?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuthResponse {
  access_token: string;
  user: UserProfileResponse;
}

export interface GoalResponse {
  id: number;
  userId: number;
  title: string;
  description?: string;
  category: string;
  priority: string;
  successCriteria?: string;
  deadline?: Date | string;
  motivation?: string;
  visibility?: string;
  reward?: string;
  progress: number;
  status: string;
  milestones?: string;
  completedMilestones?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DailyGoalResponse {
  id: number;
  userId: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  date: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  energyLevel?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WeeklyGoalResponse {
  id: number;
  userId: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  successCriteria?: string;
  progress: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CompanyEmployeeResponse {
  id: number;
  companyId: number;
  name: string;
  email: string;
  position?: string;
  status: string;
}

export interface CompanyResponse {
  id: number;
  name: string;
  email: string;
  sector?: string;
  status: string;
  logo?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  employees?: CompanyEmployeeResponse[];
}

export interface CourseResponse {
  id: number;
  courseId: string;
  title: string;
  level?: string;
  description?: string;
  certificationId?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserCourseProgressResponse {
  id: number;
  userId: number;
  courseId: number;
  currentModule: number;
  currentLesson: number;
  completedModules: number[];
  completedLessons: string[];
  completedLabs: string[];
  overallProgress: number;
  moduleProgress: Record<string, number>;
  status: string;
  startedAt?: Date | string;
  completedAt?: Date | string;
  lastAccessedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LabResponse {
  id: number;
  slug: string;
  title: string;
  description: string;
  provider: string;
  difficulty: string;
  estimatedTime: string;
  moduleTitle: string;
  tasks: string[];
  metadata?: any;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LabProgressResponse {
  id: number;
  userId: number;
  labId: number;
  completedTasks: number[];
  isCompleted: boolean;
  startedAt?: Date | string;
  completedAt?: Date | string;
  notes?: any;
  timeSpent: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface JobResponse {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  description?: string;
  salaryRange?: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

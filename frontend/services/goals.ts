import { api, API_PATHS } from '@/lib/api/client';

export interface Goal {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: 'certification' | 'course' | 'skill' | 'career';
  priority: 'high' | 'medium' | 'low';
  successCriteria: string;
  deadline: string;
  motivation: string;
  progress: number;
  milestones: string[];
  visibility: 'private' | 'public';
  reward: string;
  status: 'on-track' | 'behind' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedMilestones: string[];
}

export interface DailyGoal {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
  points: number;
  goalDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface WeeklyGoal {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: 'certification' | 'course' | 'skill' | 'career';
  progress: number;
  target: number;
  weekNumber: number;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalDto {
  title: string;
  description: string;
  category: 'certification' | 'course' | 'skill' | 'career';
  priority: 'high' | 'medium' | 'low';
  successCriteria: string;
  deadline: string;
  motivation: string;
  milestones: string[];
  visibility?: 'private' | 'public';
  reward?: string;
}

export interface UpdateGoalDto {
  title?: string;
  description?: string;
  category?: 'certification' | 'course' | 'skill' | 'career';
  priority?: 'high' | 'medium' | 'low';
  successCriteria?: string;
  deadline?: string;
  motivation?: string;
  milestones?: string[];
  visibility?: 'private' | 'public';
  reward?: string;
  progress?: number;
  status?: 'on-track' | 'behind' | 'completed';
}

export interface CreateDailyGoalDto {
  title: string;
  points?: number;
  completed?: boolean;
  goalDate?: string;
}

export interface UpdateDailyGoalDto {
  title?: string;
  points?: number;
  completed?: boolean;
}

export interface CreateWeeklyGoalDto {
  title: string;
  description: string;
  category: 'certification' | 'course' | 'skill' | 'career';
  progress?: number;
  target?: number;
  weekNumber?: number;
  year?: number;
}

export interface UpdateWeeklyGoalDto {
  title?: string;
  description?: string;
  category?: 'certification' | 'course' | 'skill' | 'career';
  progress?: number;
  target?: number;
}

export interface GoalsParams {
  search?: string;
  category?: string;
  priority?: string;
  status?: string;
}

const base = () => API_PATHS.goals();

export const getGoals = (params?: GoalsParams) =>
  api.get<Goal[]>(base(), { params }).then((r) => r.data);

export const getGoal = (id: number) => {
  if (!id || isNaN(id)) throw new Error('Invalid goal ID');
  return api.get<Goal>(`${base()}/${id}`).then((r) => r.data);
};

export const createGoal = (data: CreateGoalDto) => {
  const payload = { ...data };
  if (!payload.deadline) delete (payload as Record<string, unknown>).deadline;
  return api.post<Goal>(base(), payload).then((r) => r.data);
};

export const updateGoal = (id: number, data: UpdateGoalDto) => {
  if (!id || isNaN(id)) throw new Error('Invalid goal ID');
  const payload = { ...data };
  if (!payload.deadline) delete (payload as Record<string, unknown>).deadline;
  return api.patch<Goal>(`${base()}/${id}`, payload).then((r) => r.data);
};

export const deleteGoal = (id: number) => {
  if (!id || isNaN(id)) throw new Error('Invalid goal ID');
  return api.delete<void>(`${base()}/${id}`).then((r) => r.data);
};

export const getGoalStats = () =>
  api.get<{ total: number; completed: number; onTrack: number; behind: number }>(`${base()}/stats`).then((r) => r.data);

export const addMilestone = (id: number, milestone: string) => {
  if (!id || isNaN(id)) throw new Error('Invalid goal ID');
  return api.post<Goal>(`${base()}/${id}/milestones`, { milestone }).then((r) => r.data);
};

export const removeMilestone = (id: number, milestone: string) => {
  if (!id || isNaN(id)) throw new Error('Invalid goal ID');
  return api.delete<void>(`${base()}/${id}/milestones/${encodeURIComponent(milestone)}`).then((r) => r.data);
};

export const getDailyGoals = () =>
  api.get<DailyGoal[]>(`${base()}/daily`).then((r) => r.data);

export const getTodayDailyGoals = () =>
  api.get<DailyGoal[]>(`${base()}/daily/today`).then((r) => r.data);

export const getDailyGoalsByDate = (date: string) =>
  api.get<DailyGoal[]>(`${base()}/daily/by-date/${date}`).then((r) => r.data);

export const getDailyGoal = (id: number) => {
  if (!id || isNaN(id)) throw new Error('Invalid daily goal ID');
  return api.get<DailyGoal>(`${base()}/daily/by-id/${id}`).then((r) => r.data);
};

export const createDailyGoal = (data: CreateDailyGoalDto) =>
  api.post<DailyGoal>(`${base()}/daily`, data).then((r) => r.data);

export const updateDailyGoal = (id: number, data: UpdateDailyGoalDto) => {
  if (!id || isNaN(id)) throw new Error('Invalid daily goal ID');
  return api.patch<DailyGoal>(`${base()}/daily/${id}`, data).then((r) => r.data);
};

export const deleteDailyGoal = (id: number) => {
  if (!id || isNaN(id)) throw new Error('Invalid daily goal ID');
  return api.delete<void>(`${base()}/daily/${id}`).then((r) => r.data);
};

export const toggleDailyGoalComplete = (id: number) => {
  if (!id || isNaN(id)) throw new Error('Invalid daily goal ID');
  return api.patch<DailyGoal>(`${base()}/daily/${id}/toggle`).then((r) => r.data);
};

export const getTodayStats = () =>
  api.get<{ total: number; completed: number; points: number }>(`${base()}/daily/stats`).then((r) => r.data);

export const getWeeklyStats = () =>
  api.get<any>(`${base()}/daily/weekly-stats`).then((r) => r.data);

export const getWeeklyGoals = () =>
  api.get<WeeklyGoal[]>(`${base()}/weekly`).then((r) => r.data);

export const getCurrentWeeklyGoals = () =>
  api.get<WeeklyGoal[]>(`${base()}/weekly/current`).then((r) => r.data);

export const getWeeklyGoalsByWeek = (weekNumber: number, year: number) =>
  api.get<WeeklyGoal[]>(`${base()}/weekly/${weekNumber}/${year}`).then((r) => r.data);

export const getWeeklyGoal = (id: number) => {
  if (!id || isNaN(id)) throw new Error('Invalid weekly goal ID');
  return api.get<WeeklyGoal>(`${base()}/weekly/${id}`).then((r) => r.data);
};

export const createWeeklyGoal = (data: CreateWeeklyGoalDto) =>
  api.post<WeeklyGoal>(`${base()}/weekly`, data).then((r) => r.data);

export const updateWeeklyGoal = (id: number, data: UpdateWeeklyGoalDto) => {
  if (!id || isNaN(id)) throw new Error('Invalid weekly goal ID');
  return api.patch<WeeklyGoal>(`${base()}/weekly/${id}`, data).then((r) => r.data);
};

export const deleteWeeklyGoal = (id: number) => {
  if (!id || isNaN(id)) throw new Error('Invalid weekly goal ID');
  return api.delete<void>(`${base()}/weekly/${id}`).then((r) => r.data);
};

export const updateWeeklyGoalProgress = (id: number, delta: number) => {
  if (!id || isNaN(id)) throw new Error('Invalid weekly goal ID');
  return api.patch<WeeklyGoal>(`${base()}/weekly/${id}/progress`, { delta }).then((r) => r.data);
};

export const getCurrentWeekStats = () =>
  api.get<any>(`${base()}/weekly/current/stats`).then((r) => r.data);

/** Backwards-compatible object for consumers expecting goalsService */
export const goalsService = {
  findAll: getGoals,
  findOne: getGoal,
  create: createGoal,
  update: updateGoal,
  remove: deleteGoal,
  getStats: getGoalStats,
  addMilestone,
  removeMilestone,
  findAllDaily: getDailyGoals,
  findTodayDaily: getTodayDailyGoals,
  findDailyByDate: getDailyGoalsByDate,
  findOneDaily: getDailyGoal,
  createDaily: createDailyGoal,
  updateDaily: updateDailyGoal,
  removeDaily: deleteDailyGoal,
  toggleDailyComplete: toggleDailyGoalComplete,
  getTodayStats,
  getWeeklyStats,
  findAllWeekly: getWeeklyGoals,
  findCurrentWeekly: getCurrentWeeklyGoals,
  findWeeklyByWeek: getWeeklyGoalsByWeek,
  findOneWeekly: getWeeklyGoal,
  createWeekly: createWeeklyGoal,
  updateWeekly: updateWeeklyGoal,
  removeWeekly: deleteWeeklyGoal,
  updateWeeklyProgress: updateWeeklyGoalProgress,
  getCurrentWeekStats,
};

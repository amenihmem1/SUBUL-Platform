import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalStats,
  getTodayDailyGoals,
  getCurrentWeeklyGoals,
  getTodayStats,
  getCurrentWeekStats,
  createDailyGoal,
  updateDailyGoal,
  deleteDailyGoal,
  toggleDailyGoalComplete,
  createWeeklyGoal,
  updateWeeklyGoal,
  deleteWeeklyGoal,
  updateWeeklyGoalProgress,
  type CreateGoalDto,
  type UpdateGoalDto,
  type CreateDailyGoalDto,
  type UpdateDailyGoalDto,
  type CreateWeeklyGoalDto,
  type UpdateWeeklyGoalDto,
  type GoalsParams,
} from '@/services/goals';

export const goalKeys = {
  all: ['goals'] as const,
  lists: () => [...goalKeys.all, 'list'] as const,
  list: (params?: GoalsParams) => [...goalKeys.lists(), params] as const,
  details: () => [...goalKeys.all, 'detail'] as const,
  detail: (id: number) => [...goalKeys.details(), id] as const,
  stats: () => [...goalKeys.all, 'stats'] as const,
  daily: () => [...goalKeys.all, 'daily'] as const,
  dailyToday: () => [...goalKeys.daily(), 'today'] as const,
  dailyStats: () => [...goalKeys.daily(), 'stats'] as const,
  weekly: () => [...goalKeys.all, 'weekly'] as const,
  weeklyCurrent: () => [...goalKeys.weekly(), 'current'] as const,
  weeklyStats: () => [...goalKeys.weekly(), 'stats'] as const,
};

export function useGoals(params?: GoalsParams) {
  return useQuery({
    queryKey: goalKeys.list(params),
    queryFn: () => getGoals(params),
  });
}

export function useGoal(id: number | null, enabled = true) {
  return useQuery({
    queryKey: goalKeys.detail(id!),
    queryFn: () => getGoal(id!),
    enabled: enabled && !!id && !isNaN(id),
  });
}

export function useGoalStats() {
  return useQuery({
    queryKey: goalKeys.stats(),
    queryFn: getGoalStats,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalDto) => createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGoalDto }) =>
      updateGoal(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useTodayDailyGoals() {
  return useQuery({
    queryKey: goalKeys.dailyToday(),
    queryFn: getTodayDailyGoals,
  });
}

export function useDailyStats() {
  return useQuery({
    queryKey: goalKeys.dailyStats(),
    queryFn: getTodayStats,
  });
}

export function useCurrentWeeklyGoals() {
  return useQuery({
    queryKey: goalKeys.weeklyCurrent(),
    queryFn: getCurrentWeeklyGoals,
  });
}

export function useWeeklyStats() {
  return useQuery({
    queryKey: goalKeys.weeklyStats(),
    queryFn: getCurrentWeekStats,
  });
}

export function useCreateDailyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDailyGoalDto) => createDailyGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.daily() });
    },
  });
}

export function useUpdateDailyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDailyGoalDto }) =>
      updateDailyGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.daily() });
    },
  });
}

export function useDeleteDailyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDailyGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.daily() });
    },
  });
}

export function useToggleDailyGoalComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toggleDailyGoalComplete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.daily() });
    },
  });
}

export function useCreateWeeklyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWeeklyGoalDto) => createWeeklyGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.weekly() });
    },
  });
}

export function useUpdateWeeklyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWeeklyGoalDto }) =>
      updateWeeklyGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.weekly() });
    },
  });
}

export function useDeleteWeeklyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteWeeklyGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.weekly() });
    },
  });
}

export function useUpdateWeeklyGoalProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta }: { id: number; delta: number }) =>
      updateWeeklyGoalProgress(id, delta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.weekly() });
    },
  });
}

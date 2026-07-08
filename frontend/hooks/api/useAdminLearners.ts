import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminLearnersService,
  AssignContentPayload,
  BulkAssignPayload,
  ListLearnersParams,
} from '@/services/adminLearners';

export const adminLearnerKeys = {
  all: ['admin', 'learners'] as const,
  list: (params?: ListLearnersParams) => [...adminLearnerKeys.all, 'list', params ?? {}] as const,
  detail: (userId: number) => [...adminLearnerKeys.all, 'detail', userId] as const,
  assignments: (userId: number) => [...adminLearnerKeys.all, 'assignments', userId] as const,
};

export function useAdminLearners(params?: ListLearnersParams) {
  return useQuery({
    queryKey: adminLearnerKeys.list(params),
    queryFn: () => adminLearnersService.listLearners(params),
  });
}

export function useAdminLearner(userId: number) {
  return useQuery({
    queryKey: adminLearnerKeys.detail(userId),
    queryFn: () => adminLearnersService.getLearner(userId),
    enabled: Number.isFinite(userId) && userId > 0,
  });
}

export function useAssignContent(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignContentPayload) => adminLearnersService.assignContent(userId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminLearnerKeys.detail(userId) });
      qc.invalidateQueries({ queryKey: adminLearnerKeys.assignments(userId) });
      qc.invalidateQueries({ queryKey: adminLearnerKeys.list() });
      qc.invalidateQueries({ queryKey: ['learner', 'content-access'] });
    },
  });
}

export function useRemoveAssignment(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) => adminLearnersService.removeAssignment(userId, assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminLearnerKeys.detail(userId) });
      qc.invalidateQueries({ queryKey: adminLearnerKeys.assignments(userId) });
      qc.invalidateQueries({ queryKey: adminLearnerKeys.list() });
      qc.invalidateQueries({ queryKey: ['learner', 'content-access'] });
    },
  });
}

export function useBulkAssignContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkAssignPayload) => adminLearnersService.bulkAssign(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminLearnerKeys.all });
      qc.invalidateQueries({ queryKey: ['learner', 'content-access'] });
    },
  });
}

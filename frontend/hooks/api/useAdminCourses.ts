import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminCourses,
  getAdminCourse,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
  importCoursesJson,
  type CreateCoursePayload,
} from '@/services/admin-courses';

export const adminCourseKeys = {
  all: ['admin', 'courses'] as const,
  list: (certificationId?: number, page?: number, limit?: number) => 
    [...adminCourseKeys.all, 'list', { certificationId, page, limit }] as const,
  detail: (id: number | string) => [...adminCourseKeys.all, 'detail', id] as const,
};

export function useAdminCourses(certificationId?: number, page?: number, limit?: number) {
  return useQuery({
    queryKey: adminCourseKeys.list(certificationId, page, limit),
    queryFn: () => getAdminCourses(certificationId, { page, limit }),
  });
}

export function useAdminCourse(id: number | string | null, enabled = true) {
  return useQuery({
    queryKey: adminCourseKeys.detail(id!),
    queryFn: () => getAdminCourse(id!),
    enabled: enabled && (id != null && id !== ''),
  });
}

export function useCreateAdminCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCoursePayload) => createAdminCourse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCourseKeys.all });
    },
  });
}

export function useUpdateAdminCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Partial<CreateCoursePayload> }) =>
      updateAdminCourse(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminCourseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: adminCourseKeys.all });
    },
  });
}

export function useDeleteAdminCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteAdminCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCourseKeys.all });
    },
  });
}

export function useImportCoursesJson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, dryRun }: { payload: Record<string, unknown>; dryRun?: boolean }) =>
      importCoursesJson(payload, dryRun ?? true),
    onSuccess: (_, vars) => {
      if (!vars.dryRun) {
        queryClient.invalidateQueries({ queryKey: adminCourseKeys.all });
      }
    },
  });
}

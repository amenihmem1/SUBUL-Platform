import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLearnerCourses,
  getLearnerCatalogCourses,
  getCourseWithContent,
  getCourseProgress,
  completeLesson as completeLessonApi,
  completeLab as completeLabApi,
  type CompleteLessonDto,
} from '@/services/courses';

export const courseKeys = {
  all: ['courses'] as const,
  learner: () => [...courseKeys.all, 'learner'] as const,
  catalog: (scope: 'scoped' | 'all') => [...courseKeys.all, 'catalog', scope] as const,
  detail: (courseId: string, locale = 'en') => [...courseKeys.all, 'detail', courseId, locale] as const,
  progress: (courseId: string) => [...courseKeys.all, 'progress', courseId] as const,
};

export function useLearnerCourses() {
  return useQuery({
    queryKey: courseKeys.learner(),
    queryFn: getLearnerCourses,
  });
}

/** Pass fullCatalog=true for the full DB catalog; false (default) uses learner profile scope on the API. */
export function useLearnerCatalogCourses(fullCatalog = false) {
  return useQuery({
    queryKey: courseKeys.catalog(fullCatalog ? 'all' : 'scoped'),
    queryFn: () => getLearnerCatalogCourses({ fullCatalog }),
  });
}

export function useCourse(courseId: string | null, locale = 'en', enabled = true) {
  return useQuery({
    queryKey: courseKeys.detail(courseId ?? '', locale),
    queryFn: () => getCourseWithContent(courseId!, locale),
    enabled: enabled && !!courseId,
  });
}

export function useCourseProgress(courseId: string | null, enabled = true) {
  return useQuery({
    queryKey: courseKeys.progress(courseId ?? ''),
    queryFn: () => getCourseProgress(courseId!),
    enabled: enabled && !!courseId,
  });
}

export function useCompleteLesson(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CompleteLessonDto) => completeLessonApi(courseId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.learner() });
      queryClient.invalidateQueries({ queryKey: courseKeys.progress(courseId) });
    },
  });
}

export function useCompleteLab(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labId: number) => completeLabApi(courseId, labId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.learner() });
      queryClient.invalidateQueries({ queryKey: courseKeys.progress(courseId) });
    },
  });
}

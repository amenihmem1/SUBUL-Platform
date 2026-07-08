import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getContentIndexerStatus,
  runContentIndexerSync,
  getCoursesIndexStatus,
  getLabsIndexStatus,
  getCertificationsIndexStatus,
  reindexCourse,
  reindexLab,
  reindexCertification,
  testRetrievalCourse,
  testRetrievalLab,
  testRetrievalCertification,
} from '@/services/content-indexer-admin';

export const adminContentIndexerKeys = {
  all: ['admin', 'content-indexer'] as const,
  status: () => [...adminContentIndexerKeys.all, 'status'] as const,
  courses: () => [...adminContentIndexerKeys.all, 'courses'] as const,
  labs: () => [...adminContentIndexerKeys.all, 'labs'] as const,
  certifications: () => [...adminContentIndexerKeys.all, 'certifications'] as const,
};

export function useAdminContentIndexerStatus() {
  return useQuery({
    queryKey: adminContentIndexerKeys.status(),
    queryFn: getContentIndexerStatus,
    refetchInterval: 15000,
  });
}

export function useRunAdminContentIndexerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (force?: boolean) => runContentIndexerSync(Boolean(force)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminContentIndexerKeys.all });
    },
  });
}

export function useAdminCoursesIndexStatus() {
  return useQuery({
    queryKey: adminContentIndexerKeys.courses(),
    queryFn: getCoursesIndexStatus,
    refetchInterval: 30000,
  });
}

export function useAdminLabsIndexStatus() {
  return useQuery({
    queryKey: adminContentIndexerKeys.labs(),
    queryFn: getLabsIndexStatus,
    refetchInterval: 30000,
  });
}

export function useAdminCertificationsIndexStatus() {
  return useQuery({
    queryKey: adminContentIndexerKeys.certifications(),
    queryFn: getCertificationsIndexStatus,
    refetchInterval: 30000,
  });
}

export function useReindexCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => reindexCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminContentIndexerKeys.all });
    },
  });
}

export function useReindexLab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => reindexLab(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminContentIndexerKeys.all });
    },
  });
}

export function useReindexCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reindexCertification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminContentIndexerKeys.all });
    },
  });
}

export function useTestRetrievalCourse() {
  return useMutation({
    mutationFn: ({ courseId, query }: { courseId: string; query?: string }) =>
      testRetrievalCourse(courseId, query),
  });
}

export function useTestRetrievalLab() {
  return useMutation({
    mutationFn: ({ slug, query }: { slug: string; query?: string }) =>
      testRetrievalLab(slug, query),
  });
}

export function useTestRetrievalCertification() {
  return useMutation({
    mutationFn: ({ id, query }: { id: number; query?: string }) =>
      testRetrievalCertification(id, query),
  });
}

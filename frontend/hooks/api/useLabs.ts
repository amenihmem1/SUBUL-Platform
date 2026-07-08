import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLabs,
  getLearnerLabs,
  getLabBySlug,
  getMyLabsProgress,
  getLabProgress,
  updateLabProgress,
  startLab,
  getLabStats,
  type LabDto,
  type LabProgressDto,
  type LabStatDto,
} from '@/services/labs';

export const labKeys = {
  all: ['labs'] as const,
  lists: (track?: string) => [...labKeys.all, 'list', track ?? 'all'] as const,
  learner: (fullCatalog?: boolean) =>
    [...labKeys.all, 'learner', fullCatalog ? 'all' : 'scoped'] as const,
  detail: (slug: string, locale?: string) => [...labKeys.all, 'detail', slug, locale ?? 'en'] as const,
  myProgress: () => [...labKeys.all, 'my-progress'] as const,
  progress: (slug: string) => [...labKeys.all, 'progress', slug] as const,
  stats: () => [...labKeys.all, 'stats'] as const,
};

export function useLabs(track?: string) {
  return useQuery({
    queryKey: labKeys.lists(track),
    queryFn: () => getLabs(track),
  });
}

/** Profile-scoped labs from GET /api/learner/labs. Pass fullCatalog=true for all published labs. */
export function useLearnerLabs(fullCatalog = false) {
  return useQuery({
    queryKey: labKeys.learner(fullCatalog),
    queryFn: () => getLearnerLabs({ fullCatalog }),
  });
}

export function useLab(slug: string | null, locale?: string, enabled = true) {
  return useQuery({
    queryKey: labKeys.detail(slug!, locale),
    queryFn: () => getLabBySlug(slug!, locale),
    enabled: enabled && !!slug,
  });
}

export function useMyLabsProgress() {
  return useQuery({
    queryKey: labKeys.myProgress(),
    queryFn: getMyLabsProgress,
    retry: false,
  });
}

export function useLabProgress(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: labKeys.progress(slug!),
    queryFn: () => getLabProgress(slug!),
    enabled: enabled && !!slug,
    retry: false,
  });
}

export function useUpdateLabProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      data,
    }: {
      slug: string;
      data: {
        completedTasks: number[];
        timeSpent: number;
        isCompleted?: boolean;
        notes?: LabProgressDto['notes'];
      };
    }) => updateLabProgress(slug, data),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: labKeys.progress(slug) });
      queryClient.invalidateQueries({ queryKey: labKeys.myProgress() });
    },
  });
}

export function useStartLab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => startLab(slug),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: labKeys.progress(slug) });
      queryClient.invalidateQueries({ queryKey: labKeys.myProgress() });
    },
  });
}

export function useLabStats() {
  return useQuery({
    queryKey: labKeys.stats(),
    queryFn: getLabStats,
  });
}

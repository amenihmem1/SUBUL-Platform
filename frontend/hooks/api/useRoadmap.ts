import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRoadmap,
  refreshRoadmap,
  updateModuleProgress,
  getRoadmapAnalytics,
  getRecommendations,
  getCertificationRecommendations,
  getLevelQuestions,
  getRoadmapConfig,
  type LevelQuestionsRequest,
  type CertificationRecommendations,
} from '@/services/roadmap';

export const roadmapKeys = {
  all: ['roadmap'] as const,
  detail: () => [...roadmapKeys.all, 'detail'] as const,
  analytics: () => [...roadmapKeys.all, 'analytics'] as const,
  recommendations: () => [...roadmapKeys.all, 'recommendations'] as const,
  certificationRecommendations: () => [...roadmapKeys.all, 'certification-recommendations'] as const,
  config: () => [...roadmapKeys.all, 'config'] as const,
};

export function useRoadmap() {
  return useQuery({
    queryKey: roadmapKeys.detail(),
    queryFn: getRoadmap,
  });
}

export function useRefreshRoadmap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshRoadmap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roadmapKeys.all });
    },
  });
}

export function useUpdateModuleProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      moduleId,
      progress,
      status,
    }: { moduleId: string; progress: number; status: string }) =>
      updateModuleProgress(moduleId, progress, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roadmapKeys.all });
    },
  });
}

export function useRoadmapAnalytics() {
  return useQuery({
    queryKey: roadmapKeys.analytics(),
    queryFn: getRoadmapAnalytics,
  });
}

export function useRoadmapRecommendations() {
  return useQuery({
    queryKey: roadmapKeys.recommendations(),
    queryFn: getRecommendations,
  });
}

export function useCertificationRecommendations() {
  return useQuery({
    queryKey: roadmapKeys.certificationRecommendations(),
    queryFn: async () => {
      console.log('[Frontend] Calling getCertificationRecommendations...');
      try {
        const result = await getCertificationRecommendations();
        console.log('[Frontend] Certification recommendations result:', result);
        if (result) {
          console.log('[Frontend] CurrentFocus certifications:', result.currentFocus);
          console.log('[Frontend] SuggestedTopics certifications:', result.suggestedTopics);
        }
        return result;
      } catch (error) {
        console.error('[Frontend] Error fetching certification recommendations:', error);
        throw error;
      }
    },
  });
}

export function useRoadmapLevelQuestions() {
  return useMutation({
    mutationFn: (body: LevelQuestionsRequest) => getLevelQuestions(body),
  });
}

export function useRoadmapConfig() {
  return useQuery({
    queryKey: roadmapKeys.config(),
    queryFn: getRoadmapConfig,
  });
}

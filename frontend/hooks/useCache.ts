/**
 * @deprecated Use React Query hooks from hooks/api/ instead.
 * This custom cache duplicates TanStack Query functionality.
 */
import { useState, useEffect, useCallback } from 'react';
import ENV from '@/config/environment';
import { useLatestAssessment as useLatestAssessmentFromQuizResults } from '@/hooks/api/useQuizResults';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttl: number = ENV.CACHE_TTL * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new SimpleCache();

// Generic hook for data fetching with caching
export const useCachedData = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchInterval?: number;
  }
) => {
  const [data, setData] = useState<T | null>(() => cache.get<T>(key));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const {
    ttl = ENV.CACHE_TTL * 1000,
    enabled = true,
    refetchOnWindowFocus = false,
    refetchInterval
  } = options || {};

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;
    
    // Check cache first (unless forced)
    if (!force) {
      const cachedData = cache.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        return;
      }
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetcher();
      cache.set(key, result, ttl);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttl, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;
    
    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData, refetchOnWindowFocus]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval) return;
    
    const interval = setInterval(() => fetchData(), refetchInterval);
    return () => clearInterval(interval);
  }, [fetchData, refetchInterval]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  const mutate = useCallback((newData: T) => {
    cache.set(key, newData, ttl);
    setData(newData);
  }, [key, ttl]);

  return {
    data,
    isLoading,
    error,
    refetch,
    mutate
  };
};

// Specific hooks for roadmap data
export const useRoadmap = () => {
  return useCachedData('roadmap', async () => {
    const { roadmapService } = await import('@/services/roadmap');
    return roadmapService.getRoadmap();
  }, {
    ttl: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true
  });
};

export const useRoadmapAnalytics = () => {
  return useCachedData('roadmap_analytics', async () => {
    const { roadmapService } = await import('@/services/roadmap');
    return roadmapService.getRoadmapAnalytics();
  }, {
    ttl: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true
  });
};

/**
 * @deprecated Use useLatestAssessment from '@/hooks/api/useQuizResults' instead.
 * Re-exported for backwards compatibility; uses the same React Query source of truth.
 */
export const useLatestAssessment = () => useLatestAssessmentFromQuizResults();

export const usePersonalizedRoadmap = () => {
  return useCachedData('personalized_roadmap', async () => {
    const { quizResultsService } = await import('@/services/quiz-results');
    return quizResultsService.getPersonalizedRoadmap();
  }, {
    ttl: 10 * 60 * 1000, // 10 minutes
  });
};

// Goals hooks
export const useGoals = () => {
  return useCachedData('goals', async () => {
    const { goalsService } = await import('@/services/goals');
    return goalsService.findAll();
  }, {
    ttl: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true
  });
};

export const useGoalStats = () => {
  return useCachedData('goal_stats', async () => {
    const { goalsService } = await import('@/services/goals');
    return goalsService.getStats();
  }, {
    ttl: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000 // 30 seconds
  });
};

export const useDailyGoals = () => {
  return useCachedData('daily_goals', async () => {
    const { goalsService } = await import('@/services/goals');
    return goalsService.findTodayDaily();
  }, {
    ttl: 30 * 1000, // 30 seconds
    refetchInterval: 15 * 1000 // 15 seconds
  });
};

export const useWeeklyGoals = () => {
  return useCachedData('weekly_goals', async () => {
    const { goalsService } = await import('@/services/goals');
    return goalsService.findCurrentWeekly();
  }, {
    ttl: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000 // 30 seconds
  });
};

// Certifications hook
export const useCertifications = (params?: {
  search?: string;
  status?: 'Active' | 'Draft' | 'Archived';
  provider?: string;
}) => {
  const key = `certifications_${JSON.stringify(params || {})}`;
  
  return useCachedData(key, async () => {
    const { certificationsService } = await import('@/services/certifications');
    return certificationsService.findAll(params);
  }, {
    ttl: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutation utilities
export const useMutation = <T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options?: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: Error, variables: V) => void;
    invalidateKeys?: string[];
  }
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const mutate = useCallback(async (variables: V) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await mutationFn(variables);
      setData(result);
      
      // Invalidate cache keys
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach(key => cache.invalidate(key));
      }
      
      options?.onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options?.onError?.(error, variables);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, options]);

  return {
    mutate,
    isLoading,
    error,
    data,
    reset: () => {
      setData(null);
      setError(null);
      setIsLoading(false);
    }
  };
};

// Utility functions
export const invalidateCache = (key: string) => {
  cache.invalidate(key);
};

export const clearCache = () => {
  cache.clear();
};

export const invalidateRoadmapCache = () => {
  cache.invalidatePattern('roadmap');
  cache.invalidatePattern('assessment');
  cache.invalidatePattern('goal');
};

export default {
  cache,
  useCachedData,
  useRoadmap,
  useRoadmapAnalytics,
  useLatestAssessment,
  usePersonalizedRoadmap,
  useGoals,
  useGoalStats,
  useDailyGoals,
  useWeeklyGoals,
  useCertifications,
  useMutation,
  invalidateCache,
  clearCache,
  invalidateRoadmapCache
};

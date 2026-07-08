import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getToken } from '@/lib/auth/token';

export const jobSearchKeys = {
  all: ['job-search'] as const,
  profile: () => [...jobSearchKeys.all, 'profile'] as const,
  jobs: () => [...jobSearchKeys.all, 'jobs'] as const,
  analyzeCv: () => [...jobSearchKeys.all, 'analyze-cv'] as const,
};

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useJobSearchProfile() {
  return useQuery({
    queryKey: jobSearchKeys.profile(),
    queryFn: async () => {
      const response = await fetch('/api/job-search/profile', {
        headers: {
          ...authHeader(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get job search profile');
      }

      return response.json();
    },
  });
}

export function useUpdateJobSearchProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileData: Record<string, unknown>) => {
      const response = await fetch('/api/job-search/profile', {
        method: 'POST',
        body: JSON.stringify(profileData),
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update job search profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobSearchKeys.profile() });
    },
  });
}

export function useSearchJobs() {
  return useMutation({
    mutationFn: async (searchParams: Record<string, string>) => {
      const queryString = new URLSearchParams(searchParams).toString();
      const response = await fetch(`/api/job-search/jobs?${queryString}`, {
        headers: {
          ...authHeader(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to search jobs');
      }

      return response.json();
    },
  });
}

export function useAnalyzeCv() {
  return useMutation({
    mutationFn: async (cvData: Record<string, unknown>) => {
      const response = await fetch('/api/job-search/analyze-cv', {
        method: 'POST',
        body: JSON.stringify(cvData),
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to analyze CV');
      }

      return response.json();
    },
  });
}
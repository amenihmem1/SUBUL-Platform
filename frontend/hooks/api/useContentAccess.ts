import { useQuery } from '@tanstack/react-query';
import { api, API_PATHS } from '@/lib/api/client';

export interface ContentAccessInfo {
  isFree: boolean;
  accessibleCourseIds: string[];
  accessibleLabSlugs: string[];
  certificationsLocked: boolean;
}

async function getContentAccess(): Promise<ContentAccessInfo> {
  const { data } = await api.get<ContentAccessInfo>(API_PATHS.learner('content-access'));
  return data;
}

export function useContentAccess() {
  return useQuery({
    queryKey: ['learner', 'content-access'],
    queryFn: getContentAccess,
    staleTime: 30_000,
  });
}

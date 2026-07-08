import { useQuery } from '@tanstack/react-query';
import { getLearnerDashboard } from '@/services/learnerDashboard';

export const learnerDashboardKeys = {
  all: ['learnerDashboard'] as const,
};

export function useLearnerDashboard() {
  return useQuery({
    queryKey: learnerDashboardKeys.all,
    queryFn: getLearnerDashboard,
  });
}

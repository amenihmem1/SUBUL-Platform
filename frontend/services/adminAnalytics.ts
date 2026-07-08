import { api, API_PATHS } from '@/lib/api/client';

export interface AnalyticsOverview {
  activeUsers: number;
  coursesCompleted: number;
  revenue: string;
  completionRate: number;
  totalUsers: number;
  newSignups?: number;
  topCourses?: { name: string; students: number; completion: number; revenue: string }[];
  revenueData?: { month: string; value: number }[];
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const { data } = await api.get<AnalyticsOverview>(API_PATHS.admin('analytics/overview'));
  return data;
}

import { api } from '@/lib/api/client';

export type LearnerContentType = 'course' | 'lab' | 'certification';

export interface LearnerProfile {
  id: number;
  fullName: string;
  email: string;
  track: string | null;
  subscriptionStatus: string;
  effectivePlanSlug: string;
  enrolledCoursesCount: number;
  completedCoursesCount: number;
  lastActiveAt: string | null;
}

export interface ContentAssignment {
  id: number;
  userId: number;
  contentType: LearnerContentType;
  contentRef: string;
  grantedBy: number | null;
  grantedAt: string;
  expiresAt: string | null;
  note: string | null;
}

export interface LearnerDetail {
  id: number;
  fullName: string;
  email: string;
  track: string | null;
  lastActiveAt: string | null;
  subscription: {
    kind: string;
    effectivePlanSlug: string;
    hasAccess: boolean;
  };
  stats: {
    enrolledCourses: number;
    completedCourses: number;
    labsCompleted: number;
    certificates: number;
  };
  assignments: ContentAssignment[];
}

export interface ListLearnersParams {
  page?: number;
  limit?: number;
  search?: string;
  track?: string;
  plan?: string;
}

export interface ListLearnersResponse {
  data: LearnerProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssignContentPayload {
  contentType: LearnerContentType;
  contentRef: string;
  expiresAt?: string | null;
  note?: string | null;
}

export interface BulkAssignPayload extends AssignContentPayload {
  userIds: number[];
}

export const adminLearnersService = {
  async listLearners(params?: ListLearnersParams): Promise<ListLearnersResponse> {
    const { data } = await api.get<ListLearnersResponse>('/api/admin/learners', { params });
    return data;
  },

  async getLearner(userId: number): Promise<LearnerDetail> {
    const { data } = await api.get<LearnerDetail>(`/api/admin/learners/${userId}`);
    return data;
  },

  async getLearnerAssignments(userId: number): Promise<ContentAssignment[]> {
    const { data } = await api.get<ContentAssignment[]>(`/api/admin/learners/${userId}/assignments`);
    return data;
  },

  async assignContent(userId: number, payload: AssignContentPayload): Promise<ContentAssignment> {
    const { data } = await api.post<ContentAssignment>(`/api/admin/learners/${userId}/assign`, payload);
    return data;
  },

  async removeAssignment(userId: number, assignmentId: number): Promise<{ removed: boolean }> {
    const { data } = await api.delete<{ removed: boolean }>(
      `/api/admin/learners/${userId}/assign/${assignmentId}`,
    );
    return data;
  },

  async bulkAssign(payload: BulkAssignPayload): Promise<{ assigned: number; skipped: number }> {
    const { data } = await api.post<{ assigned: number; skipped: number }>(
      '/api/admin/learners/bulk-assign',
      payload,
    );
    return data;
  },
};

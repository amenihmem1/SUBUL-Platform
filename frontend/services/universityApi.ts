import { api } from '@/lib/api/client';

export async function getUniversityDashboard() {
  const { data } = await api.get('/api/university/dashboard');
  return data;
}

export async function getUniversityPrograms(params?: { page?: number; limit?: number }) {
  const { data } = await api.get('/api/university/programs', { params });
  return data;
}

export async function createUniversityProgram(body: {
  title: string;
  description?: string;
  certificationId?: number;
}) {
  const { data } = await api.post('/api/university/programs', body);
  return data;
}

export async function updateUniversityProgram(id: number, body: {
  title?: string;
  description?: string;
  certificationId?: number;
  isActive?: boolean;
}) {
  const { data } = await api.patch(`/api/university/programs/${id}`, body);
  return data;
}

export async function deleteUniversityProgram(id: number) {
  const { data } = await api.delete(`/api/university/programs/${id}`);
  return data;
}

export async function getUniversityLicenses() {
  const { data } = await api.get('/api/university/licenses');
  return data;
}

export type PostUniversityInvitesResponse = {
  created: number;
  invites: Array<{
    id: string;
    email: string;
    token: string;
    programId?: string;
    expiresAt?: string;
  }>;
};

export async function postUniversityInvites(
  body: { emails: string[]; programId?: string },
): Promise<PostUniversityInvitesResponse> {
  const { data } = await api.post<PostUniversityInvitesResponse>('/api/university/invites', body);
  return data;
}

export async function getUniversityInvites(params?: { page?: number; limit?: number }) {
  const { data } = await api.get('/api/university/invites', { params });
  return data;
}

export async function deleteUniversityInvite(id: string) {
  const { data } = await api.delete(`/api/university/invites/${id}`);
  return data;
}

export async function getProgramEnrollments(programId: string, params?: { page?: number; limit?: number }) {
  const { data } = await api.get(`/api/university/programs/${programId}/enrollments`, { params });
  return data;
}

export interface UniversityStudent {
  id: number;
  enrollmentId: string;
  email: string;
  fullName?: string;
  phone?: string;
  status: string;
  progress: number;
  enrolledAt?: string;
  completedAt?: string;
  program: {
    id: string;
    title: string;
  } | null;
}

export interface UniversityStudentDetail extends UniversityStudent {
  createdAt: string;
  enrollments: Array<{
    enrollmentId: string;
    status: string;
    progress: number;
    enrolledAt?: string;
    completedAt?: string;
    program: {
      id: string;
      title: string;
    } | null;
  }>;
}

export interface PaginatedStudentsResponse {
  data: UniversityStudent[];
  total: number;
  page: number;
  limit: number;
}

export async function getUniversityStudents(params?: {
  page?: number;
  limit?: number;
  programId?: string;
  status?: string;
  search?: string;
}): Promise<PaginatedStudentsResponse> {
  const { data } = await api.get<PaginatedStudentsResponse>('/api/university/students', { params });
  return data;
}

export async function getUniversityStudent(id: number): Promise<UniversityStudentDetail> {
  const { data } = await api.get<UniversityStudentDetail>(`/api/university/students/${id}`);
  return data;
}

export async function updateUniversityStudent(
  id: number,
  body: { enrollmentStatus?: string; programId?: string }
): Promise<UniversityStudentDetail> {
  const { data } = await api.patch<UniversityStudentDetail>(`/api/university/students/${id}`, body);
  return data;
}

export async function removeUniversityStudent(id: number, programId?: string): Promise<{ deleted: boolean }> {
  const params = programId ? { programId } : undefined;
  const { data } = await api.delete(`/api/university/students/${id}`, { params });
  return data;
}

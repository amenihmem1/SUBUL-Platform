import { api, API_PATHS } from '@/lib/api/client';

/** Raw job from API (list returns { data, total, page, limit }) */
export interface BackendJobRaw {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  contractType?: string | null;
  salary?: number | null;
  skills?: string[] | null;
  domain?: string | null;
  deadline?: string | null;
  status?: string;
  companyId?: string | null;
  company?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  applicants: number;
  status: 'published' | 'draft' | 'closed' | 'expired' | 'pending' | 'rejected' | 'archived';
  postedDate: string;
  deadline: string;
  description: string;
  requirements: string[];
  adminNotes?: string;
  rejectionReason?: string;
}

interface AdminJobsListResponse {
  data: BackendJobRaw[];
  total: number;
  page: number;
  limit: number;
}

function mapBackendJob(j: BackendJobRaw): AdminJob {
  const created = j.createdAt ? new Date(j.createdAt).toISOString().split('T')[0] : '';
  const deadline = j.deadline
    ? (typeof j.deadline === 'string' ? j.deadline : new Date(j.deadline).toISOString().split('T')[0])
    : created || '';
  const companyName =
    typeof j.company === 'object' && j.company?.name ? j.company.name : (j as any).company ?? '';
  return {
    id: j.id,
    title: j.title || '',
    company: companyName,
    location: j.location ?? '',
    type: (j.contractType as string) || 'full-time',
    salary: j.salary != null ? String(j.salary) : '',
    applicants: 0,
    status: (j.status as AdminJob['status']) || 'published',
    postedDate: created,
    deadline,
    description: j.description ?? '',
    requirements: Array.isArray(j.skills) ? j.skills : [],
    adminNotes: (j as any).adminNotes,
    rejectionReason: (j as any).rejectionReason,
  };
}

const base = () => API_PATHS.admin('jobs');

export interface AdminJobsPaginatedResult {
  data: AdminJob[];
  total: number;
  page: number;
  limit: number;
}

export async function getAdminJobs(params?: { status?: string; page?: number; limit?: number }): Promise<AdminJobsPaginatedResult> {
  const res = await api.get<AdminJobsListResponse>(base(), { params: params ?? {} });
  const list = res.data?.data ?? [];
  const data = Array.isArray(list) ? list.map(mapBackendJob) : [];
  const total = res.data?.total ?? 0;
  const page = res.data?.page ?? 1;
  const limit = res.data?.limit ?? 10;
  return { data, total, page, limit };
}

export async function getAdminJob(id: string): Promise<AdminJob> {
  const res = await api.get<BackendJobRaw>(`${base()}/${id}`);
  return mapBackendJob(res.data);
}

/** Accept or reject a job (admin only). Backend: PATCH /api/admin/jobs/:id/status */
export async function updateAdminJobStatus(
  id: string,
  body: { status: 'published' | 'rejected'; adminNotes?: string; rejectionReason?: string }
): Promise<{ job: BackendJobRaw; message: string }> {
  const res = await api.patch<{ job: BackendJobRaw; message: string }>(`${base()}/${id}/status`, body);
  return res.data;
}

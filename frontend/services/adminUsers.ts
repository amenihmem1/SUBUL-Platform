import { api, API_PATHS } from '@/lib/api/client';
import type { UserData } from '@/app/[locale]/dashboard/admin/users/page';
import { normalizeAdminUserRole } from '@/lib/roles';

interface BackendUser {
  id: number;
  email: string;
  fullName?: string;
  phone?: string;
  role?: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
  profilePicture?: string;
  coursesTaken?: number;
  averageProgress?: number;
  lastActivity?: string;
  averageScore?: number;
  /** Set by admin APIs when the user has an active university student seat */
  institutionalLearnerAccess?: boolean;
}

const VALID_STATUSES = ['active', 'inactive', 'suspended', 'pending'] as const;

const toUserArray = (payload: PaginatedUsersResponse | BackendUser[]): BackendUser[] => {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.data) ? payload.data : [];
};

function mapBackendUser(u: BackendUser): UserData {
  const name = u.fullName || u.email.split('@')[0];
  const avatar = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  /**
   * Prefer explicit API `role` (camelCase or legacy `user_role` snake_case). Normalize
   * `university_owner` → `university`. Empty role still defaults to `learner` for legacy rows.
   */
  const rawRole = String(
    u.role ?? (u as BackendUser & { user_role?: string }).user_role ?? '',
  ).trim();
  const role = rawRole !== '' ? normalizeAdminUserRole(rawRole) : 'learner';

  const status = VALID_STATUSES.includes(u.status as UserData['status'])
    ? (u.status as UserData['status'])
    : 'inactive';

  const activityDate = u.lastActivity || u.lastLogin || undefined;

  return {
    id: u.id,
    name,
    email: u.email,
    phone: u.phone || '',
    role,
    status,
    joinDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
    courses: u.coursesTaken || 0,
    progress: u.averageProgress || 0,
    avatar,
    lastActive: '',
    lastActivity: activityDate,
    institutionalLearnerAccess: !!u.institutionalLearnerAccess,
  };
}

const base = () => API_PATHS.admin('users');

export interface PaginatedUsersResponse {
  data: BackendUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetAdminUsersParams {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

export async function getAdminUsers(params?: GetAdminUsersParams): Promise<{
  data: UserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.role) searchParams.set('role', params.role);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const queryString = searchParams.toString();
  const url = queryString ? `${base()}?${queryString}` : base();

  const { data } = await api.get<PaginatedUsersResponse | BackendUser[]>(url);
  const users = toUserArray(data);
  const total = Array.isArray(data) ? users.length : (data.total ?? users.length);
  const page = Array.isArray(data) ? (params?.page ?? 1) : (data.page ?? params?.page ?? 1);
  const fallbackLimit = params?.limit ?? users.length ?? 1;
  const limit = Array.isArray(data) ? fallbackLimit : (data.limit ?? fallbackLimit);
  const totalPages = Array.isArray(data)
    ? Math.max(1, Math.ceil(total / Math.max(1, limit)))
    : (data.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit))));

  return {
    data: users.map(mapBackendUser),
    total,
    page,
    limit,
    totalPages,
  };
}

export async function getAdminUser(id: number): Promise<UserData> {
  const { data } = await api.get<BackendUser>(`${base()}/${id}`);
  return mapBackendUser(data);
}

export async function createAdminUser(data: {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  password: string;
}): Promise<UserData> {
  const { data: user } = await api.post<BackendUser>(base(), data);
  return mapBackendUser(user);
}

export async function updateAdminUser(
  id: number,
  data: { fullName?: string; email?: string; phone?: string; role?: string }
): Promise<UserData> {
  const { data: user } = await api.patch<BackendUser>(`${base()}/${id}`, data);
  return mapBackendUser(user);
}

export async function deleteAdminUser(id: number): Promise<void> {
  await api.delete(`${base()}/${id}`);
}

export async function updateAdminUserStatus(
  id: number,
  status: string
): Promise<UserData> {
  const { data: user } = await api.patch<BackendUser>(`${base()}/${id}/status`, {
    status,
  });
  return mapBackendUser(user);
}

export async function approveAdminUser(id: number): Promise<UserData> {
  const { data: user } = await api.post<BackendUser>(`${base()}/${id}/approve`);
  return mapBackendUser(user);
}

export async function updateAdminUserPassword(id: number, password: string): Promise<void> {
  await api.patch(`${base()}/${id}/password`, { password });
}

export async function sendResetPasswordEmail(id: number): Promise<{ message: string; email: string }> {
  const { data } = await api.post<{ message: string; email: string }>(`${base()}/${id}/send-reset-password`);
  return data;
}

export async function verifyAdminUserEmail(id: number): Promise<{ message: string; email: string }> {
  const { data } = await api.post<{ message: string; email: string }>(`/api/users/${id}/verify-email`);
  return data;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  adminUsers: number;
  /** Users with employer role (distinct from admin user count) */
  employerUsers?: number;
  monthlyRevenue?: string;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>(API_PATHS.admin('stats'));
  return data;
}

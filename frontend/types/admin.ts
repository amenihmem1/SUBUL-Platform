export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'learner' | 'employer';
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface CreateUserRequest {
  email: string;
  name?: string;
  role: 'admin' | 'learner' | 'employer';
  password?: string;
  sendInvite: boolean;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  adminUsers: number;
}

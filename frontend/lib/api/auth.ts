import { api, API_PATHS } from './client';
import { setToken } from '@/lib/auth/token';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
  companyName?: string;
}

export interface AuthResponse {
  access_token: string;
  user?: {
    id: number;
    email: string;
    fullName?: string;
    role?: string;
    companyId?: string;
    isEmailVerified?: boolean;
  };
}

export type RegisterApiResponse =
  | { requiresVerification: true; email: string; emailSent?: boolean; emailError?: string }
  | {
      requiresVerification: false;
      email: string;
      user: {
        id: number;
        email: string;
        fullName?: string;
        role?: string;
        companyId?: string;
        isEmailVerified: boolean;
      };
    };

export interface AuthUser {
  id: number;
  email: string;
  fullName?: string;
  role?: string;
  profilePicture?: string;
  companyName?: string;
  phone?: string;
  address?: string;
  bio?: string;
  isEmailVerified?: boolean;
  status?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class AuthService {
  /**
   * Login with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(API_PATHS.auth('login'), credentials);
    const { access_token } = response.data;
    
    // Store token
    setToken(access_token);
    
    return response.data;
  }

  /**
   * Register a new user (does not store a session; verify email then log in).
   */
  static async register(data: RegisterData): Promise<RegisterApiResponse> {
    const response = await api.post<RegisterApiResponse>(API_PATHS.auth('register'), data);
    return response.data;
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<AuthUser> {
    const response = await api.get<AuthUser>(API_PATHS.auth('me'));
    return response.data;
  }

  /**
   * Initiate password reset via email
   */
  static async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(API_PATHS.auth('forgot-password-email'), { email });
    return response.data;
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(API_PATHS.auth('reset-password'), { token, newPassword });
    return response.data;
  }

  /**
   * Resend email verification (rate-limited on server)
   */
  static async resendVerification(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(API_PATHS.auth('resend-verification'), { email });
    return response.data;
  }

  /**
   * Verify email with token (JSON API)
   */
  static async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(API_PATHS.auth('verify-email'), { token });
    return response.data;
  }

  /**
   * Change email for unverified accounts (sends verification to new email)
   */
  static async changeEmail(currentEmail: string, newEmail: string): Promise<{ message: string; emailSent: boolean }> {
    const response = await api.post<{ message: string; emailSent: boolean }>(API_PATHS.auth('change-email'), {
      currentEmail,
      newEmail,
    });
    return response.data;
  }

  /**
   * Get logout URL
   */
  static getLogoutUrl(): string {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const backendUrl = raw.replace(/\/$/, '').replace(/\/api\/?$/, '');
    return `${backendUrl}/api/auth/logout`;
  }
}

export default AuthService;

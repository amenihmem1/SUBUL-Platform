import { api, API_PATHS } from '@/lib/api/client';

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
  role?: 'learner' | 'employer' | 'admin';
}

export type RegisterResponse =
  | { requiresVerification: true; email: string; emailSent?: boolean; emailError?: string }
  | {
      requiresVerification: false;
      email: string;
      user: { id: number; email: string; fullName?: string; role?: string; isEmailVerified: boolean };
    };

export const register = (data: RegisterRequest): Promise<RegisterResponse> =>
  api.post<RegisterResponse>(API_PATHS.auth('register'), data).then((r) => r.data);

export interface User {
  id: number;
  email: string;
  fullName?: string;
  companyName?: string;
  phone?: string;
  address?: string;
  bio?: string;
  profilePicture?: string;
  isEmailVerified: boolean;
  role?: string;
  status: string;
  track?: 'cloud' | 'cyber' | 'ai';
  auth0Sub?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileRequest {
  fullName?: string;
  companyName?: string;
  phone?: string;
  address?: string;
  bio?: string;
}

export const getCurrentUser = (): Promise<User | null> =>
  api
    .get<User>(API_PATHS.users('me'))
    .then((r) => r.data)
    .catch((err) => {
      if (err?.response?.status === 401 || err?.response?.status === 404) return null;
      console.error('Error fetching current user:', err);
      return null;
    });

export const updateProfile = (data: UpdateProfileRequest): Promise<User> =>
  api.patch<User>(API_PATHS.users('profile'), data).then((r) => r.data);

export const updateTrack = (track: 'cloud' | 'cyber' | 'ai'): Promise<User> =>
  api.patch<User>(API_PATHS.users('me/track'), { track }).then((r) => r.data);

export const uploadProfilePicture = (file: File): Promise<{ profilePicture: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  return api
    .post<{ profilePicture: string }>(API_PATHS.users('profile-picture'), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

/** Backwards-compatible object for consumers expecting userService */
export const userService = {
  getCurrentUser,
  updateProfile,
  uploadProfilePicture,
};

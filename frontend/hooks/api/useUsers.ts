import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCurrentUser,
  updateProfile,
  updateTrack,
  uploadProfilePicture,
  type UpdateProfileRequest,
  type User,
} from '@/services/user';

export const userKeys = {
  all: ['users'] as const,
  current: () => [...userKeys.all, 'current'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.current(),
    queryFn: getCurrentUser,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateProfile(data),
    onSuccess: (data: User) => {
      queryClient.setQueryData(userKeys.current(), data);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:refresh'));
      }
    },
  });
}

export function useUpdateTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (track: 'cloud' | 'cyber' | 'ai') => updateTrack(track),
    onSuccess: (data: User) => {
      queryClient.setQueryData(userKeys.current(), data);
    },
  });
}

export function useUploadProfilePicture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadProfilePicture(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.current() });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:refresh'));
      }
    },
  });
}

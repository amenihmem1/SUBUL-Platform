import { z } from 'zod';
import { decodeJwtRole, getEffectiveRole } from '@/lib/auth/routing';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
});

export const registerSchema = loginSchema.extend({
  password: z.string().min(8, 'Minimum 8 caractères').max(72, 'Max 72 caractères'),
  fullName: z.string().max(128).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function getRoleFromResponse(res: { access_token: string; user?: { email?: string; role?: string } }): string {
  if (res.user?.role || res.user?.email) return getEffectiveRole(res.user?.role, res.user?.email);
  return decodeJwtRole(res.access_token) ?? 'learner';
}

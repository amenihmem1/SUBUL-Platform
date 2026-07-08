import { DEFAULT_LOCALE, type AppLocale } from '@/lib/i18n/config';

export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export type SupportedLocale = AppLocale;

export const ALLOWED_ROLES = [
  'learner',
  'admin',
  'employer',
  'university',
  'university_owner',
  'instructor',
  'commercial',
] as const;
export type AllowedRole = (typeof ALLOWED_ROLES)[number];

export const ADMIN_EMAILS = ['ameni.hmem@esprim.tn'];

export function isAdminEmail(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());
}

export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  const value = (locale || '').toLowerCase();
  if (value === 'ar') return DEFAULT_LOCALE;
  return (SUPPORTED_LOCALES as readonly string[]).includes(value) ? (value as SupportedLocale) : DEFAULT_LOCALE;
}

export function normalizeRole(role: string | null | undefined): AllowedRole {
  const value = (role || '').toLowerCase();
  return (ALLOWED_ROLES as readonly string[]).includes(value) ? (value as AllowedRole) : 'learner';
}

export function getEffectiveRole(role: string | null | undefined, email: string | null | undefined): AllowedRole {
  return isAdminEmail(email) ? 'admin' : normalizeRole(role);
}

export function getDashboardPath(locale: string | null | undefined, role: string | null | undefined): string {
  return `/${normalizeLocale(locale)}/dashboard/${normalizeRole(role)}`;
}

export function decodeJwtRole(token: string): AllowedRole | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1])) as { role?: string };
    return normalizeRole(payload.role);
  } catch {
    return null;
  }
}

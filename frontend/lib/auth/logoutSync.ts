import { normalizeLocale } from '@/lib/auth/routing';

export const TOKEN_STORAGE_KEY = 'access_token' as const;
export const LOGOUT_EVENT_KEY = 'logout_event' as const;

export type LogoutReason = 'user' | '401' | 'missing_token' | 'unknown';

export function emitLogoutEvent(ts = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOGOUT_EVENT_KEY, String(ts));
  } catch {
    // ignore storage write failures (private mode / quota); tab-local logout still works
  }
}

export function readLogoutEventTimestamp(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const AUTH_USER_KEYS: readonly string[] = [
  // auth token is cleared by clearToken(); keep key list explicit for safety
  'subul_user_id',
  'subul_plan_intent',
  'subul_quiz_result',
  'subul_assessment_result',
  'company-info',
  'employer-notification-prefs',
];

export function clearAuthUserStorage(): void {
  if (typeof window === 'undefined') return;
  for (const k of AUTH_USER_KEYS) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // ignore
    }
  }
}

export function getLocaleLoginPath(pathname: string): string {
  const locale = normalizeLocale(String(pathname || '/').split('/')[1]);
  return `/${locale}/auth/login`;
}

export function isLikelyProtectedPath(pathname: string): boolean {
  const p = String(pathname || '/');
  if (p === '/' || p === '') return false;
  // Public routes
  if (p.includes('/auth/')) return false;
  // Locale root pages like /en, /fr
  if (/^\/(en|fr)\/?$/.test(p)) return false;
  // Protected areas
  if (p.includes('/dashboard/')) return true;
  if (p.includes('/checkout')) return true;
  return false;
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const to = getLocaleLoginPath(window.location.pathname);
  if (window.location.pathname.startsWith(to)) return;
  window.location.href = to;
}


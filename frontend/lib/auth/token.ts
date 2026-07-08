const TOKEN_KEY = 'access_token';

function buildAccessTokenCookie(token: string, maxAgeSeconds = 86400): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `access_token=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${isProd ? '; Secure' : ''}`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const fromLocal = localStorage.getItem(TOKEN_KEY);
  if (fromLocal) {
    // Keep middleware (cookie-based) and client (localStorage-based) in sync.
    const fromCookie = document.cookie.match(/(?:^|; )access_token=([^;]*)/)?.[1] ?? null;
    if (!fromCookie) {
      document.cookie = buildAccessTokenCookie(fromLocal);
    }
    return fromLocal;
  }

  // Fallback: token stored in cookie (some flows may rely on cookies)
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = buildAccessTokenCookie(token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = 'access_token=; path=/; max-age=0';
}

export function syncAuthCookieFromStorage(): void {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  const hasCookie = /(?:^|; )access_token=/.test(document.cookie);
  if (!hasCookie) {
    document.cookie = buildAccessTokenCookie(token);
  }
}

/** Decode `sub` / `id` from JWT for client-side redirects (no signature verification). */
export function getUserIdFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const p = JSON.parse(json) as { sub?: number | string; id?: number | string };
    const raw = p.sub ?? p.id;
    if (raw === undefined || raw === null) return null;
    return String(raw);
  } catch {
    return null;
  }
}

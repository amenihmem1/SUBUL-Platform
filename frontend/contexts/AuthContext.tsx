'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearToken, getToken, syncAuthCookieFromStorage } from '@/lib/auth/token';
import { api, API_PATHS } from '@/lib/api/client';
import { normalizeRole } from '@/lib/auth/routing';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthSync } from '@/hooks/useAuthSync';
import { clearAuthUserStorage, emitLogoutEvent, redirectToLogin } from '@/lib/auth/logoutSync';

export interface AuthUser {
  id: number;
  email: string;
  fullName?: string;
  role?: string;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string | null;
  [key: string]: unknown;
}

export interface AuthSession {
  user: AuthUser;
  userRole: string;
  roles: string[];
  isAdmin: boolean;
  isLearner: boolean;
  isEmployer: boolean;
  isUniversity: boolean;
  isCommercial?: boolean;
}

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAdmin: boolean;
  isLearner: boolean;
  isEmployer: boolean;
  isUniversity: boolean;
  isEmailVerified: boolean;
  hasRole: (role: string) => boolean;
  requireRole: (role: string) => boolean;
  roles: string[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const isLoggingOutRef = React.useRef(false);
  // Ref keeps the current session accessible in the logout callback without
  // adding `session` to its dependency array (which would re-create the
  // callback on every session change and cause subtle stale-closure issues).
  const sessionRef = React.useRef<AuthSession | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const fetchSession = useCallback(async () => {
    syncAuthCookieFromStorage();
    const token = getToken();
    if (!token) {
      setSession(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get<AuthUser>(API_PATHS.auth('me'));
      const role = normalizeRole(data.role);
      setSession({
        user: data,
        userRole: role,
        roles: [role],
        isAdmin: role === 'admin',
        isLearner: role === 'learner',
        isEmployer: role === 'employer',
        isUniversity: role === 'university',
        isCommercial: role === 'commercial',
      });
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const performClientLogout = useCallback(async (opts?: { broadcast?: boolean; callBackend?: boolean }) => {
    if (typeof window === 'undefined') return;
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    const broadcast = opts?.broadcast ?? false;
    const callBackend = opts?.callBackend ?? false;

    // Capture the departing user's id BEFORE clearing state so we can do
    // surgical per-user cache removal (avoids stale data leaking to next user).
    const prevUid = sessionRef.current?.user?.id ? String(sessionRef.current.user.id) : null;

    // Prevent any further authenticated calls immediately.
    clearToken();
    clearAuthUserStorage();
    try { sessionStorage.clear(); } catch { /* ignore */ }

    setSession(null);
    setIsLoading(false);

    // Cancel + clear client cache (react-query)
    try {
      await queryClient.cancelQueries();
      if (prevUid) {
        queryClient.removeQueries({ queryKey: ['cv', prevUid] });
        queryClient.removeQueries({ queryKey: ['job-search', prevUid] });
      }
      queryClient.clear();
    } catch {
      // ignore
    }

    if (broadcast) emitLogoutEvent();

    if (callBackend) {
      try {
        await api.get(API_PATHS.auth('logout'));
      } catch {
        // backend cookie clearing is best-effort; primary auth is the cleared token
      }
    }

    // Allow any listeners to re-check session/token.
    window.dispatchEvent(new Event('auth:refresh'));

    // Hard redirect to ensure app state is fully reset.
    redirectToLogin();
  }, [queryClient]);

  useEffect(() => {
    const refreshHandler = () => {
      void fetchSession();
    };
    const storageHandler = (event: StorageEvent) => {
      if (event.key === 'access_token') {
        void fetchSession();
      }
    };
    window.addEventListener('auth:refresh', refreshHandler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('auth:refresh', refreshHandler);
      window.removeEventListener('storage', storageHandler);
    };
  }, [fetchSession]);

  useAuthSync({
    onLogoutDetected: () => {
      void performClientLogout({ broadcast: false, callBackend: false });
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const e = event as CustomEvent<{ broadcast?: boolean; callBackend?: boolean }>;
      void performClientLogout({
        broadcast: e?.detail?.broadcast ?? false,
        callBackend: e?.detail?.callBackend ?? false,
      });
    };
    window.addEventListener('auth:logout', handler as EventListener);
    return () => window.removeEventListener('auth:logout', handler as EventListener);
  }, [performClientLogout]);

  const refreshSession = useCallback(async () => {
    await fetchSession();
  }, [fetchSession]);

  const logout = useCallback(async () => {
    await performClientLogout({ broadcast: true, callBackend: true });
  }, [performClientLogout]);

  const value = useMemo<AuthContextValue>(() => {
    const hasRole = (role: string) => session?.roles?.includes(role) ?? false;
    return {
      session,
      isLoading,
      logout,
      refreshSession,
      isAdmin: session?.isAdmin ?? false,
      isLearner: session?.isLearner ?? false,
      isEmployer: session?.isEmployer ?? false,
      isUniversity: session?.isUniversity ?? false,
      isEmailVerified: session?.user?.isEmailVerified ?? false,
      hasRole,
      requireRole: hasRole,
      roles: session?.roles ?? [],
    };
  }, [isLoading, logout, refreshSession, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}


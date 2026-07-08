import { useEffect, useRef } from 'react';
import { getToken } from '@/lib/auth/token';
import {
  LOGOUT_EVENT_KEY,
  isLikelyProtectedPath,
  readLogoutEventTimestamp,
  redirectToLogin,
} from '@/lib/auth/logoutSync';

type UseAuthSyncOptions = {
  /**
   * Called when a logout was detected from another tab (via localStorage event).
   * Must be idempotent.
   */
  onLogoutDetected: (meta: { ts: number; key: string }) => void;
};

export function useAuthSync({ onLogoutDetected }: UseAuthSyncOptions) {
  const lastLogoutTsRef = useRef<number>(0);

  // Boot-time enforcement: if token is missing on a protected page, go to login.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (getToken()) return;
    if (!isLikelyProtectedPath(window.location.pathname)) return;
    redirectToLogin();
  }, []);

  // Cross-tab logout listener.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onStorage = (event: StorageEvent) => {
      if (!event) return;
      if (event.key !== LOGOUT_EVENT_KEY) return;

      const ts = readLogoutEventTimestamp(event.newValue);
      if (!ts) return;
      if (ts <= lastLogoutTsRef.current) return;

      lastLogoutTsRef.current = ts;
      onLogoutDetected({ ts, key: LOGOUT_EVENT_KEY });
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [onLogoutDetected]);
}


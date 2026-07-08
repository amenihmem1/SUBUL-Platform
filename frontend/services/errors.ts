import { API_PATHS, getBackendUrl } from '@/lib/api/client';

export interface ReportErrorPayload {
  message?: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  [key: string]: unknown;
}

/** Report client error to backend (if endpoint exists). Uses fetch to avoid auth. */
export async function reportError(payload: ReportErrorPayload): Promise<void> {
  const url = `${getBackendUrl()}${API_PATHS.errors()}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking
  }
}

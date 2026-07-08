import { getBackendUrl, API_PATHS } from '@/lib/api/client';
import { getToken } from '@/lib/auth/token';

export interface CloudTutorChatCallbacks {
  onChunk?: (chunk: string, fullSoFar: string) => void;
  onLang?: (lang: string) => void;
  onDone?: () => void;
}

/** Stream Cloud Tutor chat response; calls onChunk for each chunk */
export async function cloudTutorChatStream(
  body: Record<string, unknown>,
  callbacks: CloudTutorChatCallbacks = {}
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${getBackendUrl()}${API_PATHS.cloudTutor('chat')}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Cloud Tutor request failed');
  const reader = res.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullResponse = '';
  let jsonBuffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    jsonBuffer += decoder.decode(value, { stream: true });
    let boundary = jsonBuffer.indexOf('\n');
    while (boundary !== -1) {
      const line = jsonBuffer.slice(0, boundary);
      jsonBuffer = jsonBuffer.slice(boundary + 1);
      boundary = jsonBuffer.indexOf('\n');
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        const chunk = data.chunk ?? '';
        const detectedLang = data.lang || 'fr';
        fullResponse += chunk;
        if (callbacks.onChunk) callbacks.onChunk(chunk, fullResponse);
        if (callbacks.onLang) callbacks.onLang(detectedLang);
      } catch {
        /* skip malformed */
      }
    }
  }
  if (callbacks.onDone) callbacks.onDone();
}

/** Fetch voice credits quota (uses authenticated user from JWT). */
export async function cloudTutorQuota(): Promise<{ remaining_credits: number; max_credits: number }> {
  const token = getToken();
  const res = await fetch(`${getBackendUrl()}${API_PATHS.cloudTutor('quota')}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error('Cloud Tutor quota request failed');
  return res.json();
}

/** Notify backend that a Cloud Tutor session is ending (triggers background summary in Cosmos). */
export async function cloudTutorSessionEnd(sessionId: string): Promise<void> {
  const token = getToken();
  try {
    await fetch(`${getBackendUrl()}${API_PATHS.cloudTutor('session/end')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ session_id: sessionId }),
      keepalive: true,
    });
  } catch {
    /* best-effort — page may already be unloading */
  }
}

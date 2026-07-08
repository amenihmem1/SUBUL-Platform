import { getBackendUrl } from '@/lib/api/client';
import { getToken } from '@/lib/auth/token';

export interface RoadmapAgentGenerateCallbacks {
  onChunk?: (chunk: string, fullText: string) => void;
  onComplete?: (fullText: string, parsed?: unknown) => void;
}

/** Stream roadmap from agent POST /api/roadmap/agent/generate */
export async function roadmapAgentGenerateStream(
  body: Record<string, unknown>,
  callbacks: RoadmapAgentGenerateCallbacks = {}
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${getBackendUrl()}/api/roadmap/agent/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.body) throw new Error('No stream body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const raw = decoder.decode(value, { stream: true });
    for (const line of raw.split('\n').filter((l) => l.trim())) {
      try {
        const evt = JSON.parse(line);
        if (evt.chunk) {
          fullText += evt.chunk;
          if (callbacks.onChunk) callbacks.onChunk(evt.chunk, fullText);
        }
        if (evt.status === 'completed') {
          let parsed: unknown;
          try {
            parsed = JSON.parse(fullText);
          } catch {
            parsed = undefined;
          }
          if (callbacks.onComplete) callbacks.onComplete(fullText, parsed);
        }
      } catch {
        /* partial JSON */
      }
    }
  }
}

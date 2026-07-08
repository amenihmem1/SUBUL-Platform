/** Cartesia voice IDs — confirmed working from agent_tutor backend. */
export const CARTESIA_VOICES = {
  fr: '65b25c5d-ff07-4687-a04c-da2f43ef6fa9',
  en: '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
  ar: 'a38e4e85-e815-4e25-a9b3-2f9b69d8d7aa',
} as const;

/**
 * Client-side voice cap removed (was 60). Real enforcement now lives in the backend
 * `AgentQuotaService` (configurable per plan). This constant remains for backward
 * compatibility but is effectively unlimited; UIs treat any usage as in-bounds.
 */
export const VOICE_MAX = Number.MAX_SAFE_INTEGER;

export const CARTESIA_WS_VERSION = '2025-04-16';

export function buildCartesiaTtsWebSocketUrl(apiKey: string): string {
  return `wss://api.cartesia.ai/tts/websocket?api_key=${apiKey}&cartesia_version=${CARTESIA_WS_VERSION}`;
}

// ─── Monthly voice counter (localStorage, auto-resets each calendar month) ───

export function getVoiceMonthKey(): string {
  const d = new Date();
  return `subul_voice_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function readMonthlyVoice(): number {
  if (typeof window === 'undefined') return 0;
  return Math.max(0, parseInt(localStorage.getItem(getVoiceMonthKey()) ?? '0', 10));
}

export function writeMonthlyVoice(n: number): void {
  localStorage.setItem(getVoiceMonthKey(), String(n));
}

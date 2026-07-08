import { getBackendUrl } from '@/lib/api/client';
import { getToken } from '@/lib/auth/token';

export async function fetchHeygenStreamingToken(): Promise<string> {
  // Dev shortcut: call HeyGen directly when a client-side key is present.
  // In production this env var must NOT be set — the backend proxy handles it.
  const directKey = process.env.NEXT_PUBLIC_HEYGEN_API_KEY;
  if (directKey) {
    const res = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: { 'x-api-key': directKey },
    });
    if (!res.ok) throw new Error(`HeyGen direct token failed: ${res.status}`);
    const body = await res.json();
    return body?.data?.token as string;
  }

  // Production path: backend proxy (keeps API key server-side).
  const authToken = getToken();
  if (!authToken) throw new Error('Not authenticated');
  const base = (process.env.NEXT_PUBLIC_HEYGEN_BACKEND_URL ?? getBackendUrl()).replace(/\/$/, '');
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}/api/heygen/token`, {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HeyGen token fetch failed: ${res.status}`);
    const { token: sessionToken } = await res.json();
    return sessionToken;
  } finally {
    clearTimeout(tid);
  }
}

export function buildSpeechText(
  title: string,
  content: string,
  bullets: string[],
  examTips: string[],
): string {
  const parts: string[] = [];
  if (title) parts.push(title + '.');
  if (content) parts.push(content);
  if (bullets.length) parts.push('Points clés : ' + bullets.join('. ') + '.');
  if (examTips.length) parts.push("Conseils d'examen : " + examTips.join('. ') + '.');
  return parts.join(' ');
}

// ─── HeyGen Streaming Avatar WebRTC client (no SDK needed) ────────────────────

const HEYGEN_API = 'https://api.heygen.com';

export interface HeyGenSession {
  sessionId: string;
  sdpOffer: RTCSessionDescriptionInit;
  iceServers: RTCIceServer[];
}

export async function createHeyGenSession(
  token: string,
  avatarId: string,
  language: string,
): Promise<HeyGenSession> {
  const res = await fetch(`${HEYGEN_API}/v1/streaming.new`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quality: 'medium',
      avatar_name: avatarId,
      voice: { rate: 1.0 },
      language,
      version: 'v2',
      video_encoding: 'H264',
    }),
  });
  if (!res.ok) throw new Error(`HeyGen session create failed: ${res.status}`);
  const data = await res.json();
  return {
    sessionId: data.data.session_id,
    sdpOffer: { type: 'offer', sdp: data.data.sdp.sdp },
    iceServers: data.data.ice_servers2 ?? data.data.ice_servers ?? [],
  };
}

export async function startHeyGenSession(
  token: string,
  sessionId: string,
  sdpAnswer: RTCSessionDescriptionInit,
): Promise<void> {
  const res = await fetch(`${HEYGEN_API}/v1/streaming.start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: sessionId, sdp: sdpAnswer }),
  });
  if (!res.ok) throw new Error(`HeyGen session start failed: ${res.status}`);
}

export async function sendHeyGenIceCandidate(
  token: string,
  sessionId: string,
  candidate: RTCIceCandidateInit,
): Promise<void> {
  await fetch(`${HEYGEN_API}/v1/streaming.ice`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: sessionId, candidate }),
  });
}

export async function speakHeyGen(
  token: string,
  sessionId: string,
  text: string,
): Promise<void> {
  const res = await fetch(`${HEYGEN_API}/v1/streaming.task`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: sessionId, text, task_type: 'talk' }),
  });
  if (!res.ok) throw new Error(`HeyGen speak failed: ${res.status}`);
}

export async function interruptHeyGen(token: string, sessionId: string): Promise<void> {
  await fetch(`${HEYGEN_API}/v1/streaming.interrupt`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function stopHeyGenSession(token: string, sessionId: string): Promise<void> {
  await fetch(`${HEYGEN_API}/v1/streaming.stop`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: sessionId }),
  });
}

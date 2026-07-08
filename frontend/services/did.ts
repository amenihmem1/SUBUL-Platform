const DID_API = 'https://api.d-id.com';

function headers(apiKey: string) {
  return {
    Authorization: `Basic ${btoa(`${apiKey}:`)}`,
    'Content-Type': 'application/json',
  };
}

export interface DIDStream {
  id: string;
  sessionId: string;
  sdpOffer: RTCSessionDescriptionInit;
  iceServers: RTCIceServer[];
}

export async function createDIDStream(apiKey: string, sourceUrl: string): Promise<DIDStream> {
  const res = await fetch(`${DID_API}/talks/streams`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ source_url: sourceUrl }),
  });
  if (!res.ok) throw new Error(`D-ID create stream failed: ${res.status}`);
  const data = await res.json();
  return {
    id: data.id,
    sessionId: data.session_id,
    sdpOffer: data.offer,
    iceServers: data.ice_servers,
  };
}

export async function startDIDStream(
  apiKey: string,
  streamId: string,
  sessionId: string,
  answer: RTCSessionDescriptionInit,
): Promise<void> {
  const res = await fetch(`${DID_API}/talks/streams/${streamId}/sdp`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ answer, session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`D-ID sdp failed: ${res.status}`);
}

export async function sendDIDIce(
  apiKey: string,
  streamId: string,
  sessionId: string,
  candidate: RTCIceCandidateInit,
): Promise<void> {
  await fetch(`${DID_API}/talks/streams/${streamId}/ice`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ candidate, session_id: sessionId }),
  });
}

export async function speakDID(
  apiKey: string,
  streamId: string,
  sessionId: string,
  text: string,
  language: string,
): Promise<void> {
  const voiceId = language === 'fr'
    ? 'fr-FR-DeniseNeural'
    : language === 'ar'
    ? 'ar-SA-HamedNeural'
    : 'en-US-JennyNeural';

  const res = await fetch(`${DID_API}/talks/streams/${streamId}`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      script: {
        type: 'text',
        subtitles: false,
        provider: { type: 'microsoft', voice_id: voiceId },
        input: text,
      },
      config: { fluent: true, pad_audio: 0 },
      session_id: sessionId,
    }),
  });
  if (!res.ok) throw new Error(`D-ID speak failed: ${res.status}`);
}

export async function stopDIDStream(
  apiKey: string,
  streamId: string,
  sessionId: string,
): Promise<void> {
  await fetch(`${DID_API}/talks/streams/${streamId}`, {
    method: 'DELETE',
    headers: headers(apiKey),
    body: JSON.stringify({ session_id: sessionId }),
  });
}

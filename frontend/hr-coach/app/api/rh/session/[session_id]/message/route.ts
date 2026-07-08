import { NextResponse } from "next/server";

export const runtime = "nodejs";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

export async function POST(
  request: Request,
  { params }: { params: { session_id: string } }
) {
  try {
    const payload = await request.json();
    const res = await fetch(`${backendBaseUrl()}/rh/sessions/${encodeURIComponent(params.session_id)}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    let data: any;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {
        detail: raw || "Backend returned a non-JSON error.",
      };
    }

    if (res.ok && data?.say) {
      try {
        const ttsRes = await fetch(`${backendBaseUrl()}/rh/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.say }),
        });
        if (ttsRes.ok) {
          const audio = await ttsRes.arrayBuffer();
          data.audio_base64 = Buffer.from(audio).toString("base64");
          data.audio_mime_type = ttsRes.headers.get("content-type") || "audio/wav";
        }
      } catch {
        // Keep text response usable even if TTS pre-generation fails.
      }
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

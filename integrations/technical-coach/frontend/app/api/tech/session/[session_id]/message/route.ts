import { backendBaseUrl } from "@/lib/techBackend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TTS_PREGEN_TIMEOUT_MS = 12000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

type RouteParams = {
  params: Promise<{ session_id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { session_id } = await params;
    const payload = await request.json();
    const backendUrl = `${backendBaseUrl()}/tech/sessions/${encodeURIComponent(session_id)}/message`;
    console.log("[api/tech/session/[id]/message] Posting to:", backendUrl);

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("[api/tech/session/[id]/message] Backend status:", res.status);

    if (!res.ok) {
      const raw = await res.text();
      console.error("[api/tech/session/[id]/message] Backend error response:", raw);
      return NextResponse.json(
        { error: `Backend returned ${res.status}: ${raw}` },
        { status: res.status }
      );
    }

    const raw = await res.text();
    let data: any;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (jsonError) {
      console.error("[api/tech/session/[id]/message] Failed to parse JSON:", jsonError);
      data = {
        detail: raw || "Backend returned a non-JSON response.",
      };
    }

    if (res.ok && data?.say) {
      try {
        const ttsRes = await fetchWithTimeout(
          `${backendBaseUrl()}/tech/tts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: data.say, language: "multi" }),
          },
          TTS_PREGEN_TIMEOUT_MS
        );
        if (ttsRes.ok) {
          const audio = await ttsRes.arrayBuffer();
          data.audio_base64 = Buffer.from(audio).toString("base64");
          data.audio_mime_type = ttsRes.headers.get("content-type") || "audio/wav";
        }
      } catch (ttsError) {
        console.error("[api/tech/session/[id]/message] TTS pre-generation failed:", ttsError);
        // Keep text response usable even if TTS pre-generation fails.
      }
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[api/tech/session/[id]/message] Exception:", errorMsg, error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

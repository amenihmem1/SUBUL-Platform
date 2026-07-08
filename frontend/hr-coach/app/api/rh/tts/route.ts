export const runtime = "nodejs";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const res = await fetch(`${backendBaseUrl()}/rh/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const raw = await res.text();
      let detail = raw || "TTS unavailable";
      try {
        const parsed = JSON.parse(raw);
        detail = parsed?.detail || parsed?.error || detail;
      } catch {
        if (detail.includes("Application Error") || detail.includes("<html") || detail.includes("<div")) {
          detail = "Media service unavailable. Check rh-media-service health and voice keys.";
        }
      }
      return new Response(detail, { status: res.status });
    }

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response((error as Error).message, { status: 500 });
  }
}

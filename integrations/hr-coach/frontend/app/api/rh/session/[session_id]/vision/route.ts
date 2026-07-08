export const runtime = "nodejs";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

type RouteParams = {
  params: Promise<{ session_id: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { session_id } = await params;

  try {
    const body = await request.formData();
    const res = await fetch(`${backendBaseUrl()}/rh/sessions/${encodeURIComponent(session_id)}/vision`, {
      method: "POST",
      body,
      cache: "no-store",
    });
    const raw = await res.text();
    let responseBody = raw || "{}";
    try {
      if (raw) {
        JSON.parse(raw);
      }
    } catch {
      responseBody = JSON.stringify({
        error:
          raw.includes("Application Error") || raw.includes("<html") || raw.includes("<div")
            ? "Media service unavailable. Check rh-media-service health and emotion model."
            : raw,
      });
    }
    return new Response(responseBody, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

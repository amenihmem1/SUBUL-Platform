export const runtime = "nodejs";

import fs from "node:fs/promises";
import path from "node:path";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

type RouteParams = {
  params: Promise<{ session_id: string }>;
};

function backendUrls() {
  return Array.from(new Set([backendBaseUrl(), "http://127.0.0.1:8001"]));
}

function hasUsableSessionDetails(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  const session = payload as { turns?: unknown; final_report?: unknown; interview_status?: unknown };
  const turns = Array.isArray(session.turns) ? session.turns : [];
  const report = session.final_report && typeof session.final_report === "object" ? session.final_report as Record<string, unknown> : null;
  return turns.length > 0 || Boolean(report?.competencies) || session.interview_status === "finalized";
}

async function localSessionFallback(sessionId: string) {
  const filename = `${sessionId}.json`;
  const candidatePaths = [
    path.resolve(process.cwd(), "../../../backend/hr-coach/data/sessions", filename),
    path.resolve(process.cwd(), "../../backend/hr-coach/data/sessions", filename),
    path.resolve(process.cwd(), "backend/hr-coach/data/sessions", filename),
  ];

  for (const sessionPath of candidatePaths) {
    try {
      const raw = await fs.readFile(sessionPath, "utf8");
      const session = JSON.parse(raw);
      if (session?.session_id === sessionId && hasUsableSessionDetails(session)) {
        return session;
      }
    } catch {
      // Try the next likely workspace layout.
    }
  }

  return null;
}

async function internalSessionFallback(baseUrl: string, sessionId: string) {
  const res = await fetch(`${baseUrl}/rh/internal/sessions?limit=500`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = await res.json();
  const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
  const session = sessions.find((item: { session_id?: string }) => item?.session_id === sessionId);
  return session && typeof session === "object" && hasUsableSessionDetails(session) ? session : null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { session_id } = await params;
  const requestUrl = new URL(_request.url);
  const includeInsights = requestUrl.searchParams.get("include_insights");
  const language = requestUrl.searchParams.get("language");
  const queryParams = new URLSearchParams();
  if (includeInsights) queryParams.set("include_insights", includeInsights);
  if (language) queryParams.set("language", language);
  const querySuffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

  let lastError = "";

  for (const baseUrl of backendUrls()) {
    try {
      const res = await fetch(`${baseUrl}/rh/sessions/${encodeURIComponent(session_id)}${querySuffix}`, {
        method: "GET",
        cache: "no-store",
      });
      const raw = await res.text();

      if (!res.ok && raw.includes("Route is not exposed by this microservice")) {
        lastError = raw;
        continue;
      }

      if (res.ok) {
        try {
          const payload = JSON.parse(raw);
          if (!hasUsableSessionDetails(payload)) {
            lastError = "Session detail route returned an incomplete payload.";
            continue;
          }
        } catch {
          lastError = "Session detail route returned invalid JSON.";
          continue;
        }
      }

      return new Response(raw, {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      lastError = (error as Error).message;
    }
  }

  const localFallback = await localSessionFallback(session_id);
  if (localFallback) {
    return Response.json(localFallback, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  for (const baseUrl of backendUrls()) {
    try {
      const fallback = await internalSessionFallback(baseUrl, session_id);
      if (fallback) {
        return Response.json(fallback, {
          headers: {
            "Cache-Control": "no-store",
          },
        });
      }
    } catch (error) {
      lastError = (error as Error).message;
    }
  }

  return Response.json({ error: lastError || "Unable to load session details." }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { session_id } = await params;

  try {
    const payload = await request.json();
    const res = await fetch(`${backendBaseUrl()}/rh/sessions/${encodeURIComponent(session_id)}/meta`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    return new Response(raw, {
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

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { session_id } = await params;

  try {
    const res = await fetch(`${backendBaseUrl()}/rh/sessions/${encodeURIComponent(session_id)}`, {
      method: "DELETE",
    });
    const raw = await res.text();
    return new Response(raw, {
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

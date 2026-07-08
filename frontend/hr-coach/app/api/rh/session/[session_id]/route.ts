export const runtime = "nodejs";

import fs from "node:fs/promises";
import path from "node:path";
import { markSessionDeleted, readSessionOverrides, updateSessionOverride } from "../../../../../lib/sessionOverrides";
import { rhBackendUrls } from "../../../../../lib/rhBackend";

type RouteParams = {
  params: Promise<{ session_id: string }>;
};

function backendUrls() {
  return rhBackendUrls("interview");
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
    path.resolve(process.cwd(), "../../backend/hr-coach/data/sessions", filename),
    path.resolve(process.cwd(), "../../../backend/hr-coach/data/sessions", filename),
    path.resolve(process.cwd(), "backend/hr-coach/data/sessions", filename),
  ];

  for (const sessionPath of candidatePaths) {
    try {
      const raw = await fs.readFile(sessionPath, "utf8");
      const session = JSON.parse(raw);
      if (session?.session_id !== sessionId || !hasUsableSessionDetails(session)) continue;

      const overrides = await readSessionOverrides();
      const override = overrides[sessionId];
      if (override?.deleted) {
        return {
          ...session,
          interview_status: "archived",
          title: typeof override.title === "string" ? override.title : session.title || "Session",
          pinned: typeof override.pinned === "boolean" ? override.pinned : false,
          archived: true,
        };
      }

      return {
        ...session,
        title: typeof override?.title === "string" ? override.title : session.title,
        pinned: typeof override?.pinned === "boolean" ? override.pinned : Boolean(session.pinned),
        archived: typeof override?.archived === "boolean" ? override.archived : Boolean(session.archived),
      };
    } catch {
      // Try the next likely workspace layout.
    }
  }

  return null;
}

async function dashboardSessionFallback(baseUrl: string, sessionId: string) {
  const res = await fetch(`${baseUrl}/rh/dashboard?limit=300&days=365`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = await res.json();
  const sessions = Array.isArray(data?.recent_sessions) ? data.recent_sessions : [];
  const session = sessions.find((item: { session_id?: string }) => item.session_id === sessionId);
  if (!session) return null;

  const overrides = await readSessionOverrides();
  const override = overrides[sessionId];
  if (override?.deleted) {
    return {
      session_id: sessionId,
      turns_count: 0,
      turns: [],
      final_report: null,
      cv_uploaded: false,
      cv_profile: {
        candidate_name: "Candidate",
        name: "Candidate",
        headline: "",
        source_filename: "Session",
        skills: [],
      },
      response_language: "fr",
      updated_at: "",
      interview_status: "archived",
      title: typeof override.title === "string" ? override.title : "Session",
      pinned: typeof override.pinned === "boolean" ? override.pinned : false,
      archived: true,
    };
  }

  const title = typeof override?.title === "string"
    ? override.title
    : session.title || session.headline || session.candidate_name || "Session";

  return {
    session_id: sessionId,
    turns_count: session.turns_count || 0,
    turns: [],
    final_report: session.score_total !== null && session.score_total !== undefined
      ? {
          summary: title,
          score_total: session.score_total,
        }
      : null,
    cv_uploaded: true,
    cv_profile: {
      candidate_name: session.candidate_name || "Candidate",
      name: session.candidate_name || "Candidate",
      headline: session.headline || "",
      source_filename: title,
      skills: session.top_skills || [],
    },
    response_language: session.response_language || "fr",
    updated_at: session.updated_at || "",
    interview_status: session.status || "active",
    title,
    pinned: typeof override?.pinned === "boolean" ? override.pinned : Boolean(session.pinned),
    archived: typeof override?.archived === "boolean" ? override.archived : Boolean(session.archived),
  };
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
  if (!session || typeof session !== "object") return null;

  const overrides = await readSessionOverrides();
  const override = overrides[sessionId];
  if (override?.deleted) {
    return {
      ...session,
      interview_status: "archived",
      title: typeof override.title === "string" ? override.title : session.title || "Session",
      pinned: typeof override.pinned === "boolean" ? override.pinned : false,
      archived: true,
    };
  }

  return {
    ...session,
    title: typeof override?.title === "string" ? override.title : session.title,
    pinned: typeof override?.pinned === "boolean" ? override.pinned : Boolean(session.pinned),
    archived: typeof override?.archived === "boolean" ? override.archived : Boolean(session.archived),
  };
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

  try {
    const fallback = await localSessionFallback(session_id);
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

  for (const baseUrl of backendUrls()) {
    try {
      const fallback = await dashboardSessionFallback(baseUrl, session_id);
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

  const overrides = await readSessionOverrides();
  const override = overrides[session_id];
  return Response.json(
    {
      session_id,
      turns_count: 0,
      turns: [],
      final_report: null,
      cv_uploaded: false,
      cv_profile: {
        candidate_name: "Candidate",
        name: "Candidate",
        headline: "",
        source_filename: typeof override?.title === "string" ? override.title : "Session",
        skills: [],
      },
      response_language: language || "fr",
      updated_at: "",
      interview_status: override?.deleted ? "archived" : "active",
      title: typeof override?.title === "string" ? override.title : "Session",
      pinned: typeof override?.pinned === "boolean" ? override.pinned : false,
      archived: typeof override?.archived === "boolean" ? override.archived : Boolean(override?.deleted),
      warning: lastError || "Session detail route is unavailable; using local fallback.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { session_id } = await params;
  const payload = await request.json();

  try {
    const res = await fetch(`${backendUrls()[0]}/rh/sessions/${encodeURIComponent(session_id)}/meta`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    if (!res.ok && raw.includes("Route is not exposed by this microservice")) {
      const override = await updateSessionOverride(session_id, payload);
      return Response.json({ ok: true, session_id, override });
    }

    return new Response(raw, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const override = await updateSessionOverride(session_id, payload);
    return Response.json({ ok: true, session_id, override, warning: (error as Error).message });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { session_id } = await params;

  try {
    const res = await fetch(`${backendUrls()[0]}/rh/sessions/${encodeURIComponent(session_id)}`, {
      method: "DELETE",
    });
    const raw = await res.text();
    if (!res.ok && raw.includes("Route is not exposed by this microservice")) {
      const override = await markSessionDeleted(session_id);
      return Response.json({ ok: true, session_id, override });
    }

    return new Response(raw, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const override = await markSessionDeleted(session_id);
    return Response.json({ ok: true, session_id, override, warning: (error as Error).message });
  }
}

export const runtime = "nodejs";

import { applySessionOverrides, readSessionOverrides } from "../../../../lib/sessionOverrides";
import { rhBackendUrls } from "../../../../lib/rhBackend";

type DashboardSession = {
  session_id?: string;
  candidate_key?: string;
  candidate_name?: string;
  headline?: string;
  updated_at?: string;
  turns_count?: number;
  score_total?: number | null;
  status?: "completed" | "active" | "draft";
  title?: string;
  response_language?: string;
  pinned?: boolean;
  archived?: boolean;
  top_skills?: string[];
};

async function buildHistoryFromDashboard(sessions: DashboardSession[]) {
  const normalizedSessions = sessions.map((session) => ({
    session_id: session.session_id || "",
    candidate_key: session.candidate_key || session.candidate_name || "candidate",
    candidate_name: session.candidate_name || "Candidate",
    headline: session.headline || "",
    updated_at: session.updated_at || "",
    turns_count: session.turns_count || 0,
    score_total: typeof session.score_total === "number" ? session.score_total : null,
    status: session.status || "active",
    title: session.title || session.headline || session.candidate_name || "Session",
    preview: (session.top_skills || []).slice(0, 4).join(", "),
    response_language: session.response_language || "fr",
    pinned: Boolean(session.pinned),
    archived: Boolean(session.archived),
    title_customized: false,
  }));

  const overrides = await readSessionOverrides();
  const visibleSessions = applySessionOverrides(normalizedSessions, overrides);

  const groups = new Map<string, typeof visibleSessions>();
  visibleSessions.forEach((session) => {
    const list = groups.get(session.candidate_key) || [];
    list.push(session);
    groups.set(session.candidate_key, list);
  });

  const candidates = Array.from(groups.entries()).map(([candidateKey, candidateSessions]) => {
    const completedScores = candidateSessions
      .map((session) => session.score_total)
      .filter((score): score is number => typeof score === "number");
    const latestScore = completedScores[0] ?? null;
    const previousScore = completedScores[1] ?? null;
    const delta = latestScore !== null && previousScore !== null ? latestScore - previousScore : null;

    return {
      candidate_key: candidateKey,
      candidate_name: candidateSessions[0]?.candidate_name || "Candidate",
      headline: candidateSessions[0]?.headline || "",
      latest_updated_at: candidateSessions[0]?.updated_at || "",
      sessions_count: candidateSessions.length,
      progression: {
        latest_score: latestScore,
        previous_score: previousScore,
        delta,
        label:
          delta === null
            ? completedScores.length ? "first_completed_session" : "no_completed_session"
            : delta > 0
              ? "improving"
              : delta < 0
                ? "declining"
                : "stable",
      },
      sessions: candidateSessions,
    };
  });

  return {
    candidates,
    sessions: visibleSessions,
    total_candidates: candidates.length,
    total_sessions: visibleSessions.length,
  };
}

async function dashboardHistoryFallback(baseUrl: string, limit: string) {
  const res = await fetch(`${baseUrl}/rh/dashboard?limit=${encodeURIComponent(limit)}&days=365`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  const sessions = Array.isArray(data?.recent_sessions) ? data.recent_sessions : [];
  return buildHistoryFromDashboard(sessions);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "60";
  const backendUrls = rhBackendUrls("interview");
  let lastError = "";

  for (const baseUrl of backendUrls) {
    try {
      const res = await fetch(`${baseUrl}/rh/sessions?limit=${encodeURIComponent(limit)}`, {
        method: "GET",
        cache: "no-store",
      });
      const raw = await res.text();

      if (!res.ok && raw.includes("Route is not exposed by this microservice")) {
        lastError = raw;
        continue;
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

  for (const baseUrl of backendUrls) {
    try {
      const fallback = await dashboardHistoryFallback(baseUrl, limit);
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

  return Response.json({ error: lastError || "Unable to reach RH sessions backend." }, { status: 500 });
}

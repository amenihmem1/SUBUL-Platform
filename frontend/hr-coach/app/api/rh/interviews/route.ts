export const runtime = "nodejs";

import { createLocalInterview, listLocalInterviews } from "../../../../lib/localInterviewStore";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || "http://127.0.0.1:8001";
}

function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  try {
    const res = await fetch(`${backendBaseUrl()}/rh/interviews`, {
      method: "GET",
      cache: "no-store",
    });
    const raw = await res.text();
    if (!res.ok) {
      return jsonResponse(await listLocalInterviews());
    }
    return new Response(raw, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    void error;
    return jsonResponse(await listLocalInterviews());
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));

  try {
    const res = await fetch(`${backendBaseUrl()}/rh/interviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    if (!res.ok) {
      return jsonResponse(await createLocalInterview(payload));
    }
    return new Response(raw, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse(await createLocalInterview(payload));
  }
}

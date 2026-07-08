export const runtime = "nodejs";

import { deleteLocalInterview, updateLocalInterview } from "../../../../../lib/localInterviewStore";

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

type RouteParams = {
  params: Promise<{ interview_id: string }>;
};

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { interview_id } = await params;

  try {
    const res = await fetch(`${backendBaseUrl()}/rh/interviews/${encodeURIComponent(interview_id)}`, {
      method: "DELETE",
    });
    const raw = await res.text();
    if (!res.ok) {
      return jsonResponse(await deleteLocalInterview(interview_id));
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
    return jsonResponse(await deleteLocalInterview(interview_id));
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { interview_id } = await params;
  const payload = await request.json().catch(() => ({}));

  try {
    const res = await fetch(`${backendBaseUrl()}/rh/interviews/${encodeURIComponent(interview_id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    if (!res.ok) {
      return jsonResponse(await updateLocalInterview(interview_id, payload));
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
    return jsonResponse(await updateLocalInterview(interview_id, payload));
  }
}

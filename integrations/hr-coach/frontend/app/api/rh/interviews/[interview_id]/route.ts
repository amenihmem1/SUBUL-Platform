export const runtime = "nodejs";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
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

export async function PATCH(request: Request, { params }: RouteParams) {
  const { interview_id } = await params;

  try {
    const payload = await request.json();
    const res = await fetch(`${backendBaseUrl()}/rh/interviews/${encodeURIComponent(interview_id)}`, {
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

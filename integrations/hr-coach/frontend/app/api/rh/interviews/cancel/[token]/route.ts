export const runtime = "nodejs";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

type RouteParams = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;

  try {
    const res = await fetch(`${backendBaseUrl()}/rh/interviews/cancel/${encodeURIComponent(token)}`, {
      method: "GET",
      cache: "no-store",
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

export async function POST(_request: Request, { params }: RouteParams) {
  const { token } = await params;

  try {
    const res = await fetch(`${backendBaseUrl()}/rh/interviews/cancel/${encodeURIComponent(token)}`, {
      method: "POST",
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

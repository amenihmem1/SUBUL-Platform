import { NextResponse } from "next/server";

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
    const payload = await request.json();
    const res = await fetch(`${backendBaseUrl()}/rh/sessions/${encodeURIComponent(session_id)}/proctoring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const raw = await res.text();
    let data: unknown = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { detail: raw || "Backend returned a non-JSON response." };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

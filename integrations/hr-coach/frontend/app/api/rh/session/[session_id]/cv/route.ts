import { NextResponse } from "next/server";

export const runtime = "nodejs";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

export async function POST(
  request: Request,
  { params }: { params: { session_id: string } }
) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Field 'file' is required." }, { status: 400 });
    }

    const forward = new FormData();
    forward.append("file", file, file.name);

    const res = await fetch(`${backendBaseUrl()}/rh/sessions/${encodeURIComponent(params.session_id)}/cv`, {
      method: "POST",
      body: forward,
    });

    const raw = await res.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {
        error: raw || `Backend returned an empty response with status ${res.status}.`,
      };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

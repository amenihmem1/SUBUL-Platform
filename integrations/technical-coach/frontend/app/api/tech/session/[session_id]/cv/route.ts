import { backendBaseUrl } from "@/lib/techBackend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ session_id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { session_id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Field 'file' is required." }, { status: 400 });
    }

    const forward = new FormData();
    forward.append("file", file, file.name);

    const backendUrl = `${backendBaseUrl()}/tech/sessions/${encodeURIComponent(session_id)}/cv`;
    console.log("[api/tech/session/[id]/cv] Uploading to:", backendUrl);

    const res = await fetch(backendUrl, {
      method: "POST",
      body: forward,
    });

    console.log("[api/tech/session/[id]/cv] Backend status:", res.status);

    const responseText = await res.text();

    if (!res.ok) {
      const errorText = responseText || res.statusText || "Unknown backend error";
      console.error("[api/tech/session/[id]/cv] Backend error response:", errorText);
      return NextResponse.json(
        { error: `Backend returned ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    let data: unknown;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      return NextResponse.json(
        { error: responseText || "Backend returned a non-JSON response." },
        { status: 502 }
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[api/tech/session/[id]/cv] Exception:", errorMsg, error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { rhBackendUrls } from "../../../../../../lib/rhBackend";

export const runtime = "nodejs";

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

    let lastError = "";
    for (const baseUrl of rhBackendUrls("interview")) {
      try {
        const res = await fetch(`${baseUrl}/rh/sessions/${encodeURIComponent(params.session_id)}/cv`, {
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

        if (!res.ok && raw.includes("Route is not exposed by this microservice")) {
          lastError = raw;
          continue;
        }

        return NextResponse.json(data, { status: res.status });
      } catch (error) {
        lastError = `${baseUrl}: ${(error as Error).message}`;
      }
    }

    return NextResponse.json({ error: "Unable to reach RH interview backend.", detail: lastError }, { status: 502 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

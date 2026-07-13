import { backendBaseUrl } from "@/lib/techBackend";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ session_id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  const { session_id } = await params;
  const res = await fetch(`${backendBaseUrl()}/tech/sessions/${encodeURIComponent(session_id)}/report.pdf`, {
    method: "GET",
  });
  if (!res.ok) {
    const body = await res.text();
    return new Response(body || "PDF unavailable", { status: res.status });
  }
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${session_id}-technical-report.pdf"`,
    },
  });
}

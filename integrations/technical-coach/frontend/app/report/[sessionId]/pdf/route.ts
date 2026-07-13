import { backendBaseUrl } from "@/lib/techBackend";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  const { sessionId } = await params;
  const res = await fetch(`${backendBaseUrl()}/tech/sessions/${encodeURIComponent(sessionId)}/report.pdf`, {
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
      "Content-Disposition": `inline; filename="${sessionId}-technical-report.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

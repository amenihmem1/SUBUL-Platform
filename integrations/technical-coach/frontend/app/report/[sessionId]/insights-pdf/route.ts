import { backendBaseUrl } from "@/lib/techBackend";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  const requestUrl = new URL(request.url);
  const language = requestUrl.searchParams.get("language");
  const querySuffix = language ? `?language=${encodeURIComponent(language)}` : "";
  const res = await fetch(`${backendBaseUrl()}/tech/sessions/${encodeURIComponent(sessionId)}/insights-report.pdf${querySuffix}`, {
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
      "Content-Disposition": `inline; filename="${sessionId}-insights-visuels-vocaux.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

export const runtime = "nodejs";

function reportingBackendUrls() {
  return Array.from(new Set([
    process.env.TECH_REPORTING_API_BASE_URL,
    process.env.TECH_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    "http://technical-coach-reporting:8000",
    "http://reporting-service:8000",
    "http://127.0.0.1:8004",
  ].filter(Boolean) as string[]));
}

async function fetchReport(pathname: string) {
  let lastBody = "PDF unavailable";
  let lastStatus = 502;

  for (const baseUrl of reportingBackendUrls()) {
    try {
      const res = await fetch(`${baseUrl}${pathname}`, { method: "GET" });
      if (res.ok) return await res.arrayBuffer();
      lastStatus = res.status;
      lastBody = (await res.text()) || lastBody;
    } catch (error) {
      lastStatus = 502;
      lastBody = (error as Error).message || lastBody;
    }
  }

  return new Response(lastBody, { status: lastStatus });
}

type RouteParams = {
  params: Promise<{ session_id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  const { session_id } = await params;
  const result = await fetchReport(`/tech/sessions/${encodeURIComponent(session_id)}/report.pdf`);
  if (result instanceof Response) return result;
  return new Response(result, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${session_id}-technical-report.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

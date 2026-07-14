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
  request: Request,
  { params }: RouteParams
) {
  const { session_id } = await params;
  const requestUrl = new URL(request.url);
  const language = requestUrl.searchParams.get("language");
  const querySuffix = language ? `?language=${encodeURIComponent(language)}` : "";
  const result = await fetchReport(`/tech/sessions/${encodeURIComponent(session_id)}/insights-report.pdf${querySuffix}`);
  if (result instanceof Response) return result;
  return new Response(result, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${session_id}-insights-visuels-vocaux.pdf"`,
    },
  });
}

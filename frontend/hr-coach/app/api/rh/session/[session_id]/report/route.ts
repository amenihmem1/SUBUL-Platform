export const runtime = "nodejs";

function reportingBackendUrls() {
  return Array.from(new Set([
    process.env.RH_REPORTING_API_BASE_URL,
    process.env.RH_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    "http://hr-coach-reporting:8000",
    "http://reporting-service:8000",
    "http://127.0.0.1:8204",
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

export async function GET(
  _request: Request,
  { params }: { params: { session_id: string } }
) {
  const result = await fetchReport(`/rh/sessions/${encodeURIComponent(params.session_id)}/report.pdf`);
  if (result instanceof Response) return result;
  return new Response(result, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${params.session_id}-rapport-rh.pdf"`,
    },
  });
}

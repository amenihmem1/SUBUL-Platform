export const runtime = "nodejs";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

export async function GET(
  _request: Request,
  { params }: { params: { session_id: string } }
) {
  const res = await fetch(`${backendBaseUrl()}/rh/sessions/${encodeURIComponent(params.session_id)}/report.pdf`, {
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
      "Content-Disposition": `attachment; filename="${params.session_id}-rapport-rh.pdf"`,
    },
  });
}

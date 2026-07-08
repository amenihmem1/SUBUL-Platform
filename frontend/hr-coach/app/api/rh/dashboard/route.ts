export const runtime = "nodejs";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "200";
  const days = searchParams.get("days") || "7";
  const backendUrls = Array.from(new Set([backendBaseUrl(), "http://127.0.0.1:8001"]));
  let lastError = "";

  for (const baseUrl of backendUrls) {
    try {
      const res = await fetch(`${baseUrl}/rh/dashboard?limit=${encodeURIComponent(limit)}&days=${encodeURIComponent(days)}`, {
        method: "GET",
        cache: "no-store",
      });
      const raw = await res.text();
      return new Response(raw, {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      lastError = (error as Error).message;
    }
  }

  return Response.json({ error: lastError || "Unable to reach RH dashboard backend." }, { status: 500 });
}

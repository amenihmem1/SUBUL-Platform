import { NextResponse } from "next/server";

export const runtime = "nodejs";

function backendBaseUrl() {
  return process.env.RH_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

function mediaBaseUrl() {
  return process.env.RH_MEDIA_BASE_URL || process.env.MEDIA_SERVICE_URL || backendBaseUrl();
}

function normalizeSttLanguage(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "fr" || normalized === "en" || normalized === "multi") {
    return normalized;
  }
  return "";
}

function cleanBackendError(raw: string, status: number) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return `Media service returned an empty response with status ${status}.`;
  }
  if (trimmed.toLowerCase().startsWith("<html")) {
    return "Le service micro est temporairement indisponible. Reessayez dans quelques secondes.";
  }
  return trimmed;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const requestedLanguage = normalizeSttLanguage(form.get("language"));
    const configuredLanguage = normalizeSttLanguage(process.env.STT_LANGUAGE);
    const language = requestedLanguage || configuredLanguage || "fr";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Field 'file' is required." }, { status: 400 });
    }

    const forward = new FormData();
    forward.append("file", file, file.name || "recording.webm");
    forward.append("language", language);

    const res = await fetch(`${mediaBaseUrl()}/rh/stt`, {
      method: "POST",
      body: forward,
    });
    const raw = await res.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {
        error: cleanBackendError(raw, res.status),
      };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

type RhService = "interview" | "calendar" | "analytics" | "media" | "reporting";

const dockerServiceUrls: Record<RhService, string[]> = {
  interview: [
    "http://ai-agent-interview-service-1:8000",
    "http://hr-coach-interview:8000",
    "http://interview-service:8000",
  ],
  calendar: [
    "http://ai-agent-calendar-service-1:8000",
    "http://hr-coach-calendar:8000",
    "http://calendar-service:8000",
  ],
  analytics: [
    "http://ai-agent-analytics-service-1:8000",
    "http://hr-coach-analytics:8000",
    "http://analytics-service:8000",
  ],
  media: [
    "http://ai-agent-media-service:8000",
    "http://ai-agent-media-service-1:8000",
    "http://hr-coach-media:8000",
    "http://media-service:8000",
  ],
  reporting: [
    "http://ai-agent-reporting-service-1:8000",
    "http://hr-coach-reporting:8000",
    "http://reporting-service:8000",
  ],
};

const hostServiceUrls: Record<RhService, string[]> = {
  interview: ["http://127.0.0.1:8200"],
  calendar: ["http://127.0.0.1:8201"],
  analytics: ["http://127.0.0.1:8202"],
  media: ["http://127.0.0.1:8203"],
  reporting: ["http://127.0.0.1:8204"],
};

function normalizeUrl(value?: string | null) {
  const clean = String(value || "").trim().replace(/\/+$/, "");
  return clean || null;
}

function looksLikeRhBackend(value: string) {
  return /(:8000|:8099|:810[0-4]|rh|coach|interview|calendar|analytics|media|reporting)/i.test(value);
}

export function rhBackendUrls(service: RhService = "interview") {
  const explicit = [
    process.env.RH_API_BASE_URL,
    process.env[`RH_${service.toUpperCase()}_API_BASE_URL`],
  ]
    .map(normalizeUrl)
    .filter((value): value is string => Boolean(value));

  const genericPublic = normalizeUrl(process.env.NEXT_PUBLIC_API_URL);
  const publicRhFallback = genericPublic && looksLikeRhBackend(genericPublic) ? [genericPublic] : [];

  return Array.from(
    new Set([
      ...explicit,
      "http://127.0.0.1:8099",
      ...dockerServiceUrls[service],
      ...hostServiceUrls[service],
      ...publicRhFallback,
    ]),
  );
}

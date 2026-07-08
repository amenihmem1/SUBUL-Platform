"use client";

import { useEffect, useState } from "react";

export type PlatformLanguage = "fr" | "en";

const STORAGE_KEYS = ["subul-locale", "dashboard-language"] as const;

function normalizeLanguage(value: unknown): PlatformLanguage | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "fr" || normalized.startsWith("fr-") || normalized === "french") return "fr";
  if (normalized === "en" || normalized.startsWith("en-") || normalized === "english") return "en";
  return null;
}

function readPlatformLanguage(defaultLanguage: PlatformLanguage): PlatformLanguage {
  if (typeof window === "undefined") return defaultLanguage;

  const params = new URLSearchParams(window.location.search);
  const fromParams =
    normalizeLanguage(params.get("locale")) ||
    normalizeLanguage(params.get("lang")) ||
    normalizeLanguage(params.get("language"));
  if (fromParams) return fromParams;

  for (const key of STORAGE_KEYS) {
    const stored = normalizeLanguage(window.localStorage.getItem(key));
    if (stored) return stored;
  }

  return normalizeLanguage(document.documentElement.lang) || defaultLanguage;
}

export function usePlatformLanguage(defaultLanguage: PlatformLanguage = "fr") {
  const [language, setLanguage] = useState<PlatformLanguage>(defaultLanguage);

  useEffect(() => {
    setLanguage(readPlatformLanguage(defaultLanguage));

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { locale?: unknown; lang?: unknown; language?: unknown; type?: unknown } | null;
      const nextLanguage =
        normalizeLanguage(data?.locale) ||
        normalizeLanguage(data?.lang) ||
        normalizeLanguage(data?.language);

      if (nextLanguage) setLanguage(nextLanguage);
    };

    window.addEventListener("message", handleMessage);
    try {
      window.parent?.postMessage({ type: "SUBUL_HR_COACH_READY" }, "*");
    } catch {
      // Parent sync is best-effort when the coach runs standalone.
    }

    return () => window.removeEventListener("message", handleMessage);
  }, [defaultLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboard-language", language);
    document.documentElement.lang = language;
  }, [language]);

  return language;
}

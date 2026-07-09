"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

const TECHNICAL_COACH_URL =
  process.env.NEXT_PUBLIC_TECHNICAL_COACH_URL || "http://localhost:8082";
const START_COMMAND = "docker compose -f docker-compose.technical-coach.yml up --build";

function withPlatformParams(rawUrl: string, locale: string) {
  const fallbackBase = "http://subul.local";
  const url = new URL(rawUrl, fallbackBase);
  url.searchParams.set("locale", locale);
  url.searchParams.set("lang", locale);
  url.searchParams.set("hideLanguageSwitcher", "1");

  if (rawUrl.startsWith("/")) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return url.toString();
}

function LearnerTechnicalCoachFrame() {
  const { locale } = useLanguage();
  const searchParams = useSearchParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loaded, setLoaded] = useState(false);
  const [showStartupHint, setShowStartupHint] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const technicalCoachUrl = useMemo(() => {
    const url = withPlatformParams(TECHNICAL_COACH_URL, locale);
    const parsed = new URL(url, "http://subul.local");
    const requestedPath = searchParams.get("path");
    if (requestedPath && requestedPath.startsWith("/") && !requestedPath.startsWith("//")) {
      parsed.pathname = requestedPath;
    }
    parsed.searchParams.set("theme", theme);
    parsed.searchParams.set("hideThemeSwitcher", "1");
    return url.startsWith("/") ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
  }, [locale, searchParams, theme]);

  const syncPlatformState = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "SUBUL_PLATFORM_STATE",
        locale,
        theme,
        hideLanguageSwitcher: true,
        hideThemeSwitcher: true,
      },
      "*",
    );
  }, [locale, theme]);

  useEffect(() => {
    syncPlatformState();
  }, [syncPlatformState]);

  useEffect(() => {
    setLoaded(false);
    setShowStartupHint(false);
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        await fetch(technicalCoachUrl, { mode: "no-cors", cache: "no-store" });
        if (!cancelled) setShowStartupHint(false);
      } catch {
        if (!cancelled) setShowStartupHint(true);
      }
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [technicalCoachUrl, reloadToken]);

  useEffect(() => {
    const readTheme = () => {
      const storedTheme = window.localStorage.getItem("subul-theme");
      setTheme(storedTheme === "dark" ? "dark" : "light");
    };

    const onThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<{ theme?: string }>).detail?.theme;
      setTheme(nextTheme === "dark" ? "dark" : "light");
    };

    readTheme();
    window.addEventListener("SUBUL_PLATFORM_THEME_CHANGE", onThemeChange);
    window.addEventListener("storage", readTheme);
    return () => {
      window.removeEventListener("SUBUL_PLATFORM_THEME_CHANGE", onThemeChange);
      window.removeEventListener("storage", readTheme);
    };
  }, []);

  return (
    <section className="relative flex h-[calc(100vh-6rem)] min-h-[640px] flex-col overflow-hidden">
      <iframe
        key={reloadToken}
        ref={iframeRef}
        title="Subul Technical Coach"
        src={technicalCoachUrl}
        onLoad={() => {
          setLoaded(true);
          setShowStartupHint(false);
          syncPlatformState();
        }}
        className="min-h-0 flex-1 border-0 bg-white"
        allow="camera; microphone; clipboard-read; clipboard-write"
      />
      {showStartupHint && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 p-6">
          <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Subul Technical Coach n'est pas lance</h2>
            <p className="mt-2 text-sm text-slate-600">
              Le menu est integre, mais l'application technique doit tourner sur{" "}
              <span className="font-semibold text-slate-900">{TECHNICAL_COACH_URL}</span>.
            </p>
            <code className="mt-4 block rounded-xl bg-slate-950 px-4 py-3 text-left text-xs font-semibold text-white">
              {START_COMMAND}
            </code>
            <button
              type="button"
              onClick={() => {
                setShowStartupHint(false);
                setLoaded(false);
                setReloadToken((value) => value + 1);
              }}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700"
            >
              Reessayer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function LearnerTechnicalCoachPage() {
  return (
    <Suspense fallback={null}>
      <LearnerTechnicalCoachFrame />
    </Suspense>
  );
}

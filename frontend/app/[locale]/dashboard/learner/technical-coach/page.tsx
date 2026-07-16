"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

const TECHNICAL_COACH_URL =
  process.env.NEXT_PUBLIC_TECHNICAL_COACH_URL || "http://localhost:8082";
const TECHNICAL_COACH_PUBLIC_URL =
  process.env.NEXT_PUBLIC_TECHNICAL_COACH_PUBLIC_URL ||
  "https://technical-coach-frontend.bravesand-e5d986f3.francecentral.azurecontainerapps.io";
const START_COMMAND = "docker compose -f docker-compose.technical-coach.yml up --build";

function getTechnicalCoachBaseUrl() {
  return TECHNICAL_COACH_URL.startsWith("/") ? TECHNICAL_COACH_PUBLIC_URL : TECHNICAL_COACH_URL;
}

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
  const [frameHeight, setFrameHeight] = useState(720);
  const [allowIframeScroll, setAllowIframeScroll] = useState(false);
  const lastSearchRef = useRef("");
  const ignoreReportMessagesUntilRef = useRef(0);

  useEffect(() => {
    if (searchParams.get("path") !== "/") return;
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("path");
    const nextQuery = nextParams.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
  }, [searchParams]);

  const technicalCoachUrl = useMemo(() => {
    const url = withPlatformParams(getTechnicalCoachBaseUrl(), locale);
    const parsed = new URL(url, "http://subul.local");
    const requestedPath = searchParams.get("path");
    const reportSessionId = searchParams.get("reportSession") || searchParams.get("sessionId");
    const reportView = searchParams.get("view");
    const basePath = parsed.pathname.replace(/\/$/, "");
    const targetPath = requestedPath && requestedPath !== "/" ? requestedPath : "/";

    if (reportSessionId) {
      parsed.pathname = `${basePath}/report/${encodeURIComponent(reportSessionId)}`;
      parsed.searchParams.set("view", reportView === "insights" ? "insights" : "report");
    } else if (targetPath === "/") {
      parsed.pathname = basePath || "/";
    } else if (targetPath.startsWith("/") && !targetPath.startsWith("//")) {
      parsed.pathname = targetPath.startsWith(basePath)
        ? targetPath
        : `${basePath}${targetPath}`;
    }

    parsed.searchParams.set("theme", theme);
    parsed.searchParams.set("hideThemeSwitcher", "1");
    parsed.searchParams.set("embedded", "1");
    return url.startsWith("/") ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
  }, [locale, searchParams, theme]);

  useEffect(() => {
    const currentSearch = searchParams.toString();
    if (lastSearchRef.current && currentSearch !== lastSearchRef.current) {
      const nextParams = new URLSearchParams(currentSearch);
      const requestedCoachPath = nextParams.get("path");
      if (requestedCoachPath && requestedCoachPath !== "/") {
        ignoreReportMessagesUntilRef.current = Date.now() + 1200;
      }
    }
    lastSearchRef.current = currentSearch;
  }, [searchParams]);

  const syncPlatformState = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "SUBUL_PLATFORM_STATE",
        locale,
        theme,
        hideLanguageSwitcher: true,
        hideThemeSwitcher: true,
        embedded: true,
      },
      "*",
    );
  }, [locale, theme]);


  const syncSelectedReportFromFrame = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const frameLocation = iframe.contentWindow?.location;
      if (!frameLocation) return;

      const reportMatch = frameLocation.pathname.match(/\/report\/([^/?#]+)/);
      if (!reportMatch?.[1]) return;

      const nextParams = new URLSearchParams(window.location.search);
      const requestedCoachPath = nextParams.get("path");
      if (requestedCoachPath && requestedCoachPath !== "/") return;
      const frameParams = new URLSearchParams(frameLocation.search);
      const selectedSessionId = decodeURIComponent(reportMatch[1]);
      const reportView = frameParams.get("view") === "insights" ? "insights" : "report";
      if ((nextParams.get("reportSession") || nextParams.get("sessionId")) === selectedSessionId && nextParams.get("view") === "insights" && reportView === "report") return;
      nextParams.delete("path");
      nextParams.delete("session");
      nextParams.delete("sessionId");
      nextParams.set("reportSession", selectedSessionId);
      nextParams.set("view", reportView);

      const nextQuery = nextParams.toString();
      const nextUrl = window.location.pathname + (nextQuery ? `?${nextQuery}` : "");
      const currentUrl = window.location.pathname + window.location.search;

      if (nextUrl !== currentUrl) {
        window.history.replaceState(null, "", nextUrl);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    } catch {
      // The iframe can be cross-origin in local setups; in that case the selected session cannot be inferred here.
    }
  }, []);

  const resizeFrame = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const frameUrl = new URL(technicalCoachUrl, "http://subul.local");
    const isReportFrame = frameUrl.pathname.includes("/report/");
    const reportMinHeight = frameUrl.searchParams.get("view") === "insights" ? 3600 : 2600;
    const minFrameHeight = isReportFrame ? reportMinHeight : 640;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      const body = doc?.body;
      const html = doc?.documentElement;
      if (!body || !html) return;
      const nextHeight = Math.max(
        minFrameHeight,
        Math.ceil(
          Math.max(
            body.scrollHeight,
            html.scrollHeight,
            body.offsetHeight,
            html.offsetHeight,
            body.clientHeight,
            html.clientHeight,
          ),
        ),
      );
      setAllowIframeScroll(false);
      setFrameHeight((current) => (Math.abs(current - nextHeight) > 8 ? nextHeight : current));
    } catch {
      setAllowIframeScroll(false);
      setFrameHeight(Math.max(minFrameHeight, window.innerHeight - 96));
    }
  }, [technicalCoachUrl]);

  useEffect(() => {
    syncPlatformState();
  }, [syncPlatformState]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; coach?: string; sessionId?: string; view?: string };
      if (data?.type !== "SUBUL_COACH_SELECTED_REPORT" || data.coach !== "technical" || !data.sessionId) return;

      const nextParams = new URLSearchParams(window.location.search);
      const requestedCoachPath = nextParams.get("path");
      if (requestedCoachPath && requestedCoachPath !== "/" && Date.now() < ignoreReportMessagesUntilRef.current) return;
      const currentReportSession = nextParams.get("reportSession") || nextParams.get("sessionId");
      const reportView = data.view === "insights" ? "insights" : "report";
      if (currentReportSession === data.sessionId && nextParams.get("view") === "insights" && reportView === "report") return;
      nextParams.delete("path");
      nextParams.delete("session");
      nextParams.delete("sessionId");
      nextParams.set("reportSession", data.sessionId);
      nextParams.set("view", reportView);

      const nextQuery = nextParams.toString();
      const nextUrl = window.location.pathname + (nextQuery ? `?${nextQuery}` : "");
      const currentUrl = window.location.pathname + window.location.search;

      if (nextUrl !== currentUrl) {
        window.history.replaceState(null, "", nextUrl);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  useEffect(() => {
    syncSelectedReportFromFrame();
    const interval = window.setInterval(syncSelectedReportFromFrame, 700);
    return () => window.clearInterval(interval);
  }, [reloadToken, syncSelectedReportFromFrame, technicalCoachUrl]);

  useEffect(() => {
    resizeFrame();
    const interval = window.setInterval(resizeFrame, 700);
    window.addEventListener("resize", resizeFrame);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", resizeFrame);
    };
  }, [reloadToken, resizeFrame, technicalCoachUrl]);

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
    <section className="relative flex min-h-[640px] w-full min-w-0 flex-col overflow-visible">
      <iframe
        key={`${reloadToken}-${technicalCoachUrl}`}
        ref={iframeRef}
        title="Subul Technical Coach"
        src={technicalCoachUrl}
        onLoad={() => {
          setLoaded(true);
          setShowStartupHint(false);
          syncPlatformState();
          resizeFrame();
          syncSelectedReportFromFrame();
          window.setTimeout(resizeFrame, 250);
          window.setTimeout(resizeFrame, 900);
          window.setTimeout(syncSelectedReportFromFrame, 250);
          window.setTimeout(syncSelectedReportFromFrame, 900);
        }}
        className="block w-full min-w-0 border-0 bg-white"
        style={{ height: frameHeight }}
        scrolling={allowIframeScroll ? "auto" : "no"}
        allow="camera; microphone; clipboard-read; clipboard-write"
      />
      {showStartupHint && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 p-6">
          <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Subul Technical Coach n'est pas lance</h2>
            <p className="mt-2 text-sm text-slate-600">
              Le menu est integre, mais l'application technique doit tourner sur{" "}
              <span className="font-semibold text-slate-900">{getTechnicalCoachBaseUrl()}</span>.
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

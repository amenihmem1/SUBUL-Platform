"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

const HR_COACH_URL = process.env.NEXT_PUBLIC_HR_COACH_URL || "/hr-coach-app";
const START_COMMAND = "cd frontend/hr-coach && npx next dev --hostname 0.0.0.0 -p 8083";

function withPlatformLanguageParams(rawUrl: string, locale: string) {
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

function LearnerHrCoachFrame() {
  const { locale } = useLanguage();
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loaded, setLoaded] = useState(false);
  const [showStartupHint, setShowStartupHint] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [frameHeight, setFrameHeight] = useState(720);
  const [allowIframeScroll, setAllowIframeScroll] = useState(false);

  const hrCoachUrl = useMemo(() => {
    const url = withPlatformLanguageParams(HR_COACH_URL, locale);
    const parsed = new URL(url, "http://subul.local");
    const requestedPath = searchParams.get("path");
    const sessionId = searchParams.get("session");
    const reportSessionId = searchParams.get("reportSession") || searchParams.get("sessionId");
    const reportView = searchParams.get("view");
    const basePath = parsed.pathname.replace(/\/$/, "");

    if (reportSessionId) {
      parsed.pathname = `${basePath}/report/${encodeURIComponent(reportSessionId)}`;
      parsed.searchParams.delete("session");
      parsed.searchParams.set("view", reportView === "insights" ? "insights" : "rh");
    } else if (requestedPath && requestedPath.startsWith("/") && !requestedPath.startsWith("//")) {
      parsed.pathname = requestedPath === "/" ? basePath || "/" : `${basePath}${requestedPath}`;
      parsed.searchParams.delete("session");
    } else if (sessionId) {
      parsed.searchParams.set("session", sessionId);
    }

    parsed.searchParams.set("theme", theme);
    parsed.searchParams.set("hideThemeSwitcher", "1");
    parsed.searchParams.set("embedded", "1");
    if (session?.user?.fullName) parsed.searchParams.set("profileName", session.user.fullName);
    if (session?.user?.email) parsed.searchParams.set("profileEmail", session.user.email);
    return url.startsWith("/") ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
  }, [locale, searchParams, session?.user?.email, session?.user?.fullName, theme]);

  const syncPlatformLanguage = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "SUBUL_PLATFORM_LANGUAGE",
        locale,
        theme,
        profile: {
          name: session?.user?.fullName || "",
          email: session?.user?.email || "",
        },
        hideLanguageSwitcher: true,
        hideThemeSwitcher: true,
        embedded: true,
      },
      "*",
    );
  }, [locale, session?.user?.email, session?.user?.fullName, theme]);

  const resizeFrame = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      const body = doc?.body;
      const html = doc?.documentElement;
      if (!body || !html) return;
      const nextHeight = Math.max(
        640,
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
      setAllowIframeScroll(true);
      setFrameHeight(Math.max(640, window.innerHeight - 96));
    }
  }, []);

  useEffect(() => {
    syncPlatformLanguage();
  }, [syncPlatformLanguage]);

  useEffect(() => {
    resizeFrame();
    const interval = window.setInterval(resizeFrame, 700);
    window.addEventListener("resize", resizeFrame);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", resizeFrame);
    };
  }, [hrCoachUrl, reloadToken, resizeFrame]);

  useEffect(() => {
    setLoaded(false);
    setShowStartupHint(false);
    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(hrCoachUrl, { cache: "no-store", mode: "no-cors" });
        if (!cancelled) setShowStartupHint(false);
        void res;
      } catch {
        if (!cancelled) setShowStartupHint(true);
      }
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [hrCoachUrl, reloadToken]);

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
        key={reloadToken}
        ref={iframeRef}
        title="Subul HR Coach"
        src={hrCoachUrl}
        onLoad={() => {
          setLoaded(true);
          setShowStartupHint(false);
          syncPlatformLanguage();
          resizeFrame();
          window.setTimeout(resizeFrame, 250);
          window.setTimeout(resizeFrame, 900);
        }}
        className="block w-full min-w-0 border-0 bg-white"
        style={{ height: frameHeight }}
        scrolling={allowIframeScroll ? "auto" : "no"}
        allow="camera; microphone; clipboard-read; clipboard-write"
      />
      {showStartupHint && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 p-6">
          <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Subul HR Coach n'est pas lance</h2>
            <p className="mt-2 text-sm text-slate-600">
              Le menu est integre, mais l'application HR Coach doit repondre sur{" "}
              <span className="font-semibold text-slate-900">{HR_COACH_URL}</span>.
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

export default function LearnerHrCoachPage() {
  return (
    <Suspense fallback={null}>
      <LearnerHrCoachFrame />
    </Suspense>
  );
}

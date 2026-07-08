import { useEffect, useRef, useState } from "react";
import type { Toast, ToastType } from "../components/Toast";

export type InterviewWarningKind =
  | "visibilitychange"
  | "blur"
  | "window_resize"
  | "devtools"
  | "multiple_screens";

type InterviewWarningDefinition = {
  kind: InterviewWarningKind;
  reason: string;
  message: string;
  type?: ToastType;
  duration?: number;
};

type UseInterviewWarningsOptions = {
  active: boolean;
  sessionId: string;
};

const WARNING_DEFINITIONS: Record<InterviewWarningKind, InterviewWarningDefinition> = {
  visibilitychange: {
    kind: "visibilitychange",
    reason: "Changement d'onglet",
    message: "Alerte surveillance: changement d'onglet detecte pendant l'entretien.",
    type: "warning",
    duration: 6000,
  },
  blur: {
    kind: "blur",
    reason: "Perte de focus",
    message: "Alerte surveillance: la fenetre de l'entretien a perdu le focus.",
    type: "warning",
    duration: 5000,
  },
  window_resize: {
    kind: "window_resize",
    reason: "Reduction de fenetre",
    message: "Alerte surveillance: reduction importante de la fenetre detectee.",
    type: "warning",
    duration: 5000,
  },
  devtools: {
    kind: "devtools",
    reason: "Ouverture DevTools",
    message: "Alerte surveillance: ouverture probable des outils de developpement.",
    type: "warning",
    duration: 6000,
  },
  multiple_screens: {
    kind: "multiple_screens",
    reason: "Plusieurs ecrans",
    message: "Alerte surveillance: configuration multi-ecrans detectee partiellement.",
    type: "info",
    duration: 5000,
  },
};

export function useInterviewWarnings({ active, sessionId }: UseInterviewWarningsOptions) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const devToolsWarningShownRef = useRef(false);
  const blurWarningShownRef = useRef(false);
  const visibilityWarningShownRef = useRef(false);
  const multipleScreensWarningShownRef = useRef(false);
  const resizeWarningShownRef = useRef(false);
  const baselineSizeRef = useRef<{ width: number; height: number } | null>(null);

  const addToast = (message: string, type: ToastType = "warning", duration = 5000) => {
    const id = `${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);
  };

  const recordWarning = (kind: InterviewWarningKind, details: Record<string, unknown> = {}) => {
    if (!active || !sessionId) return;
    const definition = WARNING_DEFINITIONS[kind];
    addToast(definition.message, definition.type, definition.duration);

    void fetch(`/api/rh/session/${encodeURIComponent(sessionId)}/proctoring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: definition.kind,
        reason: definition.reason,
        message: definition.message,
        details,
      }),
      cache: "no-store",
    }).catch(() => undefined);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    if (!active) {
      devToolsWarningShownRef.current = false;
      blurWarningShownRef.current = false;
      visibilityWarningShownRef.current = false;
      multipleScreensWarningShownRef.current = false;
      resizeWarningShownRef.current = false;
      baselineSizeRef.current = null;
      return;
    }

    baselineSizeRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }, [active, sessionId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!active) return;
      if (document.hidden && !visibilityWarningShownRef.current) {
        recordWarning("visibilitychange", { hidden: true });
        visibilityWarningShownRef.current = true;
      } else if (!document.hidden) {
        visibilityWarningShownRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [active, sessionId]);

  useEffect(() => {
    const handleBlur = () => {
      if (!active) return;
      if (!blurWarningShownRef.current) {
        recordWarning("blur", { focused: false });
        blurWarningShownRef.current = true;
      }
    };

    const handleFocus = () => {
      blurWarningShownRef.current = false;
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [active, sessionId]);

  useEffect(() => {
    let resizeTimeout: number | null = null;

    const handleResize = () => {
      if (!active) return;
      if (resizeTimeout !== null) {
        window.clearTimeout(resizeTimeout);
      }

      resizeTimeout = window.setTimeout(() => {
        const baseline = baselineSizeRef.current || { width: window.outerWidth, height: window.outerHeight };
        const widthReduced = window.innerWidth < baseline.width * 0.75 || window.innerWidth < 900;
        const heightReduced = window.innerHeight < baseline.height * 0.75 || window.innerHeight < 600;
        const reduced = widthReduced || heightReduced;

        if (!resizeWarningShownRef.current && reduced) {
          recordWarning("window_resize", {
            width: window.innerWidth,
            height: window.innerHeight,
            baselineWidth: baseline.width,
            baselineHeight: baseline.height,
          });
          resizeWarningShownRef.current = true;
        } else if (!reduced) {
          resizeWarningShownRef.current = false;
        }
      }, 300);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeout !== null) {
        window.clearTimeout(resizeTimeout);
      }
    };
  }, [active, sessionId]);

  useEffect(() => {
    let checkDevToolsInterval: number | null = null;

    const detectDevTools = () => {
      if (!active) return;
      const threshold = 160;
      const heightDiff = window.outerHeight - window.innerHeight;
      const widthDiff = window.outerWidth - window.innerWidth;
      const isDevToolsOpen = heightDiff > threshold || widthDiff > threshold;

      if (isDevToolsOpen && !devToolsWarningShownRef.current) {
        recordWarning("devtools", { heightDiff, widthDiff });
        devToolsWarningShownRef.current = true;
      } else if (!isDevToolsOpen && devToolsWarningShownRef.current) {
        devToolsWarningShownRef.current = false;
      }
    };

    detectDevTools();
    checkDevToolsInterval = window.setInterval(detectDevTools, 1000);

    return () => {
      if (checkDevToolsInterval !== null) {
        window.clearInterval(checkDevToolsInterval);
      }
    };
  }, [active, sessionId]);

  useEffect(() => {
    const detectMultipleScreens = () => {
      if (!active || multipleScreensWarningShownRef.current) return;
      try {
        const extendedScreen = window.screen as ScreenExtended;
        const maybeExtended =
          Boolean(extendedScreen.isExtended) ||
          Number(extendedScreen.availLeft || 0) !== 0 ||
          Number(extendedScreen.availTop || 0) !== 0 ||
          window.screenLeft < 0 ||
          window.screenTop < 0;

        if (maybeExtended) {
          recordWarning("multiple_screens", {
            isExtended: Boolean(extendedScreen.isExtended),
            availLeft: extendedScreen.availLeft,
            availTop: extendedScreen.availTop,
            screenLeft: window.screenLeft,
            screenTop: window.screenTop,
          });
          multipleScreensWarningShownRef.current = true;
        }
      } catch {
        // Best-effort detection only.
      }
    };

    detectMultipleScreens();
  }, [active, sessionId]);

  return {
    toasts,
    removeToast,
  };
}

interface ScreenExtended extends Screen {
  availLeft?: number;
  availTop?: number;
  isExtended?: boolean;
}

"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

type HistoryActionDialogProps = {
  open: boolean;
  mode: "rename" | "delete";
  value: string;
  title: string;
  description: string;
  confirmLabel: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  cancelLabel?: string;
  busyLabel?: string;
  closeLabel?: string;
  busy?: boolean;
  onValueChange?: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function HistoryActionDialog({
  open,
  mode,
  value,
  title,
  description,
  confirmLabel,
  inputLabel = "New title",
  inputPlaceholder = "Conversation name",
  cancelLabel = "Cancel",
  busyLabel = "Please wait...",
  closeLabel = "Close",
  busy = false,
  onValueChange,
  onClose,
  onConfirm,
}: HistoryActionDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dialogTop, setDialogTop] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const updateDialogTop = () => {
      let nextTop = window.innerHeight / 2;

      try {
        if (window.parent && window.parent !== window) {
          const parentWindow = window.parent;
          const frames = Array.from(parentWindow.document.querySelectorAll("iframe"));
          const currentFrame = frames.find((frame) => frame.contentWindow === window);

          if (currentFrame) {
            const frameRect = currentFrame.getBoundingClientRect();
            nextTop = parentWindow.innerHeight / 2 - frameRect.top;
          }
        }
      } catch {
        nextTop = window.innerHeight / 2;
      }

      setDialogTop(Math.min(Math.max(nextTop, 150), Math.max(180, window.innerHeight - 90)));
    };

    updateDialogTop();
    window.addEventListener("resize", updateDialogTop);

    try {
      window.parent?.addEventListener("scroll", updateDialogTop, { passive: true });
      window.parent?.addEventListener("resize", updateDialogTop);
    } catch {
      // Cross-origin fallback keeps the dialog centered in the iframe viewport.
    }

    return () => {
      window.removeEventListener("resize", updateDialogTop);
      try {
        window.parent?.removeEventListener("scroll", updateDialogTop);
        window.parent?.removeEventListener("resize", updateDialogTop);
      } catch {
        // No-op for cross-origin parents.
      }
    };
  }, [open]);

  const dialogStyle = dialogTop
    ? ({ "--history-dialog-top": `${dialogTop}px` } as CSSProperties)
    : undefined;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  useEffect(() => {
    if (!open || mode !== "rename") return;
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [mode, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void onConfirm();
  };

  return (
    <div className="history-dialog-layer" style={dialogStyle} role="dialog" aria-modal="true" aria-labelledby="history-dialog-title">
      <button
        type="button"
        className="history-dialog-backdrop"
        aria-label={closeLabel}
        onClick={busy ? undefined : onClose}
      />

      <form className="history-dialog-card" onSubmit={handleSubmit}>
        <div className={`history-dialog-icon is-${mode}`} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            {mode === "rename" ? (
              <>
                <path d="M4 20h4l10-10l-4-4L4 16v4Z" />
                <path d="M12.5 5.5l4 4" />
              </>
            ) : (
              <>
                <path d="M5 7h14" />
                <path d="M9 7V5h6v2" />
                <path d="M8 10v7" />
                <path d="M12 10v7" />
                <path d="M16 10v7" />
                <path d="M6 7l1 12h10l1-12" />
              </>
            )}
          </svg>
        </div>

        <div className="history-dialog-copy">
          <h3 id="history-dialog-title">{title}</h3>
          <p>{description}</p>
        </div>

        {mode === "rename" ? (
          <label className="history-dialog-field" htmlFor="history-dialog-input">
            <span>{inputLabel}</span>
            <input
              ref={inputRef}
              id="history-dialog-input"
              value={value}
              onChange={(event) => onValueChange?.(event.target.value)}
              placeholder={inputPlaceholder}
              disabled={busy}
            />
          </label>
        ) : null}

        <div className="history-dialog-actions">
          <button type="button" className="history-dialog-button is-secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="submit"
            className={`history-dialog-button ${mode === "delete" ? "is-danger" : "is-primary"}`}
            disabled={busy || (mode === "rename" && !value.trim())}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

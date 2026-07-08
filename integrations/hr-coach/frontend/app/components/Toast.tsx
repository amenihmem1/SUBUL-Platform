"use client";

import { useEffect, useState } from "react";

export type ToastType = "info" | "warning" | "error" | "success";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastContainerProps = {
  toasts: Toast[];
  onRemove: (id: string) => void;
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-icon">
        {toast.type === "info" && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        )}
        {toast.type === "warning" && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l10 18H2L12 2z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        )}
        {toast.type === "error" && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 9l6 6M15 9l-6 6" />
          </svg>
        )}
        {toast.type === "success" && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        )}
      </div>
      <span className="toast-message">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={() => onRemove(toast.id)}
        aria-label="Close notification"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
      </button>
    </div>
  );
}

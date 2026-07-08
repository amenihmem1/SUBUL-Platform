'use client';

import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

const toastFn: Record<ToastType, (message: string) => void> = {
  success: (msg) => toast.success(msg),
  error: (msg) => toast.error(msg),
  warning: (msg) => toast.warning(msg),
  info: (msg) => toast.info(msg),
};

export function useToast() {
  const showToast = (message: string, type: ToastType = 'success') => {
    toastFn[type](message);
  };

  return { showToast };
}

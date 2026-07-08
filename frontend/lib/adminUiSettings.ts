const KEY = 'admin_ui_settings';

/** Subset of admin settings form persisted in localStorage (no API yet). */
export type AdminUiPanels = {
  general: Record<string, unknown>;
  notifications: Record<string, unknown>;
  security: Record<string, unknown>;
  payment: Record<string, unknown>;
};

export type AdminUiSettings = {
  paymentCurrency: string;
  panels?: AdminUiPanels;
};

export function getAdminUiSettings(): AdminUiSettings {
  if (typeof window === 'undefined') return { paymentCurrency: 'TND' };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { paymentCurrency: 'TND' };
    const parsed = JSON.parse(raw) as Partial<AdminUiSettings & { panels?: AdminUiPanels }>;
    let paymentCurrency =
      typeof parsed.paymentCurrency === 'string' ? parsed.paymentCurrency : 'TND';
    const pay = parsed.panels?.payment as { currency?: string } | undefined;
    if (typeof pay?.currency === 'string') {
      paymentCurrency = pay.currency;
    }
    if (paymentCurrency === 'EUR') {
      paymentCurrency = 'TND';
      window.localStorage.setItem(
        KEY,
        JSON.stringify({ ...parsed, paymentCurrency, panels: parsed.panels }),
      );
    }
    return {
      paymentCurrency,
      panels: parsed.panels,
    };
  } catch {
    return { paymentCurrency: 'TND' };
  }
}

export function setAdminUiSettings(next: AdminUiSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

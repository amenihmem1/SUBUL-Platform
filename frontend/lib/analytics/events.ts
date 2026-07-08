export type AnalyticsEventName =
  | 'landing_pricing_cta_click'
  | 'signup_started'
  | 'signup_completed'
  | 'checkout_viewed'
  | 'payment_initiated'
  | 'payment_failed'
  | 'payment_succeeded'
  | 'quote_submitted';

export function trackEvent(
  name: AnalyticsEventName,
  payload: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;

  const event = {
    event: name,
    timestamp: Date.now(),
    ...payload,
  };

  // GTM/GA compatible path.
  const dataLayer = (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push(event);
  }

  // Fallback for debugging/observability when no analytics SDK is attached.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event);
  }
}


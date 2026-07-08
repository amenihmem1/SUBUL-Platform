import { ConfigService } from '@nestjs/config';

/**
 * Flouci minimum payment amount in millimes.
 * Flouci rejects or leaves pending any payment below 1 TND (1000 millimes).
 */
export const FLOUCI_MIN_AMOUNT_MILLIMES = 1000;

export interface PricingTier {
  monthly: number;   // in smallest currency unit (cents for USD/EUR, millimes for TND)
  quarterly: number;
  annual: number;
}

export interface PaymentConfig {
  stripe: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    prices: {
      standardMonthly: string;
      standardQuarterly: string;
      standardAnnual: string;
      basicFree: string;
    };
  };
  flouci: {
    publicToken: string;
    privateToken: string;
    apiUrl: string;
    prices: {
      standardMonthly: number;  // TND millimes (49990 = 49.99 TND)
      standardQuarterly: number;
      standardAnnual: number;
    };
  };
  proxycheck: {
    apiKey: string;
  };
  pricing: {
    TN: PricingTier & { currency: 'TND'; provider: 'flouci' };
    US: PricingTier & { currency: 'USD'; provider: 'stripe' };
    EU: PricingTier & { currency: 'EUR'; provider: 'stripe' };
  };
}

export function getPaymentConfig(config: ConfigService): PaymentConfig {
  // ── TND pricing (Flouci) ──────────────────────────────────────────────
  // Single source of truth: env vars with correct defaults.
  // Values are in TND (e.g. "49.99") and converted to millimes (* 1000).
  const tnMonthly   = Math.round(parseFloat(config.get<string>('FLOUCI_PRICE_STANDARD_MONTHLY',   '49.99'))  * 1000);
  const tnQuarterly = Math.round(parseFloat(config.get<string>('FLOUCI_PRICE_STANDARD_QUARTERLY', '134.97')) * 1000);
  const tnAnnual    = Math.round(parseFloat(config.get<string>('FLOUCI_PRICE_STANDARD_ANNUAL',    '419.88')) * 1000);

  return {
    stripe: {
      publishableKey: config.get<string>('STRIPE_PUBLISHABLE_KEY', ''),
      secretKey: config.get<string>('STRIPE_SECRET_KEY', ''),
      webhookSecret: config.get<string>('STRIPE_WEBHOOK_SECRET', ''),
      prices: {
        standardMonthly: config.get<string>('STRIPE_PRICE_STANDARD_MONTHLY', ''),
        standardQuarterly: config.get<string>('STRIPE_PRICE_STANDARD_QUARTERLY', ''),
        standardAnnual: config.get<string>('STRIPE_PRICE_STANDARD_ANNUAL', ''),
        basicFree: config.get<string>('STRIPE_PRICE_BASIC_FREE', ''),
      },
    },
    flouci: {
      publicToken: config.get<string>('FLOUCI_PUBLIC_TOKEN', ''),
      privateToken: config.get<string>('FLOUCI_PRIVATE_TOKEN', ''),
      apiUrl: config.get<string>('FLOUCI_API_URL', 'https://developers.flouci.com/api/v2'),
      prices: {
        standardMonthly: tnMonthly,
        standardQuarterly: tnQuarterly,
        standardAnnual: tnAnnual,
      },
    },
    proxycheck: {
      apiKey: config.get<string>('PROXYCHECK_API_KEY', ''),
    },
    pricing: {
      // TN prices are in millimes (1 TND = 1000 millimes), derived from env vars above.
      TN: { currency: 'TND', provider: 'flouci', monthly: tnMonthly, quarterly: tnQuarterly, annual: tnAnnual },
      US: { currency: 'USD', provider: 'stripe', monthly: 999, quarterly: 2997, annual: 11988 },
      EU: { currency: 'EUR', provider: 'stripe', monthly: 4999, quarterly: 13498, annual: 59988 },
    },
  };
}

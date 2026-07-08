/** Supported UI locales (no RTL locale). */
export const APP_LOCALES = ['fr', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'fr';

export const LOCALE_COOKIE_NAME = 'subul-locale';

/** ISO 3166-1 alpha-2 — prefer English UI when geo suggests English-speaking region. */
export const EN_PRIMARY_COUNTRIES = new Set([
  'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'SG', 'PH', 'IN', 'PK', 'NG', 'KE', 'GH', 'JM', 'TT', 'BZ',
]);

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'fr' || value === 'en';
}

export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  const v = (value || '').toLowerCase();
  if (v === 'en' || v.startsWith('en-')) return 'en';
  if (v === 'fr' || v.startsWith('fr-')) return 'fr';
  return DEFAULT_LOCALE;
}

/** First URL segment after `/` when using `/{locale}/...` routes. */
export function localeFromPathname(pathname: string | null | undefined): AppLocale {
  const seg = pathname?.split('/')[1];
  if (isAppLocale(seg)) return seg;
  return DEFAULT_LOCALE;
}

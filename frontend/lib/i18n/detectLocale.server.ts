import type { NextRequest } from 'next/server';
import {
  AppLocale,
  DEFAULT_LOCALE,
  EN_PRIMARY_COUNTRIES,
  LOCALE_COOKIE_NAME,
  isAppLocale,
} from './config';

/** First preferred language in Accept-Language that is fr or en; null if neither appears. */
function localeFromAcceptLanguage(header: string | null): AppLocale | null {
  if (!header || !header.trim()) return null;
  for (const part of header.split(',')) {
    const tag = (part.trim().split(';')[0] || '').toLowerCase();
    if (tag.startsWith('fr')) return 'fr';
    if (tag.startsWith('en')) return 'en';
  }
  return null;
}

function countryFromRequest(request: NextRequest): string | null {
  const cf = request.headers.get('cf-ipcountry');
  if (cf && /^[A-Z]{2}$/i.test(cf)) return cf.toUpperCase();
  const vercel = request.headers.get('x-vercel-ip-country');
  if (vercel && /^[A-Z]{2}$/i.test(vercel)) return vercel.toUpperCase();
  return null;
}

/**
 * Edge locale resolution:
 * 1) Cookie subul-locale
 * 2) Accept-Language (first fr or en tag wins)
 * 3) Geo → en for English-primary countries
 * 4) Default fr
 */
export function resolveLocaleFromRequest(request: NextRequest): AppLocale {
  const cookie = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (cookie && isAppLocale(cookie)) {
    return cookie;
  }

  const fromAl = localeFromAcceptLanguage(request.headers.get('accept-language'));
  if (fromAl) return fromAl;

  const country = countryFromRequest(request);
  if (country && EN_PRIMARY_COUNTRIES.has(country)) {
    return 'en';
  }

  return DEFAULT_LOCALE;
}

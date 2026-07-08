import { LOCALE_COOKIE_NAME, type AppLocale } from './config';

const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

/** Persist locale for edge middleware (same key as localStorage in LanguageContext). */
export function setLocaleCookieClient(locale: AppLocale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${ONE_YEAR_SEC}; SameSite=Lax`;
}

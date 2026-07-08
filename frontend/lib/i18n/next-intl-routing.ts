import { defineRouting } from 'next-intl/routing';

/**
 * next-intl routing config for a future migration (Phase 2).
 * Live routing and detection use `proxy.ts` + `LanguageContext` + `APP_LOCALES` in `config.ts`.
 */
export const nextIntlRouting = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'always',
});

import en from './en.json';
import fr from './fr.json';

export const locales = {
  en,
  fr,
} as const;

export type Locale = keyof typeof locales;
export type TranslationKeys = typeof en;

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  fr: 'ltr',
};

export const defaultLocale: Locale = 'fr';

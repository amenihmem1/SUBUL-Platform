'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { locales, Locale, localeNames, localeDirections, defaultLocale } from '@/locales';
import { setLocaleCookieClient } from '@/lib/i18n/localeCookie.client';

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationParams = Record<string, string | number>;

interface TFunction {
  (key: string, params?: TranslationParams): string;
  raw: (key: string, params?: TranslationParams | { returnObjects?: boolean }) => string | string[];
}

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
  dir: 'ltr' | 'rtl';
  locales: typeof localeNames;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'subul-locale';

function segmentToLocale(seg: string | undefined): Locale | undefined {
  if (seg === 'en' || seg === 'fr') return seg;
  if (seg === 'ar') return 'fr';
  return undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const seg = pathname?.split('/')[1];
    const localeFromPath = segmentToLocale(seg);
    if (localeFromPath) {
      setLocaleState(localeFromPath);
      localStorage.setItem(STORAGE_KEY, localeFromPath);
      setLocaleCookieClient(localeFromPath);
      setIsHydrated(true);
      return;
    }

    const savedLocale = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'fr')) {
      setLocaleState(savedLocale);
    }
    setIsHydrated(true);
  }, [pathname]);
  useEffect(() => {
    if (isHydrated) {
      document.documentElement.dir = localeDirections[locale];
      document.documentElement.lang = locale;
    }
  }, [locale, isHydrated]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      if (locales[newLocale]) {
        setLocaleState(newLocale);
        localStorage.setItem(STORAGE_KEY, newLocale);
        setLocaleCookieClient(newLocale);

        if (pathname) {
          const currentPath = pathname.replace(/^\/(en|fr)/, '');
          const newPath = `/${newLocale}${currentPath}`;
          router.push(newPath);
        }
      }
    },
    [router, pathname],
  );
  const tRaw = useCallback(
    (key: string, params?: TranslationParams | { returnObjects?: boolean }): string | string[] => {
      const keys = key.split('.');
      let value: TranslationValue = locales[locale] as unknown as TranslationValue;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as { [key: string]: TranslationValue })[k];
        } else {
          let fallback: TranslationValue = locales.en as unknown as TranslationValue;
          for (const fk of keys) {
            if (fallback && typeof fallback === 'object' && fk in fallback) {
              fallback = (fallback as { [key: string]: TranslationValue })[fk];
            } else {
              return key;
            }
          }
          value = fallback;
          break;
        }
      }
      const isReturnObjects = params && typeof params === 'object' && 'returnObjects' in params && params.returnObjects;

      if (typeof value !== 'string' && !isReturnObjects) {
        return key;
      }
      if (isReturnObjects && Array.isArray(value)) {
        return value as string[];
      }
      if (isReturnObjects) {
        return [];
      }

      if (params && typeof params === 'object' && !('returnObjects' in params)) {
        return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
          return (acc as string).replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
        }, value as string);
      }

      return value as string | string[];
    },
    [locale],
  );

  const t: TFunction = Object.assign(
    (key: string, params?: TranslationParams): string => {
      const result = tRaw(key, params);
      return Array.isArray(result) ? result[0] ?? key : result;
    },
    { raw: tRaw },
  );

  const contextValue: LanguageContextType = {
    locale,
    setLocale,
    t,
    dir: localeDirections[locale],
    locales: localeNames,
  };

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, locale, dir } = useLanguage();
  return { t, locale, dir };
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Locale } from '@/locales';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'full' | 'inverted';
  className?: string;
}

const flagEmojis: Record<Locale, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
};

export default function LanguageSwitcher({ variant = 'default', className = '' }: LanguageSwitcherProps) {
  const { t, locale, setLocale, locales } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const buttons = dropdownRef.current?.querySelectorAll('button');
    const len = buttons?.length ?? 0;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % len;
      buttons?.[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + len) % Math.max(len, 1);
      buttons?.[prevIndex]?.focus();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      (e.target as HTMLElement).blur();
    }
  };

  if (variant === 'compact') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Change language"
        >
          <Globe className="w-5 h-5 text-slate-600" />
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label={t('common.language')}
            className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px] z-50"
          >
            {(Object.entries(locales) as [Locale, string][]).map(([code, name], index) => (
              <button
                key={code}
                role="menuitem"
                onClick={() => handleSelect(code)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 ${
                  locale === code ? 'text-primary bg-primary/10' : 'text-slate-700'
                }`}
                aria-current={locale === code ? 'true' : undefined}
              >
                <span aria-hidden="true">{flagEmojis[code]}</span>
                <span>{name}</span>
                {locale === code && <Check className="w-4 h-4 ml-auto" aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="text-sm font-medium text-slate-700">Language / Langue</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(locales) as [Locale, string][]).map(([code, name]) => (
            <button
              key={code}
              onClick={() => setLocale(code)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                locale === code
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <span className="text-2xl block mb-1">{flagEmojis[code]}</span>
              <span className="text-sm font-medium">{name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Inverted variant (e.g. for dark/primary header when scrolled)
  if (variant === 'inverted') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border border-white/30 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
        >
          <span>{flagEmojis[locale]}</span>
          <span className="text-sm font-medium">{locales[locale]}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px] z-50">
            {(Object.entries(locales) as [Locale, string][]).map(([code, name]) => (
              <button
                key={code}
                onClick={() => handleSelect(code)}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-50 ${
                  locale === code ? 'text-primary bg-primary/10' : 'text-slate-700'
                }`}
              >
                <span className="text-lg">{flagEmojis[code]}</span>
                <span className="font-medium">{name}</span>
                {locale === code && <Check className="w-4 h-4 ml-auto text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
      >
        <span>{flagEmojis[locale]}</span>
        <span className="text-sm font-medium text-slate-700">{locales[locale]}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px] z-50">
          {(Object.entries(locales) as [Locale, string][]).map(([code, name]) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-50 ${
                locale === code ? 'text-primary bg-primary/10' : 'text-slate-700'
              }`}
            >
              <span className="text-lg">{flagEmojis[code]}</span>
              <span className="font-medium">{name}</span>
              {locale === code && <Check className="w-4 h-4 ml-auto text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

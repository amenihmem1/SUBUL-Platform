'use client';

import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export default function FinalCtaSection() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="container">
        <div
          className="relative overflow-hidden rounded-3xl border border-pink-500/20 px-6 py-10 text-white md:px-10 md:py-12"
          style={{
            background: 'linear-gradient(135deg, #c2185b 0%, #7c3aed 60%, #4338ca 100%)',
            boxShadow: '0 24px 70px -36px rgba(232,23,125,0.5), 0 8px 30px rgba(124,58,237,0.25)',
          }}
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-white/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-white/8 blur-2xl"
            aria-hidden="true"
          />

          {/* Grid overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* Text block */}
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-pink-100">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t('homepage.cta.readyToAccelerate')}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                {t('homepage.cta.joinSubul')}
              </h2>
              <p className="mt-2 text-sm text-pink-100/80">{t('homepage.cta.freeWeek')}</p>
            </div>

            {/* Email capture */}
            <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
              <label htmlFor="cta-email" className="sr-only">
                {t('homepage.cta.emailPlaceholder')}
              </label>
              <input
                id="cta-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('homepage.cta.emailPlaceholder')}
                className="h-12 w-full rounded-xl border border-white/25 bg-white/15 px-4 text-sm text-white placeholder:text-white/60 outline-none backdrop-blur-sm transition focus:border-white/50 focus:bg-white/20"
                autoComplete="email"
              />
              <button
                type="button"
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold transition-all duration-300 hover:bg-white/95 hover:shadow-lg active:scale-[0.98]"
                style={{ color: '#c2185b' }}
              >
                {t('homepage.cta.startNow')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

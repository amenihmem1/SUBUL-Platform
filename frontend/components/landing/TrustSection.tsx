'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { CheckCircle2, Users, BookOpen, Star } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

const LOGOS = [
  { name: 'Google', src: '/partners/google.svg' },
  { name: 'Microsoft', src: '/partners/microsoft.svg' },
  { name: 'AWS', src: '/partners/aws.svg' },
  { name: 'IBM', src: '' },
];

const STAT_ICONS = [Users, BookOpen, Star, CheckCircle2] as const;
const STAT_DATA = [
  { value: '10,000+', labelKey: 'homepage.trust.stats.activeLearners' },
  { value: '500+', labelKey: 'homepage.trust.stats.availableTrainings' },
  { value: '95%', labelKey: 'homepage.trust.stats.satisfactionRate' },
  { value: '200+', labelKey: 'homepage.trust.stats.companyPartners' },
];

export default function TrustSection() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-20">
      {/* top separator */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-full max-w-3xl -translate-x-1/2"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(192,38,211,0.25), transparent)' }}
        aria-hidden="true"
      />

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-fuchsia-50/60 via-white to-indigo-50/40 p-6 shadow-sm md:p-8"
        >
          <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t('homepage.trust.trustedBy')}
          </p>

          {/* Partner logos */}
          <div className="mt-5 grid grid-cols-2 items-center gap-4 md:grid-cols-4">
            {LOGOS.map((logo, index) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
                className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-fuchsia-200 hover:shadow-md"
              >
                {logo.src ? (
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    width={120}
                    height={34}
                    className="h-7 w-auto object-contain opacity-70 transition hover:opacity-90"
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-500">{logo.name}</span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Stats grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {STAT_DATA.map((item, idx) => {
              const Icon = STAT_ICONS[idx];
              return (
                <motion.div
                  key={item.labelKey}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.07 + 0.2, duration: 0.4 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-fuchsia-200 hover:shadow-md"
                >
                  <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-50 text-fuchsia-600">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <p className="text-xl font-black tracking-tight text-slate-900">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{t(item.labelKey)}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

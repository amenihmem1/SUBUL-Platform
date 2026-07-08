'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

type TabKey = 'students' | 'professionals' | 'enterprises';
const TAB_KEYS: TabKey[] = ['students', 'professionals', 'enterprises'];

export default function TargetAudienceSection() {
  const { t } = useTranslation();
  const [active, setActive] = useState<TabKey>('students');

  const tabLabel = (key: TabKey) => t(`homepage.profiles.tabs.${key}.label`);
  const tabTitle = (key: TabKey) => t(`homepage.profiles.tabs.${key}.title`);
  const tabDescription = (key: TabKey) => t(`homepage.profiles.tabs.${key}.description`);
  const tabPoints = (key: TabKey): string[] => {
    const raw = t(`homepage.profiles.tabs.${key}.points`);
    if (Array.isArray(raw)) return raw as string[];
    return [];
  };
  const metrics = (): string[] => {
    const raw = t('homepage.profiles.metrics');
    if (Array.isArray(raw)) return raw as string[];
    return ['10,000+', '500+', '95%'];
  };

  return (
    <section
      id="profils"
      className="relative overflow-hidden scroll-mt-20 bg-gradient-to-b from-white via-indigo-50/20 to-fuchsia-50/20 py-20 md:py-24"
    >
      {/* top separator */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-full max-w-3xl -translate-x-1/2"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)' }}
        aria-hidden="true"
      />

      <div className="container relative z-10">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl"
          >
            {t('homepage.profiles.sectionTitle')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08, duration: 0.45 }}
            className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base"
          >
            {t('homepage.profiles.sectionSubtitle')}
          </motion.p>
        </div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mx-auto mt-7 flex w-fit flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        >
          {TAB_KEYS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                active === tab
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={
                active === tab
                  ? { background: 'linear-gradient(135deg, #c026d3 0%, #7c3aed 100%)' }
                  : {}
              }
            >
              {tabLabel(tab)}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 grid gap-4 lg:grid-cols-2"
        >
          {/* Info card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-black text-slate-900">{tabTitle(active)}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{tabDescription(active)}</p>
            <ul className="mt-5 space-y-3">
              {tabPoints(active).map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-600"
                    aria-hidden="true"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Why it works card */}
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-fuchsia-50 via-white to-indigo-50/60 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">
              {t('homepage.profiles.whyItWorks')}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {t('homepage.profiles.whyItWorksDesc')}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {metrics().map((metric) => (
                <div
                  key={metric}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-bold text-slate-900 shadow-sm"
                >
                  {metric}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

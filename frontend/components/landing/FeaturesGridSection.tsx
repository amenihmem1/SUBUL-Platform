'use client';

import { motion } from 'framer-motion';
import { Brain, BriefcaseBusiness, GraduationCap, Target, BarChart3, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

const ICON_LIST = [Brain, GraduationCap, BriefcaseBusiness, Target, BarChart3, Sparkles] as const;
const GRID_KEYS = [
  'personalizedPaths',
  'certifiedTraining',
  'smartJobMatching',
  'careerCoaching',
  'progressAnalytics',
  'modernSaaS',
] as const;

export default function FeaturesGridSection() {
  const { t } = useTranslation();

  const items = GRID_KEYS.map((key, i) => ({
    title: t(`homepage.features.grid.${key}.title`),
    desc: t(`homepage.features.grid.${key}.desc`),
    Icon: ICON_LIST[i],
  }));

  return (
    <section
      id="pourquoi"
      className="relative overflow-hidden bg-gradient-to-b from-white via-fuchsia-50/20 to-indigo-50/25 py-20 md:py-24"
    >
      {/* top border */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-full max-w-2xl -translate-x-1/2"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(192,38,211,0.3), transparent)' }}
        aria-hidden="true"
      />

      <div className="container relative z-10">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fuchsia-700"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('homepage.features.title')}
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl"
          >
            {t('homepage.features.acceleratedTitle')}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.14, duration: 0.45 }}
            className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base"
          >
            {t('homepage.features.acceleratedSubtitle')}
          </motion.p>
        </div>

        {/* Feature cards grid */}
        <div id="fonctionnalites" className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-200 hover:shadow-md"
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
                style={{ background: 'linear-gradient(135deg, #c026d3 0%, #7c3aed 100%)' }}
              >
                <item.Icon className="h-4 w-4 text-white" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Cpu, Globe, Shield, Sparkles, Trophy, Zap } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

const SKILLS = [
  { label: 'Azure Cloud', pct: 82, color: '#7c3aed' },
  { label: 'AWS', pct: 68, color: '#c026d3' },
  { label: 'Cybersecurity', pct: 55, color: '#4f46e5' },
];

const CERTS = [
  { icon: Globe, label: 'AZ-900', color: '#7c3aed' },
  { icon: Shield, label: 'SC-900', color: '#c026d3' },
  { icon: Cpu, label: 'AWS SAA', color: '#4f46e5' },
];

export default function HeroVisual() {
  const { t } = useTranslation();
  const v = (key: string) => String(t(`homepage.hero.visual.${key}`));

  return (
    <div className="relative h-[460px] w-full select-none" aria-hidden="true">
      {/* soft glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{
          background:
            'radial-gradient(ellipse at 55% 45%, rgba(192,38,211,0.08) 0%, rgba(124,58,237,0.07) 55%, transparent 80%)',
        }}
      />

      {/* ── Main dashboard card ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-6 top-10"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        >
          {/* header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg, #c026d3, #7c3aed)' }}
              >
                S
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{v('journeyTitle')}</p>
                <p className="text-[10px] text-slate-400">{v('weekProgress')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {v('active')}
            </div>
          </div>

          {/* skills */}
          <div className="space-y-3.5">
            {SKILLS.map((skill, i) => (
              <div key={skill.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">{skill.label}</span>
                  <span className="text-xs font-bold" style={{ color: skill.color }}>
                    {skill.pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.pct}%` }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ background: skill.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* cert badges */}
          <div className="mt-5 flex gap-2">
            {CERTS.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex flex-1 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                <span className="text-[10px] font-semibold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── AI Tutor card ── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-16 left-4"
        style={{ width: 190 }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          className="rounded-2xl border border-violet-200 bg-white p-3.5 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #c026d3)' }}
            >
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-900">{v('aiTutor')}</p>
              <p className="text-[9px] text-violet-500">{v('answersInstantly')}</p>
            </div>
          </div>
          <div className="mt-2.5 rounded-lg bg-violet-50 px-2.5 py-2">
            <p className="text-[10px] leading-relaxed text-slate-600">
              «&nbsp;{v('tutorQuestion')}&nbsp;»
            </p>
          </div>
          <div className="mt-2 flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── XP trophy ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.75, type: 'spring', stiffness: 220, damping: 16 }}
        className="absolute bottom-12 right-4 flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-white px-3.5 py-2.5 shadow-md"
      >
        <Trophy className="h-5 w-5 text-amber-500" />
        <div>
          <p className="text-[11px] font-black text-slate-900">+250 XP</p>
          <p className="text-[9px] text-amber-500">{v('moduleComplete')}</p>
        </div>
      </motion.div>

      {/* ── Lesson pill ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="absolute right-5 top-4 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 shadow-sm"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-[10px] font-semibold text-emerald-700">{v('lessonDone')}</span>
      </motion.div>

      {/* ── Streak pill ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.4 }}
        className="absolute left-4 top-6 flex items-center gap-1.5 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 shadow-sm"
      >
        <Zap className="h-3.5 w-3.5 fill-fuchsia-500 text-fuchsia-500" />
        <span className="text-[10px] font-semibold text-fuchsia-700">{v('streakDays')}</span>
      </motion.div>
    </div>
  );
}

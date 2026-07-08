'use client';

import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, LayoutDashboard, Play, Sparkles, Star } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPath, normalizeLocale } from '@/lib/auth/routing';
import HeroVisual from '@/components/landing/HeroVisual';

const HERO_SOCIAL_AVATAR_IMG_IDS = [12, 33, 47, 68] as const;

export default function HeroSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const { session, isLoading } = useAuth();
  const locale = normalizeLocale((params?.locale as string) || 'en');
  const isAuthenticated = Boolean(session?.user);
  const dashboardHref = getDashboardPath(locale, session?.userRole);

  const title: string = t('homepage.hero.marketingTitle') || '';
  const commaIdx = title.indexOf(',');
  const titleBefore = commaIdx !== -1 ? title.slice(0, commaIdx) : title;
  const titleAfter = commaIdx !== -1 ? title.slice(commaIdx + 1).trim() : '';

  return (
    <section
      id="accueil"
      className="relative flex min-h-[92vh] items-center overflow-hidden scroll-mt-20 bg-gradient-to-br from-white via-fuchsia-50/30 to-indigo-50/40"
    >
      {/* Soft ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-fuchsia-200/25 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-200/20 blur-[100px]" />
        <div className="absolute left-1/2 top-0 h-px w-full max-w-4xl -translate-x-1/2 bg-gradient-to-r from-transparent via-fuchsia-300/40 to-transparent" />
      </div>

      <div className="container relative z-10 py-24 md:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">

          {/* ── Left: Copy ── */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fuchsia-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t('homepage.hero.marketingBadge')}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 text-4xl font-black leading-[1.08] tracking-tight text-slate-900 md:text-5xl lg:text-[3.25rem]"
            >
              {titleBefore}
              {titleAfter && (
                <>
                  ,{' '}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: 'linear-gradient(135deg, #c026d3 0%, #7c3aed 60%, #4f46e5 100%)',
                    }}
                  >
                    {titleAfter}
                  </span>
                </>
              )}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg"
            >
              {t('homepage.hero.marketingSubtitle')}
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              {isLoading ? (
                <div className="h-12 w-48 animate-pulse rounded-xl bg-slate-200" aria-hidden />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (isAuthenticated) {
                        router.push(dashboardHref);
                      } else {
                        router.push(
                          `/${locale}/auth/register?startTrial=1&returnUrl=${encodeURIComponent(`/${locale}/dashboard/learner`)}`,
                        );
                      }
                    }}
                    className="group inline-flex h-12 items-center gap-2.5 rounded-xl px-6 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, #c026d3 0%, #7c3aed 100%)',
                      boxShadow: '0 8px 28px rgba(192,38,211,0.28), 0 2px 8px rgba(124,58,237,0.18)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        '0 12px 36px rgba(192,38,211,0.38), 0 4px 12px rgba(124,58,237,0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        '0 8px 28px rgba(192,38,211,0.28), 0 2px 8px rgba(124,58,237,0.18)';
                    }}
                  >
                    {isAuthenticated ? (
                      <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <Play className="h-4 w-4 shrink-0 fill-current" aria-hidden="true" />
                    )}
                    {isAuthenticated ? t('homepage.nav.dashboard') : t('homepage.hero.cta')}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>

                  {!isAuthenticated && (
                    <a
                      href="#tarifs"
                      className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-fuchsia-300 hover:text-fuchsia-700 hover:shadow-sm"
                    >
                      {t('homepage.nav.pricing')}
                    </a>
                  )}
                </>
              )}
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.4 }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <div className="flex items-center -space-x-2.5" aria-hidden="true">
                {HERO_SOCIAL_AVATAR_IMG_IDS.map((imgId) => (
                  <Image
                    key={imgId}
                    src={`https://i.pravatar.cc/96?img=${imgId}`}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full border-2 border-white object-cover shadow"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 text-amber-400" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="text-xs font-medium text-slate-500">{t('homepage.hero.socialProof')}</p>
            </motion.div>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.4 }}
              className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
            >
              {[
                { value: '10K+', labelKey: 'homepage.hero.stats.activeStudents' },
                { value: '95%', labelKey: 'homepage.hero.stats.successRate' },
                { value: '200+', labelKey: 'homepage.hero.stats.partners' },
                { value: '4.9/5', labelKey: 'homepage.hero.stats.satisfaction' },
              ].map(({ value, labelKey }) => (
                <div
                  key={labelKey}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm"
                >
                  <p className="text-xl font-black text-slate-900">{value}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-500">{t(labelKey)}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Right: Visual ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.28, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <HeroVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

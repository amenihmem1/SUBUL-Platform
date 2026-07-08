'use client';

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronDown, LayoutDashboard, LogOut, Menu, User, X, Sparkles } from "lucide-react";
import Image from "next/image";
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath, normalizeLocale } from "@/lib/auth/routing";

const HeroSection = dynamic(() => import("@/components/landing/HeroSection"), {
  ssr: false,
  loading: () => <div className="min-h-[82vh] bg-gradient-to-br from-white via-pink-50 to-purple-50 animate-pulse" />
});

const FeaturesGridSection = dynamic(() => import("@/components/landing/FeaturesGridSection"), {
  ssr: false,
  loading: () => <div className="py-14 bg-gradient-to-b from-white to-slate-50 animate-pulse" />
});

const TrustSection = dynamic(() => import("@/components/landing/TrustSection"), {
  ssr: false,
  loading: () => <div className="py-10 bg-white animate-pulse" />
});

const PricingShowcaseSection = dynamic(() => import("@/components/landing/PricingShowcaseSection"), {
  ssr: false,
  loading: () => <div className="py-14 bg-gradient-to-b from-pink-50 to-purple-50 animate-pulse" />
});

const TargetAudienceSection = dynamic(() => import("@/components/landing/TargetAudienceSection"), {
  ssr: false,
  loading: () => <div className="py-14 bg-white animate-pulse" />
});

const FinalCtaSection = dynamic(() => import("@/components/landing/FinalCtaSection"), {
  ssr: false,
  loading: () => <div className="py-10 bg-white animate-pulse" />
});

/* ── Premium Nav Link ── */
const NavLink = ({
  href,
  children,
  isActive,
  onClick,
  scrolled,
}: {
  href: string;
  children: React.ReactNode;
  isActive: boolean;
  onClick: (e: React.MouseEvent, href: string) => void;
  scrolled: boolean;
}) => (
  <a
    href={href}
    onClick={(e) => onClick(e, href)}
    className="relative rounded-xl px-3 py-1.5 text-sm font-semibold tracking-wide transition-all duration-300 group"
    style={{
      color: isActive
        ? '#c2185b'
        : scrolled
          ? '#475569'
          : '#334155',
    }}
  >
    {children}
    {/* Animated gradient underline */}
    <span
      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-full transition-all duration-300"
      style={{
        width: isActive ? '60%' : '0%',
        background: 'linear-gradient(90deg, #c2185b, #7c3aed)',
      }}
    />
    {/* Hover glow */}
    <span
      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ background: 'linear-gradient(135deg, rgba(194,24,91,0.06), rgba(124,58,237,0.06))' }}
    />
  </a>
);

export default function Home() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const { session, isLoading, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('accueil');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const routeLocale = normalizeLocale((params?.locale as string) || locale);
  const isAuthenticated = Boolean(session?.user);

  /* ── Scroll listener for navbar glass effect ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const userInitial = session?.user?.fullName
    ? session.user.fullName.charAt(0).toUpperCase()
    : session?.user?.email?.charAt(0).toUpperCase() ?? '?';
  const userDisplayName = session?.user?.fullName || session?.user?.email || '';

  /** DOM section ids are fixed (locale-independent) so anchors and scroll-spy stay reliable */
  const LANDING_SECTION_IDS = ['accueil', 'pourquoi', 'tarifs', 'profils'] as const;

  useEffect(() => {
    const handleScroll = () => {
      for (const id of LANDING_SECTION_IDS) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = useCallback((e: React.MouseEvent, sectionId: (typeof LANDING_SECTION_IDS)[number]) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 72;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      window.history.pushState(null, '', `#${sectionId}`);
    }
  }, []);

  return (
    <div className="overflow-hidden">

      {/* ── PREMIUM NAVBAR ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled
            ? 'rgba(255,255,255,0.82)'
            : 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: scrolled
            ? '1px solid rgba(194,24,91,0.08)'
            : '1px solid rgba(0,0,0,0.04)',
          boxShadow: scrolled
            ? '0 4px 30px rgba(124,58,237,0.06), 0 1px 3px rgba(0,0,0,0.04)'
            : 'none',
        }}
      >
        {/* Top accent line */}
        <div
          className="h-[2px] w-full"
          style={{ background: 'linear-gradient(90deg, #c2185b 0%, #7c3aed 50%, #c2185b 100%)' }}
        />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center justify-between">

            {/* ── Logo ──
                The source image is 1024×1024 with ~25% whitespace padding on
                all sides. We render it at 160×160 inside a 130×68 clipping
                container and shift it up/left to centre the actual artwork. -->
            */}
            <a
              href="#accueil"
              onClick={(e) => scrollToSection(e, 'accueil')}
              className="shrink-0 group"
              style={{ display: 'block', width: 118, height: 64, overflow: 'hidden', position: 'relative' }}
            >
              <Image
                src="/logo_subul_nav-side.png"
                alt="SUBUL Logo"
                width={142}
                height={142}
                className="transition-transform duration-300 group-hover:scale-[1.03]"
                style={{ width: 142, height: 142, marginTop: -30, marginLeft: -12 }}
                priority
              />
            </a>

            {/* ── Desktop Nav Links ── */}
            <nav className="hidden lg:flex items-center gap-1">
              <NavLink
                href="#accueil"
                isActive={activeSection === 'accueil'}
                onClick={(e) => scrollToSection(e, 'accueil')}
                scrolled={scrolled}
              >
                {t('homepage.nav.home')}
              </NavLink>
              <NavLink
                href="#pourquoi"
                isActive={activeSection === 'pourquoi'}
                onClick={(e) => scrollToSection(e, 'pourquoi')}
                scrolled={scrolled}
              >
                {t('homepage.nav.whySubul')}
              </NavLink>
              <NavLink
                href="#tarifs"
                isActive={activeSection === 'tarifs'}
                onClick={(e) => scrollToSection(e, 'tarifs')}
                scrolled={scrolled}
              >
                {t('homepage.nav.pricing')}
              </NavLink>
              <NavLink
                href="#profils"
                isActive={activeSection === 'profils'}
                onClick={(e) => scrollToSection(e, 'profils')}
                scrolled={scrolled}
              >
                {t('homepage.nav.forWho')}
              </NavLink>
            </nav>

            {/* ── Desktop Right Actions ── */}
            <div className="hidden lg:flex items-center gap-2.5">
              <LanguageSwitcher />

              {!isLoading && !isAuthenticated && (
                <>
                  {/* Login button */}
                  <button
                    onClick={() => router.push(`/${routeLocale}/auth/login`)}
                    className="rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      color: '#475569',
                      border: '1px solid rgba(148,163,184,0.3)',
                      background: 'rgba(255,255,255,0.7)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(194,24,91,0.3)';
                      e.currentTarget.style.color = '#c2185b';
                      e.currentTarget.style.background = 'rgba(194,24,91,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(148,163,184,0.3)';
                      e.currentTarget.style.color = '#475569';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                    }}
                  >
                    {t('homepage.nav.login') || 'Connexion'}
                  </button>

                  {/* Sign up button */}
                  <button
                    onClick={() => router.push(`/${routeLocale}/auth/register`)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #c2185b 0%, #7c3aed 100%)',
                      boxShadow: '0 4px 15px rgba(194,24,91,0.25), 0 2px 6px rgba(124,58,237,0.15)',
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('homepage.nav.register')}
                  </button>
                </>
              )}

              {isAuthenticated && (
                <>
                  <Link
                    href={getDashboardPath(routeLocale, session?.userRole)}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      color: '#5b21b6',
                      border: '1px solid rgba(124,58,237,0.28)',
                      background: 'rgba(255,255,255,0.85)',
                      boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(124,58,237,0.45)';
                      e.currentTarget.style.background = 'rgba(124,58,237,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(124,58,237,0.28)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.85)';
                    }}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    {t('homepage.nav.dashboard')}
                  </Link>
                  <div ref={avatarRef} className="relative">
                  <button
                    onClick={() => setAvatarDropdownOpen((v) => !v)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 group"
                    style={{
                      border: '1px solid rgba(194,24,91,0.12)',
                      background: avatarDropdownOpen ? 'rgba(194,24,91,0.04)' : 'rgba(255,255,255,0.7)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(194,24,91,0.04)'; e.currentTarget.style.borderColor = 'rgba(194,24,91,0.2)'; }}
                    onMouseLeave={(e) => { if (!avatarDropdownOpen) { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(194,24,91,0.12)'; } }}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #c2185b, #7c3aed)' }}
                    >
                      {userInitial}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 max-w-[120px] truncate">{userDisplayName}</span>
                    <ChevronDown
                      size={14}
                      className="text-slate-400 transition-transform duration-300"
                      style={{ transform: avatarDropdownOpen ? 'rotate(180deg)' : 'none' }}
                    />
                  </button>

                  {avatarDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-2xl py-2 z-50"
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 10px 40px rgba(124,58,237,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(194,24,91,0.08)',
                      }}
                    >
                      <button
                        onClick={() => { setAvatarDropdownOpen(false); router.push(getDashboardPath(routeLocale, session?.userRole)); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:text-[#c2185b] transition-colors rounded-lg mx-0"
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(194,24,91,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <LayoutDashboard size={16} />
                        {t('homepage.nav.dashboard')}
                      </button>
                      <button
                        onClick={() => { setAvatarDropdownOpen(false); router.push(`/${routeLocale}/dashboard/learner/profile`); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:text-[#c2185b] transition-colors rounded-lg"
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(194,24,91,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <User size={16} />
                        {t('homepage.nav.myProfile')}
                      </button>
                      <div className="my-1.5 mx-3 border-t" style={{ borderColor: 'rgba(194,24,91,0.08)' }} />
                      <button
                        onClick={async () => { setAvatarDropdownOpen(false); await logout(); router.push(`/${routeLocale}/auth/login`); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors rounded-lg"
                      >
                        <LogOut size={16} />
                        {t('homepage.nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
                </>
              )}
            </div>

            {/* ── Mobile Menu Button ── */}
            <div className="lg:hidden flex items-center gap-2">
              <LanguageSwitcher />
              {isAuthenticated && (
                <Link
                  href={getDashboardPath(routeLocale, session?.userRole)}
                  className="inline-flex items-center justify-center rounded-xl p-2.5 transition-all duration-300"
                  style={{
                    border: '1px solid rgba(124,58,237,0.28)',
                    background: 'rgba(255,255,255,0.85)',
                    color: '#5b21b6',
                  }}
                  aria-label={t('homepage.nav.dashboard')}
                  title={t('homepage.nav.dashboard')}
                >
                  <LayoutDashboard className="w-5 h-5" />
                </Link>
              )}
              <button
                className="rounded-xl p-2 transition-all duration-300"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  background: mobileMenuOpen ? 'rgba(194,24,91,0.08)' : 'transparent',
                  border: '1px solid',
                  borderColor: mobileMenuOpen ? 'rgba(194,24,91,0.15)' : 'rgba(0,0,0,0.06)',
                }}
              >
                {mobileMenuOpen ? <X size={22} style={{ color: '#c2185b' }} /> : <Menu size={22} className="text-slate-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Menu Panel ── */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden border-t"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(194,24,91,0.06)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            }}
          >
            <nav className="flex flex-col gap-1 p-3.5">
              {([
                ['accueil', t('homepage.nav.home')],
                ['pourquoi', t('homepage.nav.whySubul')],
                ['tarifs', t('homepage.nav.pricing')],
                ['profils', t('homepage.nav.forWho')],
              ] as const).map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => scrollToSection(e, id as (typeof LANDING_SECTION_IDS)[number])}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"
                  style={{
                    color: activeSection === id ? '#c2185b' : '#475569',
                    background: activeSection === id ? 'rgba(194,24,91,0.06)' : 'transparent',
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>

            {!isLoading && !isAuthenticated && (
              <div className="flex flex-col gap-2.5 px-4 pb-4">
                <button
                  onClick={() => { setMobileMenuOpen(false); router.push(`/${routeLocale}/auth/login`); }}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all duration-200"
                  style={{
                    color: '#475569',
                    border: '1px solid rgba(148,163,184,0.3)',
                  }}
                >
                  {t('homepage.nav.login') || 'Connexion'}
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); router.push(`/${routeLocale}/auth/register`); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #c2185b 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 15px rgba(194,24,91,0.25)',
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  {t('homepage.nav.register')}
                </button>
              </div>
            )}
            {isAuthenticated && (
              <div className="flex flex-col gap-2.5 px-4 pb-4">
                <button
                  onClick={() => { setMobileMenuOpen(false); router.push(getDashboardPath(routeLocale, session?.userRole)); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #c2185b 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 15px rgba(194,24,91,0.25)',
                  }}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {t('homepage.nav.dashboard')}
                </button>
                <button
                  onClick={async () => { setMobileMenuOpen(false); await logout(); router.push(`/${routeLocale}/auth/login`); }}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-red-500"
                  style={{ border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {t('homepage.nav.logout')}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Sections statiques */}
      <HeroSection />
      <FeaturesGridSection />
      <TrustSection />
      <PricingShowcaseSection />
      <TargetAudienceSection />
      <FinalCtaSection />

      <Footer userRole={null} />
    </div>
  );
}
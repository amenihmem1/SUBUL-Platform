'use client';

import {
  Mail, Phone, MapPin,
  Facebook, Twitter, Linkedin, Instagram,
  Heart, Shield,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { localeFromPathname } from '@/lib/i18n/config';

type UserRole = 'admin' | 'student' | 'instructor' | 'employer' | null;

interface FooterProps {
  userRole: UserRole;
}

export default function Footer({ userRole }: FooterProps) {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const router = useRouter();
  const pathname = usePathname();

  const locale = localeFromPathname(pathname);

  const createLocalizedUrl = (path: string) => {
    return `/${locale}${path}`;
  };

  const landingLinks = [
    { label: t('homepage.nav.home'), href: createLocalizedUrl('/'), anchor: '#accueil' },
    { label: t('homepage.nav.whySubul'), href: createLocalizedUrl('/'), anchor: '#pourquoi' },
    { label: t('homepage.nav.features'), href: createLocalizedUrl('/'), anchor: '#fonctionnalites' },
    { label: t('homepage.nav.forWho'), href: createLocalizedUrl('/'), anchor: '#profils' },
  ];

  const getRoleLinks = () => {
    switch (userRole) {
      case 'admin':
        return [
          { label: t('navigation.dashboard'), href: createLocalizedUrl('/dashboard/admin') },
          { label: t('navigation.users'), href: createLocalizedUrl('/dashboard/admin/users') },
          { label: t('navigation.certifications'), href: createLocalizedUrl('/dashboard/admin/certifications') },
          { label: t('navigation.analytics'), href: createLocalizedUrl('/dashboard/admin/analytics') },
          { label: t('navigation.payments'), href: createLocalizedUrl('/dashboard/admin/payments') },
        ];
      case 'student':
        return [
          { label: t('navigation.dashboard'), href: createLocalizedUrl('/dashboard/learner') },
          { label: t('navigation.myCourses'), href: createLocalizedUrl('/dashboard/learner/cours') },
          { label: t('navigation.certifications'), href: createLocalizedUrl('/dashboard/learner/certifications') },
          { label: t('navigation.myGoals'), href: createLocalizedUrl('/dashboard/learner/goals') },
        ];
      case 'instructor':
        return [
          { label: t('navigation.dashboard'), href: createLocalizedUrl('/dashboard/instructor') },
          { label: t('navigation.courses'), href: createLocalizedUrl('/dashboard/instructor/cours') },
          { label: t('navigation.analytics'), href: createLocalizedUrl('/dashboard/instructor/analytics') },
        ];
      case 'employer':
        return [
          { label: t('navigation.dashboard'), href: createLocalizedUrl('/dashboard/employer') },
          { label: t('navigation.certifiedLearners'), href: createLocalizedUrl('/dashboard/employer/certifies') },
          { label: t('navigation.jobOffers'), href: createLocalizedUrl('/dashboard/employer/offres') },
          { label: t('navigation.candidates'), href: createLocalizedUrl('/dashboard/employer/candidats') },
        ];
      default:
        // Pour les visiteurs non connectés, utiliser les liens de la landing
        return landingLinks;
    }
  };

 
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, link: { href: string; anchor?: string }) => {
    if (link.anchor) {
      e.preventDefault();
      const isOnHomepage = pathname === createLocalizedUrl('/') || pathname === `/${locale}`;

      if (isOnHomepage) {
        const element = document.getElementById(link.anchor.substring(1));
        if (element) {
          const headerOffset = 64;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      } else {
       
        router.push(link.href + link.anchor);
      }
    }
  };

  return (
    <footer className="mt-auto border-t border-fuchsia-100 bg-gradient-to-br from-white via-fuchsia-50/30 to-indigo-50/30 text-foreground">
      <div className="mx-auto max-w-[1240px] px-5 py-12 md:px-6">
        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href={createLocalizedUrl('/')}
              className="inline-block mb-4 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-lg"
            >
              <Image
                src="/logo_subul_nav-side.png"
                alt="Subul"
                width={160}
                height={56}
                className="h-10 w-auto max-w-[200px] object-contain object-left"
              />
            </Link>
            <p className="text-sm leading-relaxed text-slate-600">
              {t('footer.tagline')}
              {userRole === 'admin' && ` ${t('footer.taglineAdmin')}`}
              {userRole === 'student' && ` ${t('footer.taglineLearner')}`}
              {userRole === 'instructor' && ` ${t('footer.taglineInstructor')}`}
              {userRole === 'employer' && ` ${t('footer.taglineEmployer')}`}
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-800">
              {t('common.ourServices')}
            </h3>
            <ul className="list-none p-0 m-0">
              {getRoleLinks().map((link, index) => (
                <li key={index} className="mb-3">
                  <a
                    href={'anchor' in link ? link.href + link.anchor : link.href}
                    className="text-sm text-slate-600 no-underline transition-colors hover:text-fuchsia-700"
                    onClick={(e) => handleLinkClick(e, link as { href: string; anchor?: string })}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-800">
              Contact
            </h3>
            <ul className="list-none p-0 m-0">
              <li className="mb-3 flex items-center gap-3 text-sm text-slate-600">
                <Mail className="h-4 w-4 flex-shrink-0 text-fuchsia-600" />
                <a href="mailto:contact@subul.uk" className="no-underline transition-colors hover:text-fuchsia-700">contact@subul.uk</a>
              </li>
              <li className="mb-3 flex items-center gap-3 text-sm text-slate-600">
                <Phone className="h-4 w-4 flex-shrink-0 text-fuchsia-600" />
                <span>+447458197551</span>
              </li>
              <li className="mb-3 flex items-start gap-3 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-fuchsia-600" />
                <span>71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-800">
              {t('common.followUs')}
            </h3>
            <div className="flex gap-3">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-fuchsia-200 bg-white text-fuchsia-600 transition-all hover:bg-fuchsia-600 hover:text-white" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-fuchsia-200 bg-white text-fuchsia-600 transition-all hover:bg-fuchsia-600 hover:text-white" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-fuchsia-200 bg-white text-fuchsia-600 transition-all hover:bg-fuchsia-600 hover:text-white" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-fuchsia-200 bg-white text-fuchsia-600 transition-all hover:bg-fuchsia-600 hover:text-white" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-5 border-t border-fuchsia-100 pt-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-slate-600">{t('footer.copyright', { year: String(currentYear) })}</p>
            <p className="flex items-center gap-2 mt-2">
              <Heart className="h-4 w-4 text-fuchsia-600" />
              <span className="text-sm text-slate-600">{t('footer.madeWithPassion')}</span>
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 md:flex-row md:gap-6">
            <a href={createLocalizedUrl('/privacy')} className="flex items-center gap-2 text-sm text-slate-600 no-underline transition-colors hover:text-fuchsia-700">
              <Shield className="h-4 w-4" />
              {t('footer.privacy')}
            </a>
            <a href={createLocalizedUrl('/terms')} className="text-sm text-slate-600 no-underline transition-colors hover:text-fuchsia-700">{t('footer.terms')}</a>
            <a href={createLocalizedUrl('/cookies')} className="text-sm text-slate-600 no-underline transition-colors hover:text-fuchsia-700">{t('footer.cookies')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
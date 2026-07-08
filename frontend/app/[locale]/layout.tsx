import type { Metadata } from 'next';
import { LocaleLayoutClient } from './locale-layout-client';
import { SITE_URL, OG_DESCRIPTION, OG_TITLE, OG_COPY_BY_LOCALE } from '@/config/site';
import { APP_LOCALES, DEFAULT_LOCALE, type AppLocale } from '@/lib/i18n/config';

function resolveLocale(input: string): AppLocale {
  if (APP_LOCALES.includes(input as AppLocale)) {
    return input as AppLocale;
  }
  return DEFAULT_LOCALE;
}

function getOgLocale(locale: string): string {
  if (locale === 'fr') return 'fr_FR';
  return 'en_US';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const localePath = `/${locale}`;
  const ogCopy = OG_COPY_BY_LOCALE[locale];
  const title = ogCopy?.title ?? OG_TITLE;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      template: '%s | SUBUL Platform',
      default: title,
    },
    description: OG_DESCRIPTION,
    keywords: ['éducation', 'formation', 'certification', 'e-learning', 'professionnel', 'cours', 'apprentissage'],
    authors: [{ name: 'SUBUL Platform' }],
    creator: 'SUBUL Platform',
    publisher: 'SUBUL Platform',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: localePath,
      languages: {
        'x-default': `/${DEFAULT_LOCALE}`,
        en: '/en',
        fr: '/fr',
      },
    },
    openGraph: {
      type: 'website',
      locale: getOgLocale(locale),
      url: `${SITE_URL}${localePath}`,
      siteName: 'SUBUL Platform',
      title,
      description: OG_DESCRIPTION,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: OG_DESCRIPTION,
      creator: '@subulplatform',
      site: '@subulplatform',
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
      other: [
        { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', rel: 'manifest' },
        { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', rel: 'manifest' },
      ],
    },
    manifest: '/site.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'SUBUL',
    },
    appLinks: {
      android: {
        package: 'com.subul.platform',
        app_name: 'SUBUL Platform',
      },
    },
  };
}

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LocaleLayoutClient>{children}</LocaleLayoutClient>;
}

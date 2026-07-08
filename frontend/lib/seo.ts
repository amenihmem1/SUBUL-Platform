import { Metadata } from 'next';
import { SITE_URL, OG_DESCRIPTION } from '@/config/site';
import { APP_LOCALES, DEFAULT_LOCALE, type AppLocale } from '@/lib/i18n/config';

const SITE_NAME = 'SUBUL Platform';
const OG_IMAGE_URL = `${SITE_URL}/logo.png`;

export interface PageMetaProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  locale?: string;
  publishedTime?: string;
  authors?: string[];
  tags?: string[];
}

export function generatePageMetadata({
  title,
  description = OG_DESCRIPTION,
  image = OG_IMAGE_URL,
  url,
  type = 'website',
  locale = 'en_US',
  publishedTime,
  authors,
  tags,
}: PageMetaProps): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Éducation & Formation`;
  const pagePath = url || '/';
  const fullUrl = `${SITE_URL}${pagePath}`;
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;
  const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
  const detectedLocale: AppLocale =
    APP_LOCALES.find((candidate) => normalizedPath === `/${candidate}` || normalizedPath.startsWith(`/${candidate}/`)) ||
    DEFAULT_LOCALE;
  const pathWithoutLocale = normalizedPath.replace(/^\/(en|fr)(?=\/|$)/, '') || '/';
  const languages: Record<string, string> = {
    'x-default': `${SITE_URL}/${DEFAULT_LOCALE}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
  };

  for (const localeKey of APP_LOCALES) {
    languages[localeKey] = `${SITE_URL}/${localeKey}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
  }

  const canonical =
    normalizedPath === '/'
      ? `${SITE_URL}/${detectedLocale}`
      : fullUrl;

  return {
    metadataBase: new URL(SITE_URL),
    title: fullTitle,
    description,
    keywords: tags || ['éducation', 'formation', 'certification', 'e-learning', 'professionnel'],
    authors: authors ? [{ name: authors.join(', ') }] : [{ name: 'SUBUL Platform' }],
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
      canonical,
      languages,
    },
    openGraph: {
      type,
      locale,
      url: fullUrl,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title || SITE_NAME,
        },
      ],
      ...(type === 'article' && publishedTime && {
        publishedTime,
        authors,
        tags,
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [fullImage],
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
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
  };
}

export function getAbsoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

export const defaultMetadata = generatePageMetadata({});

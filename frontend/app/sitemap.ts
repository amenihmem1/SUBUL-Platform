import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';
import { APP_LOCALES } from '@/lib/i18n/config';

const LOCALES = APP_LOCALES;
const PUBLIC_PATHS = ['', '/privacy', '/terms', '/cookies', '/auth/login', '/auth/register'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const path of PUBLIC_PATHS) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.7,
      });
    }
  }

  return entries;
}

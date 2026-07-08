import { ImageResponse } from 'next/og';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { DOMAIN_DISPLAY, OG_COPY_BY_LOCALE } from '@/config/site';

export const alt = 'SUBUL Platform - Éducation et Formation Professionnelle';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

type LocaleKey = keyof typeof OG_COPY_BY_LOCALE;

function resolveLocale(input: string): LocaleKey {
  if (input in OG_COPY_BY_LOCALE) {
    return input as LocaleKey;
  }
  return 'fr';
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  try {
    const { locale: rawLocale } = await params;
    const locale = resolveLocale(rawLocale);
    const copy = OG_COPY_BY_LOCALE[locale];

    const logoData = await readFile(join(process.cwd(), 'public/logo.png'), 'base64');
    const logoSrc = `data:image/png;base64,${logoData}`;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '8px',
              background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 48,
            }}
          >
            <img src={logoSrc} height="140" alt="SUBUL Logo" />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: 900,
              padding: '0 40px',
            }}
          >
            <h1
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: '#1e293b',
                textAlign: 'center',
                margin: 0,
                marginBottom: 24,
                lineHeight: 1.1,
              }}
            >
              {copy.title}
            </h1>

            <p
              style={{
                fontSize: 28,
                color: '#64748b',
                textAlign: 'center',
                margin: 0,
                maxWidth: 700,
                lineHeight: 1.4,
              }}
            >
              {copy.subtitle}
            </p>

            <div
              style={{
                marginTop: 28,
                padding: '14px 34px',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                color: '#ffffff',
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              {copy.cta}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ color: '#94a3b8', fontSize: 24 }}>{DOMAIN_DISPLAY}</span>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (error) {
    console.error('OG image generation failed:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}

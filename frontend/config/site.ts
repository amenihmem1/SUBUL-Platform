export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.subul.uk';
export const DOMAIN_DISPLAY = 'app.subul.uk';

export const OG_DESCRIPTION =
  "Propulsez votre carrière avec SUBUL, la plateforme EdTech IA. Formations personnalisées, certifications reconnues et matching emploi intelligent.";

export const OG_TITLE = 'SUBUL — Plateforme EdTech IA';

export const OG_COPY_BY_LOCALE = {
  fr: {
    title: 'SUBUL — Plateforme EdTech IA',
    subtitle: 'Éducation et Formation Professionnelle',
    cta: 'Rejoignez SUBUL maintenant',
  },
  en: {
    title: 'SUBUL — EdTech and Job Tech AI Platform',
    subtitle: 'Education, Professional Training and Job Opportunities',
    cta: 'Join SUBUL now',
  },
} as const;

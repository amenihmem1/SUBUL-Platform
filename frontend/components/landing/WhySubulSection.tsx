'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Briefcase,
  TrendingUp,
  BookOpen,
  User,
  GraduationCap,
  ArrowRight,
  Check,
  LayoutGrid,
  BarChart2,
  FileText,
  Linkedin,
} from 'lucide-react';
import { fadeInUp } from '@/components/landing/animations';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui';
import { localeFromPathname } from '@/lib/i18n/config';

const floatingIcons = [
  { Icon: LayoutGrid, className: 'top-[12%] left-[10%] w-10 h-10 md:w-11 md:h-11' },
  { Icon: BarChart2, className: 'bottom-[15%] left-[12%] w-9 h-9 md:w-10 md:h-10' },
  { Icon: FileText, className: 'top-1/2 right-[8%] w-9 h-9 md:w-10 md:h-10 -translate-y-1/2' },
  { Icon: Linkedin, className: 'top-[15%] right-[10%] w-8 h-8 md:w-9 md:h-9' },
];

function AdvantageVisual({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-[230px] w-[230px] md:h-[270px] md:w-[270px]">
      {/* Dashed SVG circles around center */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 280 280"
        aria-hidden
      >
        <circle
          cx="140"
          cy="140"
          r="85"
          fill="none"
          stroke="rgb(147, 51, 234)"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          opacity="0.4"
        />
        <circle
          cx="140"
          cy="140"
          r="120"
          fill="none"
          stroke="rgb(147, 51, 234)"
          strokeWidth="1"
          strokeDasharray="8 6"
          opacity="0.25"
        />
      </svg>
      {/* Main central circle */}
      <div className="absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-brand md:h-28 md:w-28">
        {React.isValidElement<{ className?: string }>(icon)
          ? React.cloneElement(icon, { className: 'w-10 h-10 md:w-12 md:h-12' })
          : icon}
      </div>
      {/* Floating small icon circles */}
      {floatingIcons.map(({ Icon, className }, i) => (
        <div
          key={i}
          className={`absolute z-10 rounded-full bg-white border-2 border-pink-200 flex items-center justify-center text-pink-600 shadow-sm ${className}`}
        >
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      ))}
    </div>
  );
}

export default function WhySubulSection() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);

  const registerHref = `/${locale}/auth/register`;

  const whyPoints = [
    {
      icon: <User className="w-6 h-6" />,
      title: t('homepage.whySubul.points.network.title'),
      ctaLabel: 'Rejoindre la communauté',
      href: registerHref,
      description: "Rejoignez une communauté dynamique de professionnels de la tech et accélérez votre carrière grâce à un réseau intelligent.",
      bullets: [
        "Mise en relation IA avec des mentors et experts pertinents",
        "Événements de networking virtuels et présentiels",
        "Communauté exclusive de développeurs et data scientists"
      ],
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: t('homepage.whySubul.points.training.title'),
      ctaLabel: 'Découvrir les parcours',
      href: `/${locale}/dashboard/learner/cours`,
      description: "Formations adaptées par IA qui évoluent avec votre progression et les besoins du marché tech.",
      bullets: [
        "Parcours d'apprentissage personnalisés par votre profil",
        "Projets pratiques basés sur des cas réels d'entreprise",
        "Certifications reconnues par les leaders du secteur"
      ],
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: t('homepage.whySubul.points.opportunities.title'),
      ctaLabel: "Explorer les offres",
      href: `/${locale}/dashboard/learner/emploi`,
      description: "Accédez aux meilleures opportunités grâce à notre matching intelligent et votre profil de compétences complet.",
      bullets: [
        "Alertes d'offres ciblées selon vos compétences",
        "Préparation aux entretiens avec simulations IA",
        "Suivi de vos candidatures en temps réel"
      ],
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: t('homepage.whySubul.points.followup.title'),
      ctaLabel: "Démarrer mon accompagnement",
      href: registerHref,
      description: "Accompagnement continu avec des coachs carrière et des analyses prédictives de votre évolution.",
      bullets: [
        "Roadmaps personnalisées par IA selon vos objectifs",
        "Sessions de coaching avec des experts carrière",
        "Tableau de bord de progression et KPIs personnalisés"
      ],
    },
  ];

  const featureItems = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Roadmap Carrière IA",
      ctaLabel: 'Générer ma roadmap',
      href: `/${locale}/dashboard/learner/roadmap`,
      description: "Votre parcours personnalisé généré par IA qui s'adapte en temps réel à vos progrès et aux tendances du marché.",
      bullets: [
        "Évaluation initiale de compétences par IA",
        "Parcours adaptatif avec jalons personnalisés",
        "Prédictions de carrière basées sur votre profil"
      ],
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "Formation Immersive",
      ctaLabel: 'Accéder aux labs',
      href: `/${locale}/dashboard/learner/labs`,
      description: "Apprentissage par projet avec feedback immédiat et environnement de développement intégré.",
      bullets: [
        "Labs interactifs avec correction automatique",
        "Projets collaboratifs avec code review IA",
        "Portfolio de projets certifiables"
      ],
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: "Talents Marketplace",
      ctaLabel: 'Trouver des missions',
      href: `/${locale}/dashboard/learner/emploi`,
      description: "Connectez-vous directement avec des entreprises et développez votre expertise sur des projets réels.",
      bullets: [
        "Marketplace de projets freelances et missions",
        "Validation de compétences par les entreprises",
        "Génération de revenus dès la formation"
      ],
    },
  ];

  const allItems = [...whyPoints, ...featureItems];

  const backgroundShades = [
    'bg-background',
    'bg-muted/40',
    'bg-background',
    'bg-muted/50',
    'bg-background',
    'bg-muted/40',
    'bg-background',
  ] as const;

  return (
    <section id="pourquoi" className="scroll-mt-20 bg-background py-14 md:py-16">
      <div className="container">
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-pink-600 bg-pink-50 px-3 py-1 rounded-full mb-4">
            Pourquoi choisir SUBUL ?
          </span>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Votre Carrière Accélérée par l'Intelligence Artificielle
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Subul transforme votre développement professionnel avec des parcours sur mesure, un coaching intelligent et des opportunités ciblées.
          </p>
        </motion.div>
      </div>

      <div id="fonctionnalites" className="scroll-mt-24">
        {allItems.map((item, index) => {
          const isMuted = (backgroundShades[index] ?? 'bg-background').includes('muted');
          return (
          <motion.article
            key={index}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className={`py-12 md:py-14 ${backgroundShades[index] ?? 'bg-background'}`}
          >
            <div className="container">
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-10">
              {/* Visual: left by default, right when bg-muted */}
              <div className={`order-2 flex justify-center ${isMuted ? 'lg:order-2 lg:justify-start' : 'lg:order-1 lg:justify-end'}`}>
                <AdvantageVisual icon={item.icon} />
              </div>

              {/* Content: right by default, left when bg-muted */}
              <div className={isMuted ? 'order-1 lg:order-1' : 'order-1 lg:order-2'}>
                <h3 className="mb-2.5 text-xl font-bold tracking-tight text-foreground md:text-2xl">
                  {item.title}
                </h3>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {item.description}
                </p>
                <ul className="mb-6 space-y-2.5">
                  {item.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-pink-600" strokeWidth={2.5} />
                      </span>
                      <span className="text-sm text-foreground md:text-base">{bullet}</span>
                    </li>
                  ))}
                </ul>
                <Button className="bg-gradient-to-r from-pink-600 to-pink-700 text-sm text-white shadow-brand hover:from-pink-700 hover:to-pink-800 hover:shadow-brand-lg md:text-base" asChild>
                  <Link href={item.href} className="inline-flex items-center gap-2">
                    {item.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          </motion.article>
          );
        })}
      </div>
    </section>
  );
}

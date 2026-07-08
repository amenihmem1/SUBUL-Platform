'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Building, GraduationCap, BookOpen, CheckCircle2, Sparkles, TrendingUp, Target } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { localeFromPathname } from '@/lib/i18n/config';

export default function UserTypesSection() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const [activeTab, setActiveTab] = useState<'etudiants' | 'professionnels' | 'entreprises' | 'university'>('etudiants' as const);

  const getBenefitsFromTranslations = (key: string): string[] => {
    const translations = {
      'userTypes.students.benefits': locale === 'fr' ? [
        "Certifications reconnues par les employeurs",
        "Mentorat personnalisé par des experts du secteur",
        "Accès aux offres de stages et d'emploi exclusives",
        "Réseau d'anciens étudiants et de professionnels",
      ] : locale === 'en' ? [
        "Recognized certifications by employers",
        "Personalized mentorship by industry experts",
        "Access to exclusive internship and job offers",
        "Network of alumni and professionals",
      ] : [
        "شهادات معترف بها من قبل أصحاب العمل",
        "إرشاد شخصي من قبل خبراء القطاع",
        "الوصول إلى عروض تدريب ووظائف حصرية",
        "شبكة من الخريجين والمحترفين",
      ],
      'userTypes.professionals.benefits': locale === 'fr' ? [
        "Formations continues et mises à jour régulièrement",
        "Certifications cloud AWS, Azure & Google Cloud",
        "Accompagnement de reconversion professionnelle",
        "Réseau de professionnels qualifiés dans votre domaine",
      ] : locale === 'en' ? [
        "Continuing education and regular updates",
        "Cloud certifications AWS, Azure & Google Cloud",
        "Career transition support",
        "Network of qualified professionals in your field",
      ] : [
        "التعليم المستمر والتحديثات المنتظمة",
        "شهادات سحابية AWS, Azure & Google Cloud",
        "دعم تحويل المسار المهني",
        "شبكة من المحترفين المؤهلين في مجالك",
      ],
      'userTypes.companies.benefits': locale === 'fr' ? [
        "Programmes de formation sur mesure pour vos équipes",
        "Accès à un vivier de talents qualifiés et certifiés",
        "Innovation et transformation digitale accompagnée",
        "Partenariats stratégiques avec l'écosystème SUBUL",
      ] : locale === 'en' ? [
        "Custom training programs for your teams",
        "Access to a pool of qualified and certified talent",
        "Accompanied innovation and digital transformation",
        "Strategic partnerships with the SUBUL ecosystem",
      ] : [
        "برامج تدريب مخصصة لفرقك",
        "الوصول إلى مجموعة من المواهب المؤهلة والمعتمدة",
        "الابتكار والتحول الرقمي المصحوب",
        "شراكات استراتيجية مع نظام SUBUL البيئي",
      ],
      'userTypes.university.benefits': locale === 'fr' ? [
        "Plateforme d'orientation professionnelle pour étudiants",
        "Tableau de bord d'analyse de l'insertion professionnelle",
        "Partenariats avec les entreprises pour vos diplômés",
        "Outils pédagogiques IA alignés avec le marché",
      ] : locale === 'en' ? [
        "Career guidance platform for students",
        "Dashboard for analyzing professional integration",
        "Partnerships with companies for your graduates",
        "AI-powered teaching tools aligned with the market",
      ] : [
        "منصة توجيه مهني للطلاب",
        "لوحة تحليل لدمج المهني",
        "شراكات مع الشركات لخريجيك",
        "أدوات تعليمية مدعومة بالذكاء الاصطناعي متوافقة مع السوق",
      ],
    };
    
    return translations[key as keyof typeof translations] || [];
  };

  const USER_TYPES = [
    {
      id: "etudiants",
      labelKey: 'userTypes.students.title',
      label: t('userTypes.students.title'),
      Icon: GraduationCap,
      gradient: "linear-gradient(135deg,hsl(280 61% 55%),hsl(280 71% 65%))",
      lightBg: "linear-gradient(135deg,hsl(280 30% 95%),hsl(280 25% 97%))",
      borderColor: "hsl(280 61% 55%)",
      iconColor: "hsl(280 61% 55%)",
      checkColor: "hsl(280 61% 55%)",
      title: t('userTypes.students.title'),
      subtitle: t('userTypes.students.subtitle'),
      benefitsKey: 'userTypes.students.benefits',
      stats: { students: '10 000+', success: '95 %', partners: '500+' },
      features: ["Apprentissage propulsé par l'IA", 'Certifications sectorielles reconnues', 'Accompagnement carrière'],
    },
    {
      id: "professionnels",
      labelKey: 'userTypes.professionals.title',
      label: t('userTypes.professionals.title'),
      Icon: Briefcase,
      gradient: "linear-gradient(135deg,hsl(338 82% 58%),hsl(338 72% 68%))",
      lightBg: "linear-gradient(135deg,hsl(338 82% 95%),hsl(338 82% 97%))",
      borderColor: "hsl(338 82% 58%)",
      iconColor: "hsl(338 82% 58%)",
      checkColor: "hsl(338 82% 58%)",
      title: t('userTypes.professionals.title'),
      subtitle: t('userTypes.professionals.subtitle'),
      benefitsKey: 'userTypes.professionals.benefits',
      image: "/landing/professionals-visual.png",
      stats: { students: '5 000+', success: '92 %', partners: '300+' },
      features: ['Certifications cloud', 'Reconversion carrière', 'Réseau d\'experts'],
    },
    {
      id: "entreprises",
      labelKey: 'userTypes.companies.title',
      label: t('userTypes.companies.title'),
      Icon: Building,
      gradient: "linear-gradient(135deg,hsl(280 61% 55%),hsl(338 82% 58%))",
      lightBg: "linear-gradient(135deg,hsl(280 30% 95%),hsl(338 82% 95%))",
      borderColor: "hsl(280 61% 55%)",
      iconColor: "hsl(280 61% 55%)",
      checkColor: "hsl(280 61% 55%)",
      title: t('userTypes.companies.title'),
      subtitle: t('userTypes.companies.subtitle'),
      benefitsKey: 'userTypes.companies.benefits',
      image: "/landing/companies-visual.png",
      stats: { students: '2 000+', success: '98 %', partners: '150+' },
      features: ['Programmes sur mesure', 'Vivier de talents', 'Transformation digitale'],
    },
    {
      id: "university",
      labelKey: 'userTypes.university.title',
      label: t('userTypes.university.title'),
      Icon: BookOpen,
      gradient: "linear-gradient(135deg,hsl(280 14% 49%),hsl(280 24% 59%))",
      lightBg: "linear-gradient(135deg,hsl(280 14% 96%),hsl(280 14% 98%))",
      borderColor: "hsl(280 14% 49%)",
      iconColor: "hsl(280 14% 49%)",
      checkColor: "hsl(280 14% 49%)",
      title: t('userTypes.university.title'),
      subtitle: t('userTypes.university.subtitle'),
      benefitsKey: 'userTypes.university.benefits',
      image: "/landing/university-visual.png",
      stats: { students: '50 000+', success: '96 %', partners: '200+' },
      features: ['Orientation carrière', 'Tableau de bord analytique', 'Partenariats sectoriels'],
    },
  ];

  const activeBlock = USER_TYPES.find((b) => b.id === activeTab) ?? USER_TYPES[0];

  return (
    <section id="profils" className="relative overflow-hidden scroll-mt-20 bg-gradient-to-br from-slate-50 via-hsl(280 30% 95%) to-hsl(338 82% 95%) py-14 md:py-16">
      {/* Enhanced decorative elements using brand colors */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-hsl(280 61% 55%)/10 to-hsl(338 82% 58%)/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-hsl(280 14% 49%)/10 to-hsl(338 82% 58%)/10 rounded-full blur-3xl" />
      
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="container relative">
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-5 flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-hsl(280 61% 55%)" />
            <span className="inline-block rounded-full border border-hsl(280 40% 80%) bg-hsl(280 30% 95%) px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-hsl(280 61% 55%)">
              {t('homepage.nav.forWho')}
            </span>
            <Sparkles className="h-4 w-4 text-hsl(280 61% 55%)" />
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            {t('userTypes.title')}
          </h2>
          <p className="mx-auto max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg">
            {t('userTypes.subtitle')}
          </p>
        </motion.div>

        {/* Enhanced Tabs with better styling using brand colors */}
        <nav className="mb-10 flex justify-center" aria-label="User types">
          <div className="inline-flex rounded-2xl border border-hsl(280 40% 80%) bg-white/80 p-1 backdrop-blur-sm shadow-lg">
            {USER_TYPES.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'etudiants' | 'professionnels' | 'entreprises' | 'university')}
                className={cn(
                  'relative rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300',
                  activeTab === tab.id
                    ? 'text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
                style={{
                  background: activeTab === tab.id ? tab.gradient : 'transparent',
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <tab.Icon className="w-4 h-4" />
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: tab.gradient }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Enhanced content with three-column layout */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {/* Left: Enhanced visual card */}
          <motion.div
            key={`${activeTab}-visual`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <div className="sticky top-8">
              <div 
                className="relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl"
                style={{ background: activeBlock.gradient }}
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                
                <div className="relative z-10">
                  <div className="mb-5 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                      <activeBlock.Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{activeBlock.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm opacity-90">Plateforme de référence</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="mb-5 grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-xl font-bold">{activeBlock.stats?.students || '10 000+'}</div>
                      <div className="text-xs opacity-75">Apprenants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">{activeBlock.stats?.success || '95 %'}</div>
                      <div className="text-xs opacity-75">Réussite</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">{activeBlock.stats?.partners || '500+'}</div>
                      <div className="text-xs opacity-75">Partenaires</div>
                    </div>
                  </div>
                  
                  {/* Feature badges */}
                  <div className="flex flex-wrap gap-2">
                    {activeBlock.features?.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="bg-white/20 text-white border-white/30">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Middle: Benefits list */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="lg:col-span-2"
            >
              <Card className="border-0 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: activeBlock.lightBg }}>
                    <Target className="h-5 w-5" style={{ color: activeBlock.iconColor }} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Avantages clés</h4>
                    <p className="text-sm text-gray-600">{activeBlock.subtitle}</p>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  {getBenefitsFromTranslations(activeBlock.benefitsKey).map((benefit: string, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 rounded-xl p-3.5 transition-colors hover:bg-gray-50"
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${activeBlock.iconColor}20` }}>
                        <CheckCircle2 className="w-4 h-4" style={{ color: activeBlock.iconColor }} />
                      </div>
                      <span className="text-sm font-medium leading-relaxed text-gray-700">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

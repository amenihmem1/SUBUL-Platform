'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

const PARTNERS = [
  {
    key: 'aws',
    name: 'AWS',
    logo: '/partners/aws.svg',
    certification: 'AWS Certified Cloud Practitioner',
  },
  {
    key: 'microsoft',
    name: 'Microsoft',
    logo: '/partners/microsoft.svg',
    certification: 'Microsoft Certified: Azure Fundamentals AZ-900',
  },
  {
    key: 'google',
    name: 'Google',
    logo: '/partners/google.svg',
    certification: 'Google Cloud Digital Leader Certification',
  },
] as const;

export default function PricingPartnersSection() {
  return (
    <section className="mt-10 rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-[0_26px_80px_-48px_rgba(30,41,59,0.6)] backdrop-blur-xl sm:p-7">
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Partenaires technologiques de référence
        </p>
        <h3 className="mt-4 text-xl font-black tracking-tight text-slate-900 md:text-2xl">
          Partenaires de formation IA, Cloud et Cybersécurité
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
          Fiers de collaborer avec les leaders technologiques mondiaux pour garantir des parcours
          de formation crédibles, reconnus et orientés impact.
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {PARTNERS.map((partner, index) => (
          <motion.article
            key={partner.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            whileHover={{ y: -6, scale: 1.01 }}
            className="group rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/70 p-4 shadow-sm transition-all duration-300 hover:border-fuchsia-200 hover:shadow-[0_18px_38px_-24px_rgba(192,38,211,0.45)]"
          >
            <div className="flex h-10 items-center">
              <Image
                src={partner.logo}
                alt={`${partner.name} logo`}
                width={124}
                height={38}
                className="h-8 w-auto object-contain transition-opacity duration-300 group-hover:opacity-95"
              />
            </div>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
              {partner.certification}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

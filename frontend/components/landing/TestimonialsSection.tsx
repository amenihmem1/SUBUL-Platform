'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Code, GraduationCap, Star, UserCog, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export default function TestimonialsSection() {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      quote: t('homepage.testimonials.items.0.quote'),
      name: t('homepage.testimonials.items.0.name'),
      role: t('homepage.testimonials.items.0.role'),
      icon: <Code className="w-10 h-10 text-primary bg-secondary p-2 rounded-full" />,
    },
    {
      quote: t('homepage.testimonials.items.1.quote'),
      name: t('homepage.testimonials.items.1.name'),
      role: t('homepage.testimonials.items.1.role'),
      icon: <UserCog className="w-10 h-10 text-primary bg-secondary p-2 rounded-full" />,
    },
    {
      quote: t('homepage.testimonials.items.2.quote'),
      name: t('homepage.testimonials.items.2.name'),
      role: t('homepage.testimonials.items.2.role'),
      icon: <GraduationCap className="w-10 h-10 text-primary bg-secondary p-2 rounded-full" />,
    },
  ];

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('[data-carousel-card]')?.getBoundingClientRect().width ?? 0;
    const gap = 24;
    const scrollLeft = index * (cardWidth + gap);
    el.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    setActiveIndex(index);
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('[data-carousel-card]')?.getBoundingClientRect().width ?? 0;
    const gap = 24;
    const index = Math.round(el.scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(Math.max(0, index), testimonials.length - 1));
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="temoignages" className="py-20 md:py-24 bg-muted/40">
      <div className="container">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            {t('homepage.testimonials.headline')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('homepage.testimonials.subtitle')}
          </p>
        </motion.div>

        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4 md:-mx-6 md:px-6 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                data-carousel-card
                className="flex-shrink-0 w-[min(100%,340px)] md:w-[min(calc(50%-12px),420px)] snap-center"
              >
                <div className="h-full rounded-xl border border-border bg-card p-8 shadow-card hover:shadow-card-hover transition-all duration-200 hover:border-primary/20 hover:bg-primary/[0.02]">
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-sm leading-relaxed text-muted-foreground italic mb-6">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{testimonial.icon}</div>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted hover:border-primary/30 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollToIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    index === activeIndex ? 'bg-primary scale-125' : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => scrollToIndex(Math.min(testimonials.length - 1, activeIndex + 1))}
              disabled={activeIndex === testimonials.length - 1}
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted hover:border-primary/30 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

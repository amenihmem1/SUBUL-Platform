'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { BillingCycle } from '@/services/payments';
import { cn } from '@/lib/utils';
import {
  BILLING_SELECTOR_OPTIONS,
  type PublicPlanPrice,
} from '@/lib/config/public-pricing';

export const BILLING_CYCLE_OPTIONS: Array<{
  id: BillingCycle;
  label: string;
  sublabel: string;
  badge: string | null;
  popular?: boolean;
}> = [
  { id: 'monthly',   label: 'Mensuel',     sublabel: 'Flexibilité totale', badge: null },
  { id: 'quarterly', label: 'Trimestriel', sublabel: 'Économisez 10%',     badge: '-10%' },
  { id: 'annual',    label: 'Annuel',      sublabel: 'Meilleure valeur',   badge: '-30%', popular: true },
];

export const CYCLE_SUFFIX: Record<BillingCycle, string> = {
  monthly:   '/ mois',
  quarterly: '/ trim.',
  semester:  '/ sem.',   // kept for type-safety, never displayed
  annual:    '/ an',
};

type PricingPrices = Record<BillingCycle, number> | undefined;

type Props = {
  selectedCycle: BillingCycle;
  onSelect: (cycle: BillingCycle) => void;
  pricingLoading: boolean;
  /** When pricing failed to load (e.g. network / CORS) */
  pricingError?: boolean;
  currency: string | undefined;
  prices: PricingPrices;
  divisor: number;
  variant?: 'default' | 'compact';
  /**
   * When false (e.g. landing pricing), hide per-cycle amounts — avoids duplicating
   * the same figures shown on each plan card below.
   */
  showPrices?: boolean;
  className?: string;
  cycleMeta?: Partial<
    Record<
      BillingCycle,
      {
        badge?: string;
        popular?: boolean;
        subtitle?: string;
      }
    >
  >;
  premium?: boolean;
};

export function BillingCycleCards({
  selectedCycle,
  onSelect,
  pricingLoading,
  pricingError = false,
  currency,
  prices,
  divisor,
  variant = 'default',
  showPrices = true,
  className = '',
  cycleMeta,
  premium = false,
}: Props) {
  const isCompact = variant === 'compact';
  const pad = isCompact ? 'px-3 py-2.5 sm:px-3.5 sm:py-2.5' : 'p-5';

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/80 bg-white/85 p-1.5 shadow-[0_18px_42px_-34px_rgba(124,58,237,0.5)] backdrop-blur-xl',
        premium &&
          'border-fuchsia-200/70 bg-gradient-to-b from-white via-fuchsia-50/25 to-white shadow-[0_20px_54px_-36px_rgba(192,38,211,0.5)]',
        className,
      )}
    >
      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-3',
          isCompact ? 'gap-1' : 'gap-2',
        )}
        role="tablist"
        aria-label="Période de facturation"
      >
      {BILLING_SELECTOR_OPTIONS.map((seed, i) => {
        const c = {
          id: seed.cycle as BillingCycle,
          label: seed.label,
          sublabel: cycleMeta?.[seed.cycle]?.subtitle ?? seed.subtitle,
          badge: cycleMeta?.[seed.cycle]?.badge ?? seed.badge ?? null,
          popular: cycleMeta?.[seed.cycle]?.popular ?? seed.popular,
        };
        const price = prices?.[c.id] ?? 0;
        const isSelected = selectedCycle === c.id;
        const overridePrice = cycleMeta?.[c.id] as { displayPrice?: PublicPlanPrice } | undefined;
        const priceCurrency = overridePrice?.displayPrice?.currency ?? currency;
        const displayValue = overridePrice?.displayPrice
          ? (overridePrice.displayPrice.amountCents / divisor).toFixed(
              overridePrice.displayPrice.currency === 'TND' ? 3 : 2,
            )
          : (price / divisor).toFixed((currency || 'TND') === 'TND' ? 3 : 2);

        return (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            role="tab"
            aria-selected={isSelected}
            aria-label={`${c.label} ${c.sublabel}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
            whileHover={{ y: -1, transition: { duration: 0.16 } }}
            whileTap={{ scale: 0.985 }}
            className={cn(
              `relative flex flex-col overflow-hidden rounded-2xl border ${pad} text-left transition-all duration-300`,
              isCompact ? 'min-h-[64px] sm:min-h-[62px]' : 'min-h-[138px]',
              isSelected
                ? 'border-fuchsia-300/80 bg-gradient-to-r from-rose-50 via-fuchsia-50 to-violet-50 shadow-[0_10px_24px_-18px_rgba(192,38,211,0.65)] ring-1 ring-fuchsia-200/70'
                : 'border-slate-200/80 bg-white/90 hover:border-fuchsia-200/80 hover:bg-white',
            )}
          >
            {c.popular && (
              <span className="pointer-events-none absolute -top-px left-0 right-0 flex justify-center">
                <span className={cn(
                  'rounded-b-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-600 font-bold uppercase text-white shadow-md shadow-fuchsia-300/40',
                  isCompact ? 'px-2 py-0.5 text-[8px] tracking-[0.12em]' : 'px-4 py-0.5 text-[10px] tracking-widest',
                )}>
                  Populaire
                </span>
              </span>
            )}

            <div className={cn('flex items-center justify-between gap-2', c.popular && (isCompact ? 'mt-2.5' : 'mt-4'))}>
              <div className="min-w-0">
              {c.badge && (
                <span className={cn(`inline-flex w-fit items-center rounded-full font-bold
                  ${isSelected
                    ? 'bg-gradient-to-r from-rose-100 to-fuchsia-100 text-fuchsia-700 ring-1 ring-fuchsia-200'
                    : 'bg-slate-100 text-slate-500'
                  }`, isCompact ? 'mb-1 px-1.5 py-0.5 text-[9px]' : 'mb-2.5 px-2.5 py-0.5 text-xs')}>
                  {c.badge}
                </span>
              )}

              <span className={cn(
                `block font-bold ${isSelected ? 'text-slate-900' : 'text-slate-800'}`,
                isCompact ? 'text-[14px] leading-[1.15]' : 'text-base',
              )}>
                {c.label}
              </span>
              <span className={cn(
                `mt-0.5 block ${isSelected ? 'text-fuchsia-600' : 'text-slate-400'}`,
                isCompact ? 'text-[10px] leading-[1.15]' : 'text-xs',
              )}>
                {c.sublabel}
              </span>
              </div>

              {showPrices && (
                <div className="ml-auto mt-3 flex flex-shrink-0 items-baseline gap-1">
                  {pricingLoading ? (
                    <span className="h-7 w-20 animate-pulse rounded-lg bg-slate-100" />
                  ) : pricingError ? (
                    <span className="text-xs font-semibold text-red-600">Tarifs indisponibles</span>
                  ) : (
                    <>
                      <span
                        className={`text-2xl font-extrabold tabular-nums tracking-tight
                      ${isSelected
                        ? 'bg-gradient-to-r from-rose-600 to-fuchsia-600 bg-clip-text text-transparent'
                        : 'text-slate-700'
                      }`}
                      >
                        {displayValue}
                      </span>
                      <span
                        className={`text-xs font-medium ${isSelected ? 'text-fuchsia-400' : 'text-slate-400'}`}
                      >
                        {priceCurrency}
                        {CYCLE_SUFFIX[c.id]}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className={cn(`flex items-center justify-center self-end rounded-full border-2 transition-all
              ${isSelected
                ? 'border-fuchsia-500 bg-gradient-to-br from-rose-500 to-fuchsia-600 shadow-sm shadow-fuchsia-300'
                : 'border-slate-300'
              }`, isCompact ? 'absolute right-2.5 top-2.5 h-3.5 w-3.5 border' : 'mt-4 h-5 w-5')}>
              {isSelected && <Check className={cn(isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3', 'text-white')} strokeWidth={3} />}
            </div>
          </motion.button>
        );
      })}
      </div>
    </div>
  );
}

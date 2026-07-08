'use client';

import Link from 'next/link';
import { Lock, Crown } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

/** Minimum paid tier to unlock the locked surface (mirrors product entitlements). */
export type LockedMinimumPlan = 'standard_or_premium' | 'premium_only';

interface LockedOverlayProps {
  locked: boolean;
  locale: string;
  message?: string;
  /**
   * When `message` is omitted, controls copy + default checkout target.
   * Default: Standard or Premium (catalog courses/labs beyond free tier).
   */
  minimumPlan?: LockedMinimumPlan;
  /** Show a compact badge-only overlay (no CTA button) */
  compact?: boolean;
  onClick?: () => void;
  /** Override checkout URL (e.g. certifications → Premium preselect). */
  checkoutHref?: string;
}

function defaultCheckoutHref(locale: string, minimumPlan: LockedMinimumPlan): string {
  if (minimumPlan === 'premium_only') {
    return `/${locale}/checkout?plan=premium&cycle=monthly&source=locked-premium&mode=upgrade`;
  }
  return `/${locale}/checkout?plan=standard&cycle=monthly&source=locked-standard&mode=upgrade`;
}

export function LockedOverlay({
  locked,
  locale,
  message,
  minimumPlan = 'standard_or_premium',
  compact,
  onClick,
  checkoutHref,
}: LockedOverlayProps) {
  const { t } = useTranslation();
  if (!locked) return null;

  const label = message
    ? String(message)
    : minimumPlan === 'premium_only'
      ? String(t('subscription.lockPremiumOnly'))
      : String(t('subscription.lockStandardOrPremium'));

  const upgradeHref = checkoutHref ?? defaultCheckoutHref(locale, minimumPlan);

  const isPremiumCheckout =
    (checkoutHref ?? '').includes('plan=premium') || minimumPlan === 'premium_only';
  const upgradeCta = isPremiumCheckout
    ? String(t('subscription.upgradeCtaPremium'))
    : String(t('subscription.upgradeCtaStandardOrPremium'));

  const showCheckoutLink = ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS;

  if (compact) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/40 backdrop-blur-[2px] rounded-2xl cursor-not-allowed">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 border border-slate-200 shadow-sm">
            <Lock className="h-4 w-4 text-slate-500" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/70 dark:bg-black/50 backdrop-blur-[3px] rounded-2xl cursor-pointer transition-all hover:bg-white/80"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
        <Lock className="h-5 w-5 text-white" />
      </div>
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</span>
      {showCheckoutLink ? (
        <Link
          href={upgradeHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-[11px] font-bold text-white shadow-md shadow-violet-500/20 hover:from-violet-700 hover:to-fuchsia-700 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <Crown className="h-3 w-3" />
          {upgradeCta}
        </Link>
      ) : null}
    </div>
  );
}

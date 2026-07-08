'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useUniversity } from '@/contexts/UniversityContext';
import { getSubscriptionStatus } from '@/services/subscriptions';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

const DISABLE_SUBSCRIPTION_GATE =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DISABLE_SUBSCRIPTION_GATE === 'true';

export function SubscriptionGate({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { university, isLoading: uniLoading } = useUniversity();
  const { data, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    staleTime: 30_000,
  });

  if (DISABLE_SUBSCRIPTION_GATE) return null;
  if (uniLoading || isLoading || !data) return null;

  // B2B2C: institution overlay + access rules are handled by `UniversityAccessGate`
  if (university) return null;
  if (data.accessSource === 'institutional' || data.kind === 'institutional_active') return null;
  if (data.canUsePersonalSubscriptionFlow === false) return null;

  const blockedKinds = new Set(['trial_expired', 'paid_expired', 'cancelled', 'pending_payment']);
  const isBlocked = !data.hasAccess && blockedKinds.has(data.kind);

  if (!isBlocked) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-400 to-orange-400" />

        <div className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
            <AlertTriangle className="h-7 w-7 text-rose-500" />
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            {data.kind === 'pending_payment'
              ? t('subscriptionGate.pendingPayment')
              : t('subscriptionGate.restrictedAccess')}
          </h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            {data.kind === 'pending_payment'
              ? t('subscriptionGate.finalizePayment')
              : t('subscriptionGate.accessExpired')}
          </p>

          {ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS ? (
            <Link
              href={`/${locale}/checkout?plan=standard&cycle=monthly`}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700"
            >
              {t('subscriptionGate.subscribeNow')}
            </Link>
          ) : (
            <p className="mt-6 text-sm text-slate-500">
              {t('subscriptionGate.contactAdmin')}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <LogOut className="h-4 w-4" />
            {t('subscriptionGate.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}

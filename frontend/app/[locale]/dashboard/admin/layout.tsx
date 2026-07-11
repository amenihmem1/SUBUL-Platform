'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';
import '@/app/styles/admin-dashboard.css';

const POLL_INTERVAL_MS = 30_000;

function formatAmount(cents: number, currency: string) {
  const divider = currency === 'TND' ? 1000 : 100;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / divider);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { dir, t } = useTranslation();
  const { session } = useAuth();
  const isRTL = dir === 'rtl';

  // ── New-payment toast polling ──────────────────────────────────────────────
  const lastCheckedRef = useRef<string>(new Date().toISOString());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session?.isAdmin) return;

    const checkNewPayments = async () => {
      try {
        const since = lastCheckedRef.current;
        lastCheckedRef.current = new Date().toISOString();
        const { data } = await api.get<Array<{
          id: string; userId: number; customerEmail?: string;
          planName?: string; billingCycle?: string;
          amountCents: number; currency: string; paidAt: string;
        }>>(`/api/payments/admin/recent-paid?since=${encodeURIComponent(since)}`);

        if (Array.isArray(data) && data.length > 0) {
          data.forEach((tx) => {
            toast.success(
              `Nouveau paiement reçu !`,
              {
                description: `${tx.customerEmail ?? `Utilisateur #${tx.userId}`} — ${tx.planName ?? 'Standard'} (${tx.billingCycle ?? ''}) · ${formatAmount(tx.amountCents, tx.currency)}`,
                icon: <CreditCard className="h-4 w-4 text-emerald-600" />,
                duration: 8000,
              }
            );
          });
        }
      } catch {
        // silently ignore — admin toast is non-critical
      }
    };

    // First check after 5s (give time for layout to settle), then every 30s
    const firstTimer = setTimeout(checkNewPayments, 5000);
    pollTimerRef.current = setInterval(checkNewPayments, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(firstTimer);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [session?.isAdmin]);

  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-open');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      setSidebarOpen(parsed);
      setIsInitialized(true);
    } else {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('admin-sidebar-open', JSON.stringify(sidebarOpen));
    }
  }, [sidebarOpen, isInitialized]);

  return (
    <div className="admin-dashboard min-h-screen bg-background flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        role="admin"
        open={sidebarOpen}
        toggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div
        className={`flex-1 transition-all duration-300 min-w-0 ${
          isRTL ? (sidebarOpen ? 'mr-64' : 'mr-20') : (sidebarOpen ? 'ml-64' : 'ml-20')
        }`}
      >
        <Header
          userName={String(session?.user?.fullName || session?.user?.email || t('roles.admin'))}
          role="admin"
          showSearch={true}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

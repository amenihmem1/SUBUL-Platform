'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';

export default function CommercialLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const { dir, t } = useTranslation();
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = String(params?.locale || 'en');
  const isRTL = dir === 'rtl';

  // Auth guard
  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    const role = session.userRole?.toLowerCase();
    if (role !== 'commercial' && role !== 'admin') {
      router.replace(`/${locale}/dashboard/${role ?? 'learner'}`);
      return;
    }
    setReady(true);
  }, [session, isLoading, router, locale]);

  useEffect(() => {
    const saved = localStorage.getItem('commercial-sidebar-open');
    setSidebarOpen(saved !== null ? JSON.parse(saved) : true);
  }, []);

  useEffect(() => {
    localStorage.setItem('commercial-sidebar-open', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        role="commercial"
        open={sidebarOpen}
        toggle={() => setSidebarOpen(v => !v)}
      />
      <div
        className={`flex-1 transition-all duration-300 min-w-0 ${
          isRTL
            ? sidebarOpen ? 'mr-64' : 'mr-20'
            : sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <Header
          userName={session?.user?.fullName || session?.user?.email || 'Commercial'}
          role="commercial"
        />
        <main className="p-4 sm:p-5 lg:p-6 flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { dir, t } = useTranslation();
  const { session } = useAuth();
  const isRTL = dir === 'rtl';

  useEffect(() => {
    const saved = localStorage.getItem('instructor-sidebar-open');
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
      localStorage.setItem('instructor-sidebar-open', JSON.stringify(sidebarOpen));
    }
  }, [sidebarOpen, isInitialized]);

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        role="instructor"
        open={sidebarOpen}
        toggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div
        className={`flex-1 transition-all duration-300 min-w-0 ${
          isRTL ? (sidebarOpen ? 'mr-64' : 'mr-20') : (sidebarOpen ? 'ml-64' : 'ml-20')
        }`}
      >
        <Header
          userName={String(session?.user?.fullName || session?.user?.email || t('roles.instructor'))}
          role="instructor"
          showSearch={true}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
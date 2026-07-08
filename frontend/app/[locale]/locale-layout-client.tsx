'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import GlobalLoader from '@/components/layout/GlobalLoader';

export function LocaleLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <NotificationsProvider>
        <AuthProvider>
          <LanguageProvider>
            <GlobalLoader />
            {children}
          </LanguageProvider>
        </AuthProvider>
      </NotificationsProvider>
    </QueryProvider>
  );
}

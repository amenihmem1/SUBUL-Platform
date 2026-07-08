'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { setToken } from '@/lib/auth/token';
import { Loader2 } from 'lucide-react';
import { decodeJwtRole, getDashboardPath, normalizeLocale } from '@/lib/auth/routing';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = normalizeLocale(params?.locale as string);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token || token.length < 10) {
      router.replace(`/${locale}/auth/login?error=auth_failed`);
      return;
    }
    const role = decodeJwtRole(token);
    if (!role) {
      router.replace(`/${locale}/auth/login?error=auth_failed`);
      return;
    }
    setToken(token);
    window.dispatchEvent(new Event('auth:refresh'));
    router.replace(getDashboardPath(locale, role));
  }, [locale, router, searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Connexion...</p>
      </div>
    </div>
  );
}

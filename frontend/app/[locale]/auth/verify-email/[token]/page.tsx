'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/** Legacy path /auth/verify-email/:token → /auth/verify-email?token= */
export default function VerifyEmailTokenRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const token = params?.token as string;

  useEffect(() => {
    if (!token || token === 'pending') return;
    router.replace(`/${locale}/auth/verify-email?token=${encodeURIComponent(token)}`);
  }, [token, locale, router]);

  if (token === 'pending') {
    return null;
  }

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

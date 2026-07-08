'use client';

import { Building2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearToken } from '@/lib/auth/token';
import { useRouter, useParams } from 'next/navigation';
import { useUniversity } from '@/contexts/UniversityContext';

/**
 * Standalone overlay gate for institutional students.
 * Renders nothing visible when access is valid; shows a blocking overlay when not.
 */
export function UniversityAccessGate() {
  const { university, hasInstitutionalAccess, isLoading } = useUniversity();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  // While loading or no university, don't block
  if (isLoading || !university) return null;

  // Access is valid — render nothing (children continue normally)
  if (hasInstitutionalAccess) return null;

  const handleLogout = () => {
    clearToken();
    router.push(`/${locale}/auth/login`);
  };

  const isSuspended = university.status === 'suspended';
  const isExpired = university.license
    ? university.license.status !== 'active' ||
      (university.license.validUntil && new Date(university.license.validUntil) < new Date())
    : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-md mx-auto p-8 rounded-2xl border bg-card shadow-xl text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30">
            {isSuspended
              ? <AlertTriangle className="h-10 w-10 text-amber-600" />
              : <Building2 className="h-10 w-10 text-amber-600" />}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isSuspended ? 'Account Suspended' : 'Access Expired'}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          {isSuspended
            ? `Your institution (${university.name}) has been suspended.`
            : isExpired
              ? `Your institutional access from ${university.name} has expired.`
              : 'Your access has been deactivated.'}
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          Please contact your university administrator for assistance.
        </p>

        <Button variant="outline" onClick={handleLogout} className="w-full h-11 rounded-xl">
          Sign Out
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          Access provided by <strong>{university.name}</strong>
        </p>
      </div>
    </div>
  );
}

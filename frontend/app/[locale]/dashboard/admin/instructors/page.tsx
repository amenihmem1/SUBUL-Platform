'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminInstructorsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname?.split('/')[1] ?? 'en';

  useEffect(() => {
    router.replace(`/${locale}/dashboard/admin/companies`);
  }, [locale, router]);

  return null;
}

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/lib/api/client';
import { getToken } from '@/lib/auth/token';

interface UniversityInfo {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  status: string;
  license?: {
    validUntil?: string;
    status: string;
  } | null;
  membership?: {
    role: string;
    cohort?: { id: string; name: string } | null;
    department?: { id: string; name: string } | null;
  } | null;
}

interface UniversityContextValue {
  university: UniversityInfo | null;
  isLoading: boolean;
  hasInstitutionalAccess: boolean;
  reload: () => void;
}

const UniversityContext = createContext<UniversityContextValue>({
  university: null,
  isLoading: false,
  hasInstitutionalAccess: false,
  reload: () => {},
});

export function UniversityProvider({ children }: { children: ReactNode }) {
  const [university, setUniversity] = useState<UniversityInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) { setIsLoading(false); return; }

    setIsLoading(true);
    api.get('/api/university/my-institution')
      .then(r => setUniversity(r.data))
      .catch(() => setUniversity(null))
      .finally(() => setIsLoading(false));
  }, [version]);

  const hasInstitutionalAccess =
    !!university &&
    university.status === 'active' &&
    university.membership?.role !== undefined &&
    (university.license?.status === 'active') &&
    (!university.license?.validUntil || new Date(university.license.validUntil) > new Date());

  return (
    <UniversityContext.Provider value={{
      university,
      isLoading,
      hasInstitutionalAccess,
      reload: () => setVersion(v => v + 1),
    }}>
      {children}
    </UniversityContext.Provider>
  );
}

export function useUniversity() {
  return useContext(UniversityContext);
}

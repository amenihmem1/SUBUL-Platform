'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CompanyInfo {
  name: string;
  logo: string;
}

interface CompanyContextType {
  company: CompanyInfo;
  setCompany: (info: CompanyInfo) => void;
  setLogo: (logo: string) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompanyState] = useState<CompanyInfo>({
    name: '',
    logo: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('company-info');
    if (saved) {
      try {
        setCompanyState(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const setCompany = (info: CompanyInfo) => {
    setCompanyState(info);
    localStorage.setItem('company-info', JSON.stringify(info));
  };

  const setLogo = (logo: string) => {
    const updated = { ...company, logo };
    setCompanyState(updated);
    localStorage.setItem('company-info', JSON.stringify(updated));
  };

  return (
    <CompanyContext.Provider value={{ company, setCompany, setLogo }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

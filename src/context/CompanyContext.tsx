import React, { createContext, useContext, useState, useCallback } from 'react';
import { setApiCompanyId } from '../services/api';

export type CompanyKey = 'acp' | 'handles' | 'interior';

interface CompanyContextValue {
  company: CompanyKey | null;
  setCompany: (key: CompanyKey | null) => void;
}

const CompanyContext = createContext<CompanyContextValue>({
  company: null,
  setCompany: () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompanyState] = useState<CompanyKey | null>(null);

  const setCompany = useCallback((key: CompanyKey | null) => {
    setApiCompanyId(key);       // wire into axios interceptor immediately
    setCompanyState(key);
  }, []);

  return (
    <CompanyContext.Provider value={{ company, setCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  return useContext(CompanyContext);
}


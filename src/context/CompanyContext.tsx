import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiCompanyId } from '../services/api';

export type CompanyKey = 'acp' | 'handles' | 'interior';

const COMPANY_STORAGE_KEY = '@interior_gallery_company';

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

  // Rehydrate persisted company on mount
  useEffect(() => {
    AsyncStorage.getItem(COMPANY_STORAGE_KEY).then((stored) => {
      if (stored === 'acp' || stored === 'handles' || stored === 'interior') {
        setApiCompanyId(stored);   // restore axios interceptor immediately
        setCompanyState(stored);
      }
    });
  }, []);

  const setCompany = useCallback((key: CompanyKey | null) => {
    setApiCompanyId(key);          // wire into axios interceptor immediately
    setCompanyState(key);
    if (key) {
      AsyncStorage.setItem(COMPANY_STORAGE_KEY, key);
    } else {
      AsyncStorage.removeItem(COMPANY_STORAGE_KEY);
    }
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


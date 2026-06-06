/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export type PartnerTheme = 'dark' | 'light';

interface PartnerThemeContextValue {
  theme: PartnerTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const PARTNER_THEME_STORAGE_KEY = 'partner-dashboard-theme';

const PartnerThemeContext = createContext<PartnerThemeContextValue | null>(null);

export function PartnerThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useLocalStorage<PartnerTheme>(PARTNER_THEME_STORAGE_KEY, 'dark');

  const value: PartnerThemeContextValue = {
    theme,
    isDark: theme === 'dark',
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  };

  return <PartnerThemeContext.Provider value={value}>{children}</PartnerThemeContext.Provider>;
}

export function usePartnerTheme() {
  const context = useContext(PartnerThemeContext);

  if (!context) {
    throw new Error('usePartnerTheme must be used within PartnerThemeProvider');
  }

  return context;
}

import { useSyncExternalStore } from 'react';

export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  dark: '(prefers-color-scheme: dark)',
  light: '(prefers-color-scheme: light)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const;

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => {};
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', callback);
      return () => mediaQuery.removeEventListener('change', callback);
    },
    () => {
      if (typeof window === 'undefined') return false;
      return window.matchMedia(query).matches;
    },
    () => false
  );
}

export const useIsMobile = () => useMediaQuery(breakpoints.mobile);
export const useIsTablet = () => useMediaQuery(breakpoints.tablet);
export const useIsDesktop = () => useMediaQuery(breakpoints.desktop);
export const usePrefersDarkMode = () => useMediaQuery(breakpoints.dark);
export const usePrefersReducedMotion = () => useMediaQuery(breakpoints.reducedMotion);

export default useMediaQuery;

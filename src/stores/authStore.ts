/**
 * Centralized Authentication Store
 * 
 * Manages auth state across the application using Zustand.
 * Uses JWT-based authentication with httpOnly cookie refresh tokens.
 * Access tokens are kept in memory only (never persisted to localStorage).
 * Proactive silent-refresh keeps sessions alive during active use.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import apiClient, { setAccessToken, clearTokens, getAccessToken, startSilentRefresh, stopSilentRefresh } from '../api/apiClient';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'partner';
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser | null) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.post('/auth/login', { email, password });
          const data = response.data.data;

          const { user, accessToken, expiresIn } = data;

          // Store access token in memory only
          if (accessToken) {
            setAccessToken(accessToken);
            // Start proactive silent refresh timer
            if (typeof expiresIn === 'number' && expiresIn > 0) {
              startSilentRefresh(expiresIn);
            }
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Use centralized error parser
          const { parseApiError } = await import('../utils/parseApiError');
          const message = parseApiError(error, 'Login failed. Please try again.');

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          const token = getAccessToken();
          if (token) {
            await apiClient.post('/auth/logout');
          }
        } catch {
          // Ignore logout errors - still clear local state
        } finally {
          clearTokens();
          stopSilentRefresh();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });

        try {
          // If no in-memory token, try refreshing from the httpOnly cookie
          if (!getAccessToken()) {
            const refreshResponse = await apiClient.post('/auth/refresh-token');
            const refreshedAccessToken = refreshResponse.data.data?.accessToken;
            const expiresIn = refreshResponse.data.data?.expiresIn;

            if (refreshedAccessToken) {
              setAccessToken(refreshedAccessToken);
              // Start proactive silent refresh timer
              if (typeof expiresIn === 'number' && expiresIn > 0) {
                startSilentRefresh(expiresIn);
              }
            } else {
              clearTokens();
              set({ user: null, isAuthenticated: false, isLoading: false });
              return;
            }
          }

          // Validate token by fetching current user
          const response = await apiClient.get('/auth/me');
          const user = response.data.data.user;

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Refresh failed - session is genuinely over
          clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist user data and auth status (not loading states or tokens)
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;

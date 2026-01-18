/**
 * Centralized Authentication Store
 * 
 * Manages auth state across the application using Zustand.
 * Integrates with API client for token management.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import apiClient, { setAccessToken, clearTokens, getAccessToken } from '../api/apiClient';

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
    (set, get) => ({
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
          const { user, accessToken, refreshToken } = response.data.data;

          // Store access token in memory (handled by apiClient)
          setAccessToken(accessToken);

          // Store refresh token for mobile apps (optional, cookies handle web)
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
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
          localStorage.removeItem('refreshToken');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        // Check if we have a stored user and try to validate
        const storedUser = get().user;
        if (!storedUser) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        // Try to restore session from refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken && !getAccessToken()) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        set({ isLoading: true });

        try {
          // If we don't have an access token, try to get one via refresh
          if (!getAccessToken()) {
            const refreshResponse = await apiClient.post('/auth/refresh-token', {
              refreshToken,
            });
            setAccessToken(refreshResponse.data.data.accessToken);
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
          // Token invalid or expired
          clearTokens();
          localStorage.removeItem('refreshToken');
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
      // Only persist user data, not loading states or tokens
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export default useAuthStore;

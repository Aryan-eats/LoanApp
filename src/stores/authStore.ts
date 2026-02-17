/**
 * Centralized Authentication Store
 * 
 * Manages auth state across the application using Zustand.
 * Uses JWT-based authentication with httpOnly cookie refresh tokens.
 * Access tokens are kept in memory only (never persisted to localStorage).
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
  /** Counts consecutive failed silent-refresh attempts across page reloads */
  refreshCount: number;
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
      refreshCount: 0,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.post('/auth/login', { email, password });
          const data = response.data.data;

          const { user, accessToken } = data;

          // Store access token in memory only
          if (accessToken) {
            setAccessToken(accessToken);
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            refreshCount: 0,
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
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            refreshCount: 0,
          });
        }
      },

      checkAuth: async () => {
        // If we have an access token in memory, use it; otherwise refresh from cookie.
        const existingToken = getAccessToken();
        const hadInMemoryToken = !!existingToken;
        const { isAuthenticated: wasAuthenticated, refreshCount } = useAuthStore.getState();

        set({ isLoading: true });

        try {
          if (!existingToken) {
            const refreshResponse = await apiClient.post('/auth/refresh-token');
            const refreshedAccessToken = refreshResponse.data.data?.accessToken;

            if (refreshedAccessToken) {
              setAccessToken(refreshedAccessToken);
            } else {
              clearTokens();
              set({ user: null, isAuthenticated: false, isLoading: false, refreshCount: 0 });
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
            refreshCount: 0,
          });
        } catch {
          // Allow limited grace retries only when a token existed in memory.
          // If we had no token/cookie, mark user as logged out immediately.
          if (hadInMemoryToken && wasAuthenticated && refreshCount < 3) {
            set({ isLoading: false, refreshCount: refreshCount + 1 });
            return;
          }

          clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            refreshCount: 0,
          });
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist user data, auth status, and refresh counter (not loading states or tokens)
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        refreshCount: state.refreshCount,
      }),
    }
  )
);

export default useAuthStore;


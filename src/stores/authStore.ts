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
import apiClient, { setAccessToken, clearTokens, getAccessToken, startSilentRefresh } from '../api/apiClient';

export type AuthRole = 'super_admin' | 'admin' | 'manager' | 'agent' | 'viewer' | 'partner';
const AUTH_ROLES: readonly AuthRole[] = ['super_admin', 'admin', 'manager', 'agent', 'viewer', 'partner'];

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: AuthRole;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

type PersistedAuthUser = Pick<AuthUser, 'id' | 'role'>;

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

const STORAGE_NAME = 'auth-storage';
const STORAGE_VERSION = 1;

let authCheckPromise: Promise<void> | null = null;

const toPersistedAuthUser = (user: unknown): PersistedAuthUser | null => {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const candidate = user as Partial<AuthUser>;
  if (typeof candidate.id !== 'string') {
    return null;
  }

  const role = candidate.role;
  if (!AUTH_ROLES.includes(role as AuthRole)) {
    return null;
  }

  return {
    id: candidate.id,
    role: role as AuthRole,
  };
};

const isFullAuthUser = (user: unknown): user is AuthUser => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const candidate = user as Partial<AuthUser>;

  return (
    typeof candidate.id === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.firstName === 'string'
    && typeof candidate.lastName === 'string'
    && AUTH_ROLES.includes(candidate.role as AuthRole)
  );
};

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
          await apiClient.post('/auth/logout');
        } catch {
          // Ignore logout errors - still clear local state
        } finally {
          authCheckPromise = null;
          clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        if (authCheckPromise) {
          return authCheckPromise;
        }

        authCheckPromise = (async () => {
          set({ isLoading: true });

          try {
            // If no in-memory token, try refreshing from the httpOnly cookie
            if (!getAccessToken()) {
              const refreshResponse = await apiClient.post('/auth/refresh-token');
              const refreshedAccessToken = refreshResponse.data.data?.accessToken;
              const expiresIn = refreshResponse.data.data?.expiresIn;

              if (typeof refreshedAccessToken === 'string' && refreshedAccessToken.trim() !== '') {
                setAccessToken(refreshedAccessToken);
                // Start proactive silent refresh timer
                if (typeof expiresIn === 'number' && expiresIn > 0) {
                  startSilentRefresh(expiresIn);
                }
              } else {
                clearTokens();
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  error: null,
                });
                return;
              }
            }

            // Validate token by fetching current user
            const response = await apiClient.get('/auth/me');
            const user = response.data.data?.user;

            if (!isFullAuthUser(user)) {
              clearTokens();
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              });
              return;
            }

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch {
            // Refresh failed - session is genuinely over
            clearTokens();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          } finally {
            authCheckPromise = null;
          }
        })();

        return authCheckPromise;
      },

      clearError: () => set({ error: null }),

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: STORAGE_NAME,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<AuthState>;
        const persistedUser = toPersistedAuthUser(state.user);

        return {
          user: persistedUser,
          isAuthenticated: Boolean(state.isAuthenticated && persistedUser),
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error || !state?.isAuthenticated) {
          return;
        }

        void state.checkAuth();
      },
      // Persist only the minimal session marker; rehydrate the full profile from the server.
      partialize: (state) => ({
        user: toPersistedAuthUser(state.user),
        isAuthenticated: Boolean(state.isAuthenticated && state.user),
      }),
    }
  )
);

export default useAuthStore;

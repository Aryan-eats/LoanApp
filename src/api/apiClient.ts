/**
 * API Client with automatic token refresh
 *
 * This client handles:
 * - Automatic access token refresh on 401 errors via httpOnly cookie
 * - Proactive silent refresh before access token expires
 * - Session-expiry warning events 5 minutes before token expiry
 * - Access token stored in memory only (never in localStorage)
 */

import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { decorateApiError, type ApiErrorResponse } from '../utils/parseApiError';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const SESSION_EXPIRY_WARNING_MS = 5 * 60 * 1000;

export interface SessionExpiryWarningState {
  isVisible: boolean;
  expiresAt: number | null;
}

type RefreshResponse = {
  accessToken: string;
  expiresIn: number;
};

type SessionExpiryListener = (state: SessionExpiryWarningState) => void;

// In-memory token storage (never persisted to localStorage)
let accessToken: string | null = null;

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshTimerId: ReturnType<typeof setTimeout> | null = null;
let sessionWarningTimerId: ReturnType<typeof setTimeout> | null = null;
let sessionWarningState: SessionExpiryWarningState = {
  isVisible: false,
  expiresAt: null,
};
const sessionExpiryListeners = new Set<SessionExpiryListener>();

const emitSessionExpiryWarning = (nextState: SessionExpiryWarningState) => {
  sessionWarningState = nextState;
  sessionExpiryListeners.forEach((listener) => listener(nextState));
};

const clearSessionWarning = () => {
  if (sessionWarningTimerId !== null) {
    clearTimeout(sessionWarningTimerId);
    sessionWarningTimerId = null;
  }

  if (sessionWarningState.isVisible || sessionWarningState.expiresAt !== null) {
    emitSessionExpiryWarning({ isVisible: false, expiresAt: null });
  }
};

const scheduleSessionWarning = (expiresInSeconds: number) => {
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    clearSessionWarning();
    return;
  }

  if (sessionWarningTimerId !== null) {
    clearTimeout(sessionWarningTimerId);
    sessionWarningTimerId = null;
  }

  const expiresAt = Date.now() + expiresInSeconds * 1000;
  emitSessionExpiryWarning({ isVisible: false, expiresAt });

  const warningDelayMs = expiresAt - Date.now() - SESSION_EXPIRY_WARNING_MS;
  if (warningDelayMs <= 0) {
    emitSessionExpiryWarning({ isVisible: true, expiresAt });
    return;
  }

  sessionWarningTimerId = setTimeout(() => {
    emitSessionExpiryWarning({ isVisible: true, expiresAt });
  }, warningDelayMs);
};

const normalizeRequestPath = (url?: string): string => {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return new URL(url).pathname;
  }

  return url.startsWith('/') ? url : `/${url}`;
};

const shouldSkipRefreshForRequest = (url?: string): boolean => {
  const normalizedPath = normalizeRequestPath(url);
  const apiPath = normalizedPath.startsWith('/api/')
    ? normalizedPath.slice('/api'.length)
    : normalizedPath;

  return apiPath.startsWith('/auth/') && apiPath !== '/auth/me';
};

const setAuthorizationHeader = (
  request: InternalAxiosRequestConfig,
  token: string
) => {
  request.headers.Authorization = `Bearer ${token}`;
};

const refreshAccessToken = async (): Promise<RefreshResponse> => {
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh-token`,
    {},
    { withCredentials: true }
  );

  const newAccessToken = response?.data?.data?.accessToken;
  const newExpiresIn = response?.data?.data?.expiresIn;
  if (
    typeof newAccessToken !== 'string'
    || newAccessToken.trim() === ''
    || typeof newExpiresIn !== 'number'
    || newExpiresIn <= 0
  ) {
    throw new Error('Unable to refresh your session. Please sign in again.');
  }

  accessToken = newAccessToken;
  startSilentRefresh(newExpiresIn);

  return {
    accessToken: newAccessToken,
    expiresIn: newExpiresIn,
  };
};

// Token management functions
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const clearTokens = () => {
  accessToken = null;
  stopSilentRefresh();
};

export const subscribeToSessionExpiryWarning = (
  listener: SessionExpiryListener
): (() => void) => {
  sessionExpiryListeners.add(listener);
  listener(sessionWarningState);

  return () => {
    sessionExpiryListeners.delete(listener);
  };
};

export const getSessionExpiryWarningState = (): SessionExpiryWarningState =>
  sessionWarningState;

export const refreshSession = async (): Promise<RefreshResponse> => {
  try {
    return await refreshAccessToken();
  } catch (error) {
    throw decorateApiError(error, 'Unable to refresh your session. Please sign in again.');
  }
};

/**
 * Schedule a silent token refresh ~60 seconds before the access token expires.
 * @param expiresInSeconds lifetime of the current access token in seconds
 */
export const startSilentRefresh = (expiresInSeconds: number) => {
  stopSilentRefresh();

  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return;
  }

  scheduleSessionWarning(expiresInSeconds);

  const delayMs = Math.max((expiresInSeconds - 60) * 1000, 10_000);

  refreshTimerId = setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch {
      // Ignore here. The next protected request will surface the auth failure.
    }
  }, delayMs);
};

export const stopSilentRefresh = () => {
  if (refreshTimerId !== null) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }

  clearSessionWarning();
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      setAuthorizationHeader(config, accessToken);
    }
    return config;
  },
  (error) => Promise.reject(decorateApiError(error))
);

let isRefreshing = false;
let refreshSubscribers: { resolve: (token: string) => void; reject: (error: unknown) => void }[] = [];

const subscribeTokenRefresh = (
  resolve: (token: string) => void,
  reject: (error: unknown) => void
) => {
  refreshSubscribers.push({ resolve, reject });
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve(token));
  refreshSubscribers = [];
};

const onTokenRefreshFailed = (error: unknown) => {
  refreshSubscribers.forEach((subscriber) => subscriber.reject(error));
  refreshSubscribers = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & {
      _retry?: boolean;
    }) | undefined;

    if (
      error.response?.status === 401
      && originalRequest
      && !originalRequest._retry
      && !shouldSkipRefreshForRequest(originalRequest.url)
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(
            (token: string) => {
              setAuthorizationHeader(originalRequest, token);
              resolve(apiClient(originalRequest));
            },
            (refreshError: unknown) => {
              reject(refreshError);
            }
          );
        });
      }

      isRefreshing = true;

      try {
        const refreshed = await refreshSession();
        onTokenRefreshed(refreshed.accessToken);

        setAuthorizationHeader(originalRequest, refreshed.accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearTokens();
        onTokenRefreshFailed(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(decorateApiError(error));
  }
);

export default apiClient;

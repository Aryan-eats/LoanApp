/**
 * API Client with automatic token refresh
 *
 * This client handles:
 * - Automatic access token refresh on 401 errors via httpOnly cookie
 * - Access token stored in memory only (never in localStorage)
 */

import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// In-memory token storage (never persisted to localStorage)
let accessToken: string | null = null;

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send httpOnly cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management functions
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const clearTokens = () => {
  accessToken = null;
};

// Request interceptor - add access token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let refreshSubscribers: { resolve: (token: string) => void; reject: (error: unknown) => void }[] = [];

const subscribeTokenRefresh = (resolve: (token: string) => void, reject: (error: unknown) => void) => {
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
  async (error: AxiosError<{ code?: string; message?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // On any 401, attempt a silent token refresh via httpOnly cookie.
    // This handles both TOKEN_EXPIRED responses and requests made without
    // a Bearer token (e.g. after a page refresh clears the in-memory token).
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Wait for token refresh to complete
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(
            (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            (err: unknown) => {
              reject(err);
            }
          );
        });
      }

      isRefreshing = true;

      try {
        // Refresh token is sent automatically via httpOnly cookie
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = response?.data?.data?.accessToken;
        if (typeof newAccessToken !== 'string' || newAccessToken.trim() === '') {
          throw new Error('Refresh token response missing access token');
        }

        setAccessToken(newAccessToken);
        onTokenRefreshed(newAccessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - reject all queued requests and clear tokens
        clearTokens();
        onTokenRefreshFailed(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

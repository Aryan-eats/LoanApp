/**
 * Refresh-token cookie configuration.
 *
 * Centralises the cookie name and options so login, refresh, and logout
 * endpoints stay consistent.
 */

/** Cookie name used for the refresh token. */
export const REFRESH_COOKIE = 'refreshToken';

/**
 * Options for setting the refresh-token cookie.
 * @param maxAgeMs – lifetime in milliseconds (default 7 days)
 */
export const getRefreshCookieOptions = (maxAgeMs?: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: maxAgeMs ?? 7 * 24 * 60 * 60 * 1000, // 7 days
});

/**
 * Options for clearing the refresh-token cookie.
 * Must mirror the path / domain / sameSite used when the cookie was set,
 * otherwise the browser ignores the clear instruction.
 */
export const getClearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
});

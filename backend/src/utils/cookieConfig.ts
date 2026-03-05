/**
 * Refresh-token cookie configuration.
 *
 * Centralises the cookie name and options so login, refresh, and logout
 * endpoints stay consistent.
 */

const isProd = process.env.NODE_ENV === 'production';

/** Cookie name used for the refresh token. */
export const REFRESH_COOKIE = 'refreshToken';

/**
 * sameSite policy:
 *  - 'strict' in production for maximum CSRF protection.
 *  - 'lax' in development so cookies flow correctly between
 *    Vite dev server (e.g. localhost:5173) and Express (localhost:5000).
 */
const sameSitePolicy: 'strict' | 'lax' = isProd ? 'strict' : 'lax';

/**
 * Options for setting the refresh-token cookie.
 * @param maxAgeMs – lifetime in milliseconds (default 7 days)
 */
export const getRefreshCookieOptions = (maxAgeMs?: number) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: sameSitePolicy,
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
  secure: isProd,
  sameSite: sameSitePolicy,
  path: '/api/auth',
});

/**
 * Cyberattack: CSRF cookie hardening tests for cookieConfig.ts.
 *
 * Verifies that refresh-token cookies are set with security attributes
 * that prevent cross-site request forgery, token theft, and session hijacking.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  REFRESH_COOKIE,
  getRefreshCookieOptions,
  getClearCookieOptions,
} from '../shared/security/cookieConfig.js';

// ---------------------------------------------------------------------------
// Cookie name
// ---------------------------------------------------------------------------

describe('REFRESH_COOKIE name', () => {
  it('is a non-empty string', () => {
    expect(typeof REFRESH_COOKIE).toBe('string');
    expect(REFRESH_COOKIE.length).toBeGreaterThan(0);
  });

  it('does not contain spaces or special chars that could cause parsing issues', () => {
    expect(REFRESH_COOKIE).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});

// ---------------------------------------------------------------------------
// Production cookie options (CSRF hardening)
// ---------------------------------------------------------------------------

describe('getRefreshCookieOptions – production security', () => {
  const origNodeEnv = process.env.NODE_ENV;

  // Note: cookieConfig reads NODE_ENV at module load time, so we test
  // the structural properties that should always hold.

  it('sets httpOnly to prevent JavaScript access (XSS protection)', () => {
    const opts = getRefreshCookieOptions();
    expect(opts.httpOnly).toBe(true);
  });

  it('scopes cookie to /api/auth path', () => {
    const opts = getRefreshCookieOptions();
    expect(opts.path).toBe('/api/auth');
  });

  it('has a sameSite policy (either strict or lax)', () => {
    const opts = getRefreshCookieOptions();
    expect(['strict', 'lax']).toContain(opts.sameSite);
  });

  it('defaults to 7-day maxAge when no argument is provided', () => {
    const opts = getRefreshCookieOptions();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(opts.maxAge).toBe(sevenDays);
  });

  it('accepts a custom maxAge', () => {
    const oneHour = 60 * 60 * 1000;
    const opts = getRefreshCookieOptions(oneHour);
    expect(opts.maxAge).toBe(oneHour);
  });

  it('never sets maxAge to 0 with default (prevents immediate expiry)', () => {
    const opts = getRefreshCookieOptions();
    expect(opts.maxAge).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Clear cookie options – must mirror set options
// ---------------------------------------------------------------------------

describe('getClearCookieOptions – mirrors set options', () => {
  it('uses the same path as set options', () => {
    const setOpts = getRefreshCookieOptions();
    const clearOpts = getClearCookieOptions();
    expect(clearOpts.path).toBe(setOpts.path);
  });

  it('uses the same sameSite policy as set options', () => {
    const setOpts = getRefreshCookieOptions();
    const clearOpts = getClearCookieOptions();
    expect(clearOpts.sameSite).toBe(setOpts.sameSite);
  });

  it('uses the same secure flag as set options', () => {
    const setOpts = getRefreshCookieOptions();
    const clearOpts = getClearCookieOptions();
    expect(clearOpts.secure).toBe(setOpts.secure);
  });

  it('sets httpOnly on clear options (prevents JS from interfering with clear)', () => {
    const clearOpts = getClearCookieOptions();
    expect(clearOpts.httpOnly).toBe(true);
  });

  it('does NOT include maxAge (clear should not set a TTL)', () => {
    const clearOpts = getClearCookieOptions();
    expect(clearOpts).not.toHaveProperty('maxAge');
  });
});

// ---------------------------------------------------------------------------
// Attack scenario: cookie attribute stripping
// ---------------------------------------------------------------------------

describe('Cookie security – attack resistance', () => {
  it('all cookie options include httpOnly (mitigates session theft via XSS)', () => {
    expect(getRefreshCookieOptions().httpOnly).toBe(true);
    expect(getClearCookieOptions().httpOnly).toBe(true);
  });

  it('cookie path limits exposure scope (not set to /)', () => {
    const opts = getRefreshCookieOptions();
    expect(opts.path).not.toBe('/');
    expect(opts.path).toBe('/api/auth');
  });

  it('sameSite is never "none" (prevents CSRF via cross-site requests)', () => {
    const opts = getRefreshCookieOptions();
    expect(opts.sameSite).not.toBe('none');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateJWTConfig, generateSecureSecret } from '../shared/security/jwtValidator.js';

describe('JWT Validator Config', () => {
  const origEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    origEnv.JWT_SECRET = process.env.JWT_SECRET;
    origEnv.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    origEnv.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN;
    origEnv.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN;
    origEnv.NODE_ENV = process.env.NODE_ENV;
  });

  afterEach(() => {
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_ACCESS_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN', 'NODE_ENV'] as const) {
      if (origEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = origEnv[key];
      }
    }
    vi.restoreAllMocks();
  });

  // --- Missing secret ---
  it('should throw when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => validateJWTConfig()).toThrow('JWT_SECRET environment variable is required');
  });

  // --- Short secret ---
  it('should warn when JWT_SECRET < 32 chars (non-production)', () => {
    process.env.JWT_SECRET = 'short';
    process.env.NODE_ENV = 'development';
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validateJWTConfig();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('at least 32 characters'));
  });

  it('should throw when JWT_SECRET < 32 chars in production', () => {
    process.env.JWT_SECRET = 'short';
    process.env.NODE_ENV = 'production';
    expect(() => validateJWTConfig()).toThrow('at least 32 characters in production');
  });

  // --- Weak patterns ---
  it('should warn on weak JWT_SECRET pattern in dev', () => {
    process.env.JWT_SECRET = 'a'.repeat(32) + 'secret';
    process.env.NODE_ENV = 'development';
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validateJWTConfig();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('weak pattern'));
  });

  it('should throw on weak JWT_SECRET pattern in production', () => {
    process.env.JWT_SECRET = 'a'.repeat(32) + 'secret';
    process.env.NODE_ENV = 'production';
    expect(() => validateJWTConfig()).toThrow('weak pattern');
  });

  // --- Refresh secret weak patterns ---
  it('should warn on weak JWT_REFRESH_SECRET in dev', () => {
    process.env.JWT_SECRET = 'x'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'a'.repeat(32) + 'password';
    process.env.NODE_ENV = 'development';
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validateJWTConfig();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('JWT_REFRESH_SECRET'));
  });

  it('should throw on weak JWT_REFRESH_SECRET in production', () => {
    process.env.JWT_SECRET = 'x'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'a'.repeat(32) + 'password';
    process.env.NODE_ENV = 'production';
    expect(() => validateJWTConfig()).toThrow('JWT_REFRESH_SECRET');
  });

  // --- Refresh secret short ---
  it('should throw when JWT_REFRESH_SECRET < 32 chars in production', () => {
    process.env.JWT_SECRET = 'x'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'short';
    process.env.NODE_ENV = 'production';
    expect(() => validateJWTConfig()).toThrow('JWT_REFRESH_SECRET must be at least 32');
  });

  // --- Expiry format ---
  it('should throw on invalid access expiry format in production', () => {
    process.env.JWT_SECRET = 'x'.repeat(64);
    process.env.JWT_ACCESS_EXPIRES_IN = 'invalid';
    process.env.NODE_ENV = 'production';
    expect(() => validateJWTConfig()).toThrow('JWT_ACCESS_EXPIRES_IN');
  });

  it('should throw on invalid refresh expiry format in production', () => {
    process.env.JWT_SECRET = 'x'.repeat(64);
    process.env.JWT_REFRESH_EXPIRES_IN = 'nope';
    process.env.NODE_ENV = 'production';
    expect(() => validateJWTConfig()).toThrow('JWT_REFRESH_EXPIRES_IN');
  });

  it('should warn on invalid expiry format in dev', () => {
    process.env.JWT_SECRET = 'x'.repeat(64);
    process.env.JWT_ACCESS_EXPIRES_IN = 'invalid';
    process.env.NODE_ENV = 'development';
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validateJWTConfig();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('JWT_ACCESS_EXPIRES_IN'));
  });

  it('should warn on invalid expiry format outside production', () => {
    process.env.JWT_SECRET = 'x'.repeat(64);
    process.env.JWT_REFRESH_EXPIRES_IN = 'nope';
    process.env.NODE_ENV = 'test';
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validateJWTConfig();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('JWT_REFRESH_EXPIRES_IN'));
  });

  it('should accept valid expiry formats (s, m, h, d, w, y)', () => {
    process.env.JWT_SECRET = 'x'.repeat(64);
    process.env.NODE_ENV = 'test';
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    for (const exp of ['30s', '15m', '1h', '7d', '2w', '1y']) {
      process.env.JWT_ACCESS_EXPIRES_IN = exp;
      process.env.JWT_REFRESH_EXPIRES_IN = exp;
      expect(() => validateJWTConfig()).not.toThrow();
    }
    spy.mockRestore();
  });

  // --- Happy path ---
  it('should pass with valid config', () => {
    process.env.JWT_SECRET = 'x'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'y'.repeat(64);
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.NODE_ENV = 'production';
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => validateJWTConfig()).not.toThrow();
    spy.mockRestore();
  });
});

describe('generateSecureSecret', () => {
  it('returns a 128-char hex string', () => {
    const secret = generateSecureSecret();
    expect(secret).toHaveLength(128);
    expect(secret).toMatch(/^[0-9a-f]+$/);
  });

  it('returns unique values on successive calls', () => {
    const a = generateSecureSecret();
    const b = generateSecureSecret();
    expect(a).not.toBe(b);
  });
});

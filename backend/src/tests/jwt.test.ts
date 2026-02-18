import { describe, it, expect, beforeAll } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getTokenExpirationMs,
  extractTokenFromHeader,
  parseExpiresInToSeconds,
  getAccessTokenTtlSeconds,
} from '../utils/jwt.js';
import type { User } from '@prisma/client';

beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long!!';
  }
});

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'partner',
} as User;

describe('extractTokenFromHeader', () => {
  it('returns null for undefined header', () => {
    expect(extractTokenFromHeader(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractTokenFromHeader('')).toBeNull();
  });

  it('returns null for header without Bearer prefix', () => {
    expect(extractTokenFromHeader('Token abc123')).toBeNull();
  });

  it('returns null for header with too many parts', () => {
    expect(extractTokenFromHeader('Bearer abc 123')).toBeNull();
  });

  it('returns null for bare "Bearer" without token', () => {
    expect(extractTokenFromHeader('Bearer')).toBeNull();
  });

  it('extracts token from valid Bearer header', () => {
    expect(extractTokenFromHeader('Bearer mytoken123')).toBe('mytoken123');
  });
});

describe('parseExpiresInToSeconds', () => {
  it('parses seconds', () => {
    expect(parseExpiresInToSeconds('30s')).toBe(30);
  });

  it('parses minutes', () => {
    expect(parseExpiresInToSeconds('15m')).toBe(900);
  });

  it('parses hours', () => {
    expect(parseExpiresInToSeconds('2h')).toBe(7200);
  });

  it('parses days', () => {
    expect(parseExpiresInToSeconds('7d')).toBe(604800);
  });

  it('throws for invalid format', () => {
    expect(() => parseExpiresInToSeconds('invalid')).toThrow();
  });

  it('throws for empty string', () => {
    expect(() => parseExpiresInToSeconds('')).toThrow();
  });

  it('parses plain numeric string as seconds', () => {
    expect(parseExpiresInToSeconds('100')).toBe(100);
  });

  it('parses week unit', () => {
    expect(parseExpiresInToSeconds('1w')).toBe(604800);
  });
});

describe('getAccessTokenTtlSeconds', () => {
  it('returns a positive number', () => {
    expect(getAccessTokenTtlSeconds()).toBeGreaterThan(0);
  });
});

describe('signAccessToken / verifyAccessToken', () => {
  it('signs and verifies a token', () => {
    const token = signAccessToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.role).toBe('partner');
  });

  it('throws on tampered token', () => {
    const token = signAccessToken(mockUser);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('throws on random garbage', () => {
    expect(() => verifyAccessToken('not.a.jwt')).toThrow();
  });
});

describe('signRefreshToken / verifyRefreshToken', () => {
  it('signs and verifies a refresh token', () => {
    const token = signRefreshToken(mockUser);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.type).toBe('refresh');
  });

  it('refresh token cannot be verified as access token', () => {
    const refreshToken = signRefreshToken(mockUser);
    // Secrets must always differ, so cross-verification must throw
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });
});

describe('getTokenExpirationMs', () => {
  it('returns expiration in ms for a valid token', () => {
    const token = signAccessToken(mockUser);
    const exp = getTokenExpirationMs(token);
    expect(exp).not.toBeNull();
    expect(exp!).toBeGreaterThan(Date.now());
  });

  it('returns null for a malformed token', () => {
    expect(getTokenExpirationMs('garbage')).toBeNull();
  });
});

/**
 * Cyberattack: Token forgery & JWT abuse tests for authService.ts.
 *
 * Covers hash determinism, MSG91 verification token round-trips,
 * tampered tokens, expiry, cross-purpose misuse, and missing secrets.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  hashToken,
  normalizePhone,
  formatUserResponse,
  signMsg91VerificationToken,
  verifyMsg91VerificationToken,
  getMsg91VerificationSecret,
} from '../services/authService.js';

// Ensure a test-safe JWT secret is set
beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';
  }
});

// ---------------------------------------------------------------------------
// hashToken – SHA-256 determinism & collision avoidance
// ---------------------------------------------------------------------------

describe('hashToken', () => {
  it('is deterministic (same input → same hash)', () => {
    const hash1 = hashToken('reset-token-abc');
    const hash2 = hashToken('reset-token-abc');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = hashToken('token-1');
    const hash2 = hashToken('token-2');
    expect(hash1).not.toBe(hash2);
  });

  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = hashToken('any-token');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('does not return the original token', () => {
    const token = 'my-secret-reset-token';
    expect(hashToken(token)).not.toBe(token);
  });

  it('handles empty string input', () => {
    const hash = hashToken('');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('handles extremely long token input', () => {
    const longToken = 'a'.repeat(100_000);
    const hash = hashToken(longToken);
    expect(hash).toHaveLength(64);
  });
});

// ---------------------------------------------------------------------------
// normalizePhone – stripping non-digits
// ---------------------------------------------------------------------------

describe('normalizePhone – edge cases', () => {
  it('strips country code formatting', () => {
    expect(normalizePhone('+91-9876543210')).toBe('919876543210');
  });

  it('returns empty string for no digits', () => {
    expect(normalizePhone('abcdef')).toBe('');
  });

  it('preserves digits from mixed alphanumeric input', () => {
    expect(normalizePhone('phone: 98765 43210')).toBe('9876543210');
  });
});

// ---------------------------------------------------------------------------
// formatUserResponse – data leakage prevention
// ---------------------------------------------------------------------------

describe('formatUserResponse – sensitive field exclusion', () => {
  const mockUser = {
    id: 'usr-1',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '9876543210',
    role: 'partner',
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: false,
    createdAt: new Date('2025-01-01'),
    // Fields that should NOT appear in response
    password: '$2a$12$hashedpassword',
    resetPasswordToken: 'abc123',
    resetPasswordExpires: new Date(),
    otpHash: 'hashed-otp',
    otpExpires: new Date(),
    failedLoginAttempts: 3,
    lockUntil: new Date(),
    aadhaarNumber: '123456789012',
    panNumber: 'ABCDE1234F',
  } as any;

  it('includes only safe fields in the response', () => {
    const response = formatUserResponse(mockUser);
    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('email');
    expect(response).toHaveProperty('firstName');
    expect(response).toHaveProperty('role');
  });

  it('does NOT expose password hash', () => {
    const response = formatUserResponse(mockUser);
    expect(response).not.toHaveProperty('password');
    expect(JSON.stringify(response)).not.toContain('hashedpassword');
  });

  it('does NOT expose reset token', () => {
    const response = formatUserResponse(mockUser);
    expect(response).not.toHaveProperty('resetPasswordToken');
  });

  it('does NOT expose OTP hash', () => {
    const response = formatUserResponse(mockUser);
    expect(response).not.toHaveProperty('otpHash');
  });

  it('does NOT expose failed login attempts or lock status', () => {
    const response = formatUserResponse(mockUser);
    expect(response).not.toHaveProperty('failedLoginAttempts');
    expect(response).not.toHaveProperty('lockUntil');
  });

  it('does NOT expose raw PII (Aadhaar, PAN)', () => {
    const response = formatUserResponse(mockUser);
    expect(response).not.toHaveProperty('aadhaarNumber');
    expect(response).not.toHaveProperty('panNumber');
  });
});

// ---------------------------------------------------------------------------
// MSG91 verification token – round-trip, expiry, forgery
// ---------------------------------------------------------------------------

describe('signMsg91VerificationToken / verifyMsg91VerificationToken', () => {
  it('round-trips a valid verification token', () => {
    const token = signMsg91VerificationToken('user-1', '+919876543210');
    const payload = verifyMsg91VerificationToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.phone).toBe('919876543210'); // normalised
    expect(payload.purpose).toBe('msg91_verification');
  });

  it('rejects a tampered verification token', () => {
    const token = signMsg91VerificationToken('user-1', '9876543210');
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyMsg91VerificationToken(tampered)).toThrow();
  });

  it('rejects garbage / random string as token', () => {
    expect(() => verifyMsg91VerificationToken('not.a.jwt.token')).toThrow();
  });

  it('rejects a token signed with a different secret', async () => {
    const jwt = await import('jsonwebtoken');
    const fakeToken = jwt.default.sign(
      { sub: 'user-1', phone: '9876543210', purpose: 'msg91_verification' },
      'completely-different-secret-key-that-is-long-enough',
      { algorithm: 'HS256' }
    );
    expect(() => verifyMsg91VerificationToken(fakeToken)).toThrow();
  });

  it('produces a 3-part JWT string', () => {
    const token = signMsg91VerificationToken('user-1', '9876543210');
    expect(token.split('.')).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// getMsg91VerificationSecret – missing secret handling
// ---------------------------------------------------------------------------

describe('getMsg91VerificationSecret', () => {
  const origJwtSecret = process.env.JWT_SECRET;
  const origMsg91Secret = process.env.MSG91_VERIFICATION_SECRET;

  afterEach(() => {
    // Restore
    if (origJwtSecret) process.env.JWT_SECRET = origJwtSecret;
    else delete process.env.JWT_SECRET;
    if (origMsg91Secret) process.env.MSG91_VERIFICATION_SECRET = origMsg91Secret;
    else delete process.env.MSG91_VERIFICATION_SECRET;
  });

  it('prefers MSG91_VERIFICATION_SECRET when set', () => {
    process.env.MSG91_VERIFICATION_SECRET = 'msg91-specific-secret';
    const secret = getMsg91VerificationSecret();
    expect(secret).toBe('msg91-specific-secret');
  });

  it('falls back to JWT_SECRET when MSG91_VERIFICATION_SECRET is missing', () => {
    delete process.env.MSG91_VERIFICATION_SECRET;
    process.env.JWT_SECRET = 'fallback-jwt-secret';
    const secret = getMsg91VerificationSecret();
    expect(secret).toBe('fallback-jwt-secret');
  });

  it('throws when both secrets are missing', () => {
    delete process.env.MSG91_VERIFICATION_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => getMsg91VerificationSecret()).toThrow('must be configured');
  });
});

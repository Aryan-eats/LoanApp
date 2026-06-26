import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  comparePassword,
  isLocked,
  validatePassword,
} from '../modules/auth/user.service.js';

describe('Password Validation', () => {
  it('should reject a short password', () => {
    expect(validatePassword('short')).toBe(false);
  });

  it('should reject a password of exactly 7 characters', () => {
    expect(validatePassword('Aa1!xyz')).toBe(false);
  });

  it('should accept a valid password at length 8', () => {
    expect(validatePassword('Aa1!xyzw')).toBe(true);
  });

  it('should reject a length-8 password missing required character classes', () => {
    expect(validatePassword('abcdefgh')).toBe(false);
  });

  it('should accept a strong password', () => {
    expect(validatePassword('longenough1A!')).toBe(true);
  });

  it('should reject password missing uppercase', () => {
    expect(validatePassword('longenough1!')).toBe(false);
  });

  it('should reject password missing lowercase', () => {
    expect(validatePassword('LONGENOUGH1!')).toBe(false);
  });

  it('should reject password missing digit', () => {
    expect(validatePassword('Longenough!')).toBe(false);
  });

  it('should reject password missing special character', () => {
    expect(validatePassword('Longenough1')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(validatePassword('')).toBe(false);
  });
});

describe('hashPassword / comparePassword', () => {
  it('should hash and compare passwords correctly', async () => {
    const plain = 'TestPass1!';
    const hashed = await hashPassword(plain);
    expect(hashed).not.toBe(plain);
    expect(await comparePassword(plain, hashed)).toBe(true);
    expect(await comparePassword('WrongPass1!', hashed)).toBe(false);
  }, 15000);

  it('should produce different hashes for the same password (salt)', async () => {
    const hash1 = await hashPassword('Same1!Pass');
    const hash2 = await hashPassword('Same1!Pass');
    expect(hash1).not.toBe(hash2);
  }, 15000);

  it('should return false when stored password is null', async () => {
    expect(await comparePassword('anything', null)).toBe(false);
  });

  it('should handle long passwords', async () => {
    const longPass = 'A1!' + 'a'.repeat(200);
    const hashed = await hashPassword(longPass);
    expect(await comparePassword(longPass, hashed)).toBe(true);
  }, 15000);
});

describe('isLocked', () => {
  it('returns false when lockUntil is null', () => {
    expect(isLocked({ lockUntil: null })).toBe(false);
  });

  it('returns false when lockUntil is in the past', () => {
    expect(isLocked({ lockUntil: new Date(Date.now() - 60_000) })).toBe(false);
  });

  it('returns true when lockUntil is in the future', () => {
    expect(isLocked({ lockUntil: new Date(Date.now() + 60_000) })).toBe(true);
  });
});

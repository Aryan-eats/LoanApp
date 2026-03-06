import { describe, it, expect, beforeAll } from 'vitest';
import { encryptWhere, encryptString, decryptString } from '../utils/fieldEncryption.js';

beforeAll(() => {
  if (!process.env.FIELD_ENCRYPTION_KEY) {
    process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  }
});

describe('field encryption', () => {
  it('round-trips encrypted values', () => {
    const plaintext = 'SensitiveValue123';
    const encrypted = encryptString(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decryptString(encrypted)).toBe(plaintext);
  });

  it('uses randomized encryption for the same input', () => {
    const plaintext = 'RepeatValue';
    const encryptedA = encryptString(plaintext);
    const encryptedB = encryptString(plaintext);
    expect(encryptedA).not.toBe(encryptedB);
    expect(decryptString(encryptedA)).toBe(plaintext);
    expect(decryptString(encryptedB)).toBe(plaintext);
  });

  it('returns null for null input', () => {
    expect(encryptString(null)).toBeNull();
    expect(decryptString(null)).toBeNull();
  });

  it('returns undefined for undefined input', () => {
    expect(encryptString(undefined)).toBeUndefined();
    expect(decryptString(undefined)).toBeUndefined();
  });

  it('returns empty string for empty string input', () => {
    expect(encryptString('')).toBe('');
    expect(decryptString('')).toBe('');
  });

  it('does not double-encrypt an already encrypted value', () => {
    const plaintext = 'DoubleEncryptTest';
    const encrypted = encryptString(plaintext);
    const doubleEncrypted = encryptString(encrypted);
    expect(doubleEncrypted).toBe(encrypted);
    expect(decryptString(doubleEncrypted)).toBe(plaintext);
  });

  it('produces output starting with enc:v1 prefix', () => {
    const encrypted = encryptString('test');
    expect(encrypted).toMatch(/^enc:v1:/);
  });

  it('handles unicode / multi-byte strings', () => {
    const plaintext = '日本語テスト 🔐';
    const encrypted = encryptString(plaintext);
    expect(decryptString(encrypted)).toBe(plaintext);
  });

  it('handles long strings', () => {
    const plaintext = 'A'.repeat(10000);
    const encrypted = encryptString(plaintext);
    expect(decryptString(encrypted)).toBe(plaintext);
  });

  it('returns null on tampered ciphertext', () => {
    const encrypted = encryptString('tamperTest')!;
    const parts = encrypted.split(':');
    // Corrupt the auth tag while keeping its decoded length at 16 bytes.
    parts[3] = Buffer.alloc(16, 1).toString('base64');
    const tampered = parts.join(':');
    expect(decryptString(tampered)).toBeNull();
  });

  it('decryptString returns un-prefixed strings as-is', () => {
    const plain = 'not-encrypted-at-all';
    expect(decryptString(plain)).toBe(plain);
  });

  it('throws on truncated encrypted payload', () => {
    expect(() => decryptString('enc:v1:truncated')).toThrow('Invalid encrypted payload format');
  });

  it('throws a clear error for unsupported substring filters on encrypted fields', () => {
    expect(() =>
      encryptWhere('User', {
        panNumber: { contains: 'ABCDE1234F' },
      })
    ).toThrow('Unsupported contains filter on encrypted field "User.panNumber" (filter).');
  });
});

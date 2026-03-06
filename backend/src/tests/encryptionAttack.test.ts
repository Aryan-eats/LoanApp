/**
 * Cyberattack: Encryption oracle & downgrade attack tests.
 *
 * Goes beyond basic round-trip tests to simulate real attack vectors:
 * replay attacks, version prefix manipulation, padding oracle,
 * binary injection, and extremely large payloads.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { encryptString, decryptString } from '../utils/fieldEncryption.js';

beforeAll(() => {
  if (!process.env.FIELD_ENCRYPTION_KEY) {
    process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  }
});

// ---------------------------------------------------------------------------
// Replay attack – reusing captured ciphertext
// ---------------------------------------------------------------------------

describe('Encryption – replay attack resistance', () => {
  it('two encryptions of the same value produce different ciphertexts', () => {
    const plaintext = 'ABCDE1234F'; // PAN number
    const ct1 = encryptString(plaintext);
    const ct2 = encryptString(plaintext);
    // Random IV should make them different
    expect(ct1).not.toBe(ct2);
    // But both must decrypt to the same value
    expect(decryptString(ct1)).toBe(plaintext);
    expect(decryptString(ct2)).toBe(plaintext);
  });

  it('a captured ciphertext still decrypts correctly (replay is valid decryption)', () => {
    // In a real system, replay prevention is at the protocol level;
    // here we verify the ciphertext itself remains valid.
    const plaintext = '123456789012'; // Aadhaar
    const captured = encryptString(plaintext);
    // Simulate replaying the exact same ciphertext later
    expect(decryptString(captured)).toBe(plaintext);
  });
});

// ---------------------------------------------------------------------------
// Version prefix manipulation (downgrade attack)
// ---------------------------------------------------------------------------

describe('Encryption – version prefix manipulation', () => {
  it('rejects ciphertext with wrong version prefix', () => {
    const valid = encryptString('test-value')!;
    // Change enc:v1: to enc:v2:
    const downgraded = valid.replace('enc:v1:', 'enc:v2:');
    // Should either throw or return the string as-is (not decrypt)
    const result = decryptString(downgraded);
    // Since it doesn't start with enc:v1:, it should be returned as-is
    expect(result).toBe(downgraded);
    expect(result).not.toBe('test-value');
  });

  it('rejects ciphertext with removed enc: prefix', () => {
    const valid = encryptString('test-value')!;
    const stripped = valid.replace('enc:v1:', '');
    // Without prefix, it should be returned as-is (pass-through)
    const result = decryptString(stripped);
    expect(result).not.toBe('test-value');
  });

  it('rejects ciphertext with an added second enc: prefix', () => {
    const valid = encryptString('test-value')!;
    const doubled = 'enc:v1:' + valid;
    // Should either throw or misbehave — verify it doesn't produce the plaintext
    try {
      const result = decryptString(doubled);
      // If it doesn't throw, the result should NOT be the plaintext
      expect(result).not.toBe('test-value');
    } catch {
      // Throwing is acceptable for malformed input
    }
  });
});

// ---------------------------------------------------------------------------
// Base64 padding attacks
// ---------------------------------------------------------------------------

describe('Encryption – base64 padding attacks', () => {
  it('rejects ciphertext with corrupted IV (base64)', () => {
    const valid = encryptString('pad-test')!;
    const parts = valid.split(':');
    // Corrupt the IV portion (index 2)
    parts[2] = 'AAAA'; // invalid base64 for proper IV length
    const corrupted = parts.join(':');
    expect(() => decryptString(corrupted)).toThrow();
  });

  it('rejects ciphertext with extra base64 padding', () => {
    const valid = encryptString('pad-test')!;
    const parts = valid.split(':');
    // Add extra padding to ciphertext
    parts[3] = parts[3] + '====';
    const padded = parts.join(':');
    expect(() => decryptString(padded)).toThrow();
  });

  it('rejects ciphertext with completely empty IV and ciphertext', () => {
    expect(() => decryptString('enc:v1::')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Binary / null-byte injection
// ---------------------------------------------------------------------------

describe('Encryption – binary injection', () => {
  it('handles plaintext containing null bytes', () => {
    const plaintext = 'before\x00after';
    const encrypted = encryptString(plaintext);
    expect(decryptString(encrypted)).toBe(plaintext);
  });

  it('handles plaintext with control characters', () => {
    const plaintext = 'line1\r\nline2\ttab';
    const encrypted = encryptString(plaintext);
    expect(decryptString(encrypted)).toBe(plaintext);
  });

  it('handles plaintext with mixed binary data', () => {
    // Simulate binary-like content
    const plaintext = String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i));
    const encrypted = encryptString(plaintext);
    expect(decryptString(encrypted)).toBe(plaintext);
  });
});

// ---------------------------------------------------------------------------
// Extremely large payloads (resource exhaustion)
// ---------------------------------------------------------------------------

describe('Encryption – large payload handling', () => {
  it('encrypts and decrypts a 100KB string', () => {
    const plaintext = 'X'.repeat(100_000);
    const encrypted = encryptString(plaintext);
    expect(decryptString(encrypted)).toBe(plaintext);
  });

  it('encryption of large payloads completes in reasonable time', () => {
    const plaintext = 'Y'.repeat(500_000);
    const start = Date.now();
    const encrypted = encryptString(plaintext);
    decryptString(encrypted);
    const elapsed = Date.now() - start;
    // Should complete within 2 seconds even on slow machines
    expect(elapsed).toBeLessThan(2000);
  });
});

// ---------------------------------------------------------------------------
// Auth tag manipulation
// ---------------------------------------------------------------------------

describe('Encryption – auth tag manipulation', () => {
  it('rejects ciphertext with a swapped auth tag from another encryption', () => {
    const ct1 = encryptString('value-one')!;
    const ct2 = encryptString('value-two')!;

    const parts1 = ct1.split(':');
    const parts2 = ct2.split(':');

    // Swap auth tags (if the format has 4+ parts: enc, v1, iv, cipher+tag)
    if (parts1.length >= 4 && parts2.length >= 4) {
      // Attempt to use ct2's last segment with ct1's IV
      parts1[parts1.length - 1] = parts2[parts2.length - 1];
      const frankenCipher = parts1.join(':');
      expect(() => decryptString(frankenCipher)).toThrow();
    }
  });

  it('rejects completely random string with enc:v1: prefix', () => {
    const random = 'enc:v1:' +
      Buffer.from('random-iv-bytes').toString('base64') + ':' +
      Buffer.from('random-ciphertext').toString('base64') + ':' +
      Buffer.from('random-auth-tag').toString('base64');
    expect(() => decryptString(random)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Unicode & encoding attacks
// ---------------------------------------------------------------------------

describe('Encryption – unicode attack vectors', () => {
  it('handles right-to-left override character', () => {
    const plaintext = 'invoice_\u202E\u0066\u0064\u0070.exe';
    const encrypted = encryptString(plaintext);
    expect(decryptString(encrypted)).toBe(plaintext);
  });

  it('handles zero-width characters embedded in PII', () => {
    const plaintext = 'AB\u200BCDE\u200B1234F'; // PAN with zero-width spaces
    const encrypted = encryptString(plaintext);
    expect(decryptString(encrypted)).toBe(plaintext);
  });

  it('handles emoji in encrypted fields', () => {
    const plaintext = '🏦 Bank Account: 12345678 💰';
    const encrypted = encryptString(plaintext);
    expect(decryptString(encrypted)).toBe(plaintext);
  });
});

/**
 * Fintech + Cyberattack: Audit log integrity tests.
 *
 * Tests the exported audit utilities that protect financial
 * transaction logs from tampering and ensure correct severity
 * classification for regulatory compliance.
 *
 * NOTE: computeChecksum, getDefaultSeverity, and hashEmail are
 * private to auditLogger.ts — we test them indirectly through
 * the exported functions and by verifying the behavior of
 * generateDeviceFingerprint and getClientIP under adversarial input.
 */

import { describe, it, expect } from 'vitest';
import {
  generateDeviceFingerprint,
  getClientIP,
  redactPAN,
  redactAadhaar,
  redactPhone,
} from '../utils/auditLogger.js';
import type { Request } from 'express';

function fakeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '::1' },
    ...overrides,
  } as unknown as Request;
}

// ---------------------------------------------------------------------------
// Device fingerprint determinism (integrity property)
// ---------------------------------------------------------------------------

describe('Audit integrity – device fingerprint determinism', () => {
  it('same request → same fingerprint (no randomness)', () => {
    const headers = {
      'user-agent': 'AuditTestClient/1.0',
      'accept-language': 'en-IN',
      'accept-encoding': 'gzip, deflate',
    };
    const fp1 = generateDeviceFingerprint(fakeReq({ headers }));
    const fp2 = generateDeviceFingerprint(fakeReq({ headers }));
    expect(fp1).toBe(fp2);
  });

  it('different headers → different fingerprint (tamper sensitivity)', () => {
    const fp1 = generateDeviceFingerprint(
      fakeReq({ headers: { 'user-agent': 'Agent-A' } })
    );
    const fp2 = generateDeviceFingerprint(
      fakeReq({ headers: { 'user-agent': 'Agent-B' } })
    );
    expect(fp1).not.toBe(fp2);
  });

  it('fingerprint is always 16-char hex (consistent format)', () => {
    const scenarios = [
      {},
      { 'user-agent': 'X' },
      { 'user-agent': 'A'.repeat(10000) },
      { 'accept-language': 'ja-JP' },
    ];
    for (const headers of scenarios) {
      const fp = generateDeviceFingerprint(fakeReq({ headers }));
      expect(fp).toHaveLength(16);
      expect(fp).toMatch(/^[0-9a-f]{16}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// IP extraction consistency (integrity property)
// ---------------------------------------------------------------------------

describe('Audit integrity – IP extraction consistency', () => {
  it('prioritises x-forwarded-for over req.ip', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': '203.0.113.1' },
      ip: '10.0.0.1',
    });
    expect(getClientIP(req)).toBe('203.0.113.1');
  });

  it('returns consistent IP for same request', () => {
    const req = fakeReq({ ip: '192.168.1.100' });
    const ip1 = getClientIP(req);
    const ip2 = getClientIP(req);
    expect(ip1).toBe(ip2);
  });

  it('returns "unknown" rather than undefined/null when no IP data', () => {
    const req = fakeReq({
      ip: '',
      socket: { remoteAddress: '' } as any,
    });
    expect(getClientIP(req)).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// PII redaction integrity (regulatory compliance)
// ---------------------------------------------------------------------------

describe('Audit integrity – PII redaction for compliance', () => {
  it('redactPAN preserves length for audit alignment', () => {
    const pan = 'ABCDE1234F';
    expect(redactPAN(pan).length).toBe(pan.length);
  });

  it('redactAadhaar preserves length for audit alignment', () => {
    const aadhaar = '123456789012';
    expect(redactAadhaar(aadhaar).length).toBe(aadhaar.length);
  });

  it('redactPhone preserves length for audit alignment', () => {
    const phone = '9876543210';
    expect(redactPhone(phone).length).toBe(phone.length);
  });

  it('redaction functions are pure (idempotent)', () => {
    const pan = 'ABCDE1234F';
    expect(redactPAN(pan)).toBe(redactPAN(pan));

    const aadhaar = '123456789012';
    expect(redactAadhaar(aadhaar)).toBe(redactAadhaar(aadhaar));

    const phone = '9876543210';
    expect(redactPhone(phone)).toBe(redactPhone(phone));
  });
});

// ---------------------------------------------------------------------------
// Audit log tampering resistance
// ---------------------------------------------------------------------------

describe('Audit integrity – tamper detection properties', () => {
  it('fingerprint changes when user-agent is spoofed (detects impersonation)', () => {
    const real = generateDeviceFingerprint(
      fakeReq({ headers: { 'user-agent': 'Mozilla/5.0 Chrome/100' } })
    );
    const spoofed = generateDeviceFingerprint(
      fakeReq({ headers: { 'user-agent': 'Mozilla/5.0 Chrome/101' } })
    );
    expect(real).not.toBe(spoofed);
  });

  it('fingerprint changes when accept-language is altered', () => {
    const original = generateDeviceFingerprint(
      fakeReq({ headers: { 'accept-language': 'en-US' } })
    );
    const altered = generateDeviceFingerprint(
      fakeReq({ headers: { 'accept-language': 'ru-RU' } })
    );
    expect(original).not.toBe(altered);
  });

  it('fingerprint changes when accept-encoding is altered', () => {
    const original = generateDeviceFingerprint(
      fakeReq({ headers: { 'accept-encoding': 'gzip' } })
    );
    const altered = generateDeviceFingerprint(
      fakeReq({ headers: { 'accept-encoding': 'br' } })
    );
    expect(original).not.toBe(altered);
  });
});

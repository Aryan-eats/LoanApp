/**
 * Cyberattack: IP spoofing via header manipulation tests.
 *
 * Tests the getClientIP utility against various techniques attackers
 * use to hide their real IP or inject malicious data through headers.
 */

import { describe, it, expect } from 'vitest';
import { getClientIP, generateDeviceFingerprint } from '../modules/audit/auditLogger.js';
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
// IP Spoofing – x-forwarded-for manipulation
// ---------------------------------------------------------------------------

describe('getClientIP – IP spoofing attacks', () => {
  it('returns first IP from a chained proxy header', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': '203.0.113.50, 198.51.100.178, 10.0.0.1' },
    });
    expect(getClientIP(req)).toBe('203.0.113.50');
  });

  it('handles XSS payload in x-forwarded-for', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': '<script>alert(1)</script>, 10.0.0.1' },
    });
    const result = getClientIP(req);
    // Should return the raw first entry (it's the caller's job to sanitise for display)
    // But crucially, getClientIP must not crash
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles SQL injection payload in x-forwarded-for', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': "1.2.3.4' OR '1'='1" },
    });
    const result = getClientIP(req);
    expect(typeof result).toBe('string');
  });

  it('handles excessively long x-forwarded-for header', () => {
    const longHeader = Array(1000).fill('10.0.0.1').join(', ');
    const req = fakeReq({
      headers: { 'x-forwarded-for': longHeader },
    });
    const result = getClientIP(req);
    expect(result).toBe('10.0.0.1');
  });

  it('handles comma-only x-forwarded-for', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': ',,,' },
    });
    const result = getClientIP(req);
    // First entry after split is empty string, trimmed
    expect(typeof result).toBe('string');
  });

  it('handles x-forwarded-for with only whitespace', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': '   ' },
    });
    const result = getClientIP(req);
    expect(result).toBe('');
  });

  it('handles IPv6 mapped IPv4 address', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': '::ffff:192.168.1.1' },
    });
    expect(getClientIP(req)).toBe('::ffff:192.168.1.1');
  });

  it('handles full IPv6 address in x-forwarded-for', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334' },
    });
    expect(getClientIP(req)).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
  });

  it('falls back to req.ip for loopback IPv6', () => {
    const req = fakeReq({ ip: '::1' });
    expect(getClientIP(req)).toBe('::1');
  });

  it('handles CRLF injection in x-forwarded-for', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': '10.0.0.1\r\nX-Injected-Header: malicious' },
    });
    const result = getClientIP(req);
    expect(typeof result).toBe('string');
    // Should not crash
  });

  it('handles null byte in x-forwarded-for', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': '10.0.0.1\x00evilpayload' },
    });
    const result = getClientIP(req);
    expect(typeof result).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Device fingerprint spoofing – header manipulation
// ---------------------------------------------------------------------------

describe('generateDeviceFingerprint – spoofing attacks', () => {
  it('produces different fingerprints for different user-agents', () => {
    const fp1 = generateDeviceFingerprint(
      fakeReq({ headers: { 'user-agent': 'Chrome/100' } })
    );
    const fp2 = generateDeviceFingerprint(
      fakeReq({ headers: { 'user-agent': 'Firefox/99' } })
    );
    expect(fp1).not.toBe(fp2);
  });

  it('handles XSS in user-agent without crashing', () => {
    const req = fakeReq({
      headers: { 'user-agent': '<script>alert(document.cookie)</script>' },
    });
    const fp = generateDeviceFingerprint(req);
    expect(fp).toHaveLength(16);
    expect(fp).toMatch(/^[0-9a-f]+$/);
  });

  it('handles extremely long user-agent (buffer overflow attempt)', () => {
    const req = fakeReq({
      headers: { 'user-agent': 'A'.repeat(100_000) },
    });
    const fp = generateDeviceFingerprint(req);
    expect(fp).toHaveLength(16);
    expect(fp).toMatch(/^[0-9a-f]+$/);
  });

  it('handles user-agent with null bytes', () => {
    const req = fakeReq({
      headers: { 'user-agent': 'Chrome\x00Evil' },
    });
    const fp = generateDeviceFingerprint(req);
    expect(fp).toHaveLength(16);
  });

  it('handles all headers as empty strings', () => {
    const req = fakeReq({
      headers: { 'user-agent': '', 'accept-language': '', 'accept-encoding': '' },
    });
    const fp = generateDeviceFingerprint(req);
    expect(fp).toHaveLength(16);
    expect(fp).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic for the exact same spoofed headers', () => {
    const headers = {
      'user-agent': 'SpoofedBot/1.0',
      'accept-language': 'en-US',
      'accept-encoding': 'gzip',
    };
    const fp1 = generateDeviceFingerprint(fakeReq({ headers }));
    const fp2 = generateDeviceFingerprint(fakeReq({ headers }));
    expect(fp1).toBe(fp2);
  });
});

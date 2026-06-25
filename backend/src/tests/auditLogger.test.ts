import { describe, it, expect } from 'vitest';
import { generateDeviceFingerprint, getClientIP, redactPhone } from '../modules/audit/auditLogger.js';
import type { Request } from 'express';

function fakeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '::1' },
    ...overrides,
  } as unknown as Request;
}

describe('getClientIP', () => {
  it('returns x-forwarded-for first entry when present', () => {
    const req = fakeReq({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });
    expect(getClientIP(req)).toBe('1.2.3.4');
  });

  it('trims whitespace from forwarded IP', () => {
    const req = fakeReq({ headers: { 'x-forwarded-for': '  10.0.0.1  ' } });
    expect(getClientIP(req)).toBe('10.0.0.1');
  });

  it('falls back to req.ip when no x-forwarded-for', () => {
    const req = fakeReq({ ip: '192.168.1.1' });
    expect(getClientIP(req)).toBe('192.168.1.1');
  });

  it('falls back to socket.remoteAddress when req.ip is empty', () => {
    const req = fakeReq({ ip: '', socket: { remoteAddress: '10.10.10.10' } as any });
    expect(getClientIP(req)).toBe('10.10.10.10');
  });

  it('returns "unknown" when nothing is available', () => {
    const req = fakeReq({ ip: '', socket: { remoteAddress: '' } as any });
    expect(getClientIP(req)).toBe('unknown');
  });

  it('ignores x-forwarded-for if it is an array (non-string)', () => {
    const req = fakeReq({
      headers: { 'x-forwarded-for': ['1.2.3.4', '5.6.7.8'] as any },
      ip: '99.99.99.99',
    });
    expect(getClientIP(req)).toBe('99.99.99.99');
  });
});

describe('generateDeviceFingerprint', () => {
  it('returns a 16-char hex string', () => {
    const req = fakeReq({
      headers: {
        'user-agent': 'TestBrowser/1.0',
        'accept-language': 'en-US',
        'accept-encoding': 'gzip',
      },
    });
    const fp = generateDeviceFingerprint(req);
    expect(fp).toHaveLength(16);
    expect(fp).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic for same headers', () => {
    const headers = {
      'user-agent': 'Agent/1',
      'accept-language': 'en',
      'accept-encoding': 'br',
    };
    const fp1 = generateDeviceFingerprint(fakeReq({ headers }));
    const fp2 = generateDeviceFingerprint(fakeReq({ headers }));
    expect(fp1).toBe(fp2);
  });

  it('differs for different user-agents', () => {
    const fp1 = generateDeviceFingerprint(
      fakeReq({ headers: { 'user-agent': 'Chrome/100' } })
    );
    const fp2 = generateDeviceFingerprint(
      fakeReq({ headers: { 'user-agent': 'Firefox/99' } })
    );
    expect(fp1).not.toBe(fp2);
  });

  it('handles missing headers gracefully', () => {
    const fp = generateDeviceFingerprint(fakeReq({ headers: {} }));
    expect(fp).toHaveLength(16);
    expect(fp).toMatch(/^[0-9a-f]+$/);
  });
});

describe('redactPhone', () => {
  it('masks all but last 4 digits of a 10-digit number', () => {
    expect(redactPhone('9876543210')).toBe('******3210');
  });

  it('masks international numbers', () => {
    expect(redactPhone('+919876543210')).toBe('*********3210');
  });

  it('returns **** for a 4-digit input', () => {
    expect(redactPhone('1234')).toBe('****');
  });

  it('returns **** for very short inputs', () => {
    expect(redactPhone('12')).toBe('****');
  });

  it('handles a 5-digit number (masks first digit)', () => {
    expect(redactPhone('12345')).toBe('*2345');
  });
});

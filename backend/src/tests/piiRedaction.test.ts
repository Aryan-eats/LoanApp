/**
 * Fintech: PII redaction correctness tests.
 *
 * Ensures PAN, Aadhaar, and phone numbers are never leaked in
 * audit logs or error messages. Tests edge cases and Indian
 * financial identity document formats.
 */

import { describe, it, expect } from 'vitest';
import { redactPAN, redactAadhaar, redactPhone } from '../utils/auditLogger.js';

// ---------------------------------------------------------------------------
// redactPAN – Indian Permanent Account Number
// ---------------------------------------------------------------------------

describe('redactPAN', () => {
  it('redacts a standard 10-char PAN correctly', () => {
    // ABCDE1234F → AB*******F
    const result = redactPAN('ABCDE1234F');
    expect(result).toBe('AB*******F');
    expect(result.length).toBe(10);
  });

  it('redacted output never contains the full PAN', () => {
    const pan = 'XYZAB9876Q';
    const result = redactPAN(pan);
    expect(result).not.toBe(pan);
    // Middle chars must be masked
    expect(result.slice(2, -1)).toMatch(/^\*+$/);
  });

  it('handles a 4-char minimum-length PAN', () => {
    const result = redactPAN('ABCD');
    expect(result).toBe('AB*D');
  });

  it('returns **** for PAN shorter than 4 chars', () => {
    expect(redactPAN('AB')).toBe('****');
    expect(redactPAN('A')).toBe('****');
  });

  it('returns **** for empty PAN', () => {
    expect(redactPAN('')).toBe('****');
  });

  it('handles lowercase PAN the same way', () => {
    const result = redactPAN('abcde1234f');
    expect(result).toBe('ab*******f');
  });

  it('never exposes more than first 2 and last 1 characters', () => {
    const pan = 'ABCDE1234F';
    const result = redactPAN(pan);
    // Extract visible chars
    const visible = result.replace(/\*/g, '');
    expect(visible.length).toBe(3); // first 2 + last 1
  });
});

// ---------------------------------------------------------------------------
// redactAadhaar – Indian Aadhaar Number (12 digits)
// ---------------------------------------------------------------------------

describe('redactAadhaar', () => {
  it('redacts a standard 12-digit Aadhaar correctly', () => {
    // 123456789012 → ********9012
    const result = redactAadhaar('123456789012');
    expect(result).toBe('********9012');
    expect(result.length).toBe(12);
  });

  it('redacted Aadhaar never contains the first 8 digits', () => {
    const aadhaar = '998877665544';
    const result = redactAadhaar(aadhaar);
    // First 8 chars in result must all be asterisks
    expect(result.slice(0, 8)).toBe('********');
    // Last 4 should be the actual digits
    expect(result.slice(-4)).toBe('5544');
  });

  it('returns **** for Aadhaar with 4 or fewer digits', () => {
    expect(redactAadhaar('1234')).toBe('****');
    expect(redactAadhaar('12')).toBe('****');
  });

  it('returns **** for empty Aadhaar', () => {
    expect(redactAadhaar('')).toBe('****');
  });

  it('handles Aadhaar with 5 digits (shows only last 4)', () => {
    const result = redactAadhaar('12345');
    expect(result).toBe('*2345');
    expect(result.length).toBe(5);
  });

  it('handles very long input without crashing', () => {
    const longInput = '9'.repeat(100);
    const result = redactAadhaar(longInput);
    expect(result.slice(-4)).toBe('9999');
    expect(result.length).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// redactPhone – additional fintech edge cases
// ---------------------------------------------------------------------------

describe('redactPhone – fintech edge cases', () => {
  it('redacts an Indian mobile number with country code', () => {
    const result = redactPhone('+919876543210');
    expect(result).toBe('*********3210');
  });

  it('never exposes more than last 4 digits', () => {
    const phone = '9876543210';
    const result = redactPhone(phone);
    const visible = result.replace(/\*/g, '');
    expect(visible.length).toBe(4);
    expect(visible).toBe('3210');
  });

  it('handles a phone number with only digits', () => {
    expect(redactPhone('0000000000')).toBe('******0000');
  });

  it('handles a phone with leading zeros', () => {
    expect(redactPhone('00001234')).toBe('****1234');
  });

  it('returns **** for 3-digit emergency numbers', () => {
    expect(redactPhone('112')).toBe('****');
  });

  it('returns **** for single digit', () => {
    expect(redactPhone('5')).toBe('****');
  });

  it('handles phone numbers with mixed format chars passed through', () => {
    // redactPhone works on raw strings, not normalised — it just masks
    const result = redactPhone('+1-800-555-0100');
    // Should mask everything except last 4 chars
    expect(result.slice(-4)).toBe('0100');
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: ensure no function ever returns raw PII
// ---------------------------------------------------------------------------

describe('PII leak prevention – cross-cutting', () => {
  const sensitiveData = [
    { type: 'PAN', value: 'ABCDE1234F', redactor: redactPAN },
    { type: 'Aadhaar', value: '123456789012', redactor: redactAadhaar },
    { type: 'Phone', value: '9876543210', redactor: redactPhone },
  ] as const;

  sensitiveData.forEach(({ type, value, redactor }) => {
    it(`${type} redacted output is never equal to the original`, () => {
      expect(redactor(value)).not.toBe(value);
    });

    it(`${type} redacted output contains asterisks`, () => {
      expect(redactor(value)).toContain('*');
    });

    it(`${type} redacted output has the same length as input`, () => {
      expect(redactor(value).length).toBe(value.length);
    });
  });
});

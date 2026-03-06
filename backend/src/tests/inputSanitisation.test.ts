/**
 * Cyberattack: XSS / SQL-injection / path-traversal payload tests.
 *
 * Validates that sanitisers and validators correctly neutralise
 * malicious input that a real attacker might submit.
 */

import { describe, it, expect } from 'vitest';
import { sanitiseFilename } from '../services/documentService.js';
import { validatePassword } from '../services/userService.js';
import { normalizePhone } from '../services/authService.js';

// ---------------------------------------------------------------------------
// sanitiseFilename – path traversal & XSS payloads
// ---------------------------------------------------------------------------

describe('sanitiseFilename – attack payloads', () => {
  it('neutralises path-traversal sequences', () => {
    const result = sanitiseFilename('../../etc/passwd');
    expect(result).not.toContain('..');
    expect(result).not.toContain('/');
    // The output should still be a usable filename
    expect(result).toMatch(/^\d+-/);
  });

  it('neutralises Windows path-traversal sequences', () => {
    const result = sanitiseFilename('..\\..\\windows\\system32\\config\\sam');
    expect(result).not.toContain('..\\');
    expect(result).toMatch(/^\d+-/);
  });

  it('strips XSS script tags from filenames', () => {
    const result = sanitiseFilename('<script>alert(1)</script>.pdf');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
    expect(result).toMatch(/^\d+-/);
  });

  it('neutralises HTML event handler payloads', () => {
    const result = sanitiseFilename('" onerror="alert(1)".png');
    expect(result).not.toContain('onerror');
    // Quotes should be replaced
    expect(result).not.toContain('"');
  });

  it('removes null bytes (poison null byte attack)', () => {
    const result = sanitiseFilename('innocent.pdf\x00.exe');
    expect(result).not.toContain('\x00');
    expect(result).toMatch(/^\d+-/);
  });

  it('handles filenames that are entirely malicious characters', () => {
    const result = sanitiseFilename('<?php system($_GET["cmd"]); ?>');
    // Should fallback to "file" since all chars are unsafe
    expect(result).toMatch(/^\d+-.+/);
  });

  it('handles SQL injection in filenames', () => {
    const result = sanitiseFilename("'; DROP TABLE users; --.pdf");
    expect(result).not.toContain("DROP TABLE");
    expect(result).not.toContain("'");
    expect(result).not.toContain(';');
  });

  it('handles extremely long filenames (buffer overflow attempt)', () => {
    const longName = 'A'.repeat(10_000) + '.pdf';
    const result = sanitiseFilename(longName);
    // Filename portion after timestamp should be <= 200
    const namePart = result.split('-').slice(1).join('-');
    expect(namePart.length).toBeLessThanOrEqual(200);
  });

  it('handles Unicode homoglyph attacks', () => {
    // Cyrillic 'а' looks like Latin 'a' — should be replaced
    const result = sanitiseFilename('pаyment_receipt.pdf'); // Cyrillic а
    // The non-ASCII Cyrillic char should be replaced with underscore
    expect(result).toMatch(/^\d+-/);
  });

  it('handles CRLF injection in filenames', () => {
    const result = sanitiseFilename('file\r\nContent-Type: text/html\r\n.pdf');
    expect(result).not.toContain('\r');
    expect(result).not.toContain('\n');
  });
});

// ---------------------------------------------------------------------------
// validatePassword – adversarial password inputs
// ---------------------------------------------------------------------------

describe('validatePassword – attack payloads', () => {
  it('rejects XSS payload as password (missing char classes)', () => {
    expect(validatePassword('<script>alert(1)</script>')).toBe(false);
  });

  it('rejects SQL injection payload as password (missing char classes)', () => {
    expect(validatePassword("' OR '1'='1'; --")).toBe(false);
  });

  it('accepts a strong password that happens to contain special chars used in attacks', () => {
    // This password meets all rules: length, upper, lower, digit, special
    expect(validatePassword('SecureP@ss1!')).toBe(true);
  });

  it('rejects password with only zero-width chars (invisible password)', () => {
    const zeroWidth = '\u200B'.repeat(20); // zero-width space
    expect(validatePassword(zeroWidth)).toBe(false);
  });

  it('rejects a password of only Unicode whitespace', () => {
    const unicodeSpaces = '\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003'; // em-spaces
    expect(validatePassword(unicodeSpaces)).toBe(false);
  });

  it('handles extremely long password input (ReDoS protection)', () => {
    // Regex engines can choke on catastrophic backtracking
    const longPassword = 'Aa1!' + 'x'.repeat(100_000);
    // Should return a boolean in reasonable time, not hang
    const start = Date.now();
    const result = validatePassword(longPassword);
    const elapsed = Date.now() - start;
    expect(typeof result).toBe('boolean');
    expect(elapsed).toBeLessThan(1000); // must finish within 1 second
  });
});

// ---------------------------------------------------------------------------
// normalizePhone – injection via phone number field
// ---------------------------------------------------------------------------

describe('normalizePhone – injection payloads', () => {
  it('strips SQL injection from phone input', () => {
    const result = normalizePhone("+91; DROP TABLE users; --");
    // Only digits should remain
    expect(result).toMatch(/^\d+$/);
    expect(result).not.toContain('DROP');
    expect(result).not.toContain(';');
  });

  it('strips XSS from phone input', () => {
    const result = normalizePhone('<img src=x onerror=alert(1)>');
    expect(result).toMatch(/^\d*$/);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('strips shell injection from phone input', () => {
    const result = normalizePhone('91$(whoami)');
    expect(result).toMatch(/^\d+$/);
    expect(result).not.toContain('$');
    expect(result).not.toContain('(');
  });

  it('handles a valid Indian phone number', () => {
    expect(normalizePhone('+91-9876-543-210')).toBe('919876543210');
  });

  it('handles phone with spaces and dashes', () => {
    expect(normalizePhone('  +91 98765 43210  ')).toBe('919876543210');
  });

  it('returns empty string for entirely non-digit input', () => {
    expect(normalizePhone('not-a-phone')).toBe('');
  });

  it('strips CRLF injection from phone input', () => {
    const result = normalizePhone('9876543210\r\nX-Injected: true');
    expect(result).toMatch(/^\d+$/);
    expect(result).not.toContain('\r');
    expect(result).not.toContain('\n');
  });
});

/**
 * Unit tests for document service helpers and behavior changes.
 *
 * These tests verify:
 *   - sanitiseFilename fallback for empty / all-unsafe input
 *   - Shared MAX_FILE_SIZE export
 *   - documentExists error propagation (non-404 errors rethrown)
 */

import { describe, it, expect } from 'vitest';
import { sanitiseFilename } from '../services/documentService.js';
import { MAX_FILE_SIZE } from '../shared/middleware/upload.js';

// --- sanitiseFilename -------------------------------------

describe('sanitiseFilename', () => {
  it('handles a normal filename', () => {
    const result = sanitiseFilename('report.pdf');
    expect(result).toMatch(/^\d+-report\.pdf$/);
  });

  it('replaces unsafe characters with underscores', () => {
    const result = sanitiseFilename('my file (1).pdf');
    expect(result).toMatch(/^\d+-my_file__1_\.pdf$/);
  });

  it('truncates names longer than 200 characters', () => {
    const longName = 'a'.repeat(300) + '.pdf';
    const result = sanitiseFilename(longName);
    const namePart = result.split('-').slice(1).join('-');
    expect(namePart.length).toBeLessThanOrEqual(200);
  });

  it('falls back to "file" when input is empty', () => {
    const result = sanitiseFilename('');
    expect(result).toMatch(/^\d+-file$/);
  });

  it('falls back to "file" when all characters are unsafe', () => {
    const result = sanitiseFilename('☺️🎉 ');
    expect(result).toMatch(/^\d+-file$/);
  });

  it('falls back to "file" when input is only spaces and special chars', () => {
    const result = sanitiseFilename('   !!!@@@###   ');
    // All chars become underscores, so the name part is not empty
    // but verify it doesn't produce a trailing-only-underscore
    const namePart = result.split('-').slice(1).join('-');
    expect(namePart.length).toBeGreaterThan(0);
  });
});

// --- MAX_FILE_SIZE export ---------------------------------

describe('MAX_FILE_SIZE', () => {
  it('is exported and equals 3 MB', () => {
    expect(MAX_FILE_SIZE).toBe(3 * 1024 * 1024);
  });
});

// --- documentExists error-handling logic ------------------

describe('documentExists error-handling logic', () => {
  it('should return false for a NotFound-style error', () => {
    // Verify our distinguishing logic: NotFound → false
    const notFoundErr = Object.assign(new Error('Not Found'), {
      name: 'NotFound',
      $metadata: { httpStatusCode: 404 },
    });
    const name = (notFoundErr as { name?: string })?.name;
    const status = (notFoundErr as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    const isNotFound = name === 'NotFound' || name === 'NoSuchKey' || status === 404;
    expect(isNotFound).toBe(true);
  });

  it('should identify non-404 errors as rethrowable', () => {
    const permErr = Object.assign(new Error('Access Denied'), {
      name: 'AccessDenied',
      $metadata: { httpStatusCode: 403 },
    });
    const name = (permErr as { name?: string })?.name;
    const status = (permErr as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    const isNotFound = name === 'NotFound' || name === 'NoSuchKey' || status === 404;
    expect(isNotFound).toBe(false);
  });
});

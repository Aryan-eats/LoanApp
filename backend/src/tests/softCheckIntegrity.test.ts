import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildBorrowerHash,
  buildInputHash,
  buildResultChecksum,
  canonicalJson,
} from '../modules/soft-check/softCheckIntegrity.js';

describe('soft-check integrity helpers', () => {
  beforeEach(() => {
    process.env.SOFT_CHECK_HMAC_KEY = 'borrower-secret';
    process.env.SOFT_CHECK_CHECKSUM_KEY = 'checksum-secret';
  });

  afterEach(() => {
    delete process.env.SOFT_CHECK_HMAC_KEY;
    delete process.env.SOFT_CHECK_CHECKSUM_KEY;
  });

  it('canonicalizes objects with stable key ordering', () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe(
      canonicalJson({ a: { c: 3, d: 4 }, b: 2 })
    );
  });

  it('generates partner-scoped borrower hashes without exposing raw identifiers', () => {
    const hash = buildBorrowerHash('partner-1', '9876543210');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain('9876543210');
    expect(buildBorrowerHash('partner-2', '9876543210')).not.toBe(hash);
  });

  it('generates deterministic input and result checksums', () => {
    const inputA = { productCode: 'personal_loan', requestedAmount: 500_000 };
    const inputB = { requestedAmount: 500_000, productCode: 'personal_loan' };

    expect(buildInputHash(inputA)).toBe(buildInputHash(inputB));
    expect(buildResultChecksum({ result: 'ok', inputHash: buildInputHash(inputA) })).toMatch(/^[a-f0-9]{64}$/);
  });

  it('fails closed when dedicated integrity keys are missing', () => {
    delete process.env.SOFT_CHECK_HMAC_KEY;

    expect(() => buildBorrowerHash('partner-1', '9876543210')).toThrow(
      'SOFT_CHECK_HMAC_KEY is not configured'
    );
  });
});

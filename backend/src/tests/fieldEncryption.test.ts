import { beforeEach, describe, expect, it } from 'vitest';

import {
  decryptResultWithBridge,
  encryptFields,
  encryptWhere,
  prepareReadArgsForBridge,
} from '../utils/fieldEncryption.js';
import { encryptField, encryptForGPSIndia } from '../shared/security/encryption.js';

const TEST_FIELD_KEY = Buffer.alloc(32, 7).toString('base64');

describe('field encryption', () => {
  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_FIELD_KEY;
  });

  it('encrypts covered User fields and marks the row as version 1', async () => {
    const refreshTokenHash = 'a'.repeat(64);
    const data: Record<string, unknown> = {
      aadhaarNumber: '123412341234',
      refreshToken: refreshTokenHash,
    };

    await encryptFields('User', data);

    expect(data.encryptionVersion).toBe(1);
    expect(data.aadhaarNumber).not.toBe('123412341234');
    expect(data.aadhaarNumber).toMatch(/^enc:v1:/);
    expect(data.refreshToken).toBe(refreshTokenHash);
  });

  it('encrypts PartnerData with the partner transit key', async () => {
    const data: Record<string, unknown> = {
      partnerOrgId: 'partner-org-1',
      fullName: 'Jane Doe',
      phone: '9999999999',
      email: 'jane@example.com',
    };

    await encryptFields('PartnerData', data);

    expect(data.encryptionVersion).toBe(1);
    expect(data.fullName).not.toBe('Jane Doe');
    expect(data.fullName).toMatch(/^enc:v1:/);
    expect(data.phone).not.toBe('9999999999');
    expect(data.phone).toMatch(/^enc:v1:/);
    expect(data.email).not.toBe('jane@example.com');
    expect(data.email).toMatch(/^enc:v1:/);
  });

  it('round-trips PartnerData through partner-key encrypt and decrypt', async () => {
    const data: Record<string, unknown> = {
      partnerOrgId: 'partner-org-1',
      fullName: 'Jane Doe',
      phone: '9999999999',
      email: 'jane@example.com',
    };

    await encryptFields('PartnerData', data);
    await decryptResultWithBridge('PartnerData', data);

    expect(data.fullName).toBe('Jane Doe');
    expect(data.phone).toBe('9999999999');
    expect(data.email).toBe('jane@example.com');
  });

  it('injects partnerOrgId into selected PartnerData reads and strips it after decrypt', async () => {
    const args: Record<string, unknown> = {
      select: {
        fullName: true,
      },
    };

    const cleanupPlan = prepareReadArgsForBridge('PartnerData', args);
    const record: Record<string, unknown> = {
      fullName: await encryptField('partner-org-1', 'Jane Doe'),
      partnerOrgId: 'partner-org-1',
    };

    expect((args.select as Record<string, unknown>).partnerOrgId).toBe(true);

    await decryptResultWithBridge('PartnerData', record, cleanupPlan);

    expect(record.fullName).toBe('Jane Doe');
    expect(record.partnerOrgId).toBeUndefined();
  });

  it('decrypts encrypted ciphertexts for result objects', async () => {
    const user = {
      aadhaarNumber: await encryptForGPSIndia('123412341234'),
      refreshToken: await encryptForGPSIndia('b'.repeat(64)),
    };

    await decryptResultWithBridge('User', user);

    expect(user.aadhaarNumber).toBe('123412341234');
    expect(user.refreshToken).toBe('b'.repeat(64));
  });

  it('decrypts nested encrypted relations included under unencrypted models', async () => {
    const result = {
      id: 'doc-1',
      partnerData: {
        partnerOrgId: 'partner-org-1',
        fullName: await encryptField('partner-org-1', 'Jane Doe'),
        email: await encryptField('partner-org-1', 'jane@example.com'),
      },
    };

    await decryptResultWithBridge('PartnerDataDocument', result);

    expect(result.partnerData.fullName).toBe('Jane Doe');
    expect(result.partnerData.email).toBe('jane@example.com');
  });

  it('throws a clear error for unsupported substring filters on encrypted fields', () => {
    expect(() =>
      encryptWhere('User', {
        panNumber: { contains: 'ABCDE1234F' },
      })
    ).toThrow('Unsupported contains filter on encrypted field "User.panNumber" (filter).');
  });

  it('rejects equality filters on encrypted PII', () => {
    expect(() =>
      encryptWhere('Lead', {
        clientPhone: '9999999999',
      })
    ).toThrow('Unsupported equals filter on encrypted field "Lead.clientPhone".');
  });

  it('keeps auth-hash filters unchanged in where clauses', () => {
    const resetTokenHash = 'b'.repeat(64);
    const where = {
      resetPasswordToken: { equals: resetTokenHash },
      refreshToken: resetTokenHash,
    };

    encryptWhere('User', where);

    expect(where.resetPasswordToken.equals).toBe(resetTokenHash);
    expect(where.refreshToken).toBe(resetTokenHash);
  });
});

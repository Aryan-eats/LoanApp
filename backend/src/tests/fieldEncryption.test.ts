import { beforeEach, describe, expect, it, vi } from 'vitest';

const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64');

const { encryptForGPSIndia, decryptAsGPSIndia, encryptField, decryptField } = vi.hoisted(() => ({
  encryptForGPSIndia: vi.fn(
    async (value: string) => `vault:v1:gps:${Buffer.from(value, 'utf8').toString('base64')}`
  ),
  decryptAsGPSIndia: vi.fn(async (value: string) => {
    const payload = value.split(':').at(-1);
    return Buffer.from(payload ?? '', 'base64').toString('utf8');
  }),
  encryptField: vi.fn(
    async (partnerOrgId: string, value: string) =>
      `vault:v1:partner:${partnerOrgId}:${Buffer.from(value, 'utf8').toString('base64')}`
  ),
  decryptField: vi.fn(async (_partnerOrgId: string, value: string) => {
    const payload = value.split(':').at(-1);
    return Buffer.from(payload ?? '', 'base64').toString('utf8');
  }),
}));

vi.mock('../services/vault.js', () => ({
  encryptForGPSIndia,
  decryptAsGPSIndia,
  encryptField,
  decryptField,
  isVaultCiphertext: (value: string) => value.startsWith('vault:v1:'),
}));

import {
  decryptResultWithBridge,
  encryptFieldsWithVault,
  encryptWhere,
  prepareReadArgsForBridge,
} from '../utils/fieldEncryption.js';

describe('field encryption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encrypts covered User fields and marks the row as version 1', async () => {
    const refreshTokenHash = 'a'.repeat(64);
    const data: Record<string, unknown> = {
      aadhaarNumber: '123412341234',
      refreshToken: refreshTokenHash,
    };

    await encryptFieldsWithVault('User', data);

    expect(data.encryptionVersion).toBe(1);
    expect(data.aadhaarNumber).toBe(`vault:v1:gps:${encode('123412341234')}`);
    expect(data.refreshToken).toBe(refreshTokenHash);
    expect(encryptForGPSIndia).toHaveBeenCalledTimes(1);
  });

  it('encrypts PartnerData with the partner transit key', async () => {
    const data: Record<string, unknown> = {
      partnerOrgId: 'partner-org-1',
      fullName: 'Jane Doe',
      phone: '9999999999',
      email: 'jane@example.com',
    };

    await encryptFieldsWithVault('PartnerData', data);

    expect(data.encryptionVersion).toBe(1);
    expect(data.fullName).toBe(`vault:v1:partner:partner-org-1:${encode('Jane Doe')}`);
    expect(data.phone).toBe(`vault:v1:partner:partner-org-1:${encode('9999999999')}`);
    expect(data.email).toBe(`vault:v1:partner:partner-org-1:${encode('jane@example.com')}`);
  });

  it('round-trips PartnerData through partner-key encrypt and decrypt', async () => {
    const data: Record<string, unknown> = {
      partnerOrgId: 'partner-org-1',
      fullName: 'Jane Doe',
      phone: '9999999999',
      email: 'jane@example.com',
    };

    await encryptFieldsWithVault('PartnerData', data);
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
      fullName: `vault:v1:partner:partner-org-1:${encode('Jane Doe')}`,
      partnerOrgId: 'partner-org-1',
    };

    expect((args.select as Record<string, unknown>).partnerOrgId).toBe(true);

    await decryptResultWithBridge('PartnerData', record, cleanupPlan);

    expect(record.fullName).toBe('Jane Doe');
    expect(record.partnerOrgId).toBeUndefined();
  });

  it('decrypts vault ciphertexts for result objects', async () => {
    const user = {
      aadhaarNumber: `vault:v1:gps:${encode('123412341234')}`,
      refreshToken: `vault:v1:gps:${encode('b'.repeat(64))}`,
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
        fullName: `vault:v1:partner:partner-org-1:${encode('Jane Doe')}`,
        email: `vault:v1:partner:partner-org-1:${encode('jane@example.com')}`,
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

  it('rejects equality filters on vault-encrypted PII', () => {
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

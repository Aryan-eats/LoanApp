import { beforeEach, describe, expect, it, vi } from 'vitest';

const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64');

const { encryptForGPSIndia, decryptAsGPSIndia, encryptField, decryptField } = vi.hoisted(() => ({
  encryptForGPSIndia: vi.fn(
    async (value: string) => `vault:v1:gps:${Buffer.from(value, 'utf8').toString('base64')}`
  ),
  decryptAsGPSIndia: vi.fn(async (value: string) =>
    Buffer.from(value.split(':').at(-1) ?? '', 'base64').toString('utf8')
  ),
  encryptField: vi.fn(
    async (partnerOrgId: string, value: string) =>
      `vault:v1:partner:${partnerOrgId}:${Buffer.from(value, 'utf8').toString('base64')}`
  ),
  decryptField: vi.fn(async (_partnerOrgId: string, value: string) =>
    Buffer.from(value.split(':').at(-1) ?? '', 'base64').toString('utf8')
  ),
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
} from '../utils/fieldEncryption.js';

describe('field encryption guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not double-encrypt existing vault payloads', async () => {
    const existingCiphertext = `vault:v1:gps:${encode('ABCDE1234F')}`;
    const data: Record<string, unknown> = {
      clientPanNumber: existingCiphertext,
    };

    await encryptFieldsWithVault('Lead', data);

    expect(data.clientPanNumber).toBe(existingCiphertext);
    expect(encryptForGPSIndia).not.toHaveBeenCalled();
  });

  it('rejects partner-scoped encryption without a partnerOrgId', async () => {
    await expect(
      encryptFieldsWithVault('PartnerData', {
        fullName: 'Jane Doe',
      })
    ).rejects.toThrow('partnerOrgId is required to encrypt or decrypt PartnerData fields');
  });

  it('rejects list filters on encrypted lead fields', () => {
    expect(() =>
      encryptWhere('Lead', {
        clientEmail: { in: ['one@example.com', 'two@example.com'] },
      })
    ).toThrow('Unsupported in filter on encrypted field "Lead.clientEmail".');
  });

  it('throws when decrypting PartnerData without partner context', async () => {
    await expect(
      decryptResultWithBridge('PartnerData', {
        fullName: `vault:v1:partner:org-1:${encode('Jane Doe')}`,
      })
    ).rejects.toThrow('partnerOrgId is required to encrypt or decrypt PartnerData fields');
  });

  it('decrypts vault-encrypted auth hashes back to stable plaintext', async () => {
    const user = {
      refreshToken: `vault:v1:gps:${encode('a'.repeat(64))}`,
    };

    await decryptResultWithBridge('User', user);

    expect(user.refreshToken).toBe('a'.repeat(64));
  });
});

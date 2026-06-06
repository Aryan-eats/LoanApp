import { beforeEach, describe, expect, it, vi } from 'vitest';

const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64');

const { encryptForGPSIndia, decryptAsGPSIndia, encryptField, decryptField } = vi.hoisted(() => ({
  encryptForGPSIndia: vi.fn(
    async (value: string) => `enc:v1:${Buffer.from(value, 'utf8').toString('base64')}`
  ),
  decryptAsGPSIndia: vi.fn(async (value: string) =>
    Buffer.from(value.split(':').at(-1) ?? '', 'base64').toString('utf8')
  ),
  encryptField: vi.fn(
    async (_partnerOrgId: string, value: string) =>
      `enc:v1:${Buffer.from(value, 'utf8').toString('base64')}`
  ),
  decryptField: vi.fn(async (_partnerOrgId: string, value: string) =>
    Buffer.from(value.split(':').at(-1) ?? '', 'base64').toString('utf8')
  ),
}));

vi.mock('../services/encryption.js', () => ({
  encryptForGPSIndia,
  decryptAsGPSIndia,
  encryptField,
  decryptField,
  isEncryptedCiphertext: (value: string) => value.startsWith('enc:v1:'),
}));

import {
  decryptResultWithBridge,
  encryptFields,
  encryptWhere,
} from '../utils/fieldEncryption.js';

describe('field encryption guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not double-encrypt existing encrypted payloads', async () => {
    const existingCiphertext = `enc:v1:${encode('ABCDE1234F')}`;
    const data: Record<string, unknown> = {
      clientPanNumber: existingCiphertext,
    };

    await encryptFields('Lead', data);

    expect(data.clientPanNumber).toBe(existingCiphertext);
    expect(encryptForGPSIndia).not.toHaveBeenCalled();
  });

  it('rejects partner-scoped encryption without a partnerOrgId', async () => {
    await expect(
      encryptFields('PartnerData', {
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
        fullName: `enc:v1:${encode('Jane Doe')}`,
      })
    ).rejects.toThrow('partnerOrgId is required to encrypt or decrypt PartnerData fields');
  });

  it('decrypts encrypted auth hashes back to stable plaintext', async () => {
    const user = {
      refreshToken: `enc:v1:${encode('a'.repeat(64))}`,
    };

    await decryptResultWithBridge('User', user);

    expect(user.refreshToken).toBe('a'.repeat(64));
  });
});

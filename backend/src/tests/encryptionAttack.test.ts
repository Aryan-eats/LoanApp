import { beforeEach, describe, expect, it } from 'vitest';

import {
  decryptResultWithBridge,
  encryptFields,
  encryptWhere,
} from '../utils/fieldEncryption.js';
import { encryptField, encryptForGPSIndia } from '../shared/security/encryption.js';

const TEST_FIELD_KEY = Buffer.alloc(32, 7).toString('base64');

describe('field encryption guardrails', () => {
  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_FIELD_KEY;
  });

  it('does not double-encrypt existing encrypted payloads', async () => {
    const existingCiphertext = await encryptForGPSIndia('ABCDE1234F');
    const data: Record<string, unknown> = {
      clientPanNumber: existingCiphertext,
    };

    await encryptFields('Lead', data);

    expect(data.clientPanNumber).toBe(existingCiphertext);
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
        fullName: await encryptField('partner-org-1', 'Jane Doe'),
      })
    ).rejects.toThrow('partnerOrgId is required to encrypt or decrypt PartnerData fields');
  });

  it('decrypts encrypted auth hashes back to stable plaintext', async () => {
    const user = {
      refreshToken: await encryptForGPSIndia('a'.repeat(64)),
    };

    await decryptResultWithBridge('User', user);

    expect(user.refreshToken).toBe('a'.repeat(64));
  });
});

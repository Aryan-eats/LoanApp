import { beforeEach, describe, expect, it, vi } from 'vitest';

const partnerDataFindFirst = vi.fn();

vi.mock('../shared/db/prisma.js', () => ({
  default: {
    partnerData: { findFirst: partnerDataFindFirst },
  },
}));

vi.mock('../shared/security/encryption.js', () => ({
  decryptField: vi.fn(),
  encryptForGPSIndia: vi.fn(),
  isEncryptedCiphertext: vi.fn(),
}));

vi.mock('../modules/leads/lead.helpers.js', () => ({
  getNextGpsifsLeadId: vi.fn(),
}));

vi.mock('../shared/security/fieldEncryption.js', () => ({
  decryptResultWithBridge: vi.fn(),
}));

const { grantAccess } = await import('../modules/partner-data/consent.service.js');

describe('consent tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    partnerDataFindFirst.mockResolvedValue(null);
  });

  it('resolves a stored client by organization rather than creator user', async () => {
    await expect(
      grantAccess({
        partnerDataId: '33333333-3333-4333-8333-333333333333',
        partnerId: '11111111-1111-4111-8111-111111111111',
        partnerOrgId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        submittedBy: '11111111-1111-4111-8111-111111111111',
      }),
    ).rejects.toThrow('Stored client not found');

    expect(partnerDataFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: '33333333-3333-4333-8333-333333333333',
          partnerOrgId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        },
      }),
    );
  });
});

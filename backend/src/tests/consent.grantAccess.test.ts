import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  txMock,
  decryptFieldMock,
  encryptForGPSIndiaMock,
  getNextGpsifsLeadIdMock,
} = vi.hoisted(() => ({
  prismaMock: {
    partnerData: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    lead: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  txMock: {
    lead: { create: vi.fn() },
    $queryRaw: vi.fn(),
    submissionEvent: { create: vi.fn() },
    partnerData: { update: vi.fn() },
  },
  decryptFieldMock: vi.fn(),
  encryptForGPSIndiaMock: vi.fn(),
  getNextGpsifsLeadIdMock: vi.fn(),
}));

vi.mock('../config/prisma.js', () => ({
  default: prismaMock,
}));

vi.mock('../services/vault.js', () => ({
  decryptField: decryptFieldMock,
  encryptForGPSIndia: encryptForGPSIndiaMock,
  isVaultCiphertext: (value: string) => value.startsWith('vault:v1:'),
}));

vi.mock('../utils/leadId.js', () => ({
  getNextGpsifsLeadId: getNextGpsifsLeadIdMock,
}));

import { grantAccess } from '../services/consent.js';

describe('consent.grantAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.partnerData.findFirst.mockResolvedValue({
      id: 'stored-1',
      partnerId: 'user-1',
      partnerOrgId: 'org-1',
      fullName: 'vault:v1:partner:full-name',
      phone: 'vault:v1:partner:phone',
      email: 'vault:v1:partner:email',
      dateOfBirth: 'vault:v1:partner:dob',
      panNumber: 'vault:v1:partner:pan',
      loanType: 'home-loan',
      loanAmount: '500000',
      tenure: 24,
      preferredBank: 'Bank A',
      notes: 'priority lead',
      localStatus: 'new',
    });
    prismaMock.user.findUnique.mockResolvedValue({
      firstName: 'Pat',
      lastName: 'Agent',
      email: 'pat@example.com',
    });
    prismaMock.lead.findUnique.mockResolvedValue({
      id: 'GPSIFS000123',
      documents: [],
      timeline: [],
    });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) =>
      callback(txMock)
    );

    txMock.lead.create.mockResolvedValue({ id: 'GPSIFS000123' });
    txMock.$queryRaw.mockResolvedValue([{ id: 'grant-1' }]);
    txMock.submissionEvent.create.mockResolvedValue({});
    txMock.partnerData.update.mockResolvedValue({});

    const decryptMap = new Map([
      ['vault:v1:partner:full-name', 'Jane Doe'],
      ['vault:v1:partner:phone', '9999999999'],
      ['vault:v1:partner:email', 'jane@example.com'],
      ['vault:v1:partner:dob', '1990-01-01'],
      ['vault:v1:partner:pan', 'ABCDE1234F'],
    ]);

    decryptFieldMock.mockImplementation(async (_partnerOrgId: string, value: string) => {
      const decrypted = decryptMap.get(value);
      if (!decrypted) {
        throw new Error(`Unexpected ciphertext: ${value}`);
      }
      return decrypted;
    });
    encryptForGPSIndiaMock.mockImplementation(async (value: string) => `vault:v1:gps:${value}`);
    getNextGpsifsLeadIdMock.mockResolvedValue('GPSIFS000123');
  });

  it('creates Lead, ConsentGrant, and SubmissionEvent for stored-client submission', async () => {
    const result = await grantAccess({
      partnerDataId: 'stored-1',
      partnerId: 'user-1',
      partnerOrgId: 'org-1',
      submittedBy: 'user-1',
      grantedTo: 'gps_india',
      expiresAt: null,
    });

    expect(decryptFieldMock).toHaveBeenCalledWith('org-1', 'vault:v1:partner:full-name');
    expect(decryptFieldMock).toHaveBeenCalledWith('org-1', 'vault:v1:partner:phone');
    expect(encryptForGPSIndiaMock).toHaveBeenCalledWith('Jane Doe');
    expect(encryptForGPSIndiaMock).toHaveBeenCalledWith('9999999999');
    expect(txMock.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'GPSIFS000123',
          clientFullName: 'vault:v1:gps:Jane Doe',
          clientPhone: 'vault:v1:gps:9999999999',
          clientEmail: 'vault:v1:gps:jane@example.com',
          clientDateOfBirth: 'vault:v1:gps:1990-01-01',
          clientPanNumber: 'vault:v1:gps:ABCDE1234F',
          sourcePartnerDataId: 'stored-1',
          partnerId: 'user-1',
          partnerOrgId: 'org-1',
          encryptionVersion: 1,
        }),
      })
    );
    expect(txMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(txMock.submissionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'GPSIFS000123',
          partnerOrgId: 'org-1',
          changeSource: 'consent_submit',
        }),
      })
    );
    expect(txMock.partnerData.update).toHaveBeenCalledWith({
      where: { id: 'stored-1' },
      data: { localStatus: 'processing' },
    });
    expect(prismaMock.lead.findUnique).toHaveBeenCalledWith({
      where: { id: 'GPSIFS000123' },
      include: { documents: true, timeline: true },
    });
    expect(result).toEqual({
      id: 'GPSIFS000123',
      documents: [],
      timeline: [],
    });
  });
});

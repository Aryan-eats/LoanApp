import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    partnerData: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../config/prisma.js', () => ({
  default: prismaMock,
}));

vi.mock('../services/consent.js', () => ({
  grantAccess: vi.fn(),
  canViewLeadPII: vi.fn(),
}));

vi.mock('../utils/auditLogger.js', () => ({
  logAuditEvent: vi.fn(),
}));

import { getStoredClients } from '../controllers/partnerDataController.js';
import { formatLeadResponse } from '../utils/leadHelpers.js';

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('partner CRM identity and metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds canonical customer identity and CRM metadata to stored client responses', async () => {
    prismaMock.partnerData.findMany.mockResolvedValue([
      {
        id: 'stored-1',
        partnerId: 'partner-1',
        partnerOrgId: 'org-1',
        localStatus: 'new',
        notes: 'priority',
        fullName: 'Asha Kumar',
        phone: '9999999999',
        email: 'asha@example.com',
        dateOfBirth: '1990-01-01',
        gender: null,
        panNumber: 'ABCDE1234F',
        employmentType: 'salaried',
        monthlyIncome: '75000',
        companyName: 'Acme',
        designation: null,
        workExperience: null,
        city: 'Mumbai',
        pincode: '400001',
        state: null,
        currentAddress: null,
        residenceType: null,
        loanCategory: 'home',
        loanType: 'home_loan',
        loanAmount: '500000',
        tenure: 60,
        loanPurpose: null,
        preferredBank: null,
        encryptionVersion: 1,
        createdAt: new Date('2026-03-30T10:00:00.000Z'),
        updatedAt: new Date('2026-03-30T10:00:00.000Z'),
        documents: [],
      },
    ] as any);

    const req = { user: { id: 'partner-1' } } as any;
    const res = createResponse();

    await getStoredClients(req, res as any);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data[0].customerId).toBe('stored-1');
    expect(payload.data[0].customerKey).toBeDefined();
    expect(payload.data[0].leadSource).toBe('manual');
    expect(payload.data[0].leadScore).toEqual(expect.any(Number));
    expect(payload.data[0].scoreBand).toMatch(/^(low|medium|high)$/);
    expect(payload.data[0].consentSummary).toEqual(
      expect.objectContaining({
        consented: expect.any(Boolean),
      })
    );
  });

  it('adds canonical customer identity and CRM metadata to lead responses', () => {
    const response = formatLeadResponse({
      id: 'lead-1',
      clientFullName: 'Asha Kumar',
      clientPhone: '9999999999',
      clientEmail: 'asha@example.com',
      clientDateOfBirth: '1990-01-01',
      clientPanNumber: 'ABCDE1234F',
      clientAadhaar: null,
      clientEmployment: 'salaried',
      clientIncome: '75000',
      clientCompany: 'Acme',
      clientExperience: 5,
      clientCity: 'Mumbai',
      clientPincode: '400001',
      loanType: 'home_loan',
      loanAmount: '500000',
      tenure: 60,
      sanctionedAmount: null,
      disbursedAmount: null,
      interestRate: null,
      emi: null,
      status: 'submitted',
      bankAssigned: null,
      bankCode: null,
      bankLogo: null,
      preferredBank: null,
      partnerId: 'partner-1',
      partnerName: 'Partner One',
      sourcePartnerDataId: 'stored-1',
      isEligible: null,
      maxLoanAmount: null,
      minLoanAmount: null,
      estimatedEMI: null,
      eligibilityCheckedAt: null,
      commissionAmount: null,
      commissionRate: null,
      commissionStatus: null,
      commissionPaidAt: null,
      documents: [],
      timeline: [],
      createdAt: new Date('2026-03-30T10:00:00.000Z'),
      updatedAt: new Date('2026-03-30T10:00:00.000Z'),
    } as any);

    expect(response.customerId).toBe('stored-1');
    expect(response.customerKey).toBeDefined();
    expect(response.leadSource).toBe('stored_client');
    expect(response.leadScore).toEqual(expect.any(Number));
    expect(response.scoreBand).toMatch(/^(low|medium|high)$/);
    expect(response.consentSummary).toEqual(
      expect.objectContaining({
        consented: expect.any(Boolean),
      })
    );
    expect(response.client.id).toBe(response.customerId);
  });
});

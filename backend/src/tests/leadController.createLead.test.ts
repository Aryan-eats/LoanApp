import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  grantAccessMock,
  logAuditEventMock,
  cacheDeleteMock,
} = vi.hoisted(() => ({
  prismaMock: {
    partnerData: {
      create: vi.fn(),
    },
    lead: {
      create: vi.fn(),
    },
  },
  grantAccessMock: vi.fn(),
  logAuditEventMock: vi.fn(),
  cacheDeleteMock: vi.fn(),
}));

vi.mock('../config/prisma.js', () => ({
  default: prismaMock,
  basePrisma: {},
}));

vi.mock('../services/consent.js', () => ({
  canViewLeadPII: vi.fn(),
  grantAccess: grantAccessMock,
}));

vi.mock('../utils/cache.js', () => ({
  cacheWrap: vi.fn(),
  cacheDelete: cacheDeleteMock,
}));

vi.mock('../utils/auditLogger.js', () => ({
  logAuditEvent: logAuditEventMock,
}));

vi.mock('../utils/leadHelpers.js', () => ({
  formatLeadResponse: vi.fn((lead) => lead),
}));

vi.mock('../data/loanDocsMap.js', () => ({
  getRequiredDocTypes: vi.fn(() => []),
}));

vi.mock('../utils/leadId.js', () => ({
  getNextGpsifsLeadId: vi.fn(),
}));

import { createLead } from '../controllers/leadController.js';

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('leadController.createLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logAuditEventMock.mockResolvedValue(undefined);
    cacheDeleteMock.mockResolvedValue(undefined);
  });

  it('routes partner lead creation through stored-client consent handoff', async () => {
    prismaMock.partnerData.create.mockResolvedValue({ id: 'stored-1' });
    grantAccessMock.mockResolvedValue({
      id: 'GPSIFS001',
      clientFullName: 'Alice Applicant',
      clientPhone: '9999999999',
      clientEmail: 'alice@example.com',
      clientDateOfBirth: '1990-01-01',
      clientPanNumber: 'ABCDE1234F',
      clientAadhaar: null,
      clientEmployment: 'salaried',
      clientIncome: 50000,
      clientCompany: 'Acme',
      clientExperience: 4,
      clientCity: 'Mumbai',
      clientPincode: '400001',
      loanType: 'home_loan',
      loanAmount: 500000,
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
      partnerId: 'user-1',
      partnerName: 'Pat Ner',
      isEligible: null,
      maxLoanAmount: null,
      minLoanAmount: null,
      estimatedEMI: null,
      eligibilityCheckedAt: null,
      commissionAmount: null,
      commissionRate: null,
      commissionStatus: null,
      commissionPaidAt: null,
      createdAt: new Date('2026-03-26T00:00:00.000Z'),
      updatedAt: new Date('2026-03-26T00:00:00.000Z'),
      documents: [],
      timeline: [],
    });

    const req = {
      body: {
        fullName: 'Alice Applicant',
        phone: '9999999999',
        email: 'alice@example.com',
        dateOfBirth: '1990-01-01',
        panNumber: 'ABCDE1234F',
        employmentType: 'salaried',
        monthlyIncome: '50000',
        companyName: 'Acme',
        loanType: 'home_loan',
        loanAmount: '500000',
      },
      user: {
        id: 'user-1',
        role: 'partner',
        firstName: 'Pat',
        lastName: 'Ner',
        email: 'partner@example.com',
      },
      partnerOrgId: 'org-1',
    } as any;
    const res = createResponse();

    await createLead(req, res as any);

    expect(prismaMock.partnerData.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partnerId: 'user-1',
          partnerOrgId: 'org-1',
          fullName: 'Alice Applicant',
          phone: '9999999999',
          encryptionVersion: 1,
        }),
      })
    );
    expect(grantAccessMock).toHaveBeenCalledWith({
      partnerDataId: 'stored-1',
      partnerId: 'user-1',
      partnerOrgId: 'org-1',
      submittedBy: 'user-1',
    });
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects partner lead creation when the partner organisation is missing', async () => {
    const req = {
      body: {
        fullName: 'Alice Applicant',
        phone: '9999999999',
        loanType: 'home_loan',
        loanAmount: '500000',
      },
      user: {
        id: 'user-1',
        role: 'partner',
        firstName: 'Pat',
        lastName: 'Ner',
        email: 'partner@example.com',
      },
      partnerOrgId: undefined,
    } as any;
    const res = createResponse();

    await createLead(req, res as any);

    expect(prismaMock.partnerData.create).not.toHaveBeenCalled();
    expect(grantAccessMock).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
    expect(cacheDeleteMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Partner organisation not resolved',
    });
  });

  it('rejects loan amounts below the minimum threshold before persisting partner data', async () => {
    const req = {
      body: {
        fullName: 'Alice Applicant',
        phone: '9999999999',
        loanType: 'home_loan',
        loanAmount: '9000',
      },
      user: {
        id: 'user-1',
        role: 'partner',
        firstName: 'Pat',
        lastName: 'Ner',
        email: 'partner@example.com',
      },
      partnerOrgId: 'org-1',
    } as any;
    const res = createResponse();

    await createLead(req, res as any);

    expect(prismaMock.partnerData.create).not.toHaveBeenCalled();
    expect(grantAccessMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Loan amount must be at least ₹10,000',
    });
  });
});

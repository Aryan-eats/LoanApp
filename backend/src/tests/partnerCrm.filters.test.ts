import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  canViewLeadPIIMock,
} = vi.hoisted(() => ({
  prismaMock: {
    partnerData: {
      findMany: vi.fn(),
    },
    lead: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
  canViewLeadPIIMock: vi.fn(),
}));

vi.mock('../config/prisma.js', () => ({
  default: prismaMock,
  basePrisma: {},
}));

vi.mock('../services/consent.js', () => ({
  canViewLeadPII: canViewLeadPIIMock,
}));

vi.mock('../utils/cache.js', () => ({
  cacheWrap: vi.fn(),
  cacheDelete: vi.fn(),
}));

vi.mock('../utils/auditLogger.js', () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock('../services/consent.js', () => ({
  canViewLeadPII: canViewLeadPIIMock,
  grantAccess: vi.fn(),
}));

import { getLeads } from '../controllers/leadController.js';
import * as partnerDataController from '../controllers/partnerDataController.js';

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('partner CRM filtering and customer endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters partner leads by source, score band, and customer search', async () => {
    prismaMock.lead.findMany.mockResolvedValue([
      {
        id: 'lead-1',
        clientFullName: 'Asha Kumar',
        clientPhone: '9999999999',
        clientEmail: 'asha@example.com',
        clientDateOfBirth: null,
        clientPanNumber: 'ABCDE1234F',
        clientAadhaar: null,
        clientEmployment: 'salaried',
        clientIncome: '85000',
        clientCompany: 'Acme',
        clientExperience: 5,
        clientCity: 'Mumbai',
        clientPincode: '400001',
        loanType: 'home_loan',
        loanAmount: '500000',
        tenure: 60,
        status: 'submitted',
        bankAssigned: null,
        bankCode: null,
        bankLogo: null,
        preferredBank: null,
        partnerId: 'partner-1',
        partnerName: 'Partner One',
        sourcePartnerDataId: 'stored-1',
        documents: [],
        timeline: [],
      },
      {
        id: 'lead-2',
        clientFullName: 'Ravi Verma',
        clientPhone: '8888888888',
        clientEmail: 'ravi@example.com',
        clientDateOfBirth: null,
        clientPanNumber: null,
        clientAadhaar: null,
        clientEmployment: null,
        clientIncome: null,
        clientCompany: null,
        clientExperience: null,
        clientCity: 'Delhi',
        clientPincode: '110001',
        loanType: 'home_loan',
        loanAmount: '250000',
        tenure: 48,
        status: 'submitted',
        bankAssigned: null,
        bankCode: null,
        bankLogo: null,
        preferredBank: null,
        partnerId: 'partner-1',
        partnerName: 'Partner One',
        sourcePartnerDataId: null,
        documents: [],
        timeline: [],
      },
    ] as any);
    prismaMock.lead.count.mockResolvedValue(2);

    const req = {
      query: {
        source: 'stored_client',
        scoreBand: 'high',
        customerSearch: 'asha',
      },
      user: { id: 'partner-1', role: 'partner' },
    } as any;
    const res = createResponse();

    await getLeads(req, res as any);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.leads).toHaveLength(1);
    expect(payload.data.leads[0].id).toBe('lead-1');
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ partnerId: 'partner-1' }),
      })
    );
  });

  it('returns a merged customer detail view and activity feed', async () => {
    const getCustomerDetail = (partnerDataController as any).getPartnerCustomerById;
    const getCustomerActivity = (partnerDataController as any).getPartnerCustomerActivity;

    prismaMock.partnerData = {
      findMany: vi.fn().mockResolvedValue([
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
          monthlyIncome: '85000',
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
          consentGrants: [],
        },
      ]),
    } as any;
    prismaMock.lead.findMany.mockResolvedValue([
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
        monthlyIncome: '85000',
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
        consentGrants: [],
      },
    ] as any);

    const req = {
      params: { id: 'stored-1' },
      user: { id: 'partner-1', role: 'partner' },
      query: {},
    } as any;
    const res = createResponse();

    await expect(getCustomerDetail(req, res as any)).resolves.toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.customer.customerId).toBe('stored-1');
    expect(res.json.mock.calls[0][0].data.customer.activity).toEqual(expect.any(Array));

    const activityRes = createResponse();
    await expect(getCustomerActivity(req, activityRes as any)).resolves.toBeUndefined();
    expect(activityRes.status).toHaveBeenCalledWith(200);
    expect(activityRes.json.mock.calls[0][0].data.activity).toEqual(expect.any(Array));
  });
});

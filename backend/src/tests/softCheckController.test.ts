import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runPartnerSoftCheck } from '../modules/soft-check/softCheck.controller.js';

const { prismaMock, logAuditEventMock, getSoftCheckConfigurationMock } = vi.hoisted(() => ({
  prismaMock: {
    bank: { findMany: vi.fn() },
    partnerData: { findFirst: vi.fn() },
    lead: { findFirst: vi.fn(), update: vi.fn() },
  },
  logAuditEventMock: vi.fn(),
  getSoftCheckConfigurationMock: vi.fn(),
}));

vi.mock('../shared/db/prisma.js', () => ({
  default: prismaMock,
}));

vi.mock('../modules/audit/auditLogger.js', () => ({
  logAuditEvent: logAuditEventMock,
}));

vi.mock('../modules/soft-check/softCheckRepository.js', () => ({
  getSoftCheckConfiguration: getSoftCheckConfigurationMock,
}));

const response = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

const req = (body: Record<string, unknown>) =>
  ({
    user: { id: 'user-1' },
    partnerOrgId: 'partner-1',
    body,
  }) as any;

describe('runPartnerSoftCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.partnerData.findFirst.mockResolvedValue(null);
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.lead.update.mockResolvedValue({});
    getSoftCheckConfigurationMock.mockResolvedValue(null);
    prismaMock.bank.findMany.mockResolvedValue([
      {
        id: 'bank-1',
        name: 'HDFC Bank',
        code: 'HDFC',
        logo: null,
        status: 'active',
        supportedLoanTypes: ['personal_loan'],
        interestRateMin: 10,
        interestRateMax: 12,
        processingFee: '1%',
        maxTenure: 60,
        minAmount: 50_000,
        maxAmount: 1_000_000,
        processingTime: '3 days',
        isPopular: true,
        features: ['Fast approval'],
      },
    ]);
  });

  it('rejects missing consent', async () => {
    const res = response();

    await runPartnerSoftCheck(
      req({
        fullName: 'Ravi Sharma',
        phone: '9876543210',
        monthlyIncome: 75_000,
        employmentType: 'salaried',
        loanType: 'personal_loan',
        loanAmount: 500_000,
        consentCredit: false,
      }),
      res as any
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Soft check consent is required',
    });
  });

  it('returns a softcheck result for valid raw input', async () => {
    const res = response();

    await runPartnerSoftCheck(
      req({
        fullName: 'Ravi Sharma',
        phone: '9876543210',
        monthlyIncome: 75_000,
        existingEMI: 10_000,
        employmentType: 'salaried',
        loanType: 'personal_loan',
        loanAmount: 500_000,
        consentCredit: true,
      }),
      res as any
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ checkType: 'soft', creditImpact: 'none' }),
      })
    );
    expect(logAuditEventMock).toHaveBeenCalledWith(
      'LEAD_UPDATED',
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({ action: 'soft_check', creditImpact: 'none' }),
      })
    );
  });

  it('scopes stored client and lead lookups to the resolved partner organization', async () => {
    const res = response();
    prismaMock.partnerData.findFirst.mockResolvedValue(null);
    prismaMock.lead.findFirst.mockResolvedValue(null);

    await runPartnerSoftCheck(
      req({
        storedClientId: 'stored-client-1',
        leadId: 'lead-1',
        consentCredit: true,
      }),
      res as any
    );

    expect(prismaMock.partnerData.findFirst).toHaveBeenCalledWith({
      where: { id: 'stored-client-1', partnerOrgId: 'partner-1' },
    });
    expect(prismaMock.lead.findFirst).toHaveBeenCalledWith({
      where: { id: 'lead-1', partnerOrgId: 'partner-1' },
    });
  });

  it('uses lead data before raw request data and persists the five legacy eligibility columns', async () => {
    const res = response();
    prismaMock.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      clientFullName: 'Lead Client',
      clientPhone: '9876543210',
      clientIncome: 75_000,
      clientEmployment: 'salaried',
      loanType: 'personal_loan',
      loanAmount: 500_000,
      tenure: 60,
    });

    await runPartnerSoftCheck(
      req({
        leadId: 'lead-1',
        fullName: 'Raw Client',
        phone: '9999999999',
        monthlyIncome: 10_000,
        employmentType: 'salaried',
        loanType: 'personal_loan',
        loanAmount: 900_000,
        consentCredit: true,
      }),
      res as any
    );

    expect(prismaMock.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: {
        isEligible: true,
        maxLoanAmount: 1_350_000,
        minLoanAmount: 50_000,
        estimatedEMI: 11_122,
        eligibilityCheckedAt: expect.any(Date),
      },
    });
  });

  it('uses stored client data before lead and raw request data', async () => {
    const res = response();
    prismaMock.partnerData.findFirst.mockResolvedValue({
      id: 'stored-client-1',
      fullName: 'Stored Client',
      phone: '9876543210',
      monthlyIncome: 100_000,
      employmentType: 'salaried',
      loanType: 'personal_loan',
      loanAmount: 500_000,
      tenure: 60,
      loanPurpose: 'working_capital',
      residenceType: 'owned',
    });
    prismaMock.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      clientFullName: 'Lead Client',
      clientPhone: '9999999999',
      clientIncome: 20_000,
      clientEmployment: 'salaried',
      loanType: 'personal_loan',
      loanAmount: 900_000,
      tenure: 12,
    });

    await runPartnerSoftCheck(
      req({
        storedClientId: 'stored-client-1',
        leadId: 'lead-1',
        monthlyIncome: 10_000,
        loanAmount: 900_000,
        consentCredit: true,
      }),
      res as any
    );

    expect(prismaMock.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: expect.objectContaining({
        isEligible: true,
        maxLoanAmount: 1_800_000,
        minLoanAmount: 50_000,
        estimatedEMI: 11_122,
      }),
    });
  });

  it('returns additive V2 fields when an active rule configuration exists', async () => {
    getSoftCheckConfigurationMock.mockResolvedValue({
      productId: 'product-1',
      ruleSetId: 'ruleset-1',
      ruleSetVersion: 1,
      configHash: 'hash-1',
      lenders: [{
        id: 'bank-1',
        code: 'HDFC',
        name: 'HDFC Bank',
        productCode: 'personal_loan',
        ticketMin: 50_000,
        ticketMax: 1_000_000,
        rateMin: 10,
        rateMax: 12,
        tenureMinMonths: 12,
        tenureMaxMonths: 60,
      }],
      rules: [{
        id: 'rule-1',
        ruleCode: 'PL_MAX_FOIR',
        name: 'Maximum FOIR',
        productCode: 'personal_loan',
        fieldPath: 'derived.foirPercent',
        operator: 'LTE',
        threshold: 50,
        severity: 'HARD_FAIL',
        priority: 1,
        regulatoryClass: 'LENDER_VARIABLE',
        confidenceWeight: 2,
      }],
    });
    const res = response();

    await runPartnerSoftCheck(
      req({
        fullName: 'Ravi Sharma',
        phone: '9876543210',
        monthlyIncome: 75_000,
        existingEMI: 10_000,
        employmentType: 'salaried',
        loanType: 'personal_loan',
        loanAmount: 500_000,
        requestedTenureMonths: 60,
        age: 35,
        consentCredit: true,
      }),
      res as any
    );

    expect(getSoftCheckConfigurationMock).toHaveBeenCalledWith('personal_loan');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        schemaVersion: '2.0',
        ruleConfigReleaseId: 'ruleset-1',
        eligibilityStatus: 'ELIGIBLE',
      }),
    }));
  });
});

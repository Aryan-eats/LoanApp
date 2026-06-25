import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runPartnerSoftCheck } from '../modules/soft-check/softCheck.controller.js';

const { prismaMock, logAuditEventMock } = vi.hoisted(() => ({
  prismaMock: {
    bank: { findMany: vi.fn() },
    partnerData: { findFirst: vi.fn() },
    lead: { findFirst: vi.fn(), update: vi.fn() },
  },
  logAuditEventMock: vi.fn(),
}));

vi.mock('../shared/db/prisma.js', () => ({
  default: prismaMock,
}));

vi.mock('../modules/audit/auditLogger.js', () => ({
  logAuditEvent: logAuditEventMock,
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
});

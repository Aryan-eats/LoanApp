import { Decimal } from '@prisma/client/runtime/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();

vi.mock('../config/prisma.js', () => ({
  basePrisma: {
    bank: { findMany },
  },
}));

const { matchLeadOffers } = await import('../services/bankMatchingService.js');

const bank = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Fast Bank',
  code: 'FAST',
  logo: null,
  status: 'active',
  supportedLoanTypes: ['personal_loan'],
  interestRateMin: new Decimal(10),
  interestRateMax: new Decimal(12),
  processingFee: '1%',
  maxTenure: 60,
  minAmount: new Decimal(100000),
  maxAmount: new Decimal(1000000),
  processingTime: '2 days',
  isPopular: true,
  features: [],
  avgTat: 2,
  activeLeads: 0,
  approvalRate: 0,
  totalDisbursed: '0',
  contactPerson: 'Test',
  contactEmail: 'test@example.test',
  contactPhone: '9000000000',
  createdAt: new Date(),
  updatedAt: new Date(),
  commissionRates: [{ loanType: 'personal_loan' }],
};

describe('bank matching service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([bank]);
  });

  it('reuses active bank data for repeated matches of the same loan type', async () => {
    await matchLeadOffers({ loanType: 'personal_loan', loanAmount: 500000 });
    await matchLeadOffers({ loanType: 'personal_loan', loanAmount: 600000 });

    expect(findMany).toHaveBeenCalledTimes(1);
  });
});

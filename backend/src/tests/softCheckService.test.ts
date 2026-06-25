import { describe, expect, it } from 'vitest';
import { runSoftCheck, type SoftCheckBank } from '../modules/soft-check/softCheck.service.js';

const banks: SoftCheckBank[] = [
  {
    id: 'bank-1',
    name: 'HDFC Bank',
    code: 'HDFC',
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
  {
    id: 'bank-2',
    name: 'Closed Bank',
    code: 'CLOSED',
    status: 'inactive',
    supportedLoanTypes: ['personal_loan'],
    interestRateMin: 9,
    interestRateMax: 11,
    processingFee: '1%',
    maxTenure: 60,
    minAmount: 50_000,
    maxAmount: 1_000_000,
    processingTime: '3 days',
    isPopular: false,
    features: [],
  },
];

describe('runSoftCheck', () => {
  it('rejects checks without explicit credit consent', () => {
    expect(() =>
      runSoftCheck({
        input: {
          fullName: 'Ravi Sharma',
          phone: '9876543210',
          monthlyIncome: 75_000,
          existingEMI: 10_000,
          employmentType: 'salaried',
          loanType: 'personal_loan',
          loanAmount: 500_000,
          consentCredit: false,
        },
        banks,
      })
    ).toThrow('Soft check consent is required');
  });

  it('returns eligible offers without inactive banks', () => {
    const result = runSoftCheck({
      input: {
        fullName: 'Ravi Sharma',
        phone: '9876543210',
        monthlyIncome: 75_000,
        existingEMI: 10_000,
        employmentType: 'salaried',
        loanType: 'personal_loan',
        loanAmount: 500_000,
        consentCredit: true,
      },
      banks,
    });

    expect(result.checkType).toBe('soft');
    expect(result.creditImpact).toBe('none');
    expect(result.isEligible).toBe(true);
    expect(result.eligibleBanks).toHaveLength(1);
    expect(result.eligibleBanks[0].code).toBe('HDFC');
  });
});

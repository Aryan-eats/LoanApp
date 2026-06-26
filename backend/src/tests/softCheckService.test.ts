import { describe, expect, it } from 'vitest';
import {
  runConfiguredSoftCheck,
  runSoftCheck,
  type SoftCheckBank,
} from '../modules/soft-check/softCheck.service.js';
import legacyResponse from './fixtures/softCheckLegacyResponse.json' with { type: 'json' };

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

  it('preserves the exact legacy calculation contract', () => {
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

    expect(result).toEqual(legacyResponse);
  });

  it('preserves the no-lender legacy response shape', () => {
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
      banks: [],
    });

    expect(result).toEqual(expect.objectContaining({
      checkType: 'soft',
      creditImpact: 'none',
      isEligible: false,
      score: 75,
      maxLoanAmount: 990_000,
      minLoanAmount: 0,
      estimatedEMI: 11_122,
      eligibleBanks: [],
      disclaimer: legacyResponse.disclaimer,
    }));
    expect(result.factors.at(-1)).toEqual(expect.objectContaining({
      factor: 'Bank Fit',
      status: 'negative',
    }));
  });

  it('adds the configured engine result without removing legacy fields', () => {
    const result = runConfiguredSoftCheck({
      input: {
        fullName: 'Ravi Sharma',
        phone: '9876543210',
        monthlyIncome: 75_000,
        existingEMI: 10_000,
        employmentType: 'salaried',
        loanType: 'personal_loan',
        loanAmount: 500_000,
        consentCredit: true,
        age: 35,
        requestedTenureMonths: 60,
      },
      banks,
      configuration: {
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
      },
    });

    expect(result).toEqual(expect.objectContaining({
      checkType: 'soft',
      creditImpact: 'none',
      schemaVersion: '2.0',
      eligibilityStatus: 'ELIGIBLE',
      ruleConfigReleaseId: 'ruleset-1',
    }));
    expect(result.matchedLenders).toHaveLength(1);
    expect(result.auditTrail[0]).toEqual(expect.objectContaining({
      ruleCode: 'PL_MAX_FOIR',
      threshold: 50,
    }));
  });

  it('maps V2 ineligibility back into legacy fields consistently', () => {
    const result = runConfiguredSoftCheck({
      input: {
        fullName: 'Ravi Sharma',
        phone: '9876543210',
        monthlyIncome: 75_000,
        existingEMI: 10_000,
        employmentType: 'salaried',
        loanType: 'personal_loan',
        loanAmount: 500_000,
        consentCredit: true,
        age: 35,
        requestedTenureMonths: 60,
      },
      banks,
      configuration: {
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
          threshold: 10,
          severity: 'HARD_FAIL',
          priority: 1,
          regulatoryClass: 'LENDER_VARIABLE',
          confidenceWeight: 2,
        }],
      },
    });

    expect(result.eligibilityStatus).toBe('INELIGIBLE');
    expect(result.isEligible).toBe(false);
    expect(result.eligibleBanks).toEqual([]);
    expect(result.maxLoanAmount).toBe(0);
    expect(result.score).toBe(25);
  });
});

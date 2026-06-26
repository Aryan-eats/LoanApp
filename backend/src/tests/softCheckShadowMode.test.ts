import { describe, expect, it } from 'vitest';
import {
  getSoftCheckEngineMode,
  runSoftCheck,
  runSoftCheckForMode,
  type SoftCheckBank,
  type SoftCheckInput,
} from '../modules/soft-check/softCheck.service.js';
import type { SoftCheckConfiguration } from '../modules/soft-check/softCheckRepository.js';

const input: SoftCheckInput = {
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
};

const banks: SoftCheckBank[] = [{
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
}];

const configuration: SoftCheckConfiguration = {
  productId: 'product-1',
  ruleSetId: 'ruleset-1',
  ruleSetVersion: 7,
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
};

describe('soft check engine mode', () => {
  it('defaults to legacy mode for endpoint safety', () => {
    expect(getSoftCheckEngineMode(undefined)).toBe('legacy');
    expect(getSoftCheckEngineMode('unexpected')).toBe('legacy');
  });

  it('returns the unchanged legacy response in shadow mode while recording non-PII metrics', () => {
    const run = runSoftCheckForMode({
      input,
      banks,
      configuration,
      mode: 'shadow',
    });

    expect(run.response).toEqual(runSoftCheck({ input, banks }));
    expect(run.response).not.toHaveProperty('schemaVersion');
    expect(run.shadowMetrics).toEqual(expect.objectContaining({
      mode: 'shadow',
      failed: false,
      ruleConfigReleaseId: 'ruleset-1',
      ruleConfigVersion: 7,
      ruleConfigHash: 'hash-1',
      legacyEligible: true,
      v2Status: 'ELIGIBLE',
      matchedLenderCount: 1,
    }));
    expect(JSON.stringify(run.shadowMetrics)).not.toContain('Ravi Sharma');
    expect(JSON.stringify(run.shadowMetrics)).not.toContain('9876543210');
  });

  it('does not break legacy response when shadow evaluation fails', () => {
    const run = runSoftCheckForMode({
      input,
      banks,
      configuration: {
        ...configuration,
        rules: [{ ...configuration.rules[0], fieldPath: 'borrower.pan' }],
      },
      mode: 'shadow',
    });

    expect(run.response).toEqual(runSoftCheck({ input, banks }));
    expect(run.shadowMetrics).toEqual(expect.objectContaining({
      failed: true,
      errorCode: 'SOFT_CHECK_SHADOW_EVALUATION_FAILED',
      ruleConfigReleaseId: 'ruleset-1',
      ruleConfigVersion: 7,
    }));
  });

  it('returns additive configured fields only in v2 mode', () => {
    const run = runSoftCheckForMode({
      input,
      banks,
      configuration,
      mode: 'v2',
    });

    expect(run.response).toEqual(expect.objectContaining({
      schemaVersion: '2.0',
      eligibilityStatus: 'ELIGIBLE',
      ruleConfigReleaseId: 'ruleset-1',
    }));
  });
});

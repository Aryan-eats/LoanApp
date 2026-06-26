import { describe, expect, it } from 'vitest';
import {
  evaluateSoftCheck,
  type EligibilityRule,
  type NormalizedSoftCheckInput,
  type SoftCheckLender,
} from '../modules/soft-check/softCheckEngine.js';

const lender: SoftCheckLender = {
  id: 'bank-1',
  code: 'BANK_ONE',
  name: 'Bank One',
  productCode: 'personal_loan',
  ticketMin: 50_000,
  ticketMax: 1_000_000,
  rateMin: 12,
  rateMax: 15,
  tenureMinMonths: 12,
  tenureMaxMonths: 60,
};

const rule: EligibilityRule = {
  id: 'foir',
  ruleCode: 'PL_MAX_FOIR',
  name: 'Maximum FOIR',
  productCode: 'personal_loan',
  fieldPath: 'derived.foirPercent',
  operator: 'LTE',
  threshold: 50,
  severity: 'HARD_FAIL',
  priority: 1,
  regulatoryClass: 'LENDER_VARIABLE',
  confidenceWeight: 3,
};

const input: NormalizedSoftCheckInput = {
  employmentType: 'SALARIED',
  monthlyIncome: 75_000,
  existingEmiObligations: 32_000,
  productCode: 'personal_loan',
  requestedAmount: 200_000,
  requestedTenureMonths: 60,
};

describe('soft-check confidence', () => {
  it('uses the worst critical threshold margin for confidence', () => {
    const result = evaluateSoftCheck({ input, lenders: [lender], rules: [rule] });

    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.confidenceTier).toBe('WEAK');
    expect(result.matchedLenders[0].confidenceTier).toBe('WEAK');
  });

  it('downgrades confidence when matched input is incomplete', () => {
    const result = evaluateSoftCheck({
      input: { ...input, age: undefined },
      lenders: [lender],
      rules: [
        rule,
        {
          id: 'age-warning',
          ruleCode: 'PL_AGE_RECOMMENDED',
          name: 'Age recommended',
          productCode: 'personal_loan',
          fieldPath: 'age',
          operator: 'REQUIRED',
          threshold: true,
          severity: 'WARNING',
          priority: 2,
          regulatoryClass: 'INDUSTRY_CONSENSUS',
          confidenceWeight: 1,
        },
      ],
    });

    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.confidenceTier).toBe('WEAK');
    expect(result.auditTrail).toContainEqual(expect.objectContaining({
      ruleCode: 'PL_AGE_RECOMMENDED',
      outcome: 'WARNING',
    }));
  });
});

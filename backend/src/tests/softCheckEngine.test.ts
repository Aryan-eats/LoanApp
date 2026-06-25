import { describe, expect, it } from 'vitest';
import {
  evaluateSoftCheck,
  type EligibilityRule,
  type NormalizedSoftCheckInput,
  type SoftCheckLender,
} from '../modules/soft-check/softCheckEngine.js';

const input: NormalizedSoftCheckInput = {
  employmentType: 'SALARIED',
  monthlyIncome: 100_000,
  existingEmiObligations: 10_000,
  age: 35,
  productCode: 'personal_loan',
  requestedAmount: 500_000,
  requestedTenureMonths: 60,
  declaredCibilRange: '750_799',
};

const lenders: SoftCheckLender[] = [
  {
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
  },
];

const baseRules: EligibilityRule[] = [
  {
    id: 'rule-income',
    ruleCode: 'PL_MIN_INCOME',
    name: 'Minimum monthly income',
    productCode: 'personal_loan',
    fieldPath: 'monthlyIncome',
    operator: 'GTE',
    threshold: 25_000,
    severity: 'HARD_FAIL',
    priority: 10,
    regulatoryClass: 'LENDER_VARIABLE',
    confidenceWeight: 1,
  },
  {
    id: 'rule-foir',
    ruleCode: 'PL_MAX_FOIR',
    name: 'Maximum FOIR',
    productCode: 'personal_loan',
    fieldPath: 'derived.foirPercent',
    operator: 'LTE',
    threshold: 50,
    severity: 'HARD_FAIL',
    priority: 20,
    regulatoryClass: 'LENDER_VARIABLE',
    confidenceWeight: 2,
  },
];

describe('evaluateSoftCheck', () => {
  it('returns a matched lender with a complete deterministic rule trace', () => {
    const result = evaluateSoftCheck({ input, lenders, rules: baseRules });

    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.matchedLenders).toHaveLength(1);
    expect(result.auditTrail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleCode: 'PL_MIN_INCOME',
          inputValue: 100_000,
          operator: 'GTE',
          threshold: 25_000,
          outcome: 'PASS',
        }),
        expect.objectContaining({
          ruleCode: 'PL_MAX_FOIR',
          operator: 'LTE',
          threshold: 50,
          outcome: 'PASS',
        }),
      ])
    );
  });

  it('does not let a declared CIBIL band override an affordability hard fail', () => {
    const result = evaluateSoftCheck({
      input: { ...input, existingEmiObligations: 60_000 },
      lenders,
      rules: baseRules,
    });

    expect(result.eligibilityStatus).toBe('INELIGIBLE');
    expect(result.disqualifiedLenders[0]).toEqual(
      expect.objectContaining({
        lenderId: 'bank-1',
        ruleCode: 'PL_MAX_FOIR',
      })
    );
  });

  it('returns referral when a required underwriting field is missing', () => {
    const requiredAge: EligibilityRule = {
      id: 'rule-age',
      ruleCode: 'PL_AGE_REQUIRED',
      name: 'Applicant age',
      productCode: 'personal_loan',
      fieldPath: 'age',
      operator: 'REQUIRED',
      threshold: true,
      severity: 'REFER',
      priority: 1,
      regulatoryClass: 'INDUSTRY_CONSENSUS',
      confidenceWeight: 1,
    };

    const result = evaluateSoftCheck({
      input: { ...input, age: undefined },
      lenders,
      rules: [requiredAge, ...baseRules],
    });

    expect(result.eligibilityStatus).toBe('REFER_TO_UNDERWRITER');
    expect(result.borderlineLenders[0].missingFields).toContain('age');
  });

  it('applies a lender-specific overlay without changing the base rule', () => {
    const strictOverlay: EligibilityRule = {
      ...baseRules[1],
      id: 'rule-foir-bank-one',
      lenderId: 'bank-1',
      threshold: 35,
    };

    const result = evaluateSoftCheck({
      input: { ...input, existingEmiObligations: 25_000 },
      lenders,
      rules: [...baseRules, strictOverlay],
    });

    expect(result.eligibilityStatus).toBe('INELIGIBLE');
    expect(result.disqualifiedLenders[0].threshold).toBe(35);
  });

  it('uses product LTV rules for collateral-backed products', () => {
    const homeInput: NormalizedSoftCheckInput = {
      ...input,
      productCode: 'home_loan',
      requestedAmount: 9_500_000,
      propertyValue: 10_000_000,
    };
    const homeLender: SoftCheckLender = {
      ...lenders[0],
      productCode: 'home_loan',
      ticketMax: 20_000_000,
    };
    const ltvRule: EligibilityRule = {
      id: 'rule-ltv',
      ruleCode: 'HL_MAX_LTV',
      name: 'Maximum LTV',
      productCode: 'home_loan',
      fieldPath: 'derived.ltvPercent',
      operator: 'LTE',
      threshold: 90,
      severity: 'HARD_FAIL',
      priority: 1,
      regulatoryClass: 'RBI_REGULATORY',
      confidenceWeight: 3,
    };

    const result = evaluateSoftCheck({
      input: homeInput,
      lenders: [homeLender],
      rules: [ltvRule],
    });

    expect(result.eligibilityStatus).toBe('INELIGIBLE');
    expect(result.disqualifiedLenders[0].inputValue).toBe(95);
  });

  it('applies only the rule whose configured amount condition matches', () => {
    const homeInput: NormalizedSoftCheckInput = {
      ...input,
      productCode: 'home_loan',
      requestedAmount: 2_000_000,
      propertyValue: 2_300_000,
    };
    const homeLender: SoftCheckLender = {
      ...lenders[0],
      productCode: 'home_loan',
      ticketMax: 20_000_000,
    };
    const rules: EligibilityRule[] = [
      {
        id: 'ltv-small',
        ruleCode: 'HL_LTV_SMALL',
        name: 'Small housing loan LTV',
        productCode: 'home_loan',
        fieldPath: 'derived.ltvPercent',
        operator: 'LTE',
        threshold: 90,
        conditions: [{ fieldPath: 'requestedAmount', operator: 'LTE', threshold: 3_000_000 }],
        severity: 'HARD_FAIL',
        priority: 1,
        regulatoryClass: 'RBI_REGULATORY',
        confidenceWeight: 3,
      },
      {
        id: 'ltv-large',
        ruleCode: 'HL_LTV_LARGE',
        name: 'Large housing loan LTV',
        productCode: 'home_loan',
        fieldPath: 'derived.ltvPercent',
        operator: 'LTE',
        threshold: 75,
        conditions: [{ fieldPath: 'requestedAmount', operator: 'GT', threshold: 7_500_000 }],
        severity: 'HARD_FAIL',
        priority: 2,
        regulatoryClass: 'RBI_REGULATORY',
        confidenceWeight: 3,
      },
    ];

    const result = evaluateSoftCheck({ input: homeInput, lenders: [homeLender], rules });

    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.auditTrail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleCode: 'HL_LTV_SMALL', outcome: 'PASS' }),
        expect.objectContaining({ ruleCode: 'HL_LTV_LARGE', outcome: 'NOT_APPLICABLE' }),
      ])
    );
  });

  it('distinguishes an empty lender panel from borrower ineligibility', () => {
    const result = evaluateSoftCheck({ input, lenders: [], rules: baseRules });

    expect(result.eligibilityStatus).toBe('REFER_TO_UNDERWRITER');
    expect(result.reasonCode).toBe('NO_LENDER_PANEL_MATCH');
  });
});

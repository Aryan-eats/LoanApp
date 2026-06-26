import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirst = vi.fn();

vi.mock('../shared/db/prisma.js', () => ({
  default: {
    loanProduct: { findFirst },
  },
}));

const { getSoftCheckConfiguration } = await import('../modules/soft-check/softCheckRepository.js');

describe('getSoftCheckConfiguration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no active product release exists', async () => {
    findFirst.mockResolvedValue(null);
    await expect(getSoftCheckConfiguration('personal_loan')).resolves.toBeNull();
  });

  it('maps the active rule release, lender matrix, and approved overrides', async () => {
    findFirst.mockResolvedValue({
      id: 'product-1',
      code: 'personal_loan',
      ruleSets: [{
        id: 'ruleset-1',
        version: 1,
        configHash: 'hash-1',
        rules: [{
          id: 'rule-1',
          ruleCode: 'PL_MAX_FOIR',
          name: 'Maximum FOIR',
          fieldPath: 'derived.foirPercent',
          operator: 'LTE',
          threshold: 50,
          conditions: null,
          employmentScopes: ['SALARIED'],
          severity: 'HARD_FAIL',
          priority: 1,
          regulatoryClass: 'LENDER_VARIABLE',
          confidenceWeight: { toString: () => '2' },
          reasonTemplate: null,
          suggestionTemplate: null,
        }],
        overrides: [{
          id: 'override-1',
          bankId: 'bank-1',
          ruleCode: 'PL_MAX_FOIR',
          overrideMode: 'TIGHTEN',
          operator: 'LTE',
          threshold: 45,
          conditions: null,
          employmentScopes: ['SALARIED'],
          severity: 'HARD_FAIL',
          priority: 1,
          regulatoryClass: 'LENDER_VARIABLE',
          confidenceWeight: { toString: () => '2' },
          reasonTemplate: null,
          suggestionTemplate: null,
        }],
      }],
      lenderEligibility: [{
        bankId: 'bank-1',
        ticketMin: { toString: () => '50000' },
        ticketMax: { toString: () => '1000000' },
        rateMin: { toString: () => '12' },
        rateMax: { toString: () => '15' },
        tenureMinMonths: 12,
        tenureMaxMonths: 60,
        employmentTypes: ['SALARIED'],
        bank: { id: 'bank-1', code: 'BANK_ONE', name: 'Bank One' },
      }],
    });

    const config = await getSoftCheckConfiguration('personal_loan');

    expect(config).toEqual(expect.objectContaining({
      productId: 'product-1',
      ruleSetId: 'ruleset-1',
      configHash: 'hash-1',
    }));
    expect(config?.lenders[0]).toEqual(expect.objectContaining({
      ticketMin: 50_000,
      rateMin: 12,
    }));
    expect(config?.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'rule-1', threshold: 50 }),
      expect.objectContaining({ id: 'override-1', lenderId: 'bank-1', threshold: 45 }),
    ]));
  });
});

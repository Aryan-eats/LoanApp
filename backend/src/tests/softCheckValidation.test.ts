import { afterEach, describe, expect, it } from 'vitest';
import { validateSoftCheckPayload } from '../shared/middleware/softCheckValidation.js';

describe('validateSoftCheckPayload', () => {
  afterEach(() => {
    delete process.env.SOFT_CHECK_ENGINE_MODE;
  });

  it('rejects malformed body identifiers before Prisma receives them', () => {
    expect(validateSoftCheckPayload({ storedClientId: 'not-a-uuid' })).toContainEqual(
      expect.objectContaining({ field: 'storedClientId', code: 'INVALID_UUID' })
    );
    expect(validateSoftCheckPayload({ requestId: 'not-a-uuid' })).toContainEqual(
      expect.objectContaining({ field: 'requestId', code: 'INVALID_UUID' })
    );
  });

  it('rejects ambiguous source records', () => {
    expect(
      validateSoftCheckPayload({
        storedClientId: '11111111-1111-4111-8111-111111111111',
        leadId: '22222222-2222-4222-8222-222222222222',
      })
    ).toContainEqual(expect.objectContaining({ code: 'SOURCE_CONFLICT' }));
  });

  it('rejects negative obligations and non-finite amounts', () => {
    const issues = validateSoftCheckPayload({
      existingEMI: -1,
      monthlyIncome: Number.POSITIVE_INFINITY,
    });

    expect(issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(['existingEMI', 'monthlyIncome'])
    );
  });

  it('requires collateral data for V2 collateral products', () => {
    const issues = validateSoftCheckPayload({
      schemaVersion: '2.0',
      loanType: 'home_loan',
      loanAmount: 5_000_000,
    });

    expect(issues).toContainEqual(expect.objectContaining({ field: 'propertyValue', code: 'REQUIRED' }));
    expect(issues).toContainEqual(expect.objectContaining({ field: 'propertyType', code: 'REQUIRED' }));
  });

  it('rejects unknown and malformed V2 fields at the trust boundary', () => {
    expect(
      validateSoftCheckPayload({
        schemaVersion: '2.0',
        loanType: 'personal_loan',
        unexpected: true,
        cityTier: 'METRO',
        declaredCibilRange: '900',
      })
    ).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'unexpected', code: 'UNKNOWN_FIELD' }),
      expect.objectContaining({ field: 'cityTier', code: 'INVALID_ENUM' }),
      expect.objectContaining({ field: 'declaredCibilRange', code: 'INVALID_ENUM' }),
    ]));
  });

  it('validates nested V2 product profiles when V2 mode is enabled server-side', () => {
    process.env.SOFT_CHECK_ENGINE_MODE = 'v2';

    const issues = validateSoftCheckPayload({
      loanType: 'gold_loan',
      goldProfile: {
        goldWeightGrams: 10,
        goldPurityCarat: 14,
        declaredGoldValue: 50_000,
      },
    });

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'goldProfile.goldPurityCarat', code: 'INVALID_NUMBER' }),
      expect.objectContaining({ field: 'goldProfile.goldForm', code: 'REQUIRED' }),
    ]));
  });

  it('accepts the existing legacy payload unchanged', () => {
    expect(
      validateSoftCheckPayload({
        fullName: 'Ravi Sharma',
        phone: '9876543210',
        monthlyIncome: 75_000,
        existingEMI: 10_000,
        employmentType: 'salaried',
        loanType: 'personal_loan',
        loanAmount: 500_000,
        consentCredit: true,
      })
    ).toEqual([]);
  });
});

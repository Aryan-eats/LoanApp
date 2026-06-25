import { describe, expect, it } from 'vitest';
import { validateSoftCheckPayload } from '../shared/middleware/softCheckValidation.js';

describe('validateSoftCheckPayload', () => {
  it('rejects malformed body identifiers before Prisma receives them', () => {
    expect(validateSoftCheckPayload({ storedClientId: 'not-a-uuid' })).toContainEqual(
      expect.objectContaining({ field: 'storedClientId', code: 'INVALID_UUID' })
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
    expect(
      validateSoftCheckPayload({
        schemaVersion: '2.0',
        loanType: 'home_loan',
        loanAmount: 5_000_000,
      })
    ).toContainEqual(expect.objectContaining({ field: 'propertyValue', code: 'REQUIRED' }));
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

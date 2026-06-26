import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api/apiClient';
import { runSoftCheck } from '../api/partnerDataApi';
import legacyResponse from '../../backend/src/tests/fixtures/softCheckLegacyResponse.json';

vi.mock('../api/apiClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('partnerDataApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs a soft check through the partner endpoint', async () => {
    const apiResponse = {
      success: true,
      data: legacyResponse,
    };
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: apiResponse,
    });

    const payload = {
      fullName: 'Ravi Sharma',
      phone: '9876543210',
      monthlyIncome: 75_000,
      employmentType: 'salaried',
      loanType: 'personal_loan',
      loanAmount: 500_000,
      consentCredit: true,
    };
    const result = await runSoftCheck(payload);

    expect(result).toEqual(apiResponse);
    expect(result.data).toEqual(legacyResponse);
    expect(apiClient.post).toHaveBeenCalledWith('/partner/soft-check', payload);
  });

  it('deserializes additive V2 soft-check fields without breaking legacy fields', async () => {
    const apiResponse = {
      success: true,
      data: {
        ...legacyResponse,
        schemaVersion: '2.0',
        eligibilityStatus: 'ELIGIBLE',
        confidenceTier: 'STRONG',
        requestId: '11111111-1111-4111-8111-111111111111',
        resultId: 'result-1',
        matchedLenders: [{
          lenderId: 'bank-1',
          name: 'HDFC Bank',
          productCode: 'personal_loan',
          estimatedEligibleAmount: 500_000,
          estimatedRateBand: { min: 10, max: 12, type: 'indicative' },
          matchReason: 'Indicative match based on declared profile',
        }],
        borderlineLenders: [],
        disqualifiedLenders: [],
        improvementSuggestions: ['Reduce existing EMI obligations.'],
      },
    };
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: apiResponse,
    });

    const result = await runSoftCheck({ consentCredit: true });

    expect(result.data?.schemaVersion).toBe('2.0');
    expect(result.data?.matchedLenders?.[0].estimatedRateBand.type).toBe('indicative');
    expect(result.data?.eligibleBanks).toEqual(legacyResponse.eligibleBanks);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api/apiClient';
import { runSoftCheck } from '../api/partnerDataApi';

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
      data: { checkType: 'soft', creditImpact: 'none', isEligible: true },
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
    expect(apiClient.post).toHaveBeenCalledWith('/partner/soft-check', payload);
  });
});

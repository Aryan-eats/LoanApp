import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api/apiClient';
import { getCustomerDetail } from '../api/partnerCustomersApi';

vi.mock('../api/apiClient', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('partnerCustomersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches customer detail from the partner customer endpoint', async () => {
    const apiResponse = {
      success: true,
      data: {
        customer: { customerId: 'C-123', fullName: 'Riya Shah', phone: '9999999999' },
        relatedLeads: [],
        activity: [],
      },
    };
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: apiResponse,
    });

    const result = await getCustomerDetail('C-123');

    expect(result).toEqual(apiResponse);
    expect(apiClient.get).toHaveBeenCalledWith('/partner/customers/C-123');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalLeadsStore } from '../stores/localLeadsStore';
import * as partnerDataApi from '../api/partnerDataApi';
import type { LocalLead } from '../partner/types/partner-dashboard';

vi.mock('../api/partnerDataApi', () => ({
  getStoredClients: vi.fn(),
  bulkCreateStoredClients: vi.fn(),
  createStoredClient: vi.fn(),
  updateStoredClientStatus: vi.fn(),
  updateStoredClientNotes: vi.fn(),
  deleteStoredClient: vi.fn(),
  submitStoredClientToGPS: vi.fn(),
}));

const storedClient: LocalLead = {
  id: 'local-1',
  fullName: 'Test Client',
  phone: '9999999999',
  loanType: 'personal_loan',
  loanAmount: 500000,
  localStatus: 'new',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as LocalLead;

describe('localLeadsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useLocalLeadsStore.setState({
      leads: [],
      isLoading: false,
      hasFetched: false,
      error: null,
      lastFetchedAt: 0,
    });
    vi.clearAllMocks();
  });

  it('reuses fresh stored clients instead of refetching on repeated mounts', async () => {
    vi.mocked(partnerDataApi.getStoredClients).mockResolvedValue({
      success: true,
      data: [storedClient],
    });

    await useLocalLeadsStore.getState().fetchLeads();
    await useLocalLeadsStore.getState().fetchLeads();

    expect(partnerDataApi.getStoredClients).toHaveBeenCalledTimes(1);
    expect(useLocalLeadsStore.getState().leads).toEqual([storedClient]);
  });
});

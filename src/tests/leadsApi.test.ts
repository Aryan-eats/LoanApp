import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api/apiClient';
import {
  assignBank,
  createAdminLead,
  createLead,
  deleteLead,
  getLeadById,
  getLeads,
  getLeadStats,
  type Lead as LeadData,
  updateLead,
  updateLeadStatus,
  updatePreferredBank,
} from '../api/leadsApi';

vi.mock('../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('leadsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLeads uses partner endpoint by default', async () => {
    const apiResponse = { success: true, data: { leads: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } } };
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: apiResponse });

    const result = await getLeads({ page: 1, limit: 10 });

    expect(result).toEqual(apiResponse);
    expect(apiClient.get).toHaveBeenCalledWith('/partner/leads', {
      params: { page: 1, limit: 10 },
    });
  });

  it('getLeads uses admin endpoint when isAdmin=true', async () => {
    const apiResponse = { success: true, data: { leads: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } } };
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: apiResponse });

    const result = await getLeads({}, true);

    expect(result).toEqual(apiResponse);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/leads', { params: {} });
  });

  it('getLeadById switches endpoint by role', async () => {
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });

    await getLeadById('lead-1');
    await getLeadById('lead-1', true);

    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(apiClient.get).toHaveBeenCalledWith('/partner/leads/lead-1');
    expect(apiClient.get).toHaveBeenCalledWith('/admin/leads/lead-1');
  });

  it('createLead uses partner endpoint by default', async () => {
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });

    const result = await createLead({
      fullName: 'A User',
      phone: '9999999999',
      email: 'a@b.com',
      loanType: 'home_loan',
      loanAmount: 2500000,
    });

    expect(result).toEqual({ success: true });
    expect(apiClient.post).toHaveBeenCalledWith('/partner/leads', expect.objectContaining({ fullName: 'A User' }));
  });

  it('createLead uses public endpoint when isPartner=false', async () => {
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });

    const result = await createLead(
      {
        fullName: 'Public User',
        phone: '9999999999',
        email: 'public@b.com',
        loanType: 'personal_loan',
        loanAmount: 100000,
      },
      false
    );

    expect(result).toEqual({ success: true });
    expect(apiClient.post).toHaveBeenCalledWith('/leads', expect.any(Object));
  });

  it('supports admin create/update/status/bank/delete flow endpoints', async () => {
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
    (apiClient.put as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
    (apiClient.patch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
    (apiClient.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });

    await createAdminLead({
      fullName: 'Admin User',
      phone: '9999999999',
      email: 'admin@b.com',
      loanType: 'home_loan',
      loanAmount: 5000000,
    });
    const leadUpdate: Partial<LeadData> = { loanAmount: 6000000 };

    await updateLead('lead-1', leadUpdate, true);
    await updateLeadStatus('lead-1', 'approved', 'verified', true);
    await assignBank('lead-1', 'HDFC Bank', 'HDFC', 'logo.png', 'best fit');
    await deleteLead('lead-1');

    expect(apiClient.post).toHaveBeenCalledWith('/admin/leads', expect.any(Object));
    expect(apiClient.put).toHaveBeenCalledWith('/admin/leads/lead-1', { loanAmount: 6000000 });
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/leads/lead-1/status', {
      status: 'approved',
      note: 'verified',
    });
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/leads/lead-1/assign-bank', {
      bankName: 'HDFC Bank',
      bankCode: 'HDFC',
      bankLogo: 'logo.png',
      note: 'best fit',
    });
    expect(apiClient.delete).toHaveBeenCalledWith('/admin/leads/lead-1');
  });

  it('getLeadStats and updatePreferredBank call expected endpoints', async () => {
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
    (apiClient.patch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });

    await getLeadStats();
    await getLeadStats(true);
    await updatePreferredBank('lead-7', 'ICICI Bank', 'test-hmac-token');

    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(apiClient.get).toHaveBeenCalledWith('/partner/leads/stats');
    expect(apiClient.get).toHaveBeenCalledWith('/admin/leads/stats');
    expect(apiClient.patch).toHaveBeenCalledWith('/leads/lead-7/preferred-bank', {
      preferredBank: 'ICICI Bank',
    }, {
      headers: { 'x-lead-token': 'test-hmac-token' },
    });
  });
});

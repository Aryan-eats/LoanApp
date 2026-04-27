import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerDetailPage from '../partner/pages/CustomerDetailPage';
import { getCustomerDetail } from '../api/partnerCustomersApi';
import { PartnerThemeProvider } from '../partner/components/PartnerThemeProvider';

vi.mock('../api/partnerCustomersApi', () => ({
  getCustomerDetail: vi.fn(),
}));

const mockedDetail = {
  customer: {
    customerId: 'C-123',
    customerKey: 'CRM-123',
    fullName: 'Ravi Sharma',
    phone: '9999999999',
    email: 'ravi@example.com',
    leadSource: 'partner',
    leadScore: 87,
    scoreBand: 'high',
    consentSummary: {
      dataShare: true,
      contact: true,
      terms: true,
      privacyPolicy: true,
      summary: 'All consent captured',
    },
  },
  storedClient: {
    id: 'stored-1',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-02T00:00:00.000Z',
    localStatus: 'processing',
    fullName: 'Ravi Sharma',
    phone: '9999999999',
    email: 'ravi@example.com',
    loanType: 'home_loan',
    loanAmount: 2500000,
    customerId: 'C-123',
    customerKey: 'CRM-123',
    leadSource: 'partner',
    leadScore: 87,
    scoreBand: 'high',
    consentSummary: {
      dataShare: true,
      contact: true,
      terms: true,
      privacyPolicy: true,
      summary: 'All consent captured',
    },
  },
  relatedLeads: [
    {
      id: 'lead-1',
      client: {
        id: 'C-123',
        fullName: 'Ravi Sharma',
        phone: '9999999999',
        email: 'ravi@example.com',
        dateOfBirth: '1990-01-01',
        panNumber: 'ABCDE1234F',
        aadhaarNumber: '999999999999',
        employmentType: 'salaried',
        monthlyIncome: 100000,
        city: 'Mumbai',
        pincode: '400001',
        customerId: 'C-123',
        customerKey: 'CRM-123',
        leadSource: 'partner',
        leadScore: 87,
        scoreBand: 'high',
      },
      loanType: 'home_loan',
      loanAmount: 2500000,
      tenure: 240,
      status: 'submitted',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      documents: [],
      timeline: [],
      customerId: 'C-123',
      customerKey: 'CRM-123',
      leadSource: 'partner',
      leadScore: 87,
      scoreBand: 'high',
      consentSummary: {
        dataShare: true,
        contact: true,
        terms: true,
        privacyPolicy: true,
        summary: 'All consent captured',
      },
    },
  ],
  activity: [
    {
      id: 'activity-1',
      type: 'lead_created',
      title: 'Lead created',
      description: 'Captured from partner dashboard',
      timestamp: '2026-03-01T10:00:00.000Z',
      customerId: 'C-123',
      leadId: 'lead-1',
    },
  ],
};

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    (getCustomerDetail as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockedDetail,
    });
  });

  it('renders the customer summary, snapshot, related leads, and activity feed', async () => {
    render(
      <PartnerThemeProvider>
        <MemoryRouter initialEntries={['/partner/customers/C-123']}>
          <Routes>
            <Route path="/partner/customers/:customerId" element={<CustomerDetailPage />} />
          </Routes>
        </MemoryRouter>
      </PartnerThemeProvider>
    );

    expect(await screen.findByRole('heading', { name: 'Ravi Sharma' })).toBeInTheDocument();
    expect(screen.getByText('Lead score')).toBeInTheDocument();
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
    expect(screen.getByText('Stored client snapshot')).toBeInTheDocument();
    expect(screen.getByText('Related submitted leads')).toBeInTheDocument();
    expect(screen.getAllByText('Activity feed').length).toBeGreaterThan(0);
    expect(screen.getByText('Lead created')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: /view customer/i })
        .some((link) => link.getAttribute('href') === '/partner/customers/C-123')
    ).toBe(true);
  });
});

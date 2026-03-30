import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeadDetailsModal from '../admin/components/leads/LeadDetailsModal';
import type { Lead } from '../admin/types/admin';

const { getBanksMock } = vi.hoisted(() => ({
  getBanksMock: vi.fn(),
}));

vi.mock('../api/banksApi', () => ({
  getBanks: getBanksMock,
}));

const buildLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'L-100',
  customerId: 'C-1',
  customerName: 'Ravi Sharma',
  customerPhone: '9999999999',
  customerEmail: 'ravi@example.com',
  loanType: 'home_loan',
  loanAmount: 2500000,
  partnerId: 'P-1',
  partnerName: 'Partner One',
  status: 'submitted',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  timeline: [],
  documents: [],
  ...overrides,
});

describe('LeadDetailsModal', () => {
  beforeEach(() => {
    getBanksMock.mockResolvedValue({
      success: true,
      data: {
        banks: [
          {
            id: 'bank-1',
            name: 'HDFC Bank',
            code: 'HDFC',
            logo: null,
            status: 'active',
            supportedLoanTypes: ['home_loan'],
            interestRateMin: '8.25',
            interestRateMax: '9.10',
            processingFee: '1%',
            maxTenure: 360,
            minAmount: '100000',
            maxAmount: '10000000',
            processingTime: '7 days',
            isPopular: true,
            features: ['Doorstep pickup'],
            avgTat: 7,
            activeLeads: 10,
            approvalRate: 75,
            totalDisbursed: '1000000',
            contactPerson: 'Bank RM',
            contactEmail: 'rm@bank.test',
            contactPhone: '9999999999',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            commissionRates: [],
          },
          {
            id: 'bank-2',
            name: 'Closed Bank',
            code: 'CLOSED',
            logo: null,
            status: 'inactive',
            supportedLoanTypes: ['home_loan'],
            interestRateMin: '9.25',
            interestRateMax: '10.10',
            processingFee: '2%',
            maxTenure: 240,
            minAmount: '100000',
            maxAmount: '8000000',
            processingTime: '10 days',
            isPopular: false,
            features: [],
            avgTat: 10,
            activeLeads: 0,
            approvalRate: 0,
            totalDisbursed: '0',
            contactPerson: 'Closed RM',
            contactEmail: 'closed@bank.test',
            contactPhone: '8888888888',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            commissionRates: [],
          },
        ],
      },
    });
  });

  it('renders lead details and closes when backdrop is clicked', async () => {
    const onClose = vi.fn();

    render(
      <LeadDetailsModal
        lead={buildLead()}
        onClose={onClose}
        onStatusUpdate={vi.fn()}
        onBankAssign={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Lead L-100' })).toBeInTheDocument();
    expect(screen.getByText('Customer Information')).toBeInTheDocument();
    expect(screen.getByText('Partner Information')).toBeInTheDocument();
    expect(screen.getByText('ravi@example.com')).toBeInTheDocument();
    await waitFor(() => expect(getBanksMock).toHaveBeenCalled());

    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement?.firstElementChild as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onStatusUpdate with note when status button is clicked', async () => {
    const onStatusUpdate = vi.fn();

    render(
      <LeadDetailsModal
        lead={buildLead({ status: 'submitted', bankAssigned: 'HDFC Bank' })}
        onClose={vi.fn()}
        onStatusUpdate={onStatusUpdate}
        onBankAssign={vi.fn()}
      />
    );

    await waitFor(() => expect(getBanksMock).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'documents checked' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Docs Pending' }));

    expect(onStatusUpdate).toHaveBeenCalledWith('L-100', 'docs_pending', 'documents checked');
  });

  it('shows document empty state and bank assignment flow', async () => {
    const onBankAssign = vi.fn();

    render(
      <LeadDetailsModal
        lead={buildLead({ bankAssigned: undefined, documents: [] })}
        onClose={vi.fn()}
        onStatusUpdate={vi.fn()}
        onBankAssign={onBankAssign}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Documents' }));
    expect(screen.getByText('No documents uploaded')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bank' }));

    const hdfcButton = await screen.findByRole('button', { name: /^HDFC Bank\b/i });
    expect(screen.queryByRole('button', { name: /^Closed Bank\b/i })).not.toBeInTheDocument();

    fireEvent.click(hdfcButton);

    expect(onBankAssign).toHaveBeenCalledTimes(1);
    expect(onBankAssign).toHaveBeenCalledWith('L-100', 'HDFC Bank', 'HDFC');
  });

  it('marks the currently assigned bank as disabled', async () => {
    render(
      <LeadDetailsModal
        lead={buildLead({ bankAssigned: 'HDFC Bank' })}
        onClose={vi.fn()}
        onStatusUpdate={vi.fn()}
        onBankAssign={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Bank' }));

    const assignedBankButton = await screen.findByRole('button', { name: /^HDFC Bank\b/i });

    await waitFor(() => expect(assignedBankButton).toBeDisabled());
    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });
});

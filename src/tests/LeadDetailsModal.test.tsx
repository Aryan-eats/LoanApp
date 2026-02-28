import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LeadDetailsModal from '../admin/components/leads/LeadDetailsModal';
import type { Lead } from '../admin/types/admin';

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
  it('renders lead details and closes when backdrop is clicked', () => {
    const onClose = vi.fn();

    render(
      <LeadDetailsModal
        lead={buildLead()}
        onClose={onClose}
        onStatusUpdate={vi.fn()}
        onBankAssign={vi.fn()}
      />
    );

    expect(screen.getByText('Lead L-100')).toBeInTheDocument();
    expect(screen.getAllByText('Ravi Sharma')).toHaveLength(2);

    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement?.firstElementChild as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onStatusUpdate with note when status button is clicked', () => {
    const onStatusUpdate = vi.fn();

    render(
      <LeadDetailsModal
        lead={buildLead({ status: 'submitted' })}
        onClose={vi.fn()}
        onStatusUpdate={onStatusUpdate}
        onBankAssign={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Add a note (optional)'), {
      target: { value: 'documents checked' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Docs Pending' }));

    expect(onStatusUpdate).toHaveBeenCalledWith('L-100', 'docs_pending', 'documents checked');
  });

  it('shows document empty state and bank assignment flow', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /^HDFC Bank\b/i }));

    expect(onBankAssign).toHaveBeenCalledTimes(1);
    expect(onBankAssign).toHaveBeenCalledWith('L-100', 'HDFC Bank');
  });
});

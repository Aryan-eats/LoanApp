import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreditCheckPage from '../partner/pages/CreditCheckPage';
import { runSoftCheck } from '../api/partnerDataApi';

vi.mock('../api/partnerDataApi', () => ({
  runSoftCheck: vi.fn(),
}));

describe('CreditCheckPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires client details and consent before running a soft check', () => {
    render(
      <MemoryRouter>
        <CreditCheckPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /check eligibility/i })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/enter client's full name/i), {
      target: { value: 'Ravi Sharma' },
    });
    fireEvent.change(screen.getByPlaceholderText(/10-digit mobile number/i), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByText('Select employment type').closest('select')!, {
      target: { value: 'salaried' },
    });
    fireEvent.change(screen.getByPlaceholderText(/^e.g., 50000$/i), {
      target: { value: '75000' },
    });
    fireEvent.change(screen.getByText('Select loan type').closest('select')!, {
      target: { value: 'personal_loan' },
    });
    fireEvent.change(screen.getByPlaceholderText(/^e.g., 500000$/i), {
      target: { value: '500000' },
    });

    expect(screen.getByRole('button', { name: /check eligibility/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /client has consented/i }));
    expect(screen.getByRole('button', { name: /check eligibility/i })).toBeEnabled();
  });

  it('calls the softcheck API and renders the no-impact result banner', async () => {
    vi.mocked(runSoftCheck).mockResolvedValueOnce({
      success: true,
      data: {
        checkType: 'soft',
        creditImpact: 'none',
        isEligible: true,
        score: 90,
        maxLoanAmount: 1_000_000,
        minLoanAmount: 50_000,
        estimatedEMI: 11_122,
        eligibleBanks: [],
        factors: [],
        disclaimer:
          'Soft eligibility check only. No credit score impact. Final approval requires lender verification and may involve a hard inquiry.',
      },
    });

    render(
      <MemoryRouter>
        <CreditCheckPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/enter client's full name/i), {
      target: { value: 'Ravi Sharma' },
    });
    fireEvent.change(screen.getByPlaceholderText(/10-digit mobile number/i), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByText('Select employment type').closest('select')!, {
      target: { value: 'salaried' },
    });
    fireEvent.change(screen.getByPlaceholderText(/^e.g., 50000$/i), {
      target: { value: '75000' },
    });
    fireEvent.change(screen.getByText('Select loan type').closest('select')!, {
      target: { value: 'personal_loan' },
    });
    fireEvent.change(screen.getByPlaceholderText(/^e.g., 500000$/i), {
      target: { value: '500000' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /client has consented/i }));
    fireEvent.click(screen.getByRole('button', { name: /check eligibility/i }));

    await waitFor(() => {
      expect(runSoftCheck).toHaveBeenCalledWith({
        fullName: 'Ravi Sharma',
        phone: '9876543210',
        monthlyIncome: 75_000,
        existingEMI: 0,
        employmentType: 'salaried',
        loanType: 'personal_loan',
        loanAmount: 500_000,
        consentCredit: true,
      });
    });
    expect(await screen.findByText('Soft Check - No Credit Impact')).toBeInTheDocument();
  });
});

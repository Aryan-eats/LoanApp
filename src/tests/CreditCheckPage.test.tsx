import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreditCheckPage from '../partner/pages/CreditCheckPage';
import { runSoftCheck, type SoftCheckResult } from '../api/partnerDataApi';
import legacyResponse from '../../backend/src/tests/fixtures/softCheckLegacyResponse.json';

vi.mock('../api/partnerDataApi', () => ({
  runSoftCheck: vi.fn(),
}));

describe('CreditCheckPage', () => {
  const legacySoftCheckResponse = legacyResponse as SoftCheckResult;

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
      data: legacySoftCheckResponse,
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
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.getByText('Rs 50,000 - Rs 9.90 L')).toBeInTheDocument();
  });

  it('renders V2 as indicative pre-qualification without approval-style wording', async () => {
    vi.mocked(runSoftCheck).mockResolvedValueOnce({
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
      } as SoftCheckResult,
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

    expect(await screen.findByText('Indicative pre-qualification')).toBeInTheDocument();
    expect(screen.getByText('Profile Strength')).toBeInTheDocument();
    expect(screen.getByText('STRONG')).toBeInTheDocument();
    expect(screen.getByText('Reduce existing EMI obligations.')).toBeInTheDocument();
    expect(screen.queryByText('Eligible for Loan')).not.toBeInTheDocument();
    expect(screen.queryByText('Eligibility Score')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import PartnerHeader from '../partner/components/PartnerHeader';
import { PartnerThemeProvider } from '../partner/components/PartnerThemeProvider';
import { useAuthStore } from '../stores/authStore';
import { usePartnerProfileStore } from '../stores/partnerProfileStore';
import type { PartnerProfile } from '../partner/types/partner-dashboard';

const partnerProfile: PartnerProfile = {
  id: 'partner-12345678',
  fullName: 'Riya Shah',
  email: 'riya@example.com',
  phone: '9999999999',
  partnerType: 'freelancer',
  partnerCode: 'GPS-345678',
  city: 'Mumbai',
  state: 'MH',
  pincode: '400001',
  panNumber: '',
  aadhaarNumber: '',
  kycStatus: 'pending',
  joinedDate: 'Jan 1, 2026',
  bankDetails: {
    accountHolderName: 'Riya Shah',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    isVerified: false,
  },
};

describe('PartnerHeader', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'partner-12345678',
        firstName: 'Riya',
        lastName: 'Shah',
        email: 'riya@example.com',
        role: 'partner',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    usePartnerProfileStore.setState({
      partnerInfo: {
        fullName: 'Riya Shah',
        email: 'riya@example.com',
        phone: '9999999999',
        partnerType: 'freelancer',
        partnerCode: 'GPS-345678',
        kycStatus: 'pending',
        profile: partnerProfile,
      },
      isLoading: false,
      error: null,
      lastFetchedAt: Date.now(),
    });
  });

  it('toggles the persisted partner theme from the navbar control', async () => {
    const user = userEvent.setup();

    render(
      <PartnerThemeProvider>
        <MemoryRouter>
          <PartnerHeader />
        </MemoryRouter>
      </PartnerThemeProvider>
    );

    const toggle = screen.getByRole('button', { name: /switch to light mode/i });
    expect(screen.getByText('Light mode')).toBeInTheDocument();

    await user.click(toggle);

    expect(JSON.parse(window.localStorage.getItem('partner-dashboard-theme') ?? 'null')).toBe('light');
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });
});

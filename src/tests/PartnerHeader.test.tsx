import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerHeader from '../partner/components/PartnerHeader';
import { PartnerThemeProvider } from '../partner/components/PartnerThemeProvider';

const logoutMock = vi.fn(async () => {});
const fetchProfileMock = vi.fn(async () => {});

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'partner-12345678',
      firstName: 'Riya',
      lastName: 'Shah',
      email: 'riya@example.com',
    },
    logout: logoutMock,
  }),
}));

vi.mock('../stores/partnerProfileStore', () => ({
  usePartnerProfileStore: () => ({
    partnerInfo: {
      fullName: 'Riya Shah',
      email: 'riya@example.com',
      partnerType: 'freelancer',
      partnerCode: 'GPS-345678',
      kycStatus: 'pending',
    },
    fetchProfile: fetchProfileMock,
  }),
}));

describe('PartnerHeader', () => {
  beforeEach(() => {
    window.localStorage.clear();
    logoutMock.mockClear();
    fetchProfileMock.mockClear();
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

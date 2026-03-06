import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SessionExpiryWarningModal from '../components/SessionExpiryWarningModal';
import { useAuthStore } from '../stores/authStore';

type SessionExpiryWarningState = {
  isVisible: boolean;
  expiresAt: number | null;
};

const refreshSessionMock = vi.fn();
const listeners = new Set<(state: SessionExpiryWarningState) => void>();

const emitWarning = (state: SessionExpiryWarningState) => {
  listeners.forEach((listener) => listener(state));
};

vi.mock('../api/apiClient', () => ({
  refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
  subscribeToSessionExpiryWarning: (
    listener: (state: SessionExpiryWarningState) => void
  ) => {
    listeners.add(listener);
    listener({ isVisible: false, expiresAt: null });

    return () => {
      listeners.delete(listener);
    };
  },
}));

describe('SessionExpiryWarningModal', () => {
  const baseUser = {
    id: 'user-1',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'partner' as const,
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    const logoutMock = vi.fn().mockResolvedValue(undefined);

    vi.useFakeTimers();
    refreshSessionMock.mockReset();
    listeners.clear();
    localStorage.clear();
    useAuthStore.setState({
      user: baseUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      logout: logoutMock,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows the warning and refreshes the session when requested', async () => {
    refreshSessionMock.mockImplementation(async () => {
      emitWarning({
        isVisible: false,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      return {
        accessToken: 'next-token',
        expiresIn: 900,
      };
    });

    render(<SessionExpiryWarningModal />);

    act(() => {
      emitWarning({
        isVisible: true,
        expiresAt: Date.now() + 4 * 60 * 1000,
      });
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/session expiring soon/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /stay signed in/i }));

    await waitFor(() => {
      expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(useAuthStore.getState().logout).not.toHaveBeenCalled();
  });

  it('logs the user out once the warning countdown reaches expiry', async () => {
    render(<SessionExpiryWarningModal />);

    act(() => {
      emitWarning({
        isVisible: true,
        expiresAt: Date.now() + 2_000,
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(2_500);
    });

    await waitFor(() => {
      expect(useAuthStore.getState().logout).toHaveBeenCalledTimes(1);
    });
  });
});

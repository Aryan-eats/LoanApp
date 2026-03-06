import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../api/apiClient';
import { clearTokens, getAccessToken, setAccessToken } from '../api/apiClient';

vi.mock('../api/apiClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setAccessToken: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn(),
  startSilentRefresh: vi.fn(),
  stopSilentRefresh: vi.fn(),
}));

describe('Auth Store', () => {
  const baseUser = {
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'partner' as const,
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('initializes with logged-out state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('logs in user and stores access token in memory', async () => {
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: {
          user: baseUser,
          accessToken: 'access-token',
          expiresIn: 900,
        },
      },
    });

    await useAuthStore.getState().login('test@example.com', 'password123');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(baseUser);
    expect(state.isAuthenticated).toBe(true);
    expect(setAccessToken).toHaveBeenCalledWith('access-token');
  });

  it('persists only id and role for authenticated sessions', async () => {
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: {
          user: baseUser,
          accessToken: 'access-token',
          expiresIn: 900,
        },
      },
    });

    await useAuthStore.getState().login('test@example.com', 'password123');

    const persisted = JSON.parse(localStorage.getItem('auth-storage') ?? '{}');
    expect(persisted.state).toEqual({
      user: {
        id: baseUser.id,
        role: baseUser.role,
      },
      isAuthenticated: true,
    });
    expect(JSON.stringify(persisted.state)).not.toContain(baseUser.email);
    expect(JSON.stringify(persisted.state)).not.toContain(baseUser.firstName);
  });

  it('resets auth state when login fails', async () => {
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid credentials'));

    await expect(useAuthStore.getState().login('test@example.com', 'wrong')).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  it('logs out and clears token state even when API call fails', async () => {
    useAuthStore.setState({ user: baseUser, isAuthenticated: true });
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });

  it('calls the server logout endpoint even without an in-memory access token', async () => {
    useAuthStore.setState({ user: baseUser, isAuthenticated: true });
    (getAccessToken as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true },
    });

    await useAuthStore.getState().logout();

    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });

  it('checkAuth validates user with existing token', async () => {
    (getAccessToken as unknown as ReturnType<typeof vi.fn>).mockReturnValue('valid-token');
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { user: baseUser } },
    });

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('test@example.com');
  });

  it('checkAuth refreshes token when no in-memory token exists', async () => {
    (getAccessToken as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { accessToken: 'refreshed-token', expiresIn: 900 } },
    });
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { user: baseUser } },
    });

    await useAuthStore.getState().checkAuth();

    expect(setAccessToken).toHaveBeenCalledWith('refreshed-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('rehydrates authenticated sessions by fetching the full profile', async () => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          user: { id: baseUser.id, role: baseUser.role },
          isAuthenticated: true,
        },
        version: 1,
      }),
    );
    (getAccessToken as unknown as ReturnType<typeof vi.fn>).mockReturnValue('valid-token');
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { user: baseUser } },
    });

    await useAuthStore.persist.rehydrate();
    await vi.waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    const state = useAuthStore.getState();
    expect(state.user).toEqual(baseUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('checkAuth logs out immediately when refresh fails', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: baseUser });
    (getAccessToken as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (apiClient.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('expired'));

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });

  it('checkAuth clears stale authenticated state when /auth/me returns no user', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: baseUser });
    (getAccessToken as unknown as ReturnType<typeof vi.fn>).mockReturnValue('valid-token');
    (apiClient.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: {} },
    });

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });

  it('clears error with clearError()', () => {
    useAuthStore.setState({ error: 'Some error' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});

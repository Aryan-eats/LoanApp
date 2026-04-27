import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOTPVerification } from '../hooks/useOTPVerification';
import { resendOTPApi, sendOTPApi, verifyOTPApi } from '../api/authApi';

vi.mock('../api/authApi', () => ({
  sendOTPApi: vi.fn(),
  verifyOTPApi: vi.fn(),
  resendOTPApi: vi.fn(),
}));

describe('useOTPVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the backend verify schema to verifyOTPApi and surfaces the verification token', async () => {
    const onSuccess = vi.fn();
    vi.mocked(verifyOTPApi).mockResolvedValueOnce({
      success: true,
      message: 'OTP verified successfully',
      data: { verificationToken: 'signed-phone-token' },
    });

    const { result } = renderHook(() => useOTPVerification({ onSuccess }));

    let verified = false;
    await act(async () => {
      verified = await result.current.verifyOTP('9876543210', '123456');
    });

    expect(verified).toBe(true);
    expect(verifyOTPApi).toHaveBeenCalledWith({
      mobile: '9876543210',
      otp: '123456',
    });
    expect(onSuccess).toHaveBeenCalledWith({
      verificationToken: 'signed-phone-token',
    });
  });

  it('fails verification when the backend success response is missing verificationToken', async () => {
    const onError = vi.fn();
    vi.mocked(verifyOTPApi).mockResolvedValueOnce({
      success: true,
      message: 'OTP verified successfully',
      data: {},
    });

    const { result } = renderHook(() => useOTPVerification({ onError }));

    let verified = true;
    await act(async () => {
      verified = await result.current.verifyOTP('9876543210', '123456');
    });

    expect(verified).toBe(false);
    await waitFor(() => {
      expect(result.current.error).toBe('Verification token missing from OTP verification response');
    });
    expect(onError).toHaveBeenCalledWith(
      'Verification token missing from OTP verification response'
    );
  });

  it('sends and resends OTP using the provided mobile number', async () => {
    vi.mocked(sendOTPApi).mockResolvedValueOnce({
      success: true,
      message: 'OTP sent',
    });
    vi.mocked(resendOTPApi).mockResolvedValueOnce({
      success: true,
      message: 'OTP resent',
    });

    const { result } = renderHook(() => useOTPVerification());

    await act(async () => {
      await result.current.sendOTP('9876543210');
      await result.current.resendOTP('9876543210', 'voice');
    });

    expect(sendOTPApi).toHaveBeenCalledWith('9876543210');
    expect(resendOTPApi).toHaveBeenCalledWith('9876543210', 'voice');
  });
});

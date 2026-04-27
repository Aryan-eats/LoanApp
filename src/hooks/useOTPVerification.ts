import { useState, useCallback } from 'react';
import { sendOTPApi, verifyOTPApi, resendOTPApi } from '../api/authApi';

interface UseOTPVerificationOptions {
  onSuccess?: (data: { verificationToken?: string }) => void;
  onError?: (error: string) => void;
}

interface UseOTPVerificationReturn {
  sendOTP: (mobile: string) => Promise<boolean>;
  verifyOTP: (mobile: string, otp: string) => Promise<boolean>;
  resendOTP: (mobile: string, retryType?: 'text' | 'voice') => Promise<boolean>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for OTP verification using MSG91 REST API.
 */
export const useOTPVerification = (
  options: UseOTPVerificationOptions = {}
): UseOTPVerificationReturn => {
  const { onSuccess, onError } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const sendOTP = useCallback(async (mobile: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendOTPApi(mobile);
      setLoading(false);
      
      if (result.success) {
        return true;
      }
      
      const errorMsg = result.message || 'Failed to send OTP';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    } catch (err) {
      setLoading(false);
      const errorMsg = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }
  }, [onError]);

  const verifyOTP = useCallback(async (mobile: string, otp: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await verifyOTPApi({
        mobile: mobile.trim(),
        otp: otp.trim(),
      });
      setLoading(false);

      const verificationToken = result.data?.verificationToken;

      if (result.success && verificationToken) {
        onSuccess?.({ verificationToken });
        return true;
      }

      const errorMsg = result.success
        ? 'Verification token missing from OTP verification response'
        : (result.message || 'Invalid OTP');
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    } catch (err) {
      setLoading(false);
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify OTP';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }
  }, [onSuccess, onError]);

  const resendOTP = useCallback(async (
    mobile: string,
    retryType: 'text' | 'voice' = 'text'
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await resendOTPApi(mobile, retryType);
      setLoading(false);
      
      if (result.success) {
        return true;
      }
      
      const errorMsg = result.message || 'Failed to resend OTP';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    } catch (err) {
      setLoading(false);
      const errorMsg = err instanceof Error ? err.message : 'Failed to resend OTP';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }
  }, [onError]);

  return {
    sendOTP,
    verifyOTP,
    resendOTP,
    loading,
    error,
    clearError,
  };
};

export default useOTPVerification;

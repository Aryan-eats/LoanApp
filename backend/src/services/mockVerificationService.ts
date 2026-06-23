/**
 * Mock verification service.
 *
 * Allows dev/test environments to bypass real SMS/email OTP delivery by
 * matching against MOCK_PHONE_OTP / MOCK_EMAIL_OTP env vars when
 * MOCK_VERIFICATION_ENABLED=true.
 *
 * Usage:
 *   import { matchesMockOtp } from './mockVerificationService.js';
 *   if (matchesMockOtp('phone', submittedOtp)) { ... }
 */

export type VerificationChannel = 'phone' | 'email';

export const isMockVerificationEnabled = (): boolean =>
  process.env.NODE_ENV !== 'production' && process.env.MOCK_VERIFICATION_ENABLED === 'true';

export const getMockOtp = (channel: VerificationChannel): string | undefined =>
  (channel === 'phone' ? process.env.MOCK_PHONE_OTP : process.env.MOCK_EMAIL_OTP)
  || process.env.MOCK_OTP;

/**
 * Returns true when mock-mode is active and the submitted OTP matches the
 * configured mock value for the given channel.
 *
 * Never returns true in production regardless of env vars.
 */
export const matchesMockOtp = (channel: VerificationChannel, otp: string): boolean => {
  if (!isMockVerificationEnabled()) return false;

  const expected = getMockOtp(channel);

  return !!expected && otp.trim() === expected.trim();
};

import { afterEach, describe, expect, it } from 'vitest';
import { matchesMockOtp } from '../services/mockVerificationService.js';

describe('mock verification', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses MOCK_OTP for phone verification when channel-specific OTP is absent', () => {
    process.env.NODE_ENV = 'development';
    process.env.MOCK_VERIFICATION_ENABLED = 'true';
    process.env.MOCK_OTP = '123456';
    delete process.env.MOCK_PHONE_OTP;

    expect(matchesMockOtp('phone', '123456')).toBe(true);
  });
});

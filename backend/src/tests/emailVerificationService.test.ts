import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('emailVerificationService', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.MOCK_VERIFICATION_ENABLED;
    delete process.env.MOCK_EMAIL_OTP;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_VERIFICATION_TEMPLATE_ID;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns success in mock mode without requiring provider configuration', async () => {
    process.env.MOCK_VERIFICATION_ENABLED = 'true';
    process.env.MOCK_EMAIL_OTP = '654321';

    const { sendVerificationCode } = await import('../services/emailVerificationService.js');

    const result = await sendVerificationCode('user@example.com', '111111');

    expect(result).toEqual({
      success: true,
      message: 'Verification code sent successfully',
    });
  });

  it('returns provider-not-configured outside mock mode', async () => {
    const { sendVerificationCode } = await import('../services/emailVerificationService.js');

    const result = await sendVerificationCode('user@example.com', '111111');

    expect(result).toEqual({
      success: false,
      message: 'SendGrid verification provider not configured',
    });
  });
});

import crypto from 'crypto';

export type VerificationChannel = 'phone' | 'email';

const ENV_BY_CHANNEL: Record<VerificationChannel, string> = {
  phone: 'MOCK_PHONE_OTP',
  email: 'MOCK_EMAIL_OTP',
};

const isSixDigitOtp = (value: string): boolean => /^\d{6}$/.test(value);

const timingSafeCompare = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
};

export const isMockVerificationEnabled = (): boolean =>
  process.env.MOCK_VERIFICATION_ENABLED === 'true';

export const getMockOtp = (channel: VerificationChannel): string | null => {
  const configured = process.env[ENV_BY_CHANNEL[channel]]?.trim() ?? '';
  return isSixDigitOtp(configured) ? configured : null;
};

export const matchesMockOtp = (
  channel: VerificationChannel,
  candidate: string
): boolean => {
  if (!isMockVerificationEnabled()) {
    return false;
  }

  const configured = getMockOtp(channel);
  if (!configured || !isSixDigitOtp(candidate)) {
    return false;
  }

  return timingSafeCompare(configured, candidate);
};

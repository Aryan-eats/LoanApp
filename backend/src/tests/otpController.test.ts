import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  logAuditEventMock,
  formatUserResponseMock,
  generateOTPMock,
  verifyUserOTPMock,
  clearUserOTPMock,
  sendMsg91OTPMock,
  createOtpChallengeMock,
  verifyOtpChallengeMock,
  sendVerificationCodeMock,
} = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  logAuditEventMock: vi.fn(),
  formatUserResponseMock: vi.fn((user) => user),
  generateOTPMock: vi.fn(),
  verifyUserOTPMock: vi.fn(),
  clearUserOTPMock: vi.fn(),
  sendMsg91OTPMock: vi.fn(),
  createOtpChallengeMock: vi.fn(),
  verifyOtpChallengeMock: vi.fn(),
  sendVerificationCodeMock: vi.fn(),
}));

vi.mock('../config/prisma.js', () => ({
  default: prismaMock,
}));

vi.mock('../utils/auditLogger.js', () => ({
  logAuditEvent: logAuditEventMock,
  redactPhone: vi.fn((phone) => phone),
}));

vi.mock('../services/authService.js', () => ({
  formatUserResponse: formatUserResponseMock,
  hashToken: vi.fn((value) => value),
  normalizePhone: vi.fn((value) => value),
  verifyMsg91VerificationToken: vi.fn(),
  signMsg91VerificationToken: vi.fn(),
}));

vi.mock('../services/userService.js', () => ({
  generateOTP: generateOTPMock,
  verifyUserOTP: verifyUserOTPMock,
  clearUserOTP: clearUserOTPMock,
}));

vi.mock('../services/smsService.js', () => ({
  sendOTP: sendMsg91OTPMock,
  verifyOTP: vi.fn(),
  resendOTP: vi.fn(),
}));

vi.mock('../services/otpChallengeService.js', () => ({
  createOtpChallenge: createOtpChallengeMock,
  verifyOtpChallenge: verifyOtpChallengeMock,
}));

vi.mock('../services/emailVerificationService.js', () => ({
  sendVerificationCode: sendVerificationCodeMock,
}));

import { sendOTP, verifyOTP } from '../controllers/otpController.js';

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
};

describe('otpController mock verification flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logAuditEventMock.mockResolvedValue(undefined);
    clearUserOTPMock.mockResolvedValue(undefined);
    sendMsg91OTPMock.mockResolvedValue({ success: true, message: 'OTP sent successfully' });
    sendVerificationCodeMock.mockResolvedValue({
      success: true,
      message: 'Verification code sent successfully',
    });
  });

  it('uses the email provider entrypoint for email sends', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });
    generateOTPMock.mockResolvedValue('111111');

    const req = {
      body: {
        email: 'USER@example.com',
      },
    } as any;
    const res = createResponse();

    await sendOTP(req, res as any);

    expect(sendVerificationCodeMock).toHaveBeenCalledWith('user@example.com', '111111');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('marks email verified when the configured mock email otp is accepted for an active user otp', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      isEmailVerified: false,
      isPhoneVerified: false,
    });
    verifyUserOTPMock.mockResolvedValue({ status: 'verified' });
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      isEmailVerified: true,
      isPhoneVerified: false,
    });

    const req = {
      body: {
        email: 'user@example.com',
        otp: '654321',
      },
      headers: {},
    } as any;
    const res = createResponse();

    await verifyOTP(req, res as any);

    expect(verifyUserOTPMock).toHaveBeenCalledWith('user-1', '654321', 'email');
    expect(clearUserOTPMock).toHaveBeenCalledWith('user-1');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        isEmailVerified: true,
        isPhoneVerified: false,
        otpHash: null,
        otpExpires: null,
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns expired when no active onboarding challenge exists for phone verification', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    verifyOtpChallengeMock.mockResolvedValue({
      success: false,
      reason: 'expired',
    });

    const req = {
      body: {
        phone: '9876543210',
        otp: '123456',
      },
      headers: {},
    } as any;
    const res = createResponse();

    await verifyOTP(req, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Verification code has expired',
    });
  });
});

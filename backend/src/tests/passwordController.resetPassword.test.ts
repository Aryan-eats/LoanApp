import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';

const {
  prismaMock,
  logAuditEventMock,
  hashPasswordMock,
  isPasswordReusedMock,
  addToPasswordHistoryMock,
} = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  logAuditEventMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  isPasswordReusedMock: vi.fn(),
  addToPasswordHistoryMock: vi.fn(),
}));

vi.mock('../config/prisma.js', () => ({
  default: prismaMock,
}));

vi.mock('../utils/auditLogger.js', () => ({
  logAuditEvent: logAuditEventMock,
}));

vi.mock('../services/userService.js', () => ({
  hashPassword: hashPasswordMock,
  generatePasswordResetToken: vi.fn(),
  isPasswordReused: isPasswordReusedMock,
  addToPasswordHistory: addToPasswordHistoryMock,
}));

import { resetPassword } from '../controllers/passwordController.js';

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
};

describe('passwordController.resetPassword', () => {
  const hashToken = (value: string): string =>
    crypto.createHash('sha256').update(value).digest('hex');

  beforeEach(() => {
    vi.clearAllMocks();
    hashPasswordMock.mockResolvedValue('new-password-hash');
    isPasswordReusedMock.mockResolvedValue(false);
    addToPasswordHistoryMock.mockResolvedValue(undefined);
    prismaMock.user.update.mockResolvedValue({});
    logAuditEventMock.mockResolvedValue(undefined);
  });

  it('matches the reset token after loading the user instead of querying by encrypted token', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      password: 'old-password-hash',
      resetPasswordToken: hashToken('secret'),
    });

    const req = {
      body: {
        email: 'USER@example.com',
        code: 'secret',
        password: 'NewPassword1!',
      },
      headers: {},
    } as any;
    const res = createResponse();

    await resetPassword(req, res as any);

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'user@example.com',
        resetPasswordExpires: { gt: expect.any(Date) },
      },
    });
    expect(addToPasswordHistoryMock).toHaveBeenCalledWith('user-1', 'old-password-hash');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        password: 'new-password-hash',
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    expect(logAuditEventMock).toHaveBeenCalledWith('PASSWORD_RESET_SUCCESS', req, {
      userId: 'user-1',
      email: 'user@example.com',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects an incorrect reset token even when the email lookup succeeds', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      password: 'old-password-hash',
      resetPasswordToken: hashToken('secret'),
    });

    const req = {
      body: {
        email: 'user@example.com',
        code: 'wrong-secret',
        password: 'NewPassword1!',
      },
      headers: {},
    } as any;
    const res = createResponse();

    await resetPassword(req, res as any);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired reset code',
    });
  });

  it('rejects a reused password before updating the user record', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      password: 'old-password-hash',
      resetPasswordToken: hashToken('secret'),
    });
    isPasswordReusedMock.mockResolvedValue(true);

    const req = {
      body: {
        email: 'user@example.com',
        code: 'secret',
        password: 'OldPassword1!',
      },
      headers: {},
    } as any;
    const res = createResponse();

    await resetPassword(req, res as any);

    expect(addToPasswordHistoryMock).not.toHaveBeenCalled();
    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'You cannot reuse a recent password',
    });
  });
});

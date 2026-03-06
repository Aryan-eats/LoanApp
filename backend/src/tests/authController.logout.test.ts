import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  tokenBlacklistAddMock,
  removeSessionMock,
  logAuditEventMock,
  verifyRefreshTokenMock,
  extractTokenFromHeaderMock,
  getTokenExpirationMsMock,
  generateDeviceFingerprintMock,
  hashTokenMock,
} = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  tokenBlacklistAddMock: vi.fn(),
  removeSessionMock: vi.fn(),
  logAuditEventMock: vi.fn(),
  verifyRefreshTokenMock: vi.fn(),
  extractTokenFromHeaderMock: vi.fn(),
  getTokenExpirationMsMock: vi.fn(),
  generateDeviceFingerprintMock: vi.fn(),
  hashTokenMock: vi.fn(),
}));

vi.mock('../config/prisma.js', () => ({
  default: prismaMock,
}));

vi.mock('../utils/cookieConfig.js', () => ({
  REFRESH_COOKIE: 'refreshToken',
  getRefreshCookieOptions: vi.fn(() => ({ path: '/api/auth' })),
  getClearCookieOptions: vi.fn(() => ({ path: '/api/auth' })),
}));

vi.mock('../utils/auditLogger.js', () => ({
  logAuditEvent: logAuditEventMock,
  generateDeviceFingerprint: generateDeviceFingerprintMock,
  getClientIP: vi.fn(),
  checkSuspiciousActivity: vi.fn(),
}));

vi.mock('../utils/jwt.js', () => ({
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyRefreshToken: verifyRefreshTokenMock,
  getAccessTokenTtlSeconds: vi.fn(),
  extractTokenFromHeader: extractTokenFromHeaderMock,
  getTokenExpirationMs: getTokenExpirationMsMock,
}));

vi.mock('../utils/tokenBlacklist.js', () => ({
  tokenBlacklist: {
    add: tokenBlacklistAddMock,
    isBlacklisted: vi.fn(),
  },
}));

vi.mock('../services/userService.js', () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn(),
  isLocked: vi.fn(),
  incrementLoginAttempts: vi.fn(),
  addSession: vi.fn(),
  removeSession: removeSessionMock,
}));

vi.mock('../services/authService.js', () => ({
  formatUserResponse: vi.fn((user) => user),
  hashToken: hashTokenMock,
  normalizePhone: vi.fn((phone) => phone),
  verifyMsg91VerificationToken: vi.fn(),
}));

vi.mock('../services/otpChallengeService.js', () => ({
  consumeVerificationToken: vi.fn(),
}));

import { logout } from '../controllers/authController.js';

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    clearCookie: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
};

describe('authController.logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logAuditEventMock.mockResolvedValue(undefined);
    extractTokenFromHeaderMock.mockReturnValue(null);
    getTokenExpirationMsMock.mockReturnValue(null);
    generateDeviceFingerprintMock.mockReturnValue('device-fingerprint');
  });

  it('clears the server session from the refresh cookie when no access token is present', async () => {
    verifyRefreshTokenMock.mockReturnValue({ sub: 'user-1' });
    hashTokenMock.mockReturnValue('hashed-refresh-cookie');
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'partner@example.com',
      refreshToken: 'hashed-refresh-cookie',
      refreshTokenExpires: new Date(Date.now() + 60_000),
    });
    prismaMock.user.update.mockResolvedValue({});

    const req = {
      headers: {},
      cookies: {
        refreshToken: 'raw-refresh-cookie',
      },
    } as any;
    const res = createResponse();

    await logout(req, res as any);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
    expect(removeSessionMock).toHaveBeenCalledWith('user-1', 'device-fingerprint');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        refreshToken: null,
        refreshTokenExpires: null,
      },
    });
    expect(logAuditEventMock).toHaveBeenCalledWith('LOGOUT', req, {
      userId: 'user-1',
      email: 'partner@example.com',
    });
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/auth' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Logged out successfully',
    });
    expect(tokenBlacklistAddMock).not.toHaveBeenCalled();
  });
});

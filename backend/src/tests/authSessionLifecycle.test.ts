import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userFindUnique = vi.fn();
const userUpdate = vi.fn();
const tokenBlacklistAdd = vi.fn();
const removeSession = vi.fn();
const logAuditEvent = vi.fn();

vi.mock('../shared/db/prisma.js', () => ({
  default: {
    user: {
      findUnique: userFindUnique,
      update: userUpdate,
    },
  },
}));

vi.mock('../shared/security/jwt.js', () => ({
  signAccessToken: vi.fn(() => 'new-access-token'),
  signRefreshToken: vi.fn(() => 'new-refresh-token'),
  verifyRefreshToken: vi.fn(() => ({
    sub: '11111111-1111-4111-8111-111111111111',
    type: 'refresh',
  })),
  getAccessTokenTtlSeconds: vi.fn(() => 900),
  extractTokenFromHeader: vi.fn((header?: string) =>
    header?.startsWith('Bearer ') ? header.slice(7) : null,
  ),
  getTokenExpirationMs: vi.fn((token: string) =>
    token === 'access-token' ? Date.now() + 900_000 : Date.now() + 604_800_000,
  ),
}));

vi.mock('../shared/security/tokenBlacklist.js', () => ({
  tokenBlacklist: { add: tokenBlacklistAdd },
}));

vi.mock('../modules/audit/auditLogger.js', () => ({
  logAuditEvent,
  generateDeviceFingerprint: vi.fn(() => 'device-fingerprint'),
  getClientIP: vi.fn(),
  checkSuspiciousActivity: vi.fn(),
}));

vi.mock('../modules/auth/user.service.js', () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn(),
  isLocked: vi.fn(),
  incrementLoginAttempts: vi.fn(),
  addSession: vi.fn(),
  removeSession,
}));

vi.mock('../modules/auth/auth.service.js', () => ({
  formatUserResponse: vi.fn(),
  hashToken: vi.fn((token: string) => `hash:${token}`),
  normalizePhone: vi.fn(),
  verifyMsg91VerificationToken: vi.fn(),
}));

vi.mock('../modules/auth/otpChallenge.service.js', () => ({
  consumeVerificationToken: vi.fn(),
}));

const { refreshAccessToken, logout } = await import('../modules/auth/auth.controller.js');

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'partner@example.test',
  firstName: 'Partner',
  lastName: 'User',
  role: 'partner',
  isActive: true,
  refreshToken: 'hash:old-refresh-token',
  refreshTokenExpires: new Date(Date.now() + 60_000),
};

const createResponse = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

describe('auth session lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindUnique.mockResolvedValue(user);
    userUpdate.mockResolvedValue(user);
  });

  it('rotates the stored refresh token and cookie on refresh', async () => {
    const req = {
      cookies: { refreshToken: 'old-refresh-token' },
      body: {},
      headers: {},
    } as unknown as Request;
    const res = createResponse();

    await refreshAccessToken(req, res);

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        refreshToken: 'hash:new-refresh-token',
        refreshTokenExpires: expect.any(Date),
      },
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'new-refresh-token',
      expect.objectContaining({ httpOnly: true, path: '/api/auth' }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        accessToken: 'new-access-token',
        expiresIn: 900,
      },
    });
  });

  it('refreshes from the cookie when the request body is missing', async () => {
    const req = {
      cookies: { refreshToken: 'old-refresh-token' },
      headers: {},
    } as unknown as Request;
    const res = createResponse();

    await refreshAccessToken(req, res);

    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: user.id },
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('blacklists the access token and clears refresh state on logout', async () => {
    const req = {
      user,
      cookies: { refreshToken: 'old-refresh-token' },
      headers: { authorization: 'Bearer access-token' },
      ip: '127.0.0.1',
      get: vi.fn(),
    } as unknown as Request;
    const res = createResponse();

    await logout(req, res);

    expect(tokenBlacklistAdd).toHaveBeenCalledWith(
      'access-token',
      expect.any(Number),
    );
    expect(removeSession).toHaveBeenCalledWith(user.id, 'device-fingerprint');
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        refreshToken: null,
        refreshTokenExpires: null,
      },
    });
    expect(res.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({ httpOnly: true, path: '/api/auth' }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

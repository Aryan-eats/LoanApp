import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-minimum-32-characters';
process.env.FIELD_ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY || Buffer.alloc(32).toString('base64');

const userFindUnique = vi.fn();
const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
  callback({
    user: { update: vi.fn() },
    activeSession: {
      upsert: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn(),
    },
  })
);
const comparePassword = vi.fn();

vi.mock('../shared/db/prisma.js', () => ({
  default: {
    user: {
      findUnique: userFindUnique,
      update: vi.fn(),
    },
    $transaction: transaction,
  },
}));

vi.mock('../modules/auth/user.service.js', () => ({
  comparePassword,
  hashPassword: vi.fn(),
  isLocked: vi.fn(() => false),
  incrementLoginAttempts: vi.fn(),
  addSession: vi.fn(),
  removeSession: vi.fn(),
}));

vi.mock('../modules/audit/auditLogger.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  generateDeviceFingerprint: vi.fn(() => 'fingerprint'),
  getClientIP: vi.fn(() => '127.0.0.1'),
  checkSuspiciousActivity: vi.fn(() => false),
}));

vi.mock('../shared/security/jwt.js', () => ({
  signAccessToken: vi.fn(() => 'access-token'),
  signRefreshToken: vi.fn(() => 'refresh-token'),
  verifyRefreshToken: vi.fn(),
  getAccessTokenTtlSeconds: vi.fn(() => 900),
  extractTokenFromHeader: vi.fn(),
  getTokenExpirationMs: vi.fn(() => Date.now() + 604_800_000),
}));

vi.mock('../modules/auth/auth.service.js', () => ({
  formatUserResponse: vi.fn((user) => ({ id: user.id, email: user.email, role: user.role })),
  hashToken: vi.fn((token: string) => `hash:${token}`),
  normalizePhone: vi.fn(),
  verifyMsg91VerificationToken: vi.fn(),
}));

vi.mock('../modules/auth/otpChallenge.service.js', () => ({
  consumeVerificationToken: vi.fn(),
}));

const { loginPartner, loginRestrictedAccess } = await import('../modules/auth/auth.controller.js');

const baseUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  password: 'hash',
  firstName: 'Test',
  lastName: 'User',
  phone: null,
  role: 'partner',
  isActive: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  failedLoginAttempts: 0,
  lockUntil: null,
  onboardingStatus: 'approved',
  refreshToken: null,
  refreshTokenExpires: null,
  createdAt: new Date(),
};

const req = (email = 'user@example.com', password = 'StrongPass1!') => ({
  body: { email, password },
  headers: {},
  ip: '127.0.0.1',
  get: vi.fn(),
}) as unknown as Request;

const res = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  cookie: vi.fn().mockReturnThis(),
}) as unknown as Response;

describe('password login portals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindUnique.mockResolvedValue(baseUser);
    comparePassword.mockResolvedValue(true);
  });

  it('allows partner users through the partner login endpoint', async () => {
    const response = res();

    await loginPartner(req(), response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(comparePassword).toHaveBeenCalledWith('StrongPass1!', 'hash');
  });

  it('rejects admin users on the partner login endpoint', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser, role: 'admin' });
    const response = res();

    await loginPartner(req(), response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(comparePassword).not.toHaveBeenCalled();
  });

  it('allows admin users through the restricted-access login endpoint', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser, role: 'manager' });
    const response = res();

    await loginRestrictedAccess(req(), response);

    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('rejects partner users on the restricted-access login endpoint', async () => {
    const response = res();

    await loginRestrictedAccess(req(), response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(comparePassword).not.toHaveBeenCalled();
  });

  it('rejects OAuth-only users without comparing a null password', async () => {
    userFindUnique.mockResolvedValue({ ...baseUser, password: null });
    const response = res();

    await loginPartner(req(), response);

    expect(comparePassword).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'GOOGLE_SIGN_IN_REQUIRED',
      message: 'This account uses Google sign-in. Continue with Google.',
    }));
  });
});

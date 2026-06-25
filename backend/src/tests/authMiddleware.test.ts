import type { Request, Response, NextFunction } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUnique = vi.fn();
const isBlacklisted = vi.fn();
const verifyAccessToken = vi.fn();

vi.mock('../shared/db/prisma.js', () => ({
  default: {
    user: { findUnique },
  },
}));

vi.mock('../shared/security/tokenBlacklist.js', () => ({
  tokenBlacklist: { isBlacklisted },
}));

vi.mock('../shared/security/jwt.js', async () => {
  const actual = await vi.importActual<typeof import('../shared/security/jwt.js')>('../shared/security/jwt.js');
  return {
    ...actual,
    verifyAccessToken,
  };
});

const { protect } = await import('../shared/middleware/auth.js');

const activeUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'cached@example.test',
  role: 'partner',
  isActive: true,
};

const createReq = (): Request => ({
  headers: { authorization: 'Bearer cached-token' },
}) as Request;

const createRes = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isBlacklisted.mockResolvedValue(false);
    verifyAccessToken.mockReturnValue({ sub: activeUser.id });
    findUnique.mockResolvedValue(activeUser);
  });

  it('reuses a recently loaded active user for the same bearer token', async () => {
    const nextA = vi.fn() as unknown as NextFunction;
    const nextB = vi.fn() as unknown as NextFunction;

    await protect(createReq(), createRes(), nextA);
    await protect(createReq(), createRes(), nextB);

    expect(nextA).toHaveBeenCalledTimes(1);
    expect(nextB).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });
});

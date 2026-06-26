import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  partnerUser: { findFirst: vi.fn() },
  partner: { findFirst: vi.fn() },
};

vi.mock('../shared/db/prisma.js', () => ({ default: prismaMock }));

const { resolvePartnerOrg } = await import('../shared/middleware/partnerContext.js');

const res = {} as Response;
const next = vi.fn() as NextFunction;

describe('resolvePartnerOrg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only resolves active partner memberships', async () => {
    const req = { user: { id: 'user-1', role: 'partner' } } as Request;
    prismaMock.partnerUser.findFirst.mockResolvedValue({ partnerId: 'partner-1' });

    await resolvePartnerOrg(req, res, next);

    expect(prismaMock.partnerUser.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: 'user-1',
        isActive: true,
        partner: { status: 'active' },
      },
    }));
    expect(req.partnerOrgId).toBe('partner-1');
  });

  it('does not resolve an owned partner unless the partner is active', async () => {
    const req = { user: { id: 'user-1', role: 'partner' } } as Request;
    prismaMock.partnerUser.findFirst.mockResolvedValue(null);
    prismaMock.partner.findFirst.mockResolvedValue(null);

    await resolvePartnerOrg(req, res, next);

    expect(prismaMock.partner.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerUserId: 'user-1', status: 'active' },
    }));
    expect(req.partnerOrgId).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

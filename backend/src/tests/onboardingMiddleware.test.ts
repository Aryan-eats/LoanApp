import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireApprovedPartnerOnboarding } from '../shared/middleware/onboarding.js';

const response = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
}) as unknown as Response;

const next: NextFunction = vi.fn();

const request = (onboardingStatus: string | null, path = '/api/partner/leads') => ({
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    role: 'partner',
    onboardingStatus,
  },
  path,
  originalUrl: path,
}) as unknown as Request;

describe('requireApprovedPartnerOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows approved partners through', () => {
    const res = response();

    requireApprovedPartnerOnboarding(request('approved'), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks pending partners from partner business APIs', () => {
    const res = response();

    requireApprovedPartnerOnboarding(request('pending'), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Partner onboarding must be completed before accessing this resource',
      code: 'ONBOARDING_REQUIRED',
    });
  });

  it('allows pending partners to read the minimal profile endpoint', () => {
    const res = response();

    requireApprovedPartnerOnboarding(request('pending', '/api/partner/profile'), res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

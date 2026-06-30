import type { NextFunction, Request, Response } from 'express';

const allowedPendingPartnerPaths = new Set([
  '/api/partner/profile',
  '/profile',
]);

export const requireApprovedPartnerOnboarding = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'partner') {
    next();
    return;
  }

  if (req.user.onboardingStatus === 'approved') {
    next();
    return;
  }

  const path = req.originalUrl || req.path;
  if (allowedPendingPartnerPaths.has(path.split('?')[0])) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Partner onboarding must be completed before accessing this resource',
    code: 'ONBOARDING_REQUIRED',
  });
};


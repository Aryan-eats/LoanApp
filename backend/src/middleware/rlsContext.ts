import type { NextFunction, Request, Response } from 'express';
import prisma from '../shared/db/prisma.js';

export const resolvePartnerOrg = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user || req.user.role !== 'partner') {
    next();
    return;
  }

  try {
    const membership = await prisma.partnerUser.findFirst({
      where: {
        userId: req.user.id,
        isActive: true,
      },
      select: { partnerId: true },
      orderBy: { createdAt: 'asc' },
    });

    if (membership?.partnerId) {
      req.partnerOrgId = membership.partnerId;
      next();
      return;
    }

    const ownedPartner = await prisma.partner.findFirst({
      where: { ownerUserId: req.user.id },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (ownedPartner?.id) {
      req.partnerOrgId = ownedPartner.id;
    }

    next();
  } catch (error) {
    console.error('resolvePartnerOrg error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve partner organisation' });
  }
};

export default resolvePartnerOrg;

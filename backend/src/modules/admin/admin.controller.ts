import { Request, Response } from 'express';
import prisma from '../../shared/db/prisma.js';
import { cacheWrap } from '../../shared/utils/cache.js';

// -- Stats -------------------------------------------------------------------

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await cacheWrap(
      'admin:stats',
      async () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const [totalUsers, activeUsers, partners, admins, verifiedUsers, newUsersThisWeek] =
          await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.user.count({ where: { role: 'partner' } }),
            prisma.user.count({ where: { role: 'admin' } }),
            prisma.user.count({ where: { isEmailVerified: true } }),
            prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
          ]);
        return { totalUsers, activeUsers, partners, admins, verifiedUsers, newUsersThisWeek };
      },
      60 // 60-second TTL
    );
    res.status(200).json({ success: true, data: { stats: data } });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


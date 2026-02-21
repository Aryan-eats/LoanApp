import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { basePrisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../services/userService.js';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats,
  updateLeadStatus,
  assignBank,
} from '../controllers/leadController.js';

const router = Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });

    res.status(200).json({
      success: true,
      count: users.length,
      data: { users },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.get('/partners', async (req: Request, res: Response): Promise<void> => {
  try {
    const where: Record<string, unknown> = { role: 'partner' };

    if (req.query.status) {
      where.isActive = req.query.status === 'approved';
    }

    const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });

    const leadCounts = await prisma.lead.groupBy({
      by: ['partnerId'],
      where: { partnerId: { in: users.map((u) => u.id) } },
      _count: { id: true },
    });
    const leadCountMap = new Map(leadCounts.map((lc) => [lc.partnerId, lc._count.id]));

    const partners = users.map((user) => ({
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      partnerType: user.partnerType || 'freelancer',
      city: user.city || 'N/A',
      status: user.isActive ? 'approved' : 'pending',
      leadsSubmitted: leadCountMap.get(user.id) || 0,
      joinedDate: user.createdAt.toISOString().split('T')[0],
      panNumber: user.panNumber || 'N/A',
      businessName: user.businessName,
      businessAddress: user.businessAddress,
      gstNumber: user.gstNumber,
      accountHolderName: user.accountHolderName,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      ifscCode: user.ifscCode,
      notes: user.internalNotes,
    }));

    res.status(200).json({
      success: true,
      count: partners.length,
      data: { partners },
    });
  } catch (error) {
    console.error('Get partners error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      res.status(400).json({
        success: false,
        message: 'Please provide email, password, firstName, lastName, and role',
      });
      return;
    }

    const validRoles = ['super_admin', 'admin', 'manager', 'agent', 'viewer'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role,
        isActive: true,
        isEmailVerified: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.get('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.put('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { firstName, lastName, phone, role, isActive, isEmailVerified, isPhoneVerified } = req.body;

    const updateData: Record<string, unknown> = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isEmailVerified !== undefined) updateData.isEmailVerified = isEmailVerified;
    if (isPhoneVerified !== undefined) updateData.isPhoneVerified = isPhoneVerified;

    let user;
    try {
      user = await prisma.user.update({
        where: { id },
        data: updateData,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }
      throw err;
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (req.user && user.id === req.user.id) {
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account from here',
      });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { isActive: true } });
    const partners = await prisma.user.count({ where: { role: 'partner' } });
    const admins = await prisma.user.count({ where: { role: 'admin' } });
    const verifiedUsers = await prisma.user.count({ where: { isEmailVerified: true } });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersThisWeek = await prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          partners,
          admins,
          verifiedUsers,
          newUsersThisWeek,
        },
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      event,
      userId,
      dateFrom,
      dateTo,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    const where: Prisma.AuditLogWhereInput = {};

    if (event && typeof event === 'string') {
      where.event = event as any;
    }

    if (userId && typeof userId === 'string') {
      where.userId = userId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom && typeof dateFrom === 'string') {
        (where.createdAt as any).gte = new Date(dateFrom);
      }
      if (dateTo && typeof dateTo === 'string') {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        (where.createdAt as any).lte = toDate;
      }
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { ip: { contains: search } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      event: log.event,
      userName: log.user
        ? `${log.user.firstName} ${log.user.lastName}`
        : 'System',
      userRole: log.user?.role || 'unknown',
      ip: log.ip,
      userAgent: log.userAgent,
      success: log.success,
      failureReason: log.failureReason,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    }));

    res.status(200).json({
      success: true,
      count: total,
      data: {
        logs: formattedLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.get('/leads/stats', getLeadStats);

router.route('/leads')
  .get(getLeads)
  .post(createLead);

router.route('/leads/:id')
  .get(getLeadById)
  .put(updateLead)
  .delete(deleteLead);

router.patch('/leads/:id/status', updateLeadStatus);

router.patch('/leads/:id/assign-bank', assignBank);

// ── Lender Document Requirements ──────────────────────────────────────────────

/**
 * GET /api/admin/docs/reqdoc
 * List all lender doc requirements, optionally filtered by lenderCode and/or loanCode.
 */
router.get('/docs/reqdoc', async (req: Request, res: Response): Promise<void> => {
  try {
    const { lenderCode, loanCode } = req.query;
    const where: Record<string, unknown> = {};
    if (lenderCode && typeof lenderCode === 'string') where.lenderCode = lenderCode;
    if (loanCode   && typeof loanCode   === 'string') where.loanCode   = loanCode;

    const docs = await basePrisma.lenderDocRequirement.findMany({
      where,
      orderBy: [
        { lenderCode: 'asc' },
        { loanCode:   'asc' },
        { sortOrder:  'asc' },
      ],
    });

    res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    console.error('Get doc requirements error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/admin/docs/reqdoc
 * Add a new document requirement for a lender + loan type.
 */
router.post('/docs/reqdoc', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      lenderCode, lenderName, loanCode, docId, docName,
      description, mandatory, acceptedFormats, maxSizeMB,
    } = req.body as {
      lenderCode: string; lenderName: string; loanCode: string;
      docId?: string; docName: string; description?: string;
      mandatory?: boolean; acceptedFormats?: string[]; maxSizeMB?: number;
    };

    if (!lenderCode || !lenderName || !loanCode || !docName) {
      res.status(400).json({ success: false, message: 'lenderCode, lenderName, loanCode and docName are required' });
      return;
    }

    const doc = await basePrisma.lenderDocRequirement.create({
      data: {
        lenderCode,
        lenderName,
        loanCode,
        docId:           docId ?? `custom_${Date.now()}`,
        docName,
        description:     description ?? null,
        mandatory:       mandatory ?? true,
        acceptedFormats: acceptedFormats ?? ['pdf', 'jpg', 'png'],
        maxSizeMB:       maxSizeMB ?? 5,
        createdBy:       req.user?.id ?? null,
      },
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, message: 'This document already exists for the selected lender and loan type' });
      return;
    }
    console.error('Create doc requirement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PATCH /api/admin/docs/reqdoc/:id
 * Update an existing document requirement (name, mandatory flag, formats, etc).
 */
router.patch('/docs/reqdoc/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { docName, description, mandatory, acceptedFormats, maxSizeMB } = req.body as {
      docName?: string; description?: string; mandatory?: boolean;
      acceptedFormats?: string[]; maxSizeMB?: number;
    };

    const updateData: Record<string, unknown> = {};
    if (docName         !== undefined) updateData.docName         = docName;
    if (description     !== undefined) updateData.description     = description;
    if (mandatory       !== undefined) updateData.mandatory       = mandatory;
    if (acceptedFormats !== undefined) updateData.acceptedFormats = acceptedFormats;
    if (maxSizeMB       !== undefined) updateData.maxSizeMB       = maxSizeMB;

    let doc;
    try {
      doc = await basePrisma.lenderDocRequirement.update({ where: { id }, data: updateData });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Document requirement not found' });
        return;
      }
      throw err;
    }

    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error('Update doc requirement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * DELETE /api/admin/docs/reqdoc/:id
 * Remove a document requirement.
 */
router.delete('/docs/reqdoc/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    try {
      await basePrisma.lenderDocRequirement.delete({ where: { id } });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Document requirement not found' });
        return;
      }
      throw err;
    }
    res.status(200).json({ success: true, message: 'Document requirement removed' });
  } catch (error) {
    console.error('Delete doc requirement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;


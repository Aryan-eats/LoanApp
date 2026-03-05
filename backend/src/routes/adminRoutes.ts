import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { basePrisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../services/userService.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { cacheWrap, cacheDelete, cacheInvalidatePattern } from '../utils/cache.js';
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

    await logAuditEvent('ADMIN_USER_CREATED' as any, req, {
      userId: req.user?.id,
      entityId: user.id,
      entityType: 'user',
      metadata: { email: email.toLowerCase(), role },
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

    // Detect role changes for ADMIN_ROLE_CHANGED
    if (role !== undefined) {
      await logAuditEvent('ADMIN_ROLE_CHANGED' as any, req, {
        userId: req.user?.id,
        entityId: id,
        entityType: 'user',
        severity: 'HIGH',
        metadata: { newRole: role, changedFields: Object.keys(updateData) },
      });
    }
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

    await logAuditEvent('ADMIN_USER_DELETED' as any, req, {
      userId: req.user?.id,
      entityId: id,
      entityType: 'user',
      severity: 'HIGH',
      metadata: { deletedEmail: user.email, deletedRole: user.role },
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

    const [logs, total, loginCount, securityCount, authCount] = await Promise.all([
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
      prisma.auditLog.count({ where: { ...where, event: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'] } } }),
      prisma.auditLog.count({ where: { ...where, event: { in: ['ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY'] } } }),
      prisma.auditLog.count({ where: { ...where, event: { in: ['REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS'] } } }),
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
      entityId: (log as any).entityId || null,
      entityType: (log as any).entityType || null,
      severity: (log as any).severity || 'LOW',
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
        counts: {
          loginEvents: loginCount,
          securityEvents: securityCount,
          authEvents: authCount,
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

// ── Audit Logs CSV Export ─────────────────────────────────────────────────────

router.get('/audit-logs/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const { event, dateFrom, dateTo, search } = req.query;

    const where: Prisma.AuditLogWhereInput = {};
    if (event && typeof event === 'string') where.event = event as any;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom && typeof dateFrom === 'string') (where.createdAt as any).gte = new Date(dateFrom);
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

    await logAuditEvent('BULK_EXPORT' as any, req, {
      userId: req.user?.id,
      severity: 'HIGH',
      metadata: { format: 'csv', filters: req.query },
    });

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const escCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const csv = [
      'Timestamp,User,Role,Event,Status,IP,EntityType,EntityId,Severity,Details',
      ...logs.map((l) => [
        escCsv(l.createdAt.toISOString()),
        escCsv(l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System'),
        escCsv(l.user?.role || 'unknown'),
        escCsv(l.event),
        escCsv(l.success ? 'Success' : 'Failed'),
        escCsv(l.ip || ''),
        escCsv((l as any).entityType || ''),
        escCsv((l as any).entityId || ''),
        escCsv((l as any).severity || 'LOW'),
        escCsv(JSON.stringify(l.metadata || l.failureReason || '')),
      ].join(',')),
    ].join('\n');

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
    const lc = typeof lenderCode === 'string' ? lenderCode : '';
    const lco = typeof loanCode === 'string' ? loanCode : '';
    const where: Record<string, unknown> = {};
    if (lc) where.lenderCode = lc;
    if (lco) where.loanCode = lco;

    const docs = await cacheWrap(
      `docs:reqdoc:${lc}:${lco}`,
      () => basePrisma.lenderDocRequirement.findMany({
        where,
        orderBy: [{ lenderCode: 'asc' }, { loanCode: 'asc' }, { sortOrder: 'asc' }],
      }),
      600 // 10-minute TTL — reference data rarely changes
    );

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

    // New requirement — bust all cached variations
    await cacheInvalidatePattern('docs:reqdoc:*');

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

    // Updated — bust all cached doc req variations
    await cacheInvalidatePattern('docs:reqdoc:*');

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

    // Deleted — bust all cached doc req variations
    await cacheInvalidatePattern('docs:reqdoc:*');

    res.status(200).json({ success: true, message: 'Document requirement removed' });
  } catch (error) {
    console.error('Delete doc requirement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Banks ────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/banks
 * List all banks with commission rates.
 */
router.get('/banks', async (_req: Request, res: Response): Promise<void> => {
  try {
    const banks = await cacheWrap(
      'banks:all',
      () => basePrisma.bank.findMany({ include: { commissionRates: true }, orderBy: { name: 'asc' } }),
      300 // 5-minute TTL — bank data is slow-moving
    );
    res.status(200).json({ success: true, count: banks.length, data: { banks } });
  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/admin/banks/:id
 * Get a single bank by ID with commission rates.
 */
router.get('/banks/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const bank = await cacheWrap(
      `banks:id:${id}`,
      () => basePrisma.bank.findUnique({ where: { id }, include: { commissionRates: true } }),
      300
    );
    if (!bank) {
      res.status(404).json({ success: false, message: 'Bank not found' });
      return;
    }
    res.status(200).json({ success: true, data: { bank } });
  } catch (error) {
    console.error('Get bank error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PATCH /api/admin/banks/:id/status
 * Toggle bank status between active and inactive.
 */
router.patch('/banks/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body as { status: 'active' | 'inactive' };

    if (!status || !['active', 'inactive'].includes(status)) {
      res.status(400).json({ success: false, message: 'status must be "active" or "inactive"' });
      return;
    }

    let bank;
    try {
      bank = await basePrisma.bank.update({
        where: { id },
        data: { status },
        include: { commissionRates: true },
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Bank not found' });
        return;
      }
      throw err;
    }

    res.status(200).json({ success: true, message: `Bank ${status === 'active' ? 'activated' : 'deactivated'}`, data: { bank } });

    // Invalidate both the list and this specific bank's cache entry
    await cacheDelete('banks:all', `banks:id:${id}`);

    await logAuditEvent('BANK_STATUS_CHANGED' as any, req, {
      userId: req.user?.id,
      entityId: id,
      entityType: 'bank',
      metadata: { status },
    });
  } catch (error) {
    console.error('Toggle bank status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PUT /api/admin/banks/:id
 * Full update of a bank and its commission rates.
 */
router.put('/banks/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const {
      name, code, status, supportedLoanTypes,
      interestRateMin, interestRateMax, processingFee,
      maxTenure, minAmount, maxAmount, processingTime,
      isPopular, features, avgTat, activeLeads,
      approvalRate, totalDisbursed, contactPerson,
      contactEmail, contactPhone, commissionRates,
    } = req.body;

    // Build update data – only include fields that were sent
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (status !== undefined) updateData.status = status;
    if (supportedLoanTypes !== undefined) updateData.supportedLoanTypes = supportedLoanTypes;
    if (interestRateMin !== undefined) updateData.interestRateMin = interestRateMin;
    if (interestRateMax !== undefined) updateData.interestRateMax = interestRateMax;
    if (processingFee !== undefined) updateData.processingFee = processingFee;
    if (maxTenure !== undefined) updateData.maxTenure = maxTenure;
    if (minAmount !== undefined) updateData.minAmount = minAmount;
    if (maxAmount !== undefined) updateData.maxAmount = maxAmount;
    if (processingTime !== undefined) updateData.processingTime = processingTime;
    if (isPopular !== undefined) updateData.isPopular = isPopular;
    if (features !== undefined) updateData.features = features;
    if (avgTat !== undefined) updateData.avgTat = avgTat;
    if (activeLeads !== undefined) updateData.activeLeads = activeLeads;
    if (approvalRate !== undefined) updateData.approvalRate = approvalRate;
    if (totalDisbursed !== undefined) updateData.totalDisbursed = totalDisbursed;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;

    // Use transaction to atomically update bank + replace commission rates
    const bank = await basePrisma.$transaction(async (tx) => {
      // Update bank fields
      const updated = await tx.bank.update({
        where: { id },
        data: updateData,
      });

      // If commission rates are provided, replace them all
      if (Array.isArray(commissionRates)) {
        await tx.bankCommissionRate.deleteMany({ where: { bankId: id } });
        if (commissionRates.length > 0) {
          await tx.bankCommissionRate.createMany({
            data: commissionRates.map((r: { loanType: string; partnerCommission: number; interestRate?: string; maxAmount?: number; minAmount?: number; maxTenure?: number }) => ({
              bankId: id,
              loanType: r.loanType,
              partnerCommission: r.partnerCommission,
              interestRate: r.interestRate ?? null,
              maxAmount: r.maxAmount ?? null,
              minAmount: r.minAmount ?? null,
              maxTenure: r.maxTenure ?? null,
            })),
          });
        }
      }

      return tx.bank.findUnique({
        where: { id: updated.id },
        include: { commissionRates: true },
      });
    });

    if (!bank) {
      res.status(404).json({ success: false, message: 'Bank not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Bank updated successfully', data: { bank } });

    // Bust both caches — list and individual entry
    await cacheDelete('banks:all', `banks:id:${id}`);

    await logAuditEvent('BANK_UPDATED' as any, req, {
      userId: req.user?.id,
      entityId: id,
      entityType: 'bank',
      metadata: {
        updatedFields: Object.keys(updateData),
        commissionRatesUpdated: Array.isArray(commissionRates),
      },
    });

    if (Array.isArray(commissionRates)) {
      await logAuditEvent('COMMISSION_RATE_CHANGED' as any, req, {
        userId: req.user?.id,
        entityId: id,
        entityType: 'bank',
        metadata: {
          ratesCount: commissionRates.length,
          loanTypes: commissionRates.map((r: { loanType: string }) => r.loanType),
        },
      });
    }
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Bank not found' });
      return;
    }
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, message: 'Bank code already exists' });
      return;
    }
    console.error('Update bank error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;


import { Request, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/client';
import type { User, AuditEventType } from '@prisma/client';
import prisma from '../../shared/db/prisma.js';
import { logAuditEvent, redactPAN, redactAadhaar } from '../audit/auditLogger.js';
import { cacheWrap, cacheDelete } from '../../shared/utils/cache.js';
import { isAdminRole } from '../users/adminPermissions.service.js';

// Derive the frontend-visible status from DB fields
const derivePartnerStatus = (user: User): string => {
  if (user.isActive) return 'approved';
  if (user.kycStatus === 'rejected') return 'rejected';
  if (user.onboardingStatus === 'approved') return 'suspended';
  return 'pending';
};

// Format partner response for API - matching frontend Partner type
const formatPartnerResponse = (user: User, leadsSubmitted = 0) => ({
  id: user.id,
  fullName: `${user.firstName} ${user.lastName}`,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  partnerType: user.partnerType || 'freelancer',
  city: user.city || '',
  state: user.state,
  pincode: user.pincode,
  status: derivePartnerStatus(user),
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
  kycStatus: user.kycStatus || 'pending',
  leadsSubmitted,
  joinedDate: user.createdAt.toISOString().split('T')[0],
  panNumber: user.panNumber || '',
  aadhaarNumber: user.aadhaarNumber,
  businessName: user.businessName,
  businessAddress: user.businessAddress,
  gstNumber: user.gstNumber,
  accountHolderName: user.accountHolderName,
  bankName: user.bankName,
  accountNumber: user.accountNumber,
  ifscCode: user.ifscCode,
  notes: user.internalNotes,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * @desc    Get all partners (with filters)
 * @route   GET /api/partners
 * @access  Private/Admin
 */
export const getPartners = async (req: Request, res: Response): Promise<void> => {
  try {
    const where: Record<string, unknown> = { role: 'partner' };

    if (req.query.status) {
      if (req.query.status === 'approved') {
        where.isActive = true;
      } else if (req.query.status === 'pending') {
        where.isActive = false;
        where.kycStatus = { not: 'rejected' };
        where.onboardingStatus = { not: 'approved' };
      } else if (req.query.status === 'rejected') {
        where.isActive = false;
        where.kycStatus = 'rejected';
      } else if (req.query.status === 'suspended') {
        where.isActive = false;
        where.onboardingStatus = 'approved';
        where.kycStatus = { not: 'rejected' };
      }
    }

    if (req.query.partnerType) {
      where.partnerType = req.query.partnerType;
    }

    if (req.query.city) {
      where.city = { contains: req.query.city as string, mode: 'insensitive' };
    }

    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const partnerIds = users.map((u) => u.id);
    const leadCounts = await prisma.lead.groupBy({
      by: ['partnerId'],
      where: { partnerId: { in: partnerIds } },
      _count: { _all: true },
    });

    const leadCountMap = new Map(
      leadCounts.map((lc) => [lc.partnerId, lc._count._all])
    );

    const partners = users.map((user) =>
      formatPartnerResponse(user, leadCountMap.get(user.id) || 0)
    );

    res.status(200).json({
      success: true,
      count: partners.length,
      data: {
        partners,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get partners error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get single partner by ID
 * @route   GET /api/partners/:id
 * @access  Private/Admin
 */
export const getPartnerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.params.id as string;

    const user = await prisma.user.findFirst({
      where: { id: partnerId, role: 'partner' },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    const leadCount = await prisma.lead.count({ where: { partnerId: user.id } });

    res.status(200).json({
      success: true,
      data: {
        partner: formatPartnerResponse(user, leadCount),
      },
    });
  } catch (error) {
    console.error('Get partner error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get current partner profile
 * @route   GET /api/partner/profile
 * @access  Private/Partner
 */
export const getCurrentPartnerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    if (req.user.role !== 'partner') {
      res.status(403).json({ success: false, message: 'Only partners can access this resource' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { id: req.user.id, role: 'partner' },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    const leadCount = await prisma.lead.count({ where: { partnerId: user.id } });

    res.status(200).json({
      success: true,
      data: {
        partner: formatPartnerResponse(user, leadCount),
      },
    });
  } catch (error) {
    console.error('Get current partner profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update partner details (admin)
 * @route   PUT /api/partners/:id
 * @access  Private/Admin
 */
export const updatePartner = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.params.id as string;

    const allowedFields = [
      'firstName',
      'lastName',
      'phone',
      'city',
      'state',
      'pincode',
      'partnerType',
      'businessName',
      'businessAddress',
      'gstNumber',
      'panNumber',
      'aadhaarNumber',
      'accountHolderName',
      'bankName',
      'accountNumber',
      'ifscCode',
      'isActive',
      'internalNotes',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const existing = await prisma.user.findFirst({
      where: { id: partnerId, role: 'partner' },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: partnerId },
      data: updateData,
    });

    if (req.user) {
      await logAuditEvent('PARTNER_UPDATED', req, {
        userId: req.user.id,
        entityId: partnerId,
        entityType: 'partner',
        metadata: {
          changedFields: Object.keys(updateData),
          previousActive: existing.isActive,
          newActive: updateData.isActive ?? existing.isActive,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Partner updated successfully',
      data: { partner: formatPartnerResponse(user) },
    });
  } catch (error) {
    console.error('Update partner error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Approve/Reject/Suspend partner
 * @route   PATCH /api/partners/:id/status
 * @access  Private/Admin
 */
export const updatePartnerStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.params.id as string;
    const { status, reason } = req.body;

    if (!status || !['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: approved, rejected, suspended, or pending',
      });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { id: partnerId, role: 'partner' },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    const updateData: Record<string, unknown> = {
      isActive: status === 'approved',
    };

    if (status === 'approved') {
      updateData.onboardingStatus = 'approved';
      updateData.onboardingCompletedAt = new Date();
      updateData.kycStatus = 'verified';
    } else if (status === 'rejected') {
      updateData.onboardingStatus = 'rejected';
      updateData.kycStatus = 'rejected';
      if (reason) updateData.internalNotes = reason;
    } else if (status === 'pending') {
      updateData.onboardingStatus = 'pending';
      updateData.kycStatus = 'pending';
    }
    // For 'suspended', isActive is already set to false above.
    // onboardingStatus stays 'approved' so we can distinguish from pending.

    const user = await prisma.user.update({
      where: { id: partnerId },
      data: updateData,
    });

    if (req.user) {
      const eventType: AuditEventType = status === 'approved' ? 'PARTNER_APPROVED'
        : (status === 'suspended' || status === 'rejected') ? 'PARTNER_SUSPENDED'
        : 'PARTNER_UPDATED';
      await logAuditEvent(eventType, req, {
        userId: req.user.id,
        entityId: partnerId,
        entityType: 'partner',
        severity: eventType === 'PARTNER_SUSPENDED' ? 'HIGH' : 'MEDIUM',
        metadata: { status, reason, previousActive: existing.isActive },
      });
    }

    // Partner counts changed - bust the stats cache
    await cacheDelete('partner:stats');

    res.status(200).json({
      success: true,
      message: `Partner ${status} successfully`,
      data: { partner: formatPartnerResponse(user) },
    });
  } catch (error) {
    console.error('Update partner status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get leads for specific partner
 * @route   GET /api/partners/:id/leads
 * @access  Private/Admin
 */
export const getPartnerLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.params.id as string;

    const partner = await prisma.user.findFirst({
      where: { id: partnerId, role: 'partner' },
    });
    if (!partner) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    const where: Record<string, unknown> = { partnerId };
    if (req.query.status) {
      where.status = req.query.status;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        leads: leads.map((lead) => ({
          id: lead.id,
          client: {
            fullName: lead.clientFullName,
            phone: lead.clientPhone,
            email: lead.clientEmail,
            dateOfBirth: lead.clientDateOfBirth || undefined,
            panNumber: lead.clientPanNumber || undefined,
            aadhaarNumber: lead.clientAadhaar || undefined,
            employmentType: lead.clientEmployment || undefined,
            monthlyIncome: lead.clientIncome ? Number(lead.clientIncome) : undefined,
            companyName: lead.clientCompany || undefined,
            workExperience: lead.clientExperience || undefined,
            city: lead.clientCity || undefined,
            pincode: lead.clientPincode || undefined,
          },
          loanType: lead.loanType,
          loanAmount: Number(lead.loanAmount),
          status: lead.status,
          bankAssigned: lead.bankAssigned,
          createdAt: lead.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get partner leads error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get commissions for partner
 * @route   GET /api/partners/:id/commissions
 * @access  Private/Admin
 */
export const getPartnerCommissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.params.id as string;

    const partner = await prisma.user.findFirst({
      where: { id: partnerId, role: 'partner' },
    });

    if (!partner) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    const leads = await prisma.lead.findMany({
      where: {
        partnerId,
        status: 'disbursed',
        commissionAmount: { gt: 0 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const commissions = leads.map((lead) => ({
      id: lead.id,
      leadId: lead.id,
      clientName: lead.clientFullName,
      loanType: lead.loanType,
      disbursedAmount: Number(lead.disbursedAmount || lead.loanAmount),
      commissionRate: Number(lead.commissionRate || 0),
      commissionAmount: Number(lead.commissionAmount || 0),
      status: lead.commissionStatus || 'pending',
      paidAt: lead.commissionPaidAt || undefined,
      createdAt: lead.createdAt,
    }));

    const totalCommission = leads.reduce(
      (sum, lead) => sum.plus(lead.commissionAmount?.toString() ?? '0'),
      new Decimal(0)
    );
    const paidCommission = leads
      .filter((lead) => lead.commissionStatus === 'paid')
      .reduce((sum, lead) => sum.plus(lead.commissionAmount?.toString() ?? '0'), new Decimal(0));
    const pendingCommission = totalCommission.minus(paidCommission);

    res.status(200).json({
      success: true,
      data: {
        commissions,
        summary: {
          total: totalCommission.toNumber(),
          paid: paidCommission.toNumber(),
          pending: pendingCommission.toNumber(),
          count: commissions.length,
        },
      },
    });
  } catch (error) {
    console.error('Get partner commissions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update partner profile (self-update)
 * @route   PUT /api/partners/:id/profile
 * @access  Private/Admin or Self
 */
export const updatePartnerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.params.id as string;

    if (req.user && !isAdminRole(req.user.role) && req.user.id !== partnerId) {
      res.status(403).json({ success: false, message: 'Not authorized to update this profile' });
      return;
    }

    const allowedFields = [
      'firstName',
      'lastName',
      'phone',
      'city',
      'state',
      'pincode',
      'businessName',
      'businessAddress',
      'accountHolderName',
      'bankName',
      'accountNumber',
      'ifscCode',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const existing = await prisma.user.findFirst({
      where: { id: partnerId, role: 'partner' },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: partnerId },
      data: updateData,
    });

    if (req.user) {
      await logAuditEvent('PARTNER_UPDATED', req, {
        userId: req.user.id,
        entityId: partnerId,
        entityType: 'partner',
        metadata: { changedFields: Object.keys(updateData), selfUpdate: req.user.id === partnerId },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { partner: formatPartnerResponse(user) },
    });
  } catch (error) {
    console.error('Update partner profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Submit KYC documents
 * @route   POST /api/partners/:id/kyc
 * @access  Private/Admin or Self
 */
export const submitPartnerKYC = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.params.id as string;

    if (req.user && !isAdminRole(req.user.role) && req.user.id !== partnerId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    const { panNumber, aadhaarNumber } = req.body;

    const updateData: Record<string, unknown> = {
      kycStatus: 'pending',
    };

    if (panNumber) updateData.panNumber = panNumber;
    if (aadhaarNumber) updateData.aadhaarNumber = aadhaarNumber;

    const existing = await prisma.user.findFirst({
      where: { id: partnerId, role: 'partner' },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: partnerId },
      data: updateData,
    });

    if (req.user) {
      await logAuditEvent('PARTNER_KYC_UPDATED', req, {
        userId: req.user.id,
        entityId: partnerId,
        entityType: 'partner',
        metadata: {
          panProvided: !!panNumber,
          aadhaarProvided: !!aadhaarNumber,
          ...(panNumber ? { panRedacted: redactPAN(panNumber) } : {}),
          ...(aadhaarNumber ? { aadhaarRedacted: redactAadhaar(aadhaarNumber) } : {}),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'KYC documents submitted successfully',
      data: { partner: formatPartnerResponse(user) },
    });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update KYC status
 * @route   PATCH /api/partners/:id/kyc/status
 * @access  Private/Admin
 */
export const updatePartnerKYCStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.params.id as string;
    const { status, rejectionReason } = req.body;

    if (!status || !['pending', 'verified', 'rejected'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid KYC status. Must be: pending, verified, or rejected',
      });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { id: partnerId, role: 'partner' },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    const updateData: Record<string, unknown> = {
      kycStatus: status,
    };

    if (status === 'verified') {
      updateData.isActive = true;
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.kycRejectionReason = rejectionReason;
    }

    const user = await prisma.user.update({
      where: { id: partnerId },
      data: updateData,
    });

    if (req.user) {
      await logAuditEvent('PARTNER_KYC_UPDATED', req, {
        userId: req.user.id,
        entityId: partnerId,
        entityType: 'partner',
        metadata: {
          kycStatus: status,
          previousKycStatus: existing.kycStatus,
          rejectionReason: rejectionReason || undefined,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `KYC ${status} successfully`,
      data: { partner: formatPartnerResponse(user) },
    });
  } catch (error) {
    console.error('Update KYC status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get partner statistics
 * @route   GET /api/partners/stats
 * @access  Private/Admin
 */
export const getPartnerStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await cacheWrap(
      'partner:stats',
      async () => {
        const [totalPartners, activePartners, pendingPartners, byType] = await Promise.all([
          prisma.user.count({ where: { role: 'partner' } }),
          prisma.user.count({ where: { role: 'partner', isActive: true } }),
          prisma.user.count({ where: { role: 'partner', isActive: false } }),
          prisma.user.groupBy({
            by: ['partnerType'],
            where: { role: 'partner' },
            _count: { _all: true },
          }),
        ]);
        return {
          total: totalPartners,
          active: activePartners,
          pending: pendingPartners,
          byType: byType.map((t) => ({ type: t.partnerType || 'unknown', count: t._count._all })),
        };
      },
      60 // 60-second TTL
    );

    res.status(200).json({ success: true, data: { stats: data } });
  } catch (error) {
    console.error('Get partner stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

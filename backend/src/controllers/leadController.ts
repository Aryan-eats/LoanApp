import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import type { LeadStatus } from '@prisma/client';
import prisma, { basePrisma } from '../config/prisma.js';
import { cacheWrap, cacheDelete } from '../utils/cache.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { getRequiredDocTypes } from '../data/loanDocsMap.js';
import { formatLeadResponse } from '../utils/leadHelpers.js';

/**
 * @desc    Create a new lead
 * @route   POST /api/partner/leads
 * @access  Private (Partner)
 */
export const createLead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    const {
      fullName, phone, email, dateOfBirth, panNumber,
      employmentType, monthlyIncome, companyName,
      workExperience, city, pincode, loanType, loanAmount, tenure,
    } = req.body;

    const firstName = req.user.firstName ?? '';
    const lastName = req.user.lastName ?? '';
    const combinedName = `${firstName} ${lastName}`.trim();
    const partnerName = combinedName || req.user.email || 'Unknown';

    if (!fullName || !phone || !email || !loanType || !loanAmount) {
      res.status(400).json({
        success: false,
        message: 'Please provide fullName, phone, email, loanType, and loanAmount',
      });
      return;
    }

    const parsedLoanAmount = Number(loanAmount);
    if (!Number.isFinite(parsedLoanAmount) || parsedLoanAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'loanAmount must be a valid positive number',
      });
      return;
    }
    if (parsedLoanAmount < 10_000) {
      res.status(400).json({
        success: false,
        message: 'Loan amount must be at least ₹10,000',
      });
      return;
    }
    if (parsedLoanAmount > 10_00_00_000) {
      res.status(400).json({
        success: false,
        message: 'Contact office for high-value loans above ₹10 Cr',
      });
      return;
    }

    const lead = await prisma.lead.create({
      data: {
        clientFullName: fullName,
        clientPhone: phone,
        clientEmail: email,
        clientDateOfBirth: dateOfBirth || null,
        clientPanNumber: panNumber || null,
        clientAadhaar: req.body.aadhaarNumber || null,
        clientEmployment: employmentType || null,
        clientIncome: monthlyIncome ?? null,
        clientCompany: companyName || null,
        clientExperience: workExperience ?? null,
        clientCity: city || null,
        clientPincode: pincode || null,
        loanType,
        loanAmount,
        tenure: tenure ?? null,
        partnerId: req.user.id,
        partnerName,
        status: 'submitted',
        timeline: {
          create: {
            status: 'submitted',
            timestamp: new Date(),
            updatedBy: 'System',
            note: 'Lead submitted',
          },
        },
      },
      include: { documents: true, timeline: true },
    });

    await logAuditEvent('LEAD_CREATED', req, {
      userId: req.user.id,
      entityId: lead.id,
      entityType: 'lead',
      metadata: { loanType: lead.loanType, loanAmount: Number(lead.loanAmount) },
    });

    await cacheDelete(`lead:stats:${req.user.id}`, 'lead:stats:all');

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: { lead: formatLeadResponse(lead) },
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get all leads (filtered by partner for partners, all for admins)
 * @route   GET /api/partner/leads or GET /api/admin/leads
 * @access  Private
 */
export const getLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    const where: Record<string, unknown> = {};
    if (req.user.role === 'partner') where.partnerId = req.user.id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.loanType) where.loanType = req.query.loanType;

    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { clientFullName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search, mode: 'insensitive' } },
        { clientEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const allowedSortFields = new Set(['createdAt', 'updatedAt', 'loanAmount', 'status', 'loanType']);
    const sortField = allowedSortFields.has(req.query.sortBy as string)
      ? (req.query.sortBy as string)
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limit,
        include: { documents: true, timeline: true },
      }),
      prisma.lead.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        leads: leads.map(formatLeadResponse),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get single lead by ID
 * @route   GET /api/partner/leads/:id or GET /api/admin/leads/:id
 * @access  Private
 */
export const getLeadById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    const leadId = req.params.id as string;
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { documents: true, timeline: true },
    });

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    if (req.user.role === 'partner' && lead.partnerId !== req.user.id) {
      res.status(403).json({ success: false, message: 'Not authorized to access this lead' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { lead: formatLeadResponse(lead) },
    });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update lead
 * @route   PUT /api/partner/leads/:id or PUT /api/admin/leads/:id
 * @access  Private
 */
export const updateLead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    const leadId = req.params.id as string;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    if (req.user.role === 'partner' && lead.partnerId !== req.user.id) {
      res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
      return;
    }

    const partnerAllowedFields = ['loanAmount', 'tenure'];
    const adminAllowedFields = [
      ...partnerAllowedFields,
      'status', 'bankAssigned', 'bankLogo',
      'sanctionedAmount', 'disbursedAmount', 'interestRate', 'emi', 'internalNotes',
    ];
    const allowedFields = req.user.role === 'admin' ? adminAllowedFields : partnerAllowedFields;
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    const statusChanged = updateData.status && updateData.status !== lead.status;

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: leadId }, data: updateData });

      if (statusChanged) {
        const newStatus = updateData.status as LeadStatus;
        await tx.leadTimeline.create({
          data: {
            leadId,
            status: newStatus,
            timestamp: new Date(),
            updatedBy: `${req.user?.firstName} ${req.user?.lastName}`,
            note: req.body.statusNote || `Status changed to ${newStatus}`,
          },
        });
      }
    });

    const updatedLead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { documents: true, timeline: true },
    });

    if (!updatedLead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    await logAuditEvent(statusChanged ? 'LEAD_STATUS_CHANGED' : 'LEAD_UPDATED', req, {
      userId: req.user.id,
      entityId: leadId,
      entityType: 'lead',
      metadata: {
        changedFields: Object.keys(updateData),
        ...(statusChanged ? { previousStatus: lead.status, newStatus: updateData.status } : {}),
      },
    });

    await cacheDelete(`lead:stats:${lead.partnerId}`, 'lead:stats:all');

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: { lead: formatLeadResponse(updatedLead) },
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Delete lead
 * @route   DELETE /api/admin/leads/:id
 * @access  Private (Admin only)
 */
export const deleteLead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only admins can delete leads' });
      return;
    }

    const leadId = req.params.id as string;
    const leadToDelete = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!leadToDelete) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    try {
      await prisma.lead.delete({ where: { id: leadId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        res.status(404).json({ success: false, message: 'Lead not found' });
        return;
      }
      throw error;
    }

    await logAuditEvent('LEAD_DELETED', req, {
      userId: req.user.id,
      entityId: leadId,
      entityType: 'lead',
      severity: 'HIGH',
      metadata: {
        loanType: leadToDelete.loanType,
        loanAmount: Number(leadToDelete.loanAmount),
        clientName: leadToDelete.clientFullName,
      },
    });

    await cacheDelete(`lead:stats:${leadToDelete.partnerId}`, 'lead:stats:all');

    res.status(200).json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get lead statistics for dashboard
 * @route   GET /api/partner/leads/stats or GET /api/admin/leads/stats
 * @access  Private
 */
export const getLeadStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    const isPartner = req.user.role === 'partner';
    const cacheKey = `lead:stats:${isPartner ? req.user.id : 'all'}`;
    const where: Record<string, unknown> = {};
    if (isPartner) where.partnerId = req.user.id;

    const data = await cacheWrap(
      cacheKey,
      async () => {
        const [statusCounts, loanTypeCounts] = await Promise.all([
          prisma.lead.groupBy({
            by: ['status'], where,
            _count: { _all: true }, _sum: { loanAmount: true },
          }),
          prisma.lead.groupBy({
            by: ['loanType'], where,
            _count: { _all: true },
            orderBy: { _count: { loanType: 'desc' } }, take: 10,
          }),
        ]);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentLeads = await prisma.lead.count({
          where: { ...where, createdAt: { gte: sevenDaysAgo } },
        });

        const stats: Record<string, number> = {};
        let totalLeads = 0;
        let totalAmount = new Decimal(0);
        statusCounts.forEach((item) => {
          stats[item.status] = item._count._all;
          totalLeads += item._count._all;
          totalAmount = totalAmount.plus(item._sum.loanAmount?.toString() ?? '0');
        });

        return {
          total: totalLeads,
          totalAmount: totalAmount.toNumber(),
          byStatus: stats,
          byLoanType: loanTypeCounts.map((item) => ({
            type: item.loanType, count: item._count._all,
          })),
          recentLeads,
        };
      },
      30 // 30-second TTL
    );

    res.status(200).json({ success: true, data: { stats: data } });
  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update lead status with timeline entry
 * @route   PATCH /api/partner/leads/:id/status or PATCH /api/admin/leads/:id/status
 * @access  Private
 */
export const updateLeadStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    const { status, note } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: 'Status is required' });
      return;
    }

    const validStatuses: LeadStatus[] = [
      'draft', 'submitted', 'docs_pending', 'docs_uploaded', 'docs_collected',
      'bank_processing', 'bank_logged', 'approved', 'disbursed', 'rejected',
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const leadId = req.params.id as string;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    if (req.user.role === 'partner') {
      if (lead.partnerId !== req.user.id) {
        res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
        return;
      }
      const partnerAllowed: LeadStatus[] = ['submitted', 'docs_pending', 'docs_uploaded'];
      if (!partnerAllowed.includes(status)) {
        res.status(403).json({
          success: false,
          message: 'Partners can only update status to docs_pending, submitted, or docs_uploaded',
        });
        return;
      }
    }

    // Block docs_pending unless a bank has been assigned
    if (status === 'docs_pending' && !lead.bankAssigned) {
      res.status(400).json({
        success: false,
        message: 'Cannot move to docs_pending: a bank must be assigned to this lead first',
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: leadId }, data: { status } });

      await tx.leadTimeline.create({
        data: {
          leadId, status, timestamp: new Date(),
          updatedBy: `${req.user?.firstName} ${req.user?.lastName}`,
          note: note || `Status updated to ${status}`,
        },
      });

      // When transitioning to docs_pending, auto-create required document slots
      // using the assigned bank's document requirements
      if (status === 'docs_pending') {
        const existingDocCount = await tx.leadDocument.count({ where: { leadId } });
        if (existingDocCount === 0) {
          let requiredDocs: string[] = [];
          const dedupeDocNames = (rows: Array<{ docId: string; docName: string }>) => {
            const seen = new Set<string>();
            return rows
              .filter((r) => {
                if (seen.has(r.docId)) return false;
                seen.add(r.docId);
                return true;
              })
              .map((r) => r.docName);
          };

          // Prefer bankCode. For legacy/manual rows where only bankAssigned exists,
          // resolve the code by bank name before fetching requirements.
          let bankCodeToUse = lead.bankCode || '';
          if (!bankCodeToUse && lead.bankAssigned) {
            const matchedBank = await tx.bank.findFirst({
              where: { name: { equals: lead.bankAssigned, mode: 'insensitive' } },
              select: { code: true },
            });
            bankCodeToUse = matchedBank?.code || '';

            // Persist resolved code so future lookups stay bank-specific.
            if (bankCodeToUse) {
              await tx.lead.update({
                where: { id: leadId },
                data: { bankCode: bankCodeToUse },
              });
            }
          }

          if (bankCodeToUse) {
            const bankDocs = await tx.lenderDocRequirement.findMany({
              where: { lenderCode: bankCodeToUse, loanCode: lead.loanType },
              orderBy: [{ mandatory: 'desc' }, { sortOrder: 'asc' }],
            });

            if (bankDocs.length > 0) {
              requiredDocs = dedupeDocNames(bankDocs);
            }
          }

          // Fallback: try lenderName match when code mapping is missing/inconsistent.
          if (requiredDocs.length === 0 && lead.bankAssigned) {
            const bankDocsByName = await tx.lenderDocRequirement.findMany({
              where: {
                lenderName: { equals: lead.bankAssigned, mode: 'insensitive' },
                loanCode: lead.loanType,
              },
              orderBy: [{ mandatory: 'desc' }, { sortOrder: 'asc' }],
            });
            if (bankDocsByName.length > 0) {
              requiredDocs = dedupeDocNames(bankDocsByName);
            }
          }

          // Fall back to static map if no bank-specific docs found
          if (requiredDocs.length === 0) {
            requiredDocs = getRequiredDocTypes(lead.loanType);
          }

          await tx.leadDocument.createMany({
            data: requiredDocs.map((docType) => ({
              leadId, type: docType, fileName: '',
              status: 'pending' as const, uploadedBy: 'System',
            })),
          });
        }
      }
    });

    const updatedLead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { documents: true, timeline: true },
    });

    await logAuditEvent('LEAD_STATUS_CHANGED', req, {
      userId: req.user.id,
      entityId: leadId,
      entityType: 'lead',
      metadata: { previousStatus: lead.status, newStatus: status, note },
    });

    await cacheDelete(`lead:stats:${lead.partnerId}`, 'lead:stats:all');

    res.status(200).json({
      success: true,
      message: 'Lead status updated successfully',
      data: { lead: updatedLead ? formatLeadResponse(updatedLead) : undefined },
    });
  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Assign bank to a lead
 * @route   PATCH /api/admin/leads/:id/assign-bank
 * @access  Private (Admin only)
 */
export const assignBank = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only admins can assign banks to leads' });
      return;
    }

    const { bankName, bankCode, bankLogo, note } = req.body;

    if (!bankName) {
      res.status(400).json({ success: false, message: 'Bank name is required' });
      return;
    }

    // Resolve bank code: prefer explicit bankCode, otherwise look up by name
    let resolvedBankCode = typeof bankCode === 'string' ? bankCode : '';
    if (!resolvedBankCode) {
      const bank = await basePrisma.bank.findFirst({
        where: { name: bankName },
        select: { code: true },
      });
      resolvedBankCode = bank?.code || '';
    }

    const leadId = req.params.id as string;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    const previousBank = lead.bankAssigned;
    const timelineEntries: { status: LeadStatus; note: string }[] = [
      {
        status: lead.status,
        note: note ||
          `Bank assigned: ${bankName}${previousBank ? ` (previously: ${previousBank})` : ''}`,
      },
    ];

    let newStatus: LeadStatus | undefined;
    if (lead.status === 'submitted' || lead.status === 'docs_uploaded' || lead.status === 'docs_pending') {
      newStatus = 'bank_processing';
      timelineEntries.push({
        status: 'bank_processing',
        note: 'Status updated to bank_processing after bank assignment',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          bankAssigned: bankName,
          bankCode: resolvedBankCode || null,
          bankLogo: bankLogo || null,
          status: newStatus || lead.status,
        },
      });

      for (const entry of timelineEntries) {
        await tx.leadTimeline.create({
          data: {
            leadId, status: entry.status, timestamp: new Date(),
            updatedBy: `${req.user?.firstName} ${req.user?.lastName}`,
            note: entry.note,
          },
        });
      }
    });

    const updatedLead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { documents: true, timeline: true },
    });

    await logAuditEvent('LEAD_ASSIGNED', req, {
      userId: req.user.id,
      entityId: leadId,
      entityType: 'lead',
      metadata: { bankName, previousBank: lead.bankAssigned || null },
    });

    await cacheDelete(`lead:stats:${lead.partnerId}`, 'lead:stats:all');

    res.status(200).json({
      success: true,
      message: `Bank "${bankName}" assigned to lead successfully`,
      data: { lead: updatedLead ? formatLeadResponse(updatedLead) : undefined },
    });
  } catch (error) {
    console.error('Assign bank error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import type { Lead, LeadDocument, LeadTimeline, LeadStatus } from '@prisma/client';
import prisma from '../config/prisma.js';
import { logAuditEvent } from '../utils/auditLogger.js';

type LeadWithRelations = Lead & {
  documents: LeadDocument[];
  timeline: LeadTimeline[];
};

const formatLeadResponse = (lead: LeadWithRelations) => {
  const eligibilityResult =
    lead.isEligible !== null ||
    lead.maxLoanAmount !== null ||
    lead.minLoanAmount !== null ||
    lead.estimatedEMI !== null ||
    lead.eligibilityCheckedAt !== null
      ? {
          isEligible: lead.isEligible ?? false,
          maxLoanAmount: lead.maxLoanAmount ? Number(lead.maxLoanAmount) : undefined,
          minLoanAmount: lead.minLoanAmount ? Number(lead.minLoanAmount) : undefined,
          estimatedEMI: lead.estimatedEMI ? Number(lead.estimatedEMI) : undefined,
          checkedAt: lead.eligibilityCheckedAt?.toISOString(),
        }
      : undefined;

  const commission =
    lead.commissionAmount !== null ||
    lead.commissionRate !== null ||
    lead.commissionStatus !== null ||
    lead.commissionPaidAt !== null
      ? {
          amount: lead.commissionAmount ? Number(lead.commissionAmount) : undefined,
          rate: lead.commissionRate ? Number(lead.commissionRate) : undefined,
          status: lead.commissionStatus || undefined,
          paidAt: lead.commissionPaidAt?.toISOString(),
        }
      : undefined;

  return {
    id: lead.id,
    client: {
      id: lead.id,
      fullName: lead.clientFullName || 'Unknown',
      phone: lead.clientPhone || '',
      email: lead.clientEmail || '',
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
    tenure: lead.tenure || undefined,
    sanctionedAmount: lead.sanctionedAmount ? Number(lead.sanctionedAmount) : undefined,
    disbursedAmount: lead.disbursedAmount ? Number(lead.disbursedAmount) : undefined,
    interestRate: lead.interestRate ? Number(lead.interestRate) : undefined,
    emi: lead.emi ? Number(lead.emi) : undefined,
    status: lead.status,
    bankAssigned: lead.bankAssigned || undefined,
    bankLogo: lead.bankLogo || undefined,
    preferredBank: lead.preferredBank || undefined,
    partnerId: lead.partnerId || 'SYSTEM',
    partnerName: lead.partnerName || 'Website Direct',
    documents: (lead.documents || []).map((doc: LeadDocument) => ({
      id: doc.id,
      type: doc.type,
      fileName: doc.fileName,
      fileSize: doc.fileSize || undefined,
      fileUrl: doc.fileUrl || undefined,
      mimeType: doc.mimeType || undefined,
      uploadedBy: doc.uploadedBy || undefined,
      r2ObjectKey: doc.r2ObjectKey || undefined,
      uploadedAt: doc.uploadedAt?.toISOString(),
      status: doc.status,
      rejectionReason: doc.rejectionReason || undefined,
    })),
    timeline: (lead.timeline || []).map((event: LeadTimeline) => ({
      id: event.id,
      status: event.status,
      timestamp: event.timestamp?.toISOString(),
      note: event.note || undefined,
      updatedBy: event.updatedBy,
    })),
    eligibilityResult,
    commission,
    createdAt: lead.createdAt?.toISOString().split('T')[0] || '',
    updatedAt: lead.updatedAt?.toISOString().split('T')[0] || '',
  };
};

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
      fullName,
      phone,
      email,
      dateOfBirth,
      panNumber,
      employmentType,
      monthlyIncome,
      companyName,
      workExperience,
      city,
      pincode,
      loanType,
      loanAmount,
      tenure,
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

    await logAuditEvent('REGISTER', req, {
      userId: req.user.id,
      metadata: { action: 'CREATE_LEAD', leadId: lead.id },
    });

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
    if (req.user.role === 'partner') {
      where.partnerId = req.user.id;
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.loanType) {
      where.loanType = req.query.loanType;
    }

    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { clientFullName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search, mode: 'insensitive' } },
        { clientEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const allowedSortFields = new Set([
      'createdAt',
      'updatedAt',
      'loanAmount',
      'status',
      'loanType',
    ]);

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
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
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
      'status',
      'bankAssigned',
      'bankLogo',
      'sanctionedAmount',
      'disbursedAmount',
      'interestRate',
      'emi',
      'internalNotes',
    ];

    const allowedFields = req.user.role === 'admin' ? adminAllowedFields : partnerAllowedFields;
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const statusChanged = updateData.status && updateData.status !== lead.status;

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: updateData,
      });

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

    await logAuditEvent('REGISTER', req, {
      userId: req.user.id,
      metadata: { action: 'UPDATE_LEAD', leadId: leadId, changes: Object.keys(updateData) },
    });

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

    try {
      await prisma.lead.delete({ where: { id: leadId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        res.status(404).json({ success: false, message: 'Lead not found' });
        return;
      }
      throw error;
    }

    await logAuditEvent('REGISTER', req, {
      userId: req.user.id,
      metadata: { action: 'DELETE_LEAD', leadId: leadId },
    });

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully',
    });
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

    const where: Record<string, unknown> = {};
    if (req.user.role === 'partner') {
      where.partnerId = req.user.id;
    }

    const statusCounts = await prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
      _sum: { loanAmount: true },
    });

    const loanTypeCounts = await prisma.lead.groupBy({
      by: ['loanType'],
      where,
      _count: { _all: true },
      orderBy: { _count: { loanType: 'desc' } },
      take: 10,
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLeads = await prisma.lead.count({
      where: { ...where, createdAt: { gte: sevenDaysAgo } },
    });

    const stats: Record<string, number> = {};
    let totalLeads = 0;
    let totalAmount = 0;

    statusCounts.forEach((item: any) => {
      stats[item.status] = item._count._all;
      totalLeads += item._count._all;
      totalAmount += Number(item._sum.loanAmount || 0);
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total: totalLeads,
          totalAmount,
          byStatus: stats,
          byLoanType: loanTypeCounts.map((item: any) => ({
            type: item.loanType,
            count: item._count._all,
          })),
          recentLeads,
        },
      },
    });
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
      'draft',
      'submitted',
      'docs_pending',
      'docs_uploaded',
      'bank_processing',
      'approved',
      'disbursed',
      'rejected',
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
      if (status !== 'docs_uploaded' && status !== 'submitted' && status !== 'docs_pending') {
        res.status(403).json({
          success: false,
          message: 'Partners can only update status to docs_pending, submitted, or docs_uploaded',
        });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: { status },
      });

      await tx.leadTimeline.create({
        data: {
          leadId,
          status,
          timestamp: new Date(),
          updatedBy: `${req.user?.firstName} ${req.user?.lastName}`,
          note: note || `Status updated to ${status}`,
        },
      });
    });

    const updatedLead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { documents: true, timeline: true },
    });

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

    const { bankName, bankLogo, note } = req.body;

    if (!bankName) {
      res.status(400).json({ success: false, message: 'Bank name is required' });
      return;
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
          bankLogo: bankLogo || null,
          status: newStatus || lead.status,
        },
      });

      for (const entry of timelineEntries) {
        await tx.leadTimeline.create({
          data: {
            leadId,
            status: entry.status,
            timestamp: new Date(),
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

    await logAuditEvent('REGISTER', req, {
      userId: req.user.id,
      metadata: { action: 'ASSIGN_BANK', leadId: leadId, bank: bankName },
    });

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

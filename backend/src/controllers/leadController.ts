import { Request, Response } from 'express';
import Lead, { ILead, LeadStatus } from '../models/Lead.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import mongoose from 'mongoose';

// Format lead response for API - matching frontend Lead type
const formatLeadResponse = (lead: ILead) => ({
  id: lead._id.toString(),
  client: {
    id: lead._id.toString(),
    fullName: lead.client.fullName,
    phone: lead.client.phone,
    email: lead.client.email,
    dateOfBirth: lead.client.dateOfBirth,
    panNumber: lead.client.panNumber,
    aadhaarNumber: lead.client.aadhaarNumber,
    employmentType: lead.client.employmentType,
    monthlyIncome: lead.client.monthlyIncome,
    companyName: lead.client.companyName,
    workExperience: lead.client.workExperience,
    city: lead.client.city,
    pincode: lead.client.pincode,
  },
  loanType: lead.loanType,
  loanAmount: lead.loanAmount,
  tenure: lead.tenure,
  sanctionedAmount: lead.sanctionedAmount,
  disbursedAmount: lead.disbursedAmount,
  interestRate: lead.interestRate,
  emi: lead.emi,
  status: lead.status,
  bankAssigned: lead.bankAssigned,
  bankLogo: lead.bankLogo,
  partnerId: lead.partnerId,
  partnerName: lead.partnerName,
  documents: lead.documents.map((doc) => ({
    id: doc._id?.toString() || doc.type,
    type: doc.type,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    uploadedAt: doc.uploadedAt?.toISOString(),
    status: doc.status,
    rejectionReason: doc.rejectionReason,
  })),
  timeline: lead.timeline.map((event) => ({
    id: event._id?.toString() || event.status,
    status: event.status,
    timestamp: event.timestamp.toISOString(),
    note: event.note,
    updatedBy: event.updatedBy,
  })),
  eligibilityResult: lead.eligibilityResult,
  commission: lead.commission ? {
    amount: lead.commission.amount,
    rate: lead.commission.rate,
    status: lead.commission.status,
    paidAt: lead.commission.paidAt?.toISOString(),
  } : undefined,
  createdAt: lead.createdAt.toISOString().split('T')[0],
  updatedAt: lead.updatedAt.toISOString().split('T')[0],
});

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
      // Client details
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
      // Loan details
      loanType,
      loanAmount,
      tenure,
    } = req.body;

    // Validate required fields
    if (!fullName || !phone || !email || !loanType || !loanAmount) {
      res.status(400).json({
        success: false,
        message: 'Please provide fullName, phone, email, loanType, and loanAmount',
      });
      return;
    }

    // Create lead with client nested object
    const lead = await Lead.create({
      client: {
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
      },
      loanType,
      loanAmount,
      tenure,
      partnerId: req.user._id,
      partnerName: `${req.user.firstName} ${req.user.lastName}`,
      status: 'submitted',
    });

    // Log audit event
    await logAuditEvent('REGISTER', req, {
      userId: req.user._id.toString(),
      metadata: { action: 'CREATE_LEAD', leadId: lead._id.toString() },
    });

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: { lead: formatLeadResponse(lead) },
    });
  } catch (error) {
    console.error('Create lead error:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

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

    // Build query based on role
    const query: Record<string, unknown> = {};
    
    // Partners can only see their own leads
    if (req.user.role === 'partner') {
      query.partnerId = req.user._id;
    }

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by loan type if provided
    if (req.query.loanType) {
      query.loanType = req.query.loanType;
    }

    // Search by client name or phone
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      query.$or = [
        { 'client.fullName': searchRegex },
        { 'client.phone': searchRegex },
        { 'client.email': searchRegex },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Sort
    const sortField = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(query),
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
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ success: false, message: 'Invalid lead ID' });
      return;
    }

    const lead = await Lead.findById(leadId);

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    // Partners can only access their own leads
    if (req.user.role === 'partner' && lead.partnerId.toString() !== req.user._id.toString()) {
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
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ success: false, message: 'Invalid lead ID' });
      return;
    }

    const lead = await Lead.findById(leadId);

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    // Partners can only update their own leads
    if (req.user.role === 'partner' && lead.partnerId.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
      return;
    }

    // Fields partners can update
    const partnerAllowedFields = ['loanAmount', 'tenure'];
    
    // Fields admins can additionally update
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

    // If status is being changed, add timeline event
    if (updateData.status && updateData.status !== lead.status) {
      const newStatus = updateData.status as LeadStatus;
      lead.timeline.push({
        status: newStatus,
        timestamp: new Date(),
        updatedBy: `${req.user.firstName} ${req.user.lastName}`,
        note: req.body.statusNote || `Status changed to ${newStatus}`,
      });
      updateData.timeline = lead.timeline;
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedLead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    // Log audit event
    await logAuditEvent('REGISTER', req, {
      userId: req.user._id.toString(),
      metadata: { action: 'UPDATE_LEAD', leadId: lead._id.toString(), changes: Object.keys(updateData) },
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

    // Only admins can delete leads
    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only admins can delete leads' });
      return;
    }

    const leadId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ success: false, message: 'Invalid lead ID' });
      return;
    }

    const lead = await Lead.findByIdAndDelete(leadId);

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    // Log audit event
    await logAuditEvent('REGISTER', req, {
      userId: req.user._id.toString(),
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

    // Build match query based on role
    const matchQuery: Record<string, unknown> = {};
    if (req.user.role === 'partner') {
      matchQuery.partnerId = req.user._id;
    }

    // Get counts by status
    const statusCounts = await Lead.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$loanAmount' },
        },
      },
    ]);

    // Get counts by loan type
    const loanTypeCounts = await Lead.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$loanType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLeads = await Lead.countDocuments({
      ...matchQuery,
      createdAt: { $gte: sevenDaysAgo },
    });

    // Format status counts
    const stats: Record<string, number> = {};
    let totalLeads = 0;
    let totalAmount = 0;

    statusCounts.forEach((item) => {
      stats[item._id] = item.count;
      totalLeads += item.count;
      totalAmount += item.totalAmount;
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total: totalLeads,
          totalAmount,
          byStatus: stats,
          byLoanType: loanTypeCounts.map((item) => ({
            type: item._id,
            count: item.count,
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

    const validStatuses: LeadStatus[] = ['draft', 'submitted', 'docs_pending', 'docs_uploaded', 'bank_processing', 'approved', 'disbursed', 'rejected'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const leadId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ success: false, message: 'Invalid lead ID' });
      return;
    }

    const lead = await Lead.findById(leadId);

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    // Partners can only update their own leads and only certain statuses
    if (req.user.role === 'partner') {
      if (lead.partnerId.toString() !== req.user._id.toString()) {
        res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
        return;
      }
      // Partners can only update to docs_uploaded
      if (status !== 'docs_uploaded' && status !== 'submitted' && status !== 'docs_pending') {
        res.status(403).json({ success: false, message: 'Partners can only update status to docs_pending or docs_uploaded' });
        return;
      }
    }

    // Add timeline event
    lead.timeline.push({
      status,
      timestamp: new Date(),
      updatedBy: `${req.user.firstName} ${req.user.lastName}`,
      note: note || `Status updated to ${status}`,
    });

    lead.status = status;
    await lead.save();

    res.status(200).json({
      success: true,
      message: 'Lead status updated successfully',
      data: { lead: formatLeadResponse(lead) },
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

    // Only admins can assign banks
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
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ success: false, message: 'Invalid lead ID' });
      return;
    }

    const lead = await Lead.findById(leadId);

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    // Update bank assignment
    const previousBank = lead.bankAssigned;
    lead.bankAssigned = bankName;
    if (bankLogo) lead.bankLogo = bankLogo;

    // Add timeline event
    lead.timeline.push({
      status: lead.status,
      timestamp: new Date(),
      updatedBy: `${req.user.firstName} ${req.user.lastName}`,
      note: note || `Bank assigned: ${bankName}${previousBank ? ` (previously: ${previousBank})` : ''}`,
    });

    // If status is still 'submitted' or 'docs_uploaded', move to 'bank_processing'
    if (lead.status === 'submitted' || lead.status === 'docs_uploaded' || lead.status === 'docs_pending') {
      lead.status = 'bank_processing';
      lead.timeline.push({
        status: 'bank_processing',
        timestamp: new Date(),
        updatedBy: `${req.user.firstName} ${req.user.lastName}`,
        note: 'Status updated to bank_processing after bank assignment',
      });
    }

    await lead.save();

    // Log audit event
    await logAuditEvent('REGISTER', req, {
      userId: req.user._id.toString(),
      metadata: { action: 'ASSIGN_BANK', leadId: leadId, bank: bankName },
    });

    res.status(200).json({
      success: true,
      message: `Bank "${bankName}" assigned to lead successfully`,
      data: { lead: formatLeadResponse(lead) },
    });
  } catch (error) {
    console.error('Assign bank error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

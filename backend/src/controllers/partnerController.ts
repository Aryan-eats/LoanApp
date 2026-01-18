import { Request, Response } from 'express';
import User, { IUser } from '../models/User.js';
import Lead from '../models/Lead.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import mongoose from 'mongoose';

// Format partner response for API - matching frontend Partner type
const formatPartnerResponse = (user: IUser) => ({
  id: user._id.toString(),
  fullName: `${user.firstName} ${user.lastName}`,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  partnerType: user.partnerType || 'freelancer',
  city: user.city || '',
  state: user.state,
  pincode: user.pincode,
  status: user.isActive ? 'approved' : 'pending',
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
  kycStatus: user.kycStatus || 'pending',
  leadsSubmitted: 0, // Will be populated with aggregate
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
    const query: Record<string, unknown> = { role: 'partner' };

    // Filter by status
    if (req.query.status) {
      if (req.query.status === 'approved') {
        query.isActive = true;
      } else if (req.query.status === 'pending') {
        query.isActive = false;
      } else if (req.query.status === 'rejected') {
        query.isActive = false;
        query.kycStatus = 'rejected';
      }
    }

    // Filter by partner type
    if (req.query.partnerType) {
      query.partnerType = req.query.partnerType;
    }

    // Filter by city
    if (req.query.city) {
      query.city = new RegExp(req.query.city as string, 'i');
    }

    // Search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    // Get lead counts for each partner
    const partnerIds = users.map((u) => u._id);
    const leadCounts = await Lead.aggregate([
      { $match: { partnerId: { $in: partnerIds } } },
      { $group: { _id: '$partnerId', count: { $sum: 1 } } },
    ]);

    const leadCountMap = new Map(
      leadCounts.map((lc) => [lc._id.toString(), lc.count])
    );

    const partners = users.map((user) => ({
      ...formatPartnerResponse(user),
      leadsSubmitted: leadCountMap.get(user._id.toString()) || 0,
    }));

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
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      res.status(400).json({ success: false, message: 'Invalid partner ID' });
      return;
    }

    const user = await User.findOne({ _id: partnerId, role: 'partner' }).select('-password');

    if (!user) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    // Get lead count
    const leadCount = await Lead.countDocuments({ partnerId: user._id });

    res.status(200).json({
      success: true,
      data: {
        partner: {
          ...formatPartnerResponse(user),
          leadsSubmitted: leadCount,
        },
      },
    });
  } catch (error) {
    console.error('Get partner error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      res.status(400).json({ success: false, message: 'Invalid partner ID' });
      return;
    }

    const allowedFields = [
      'firstName', 'lastName', 'phone', 'city', 'state', 'pincode',
      'partnerType', 'businessName', 'businessAddress', 'gstNumber',
      'panNumber', 'aadhaarNumber', 'accountHolderName', 'bankName',
      'accountNumber', 'ifscCode', 'isActive', 'internalNotes',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const user = await User.findOneAndUpdate(
      { _id: partnerId, role: 'partner' },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    // Log audit event
    if (req.user) {
      await logAuditEvent('REGISTER', req, {
        userId: req.user._id.toString(),
        metadata: { action: 'UPDATE_PARTNER', partnerId, changes: Object.keys(updateData) },
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
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      res.status(400).json({ success: false, message: 'Invalid partner ID' });
      return;
    }

    const { status, reason } = req.body;

    if (!status || !['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: approved, rejected, suspended, or pending',
      });
      return;
    }

    const updateData: Record<string, unknown> = {
      isActive: status === 'approved',
    };

    if (status === 'rejected') {
      updateData.kycStatus = 'rejected';
      if (reason) updateData.internalNotes = reason;
    }

    const user = await User.findOneAndUpdate(
      { _id: partnerId, role: 'partner' },
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    // Log audit event
    if (req.user) {
      await logAuditEvent('REGISTER', req, {
        userId: req.user._id.toString(),
        metadata: { action: `PARTNER_${status.toUpperCase()}`, partnerId, reason },
      });
    }

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
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      res.status(400).json({ success: false, message: 'Invalid partner ID' });
      return;
    }

    // Verify partner exists
    const partner = await User.findOne({ _id: partnerId, role: 'partner' });
    if (!partner) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    // Get query params for filtering
    const query: Record<string, unknown> = { partnerId: new mongoose.Types.ObjectId(partnerId) };

    if (req.query.status) {
      query.status = req.query.status;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Lead.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        leads: leads.map((lead) => ({
          id: lead._id.toString(),
          client: lead.client,
          loanType: lead.loanType,
          loanAmount: lead.loanAmount,
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
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      res.status(400).json({ success: false, message: 'Invalid partner ID' });
      return;
    }

    // Get all disbursed leads with commission
    const leads = await Lead.find({
      partnerId: new mongoose.Types.ObjectId(partnerId),
      status: 'disbursed',
      'commission.amount': { $exists: true, $gt: 0 },
    }).sort({ updatedAt: -1 });

    const commissions = leads.map((lead) => ({
      id: lead._id.toString(),
      leadId: lead._id.toString(),
      clientName: lead.client.fullName,
      loanType: lead.loanType,
      disbursedAmount: lead.disbursedAmount || lead.loanAmount,
      commissionRate: lead.commission?.rate || 0,
      commissionAmount: lead.commission?.amount || 0,
      status: lead.commission?.status || 'pending',
      paidAt: lead.commission?.paidAt,
      createdAt: lead.createdAt,
    }));

    // Calculate totals
    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const paidCommission = commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    const pendingCommission = totalCommission - paidCommission;

    res.status(200).json({
      success: true,
      data: {
        commissions,
        summary: {
          total: totalCommission,
          paid: paidCommission,
          pending: pendingCommission,
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
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      res.status(400).json({ success: false, message: 'Invalid partner ID' });
      return;
    }

    // Check authorization - admin or self
    if (req.user && req.user.role !== 'admin' && req.user._id.toString() !== partnerId) {
      res.status(403).json({ success: false, message: 'Not authorized to update this profile' });
      return;
    }

    const allowedFields = [
      'firstName', 'lastName', 'phone', 'city', 'state', 'pincode',
      'businessName', 'businessAddress', 'accountHolderName', 'bankName',
      'accountNumber', 'ifscCode',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const user = await User.findOneAndUpdate(
      { _id: partnerId, role: 'partner' },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
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
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      res.status(400).json({ success: false, message: 'Invalid partner ID' });
      return;
    }

    // Check authorization - admin or self
    if (req.user && req.user.role !== 'admin' && req.user._id.toString() !== partnerId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    const { panNumber, aadhaarNumber, panDocument, aadhaarDocument, photoDocument } = req.body;

    const updateData: Record<string, unknown> = {
      kycStatus: 'pending',
    };

    if (panNumber) updateData.panNumber = panNumber;
    if (aadhaarNumber) updateData.aadhaarNumber = aadhaarNumber;
    
    // Store document URLs/references if provided
    if (panDocument) updateData.panDocument = panDocument;
    if (aadhaarDocument) updateData.aadhaarDocument = aadhaarDocument;
    if (photoDocument) updateData.photoDocument = photoDocument;

    const user = await User.findOneAndUpdate(
      { _id: partnerId, role: 'partner' },
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
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
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      res.status(400).json({ success: false, message: 'Invalid partner ID' });
      return;
    }

    const { status, rejectionReason } = req.body;

    if (!status || !['pending', 'verified', 'rejected'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid KYC status. Must be: pending, verified, or rejected',
      });
      return;
    }

    const updateData: Record<string, unknown> = {
      kycStatus: status,
    };

    // If approved, also activate the partner
    if (status === 'verified') {
      updateData.isActive = true;
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.kycRejectionReason = rejectionReason;
    }

    const user = await User.findOneAndUpdate(
      { _id: partnerId, role: 'partner' },
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ success: false, message: 'Partner not found' });
      return;
    }

    // Log audit event
    if (req.user) {
      await logAuditEvent('REGISTER', req, {
        userId: req.user._id.toString(),
        metadata: { action: `KYC_${status.toUpperCase()}`, partnerId, rejectionReason },
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
    const [
      totalPartners,
      activePartners,
      pendingPartners,
      byType,
    ] = await Promise.all([
      User.countDocuments({ role: 'partner' }),
      User.countDocuments({ role: 'partner', isActive: true }),
      User.countDocuments({ role: 'partner', isActive: false }),
      User.aggregate([
        { $match: { role: 'partner' } },
        { $group: { _id: '$partnerType', count: { $sum: 1 } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total: totalPartners,
          active: activePartners,
          pending: pendingPartners,
          byType: byType.map((t) => ({ type: t._id || 'unknown', count: t.count })),
        },
      },
    });
  } catch (error) {
    console.error('Get partner stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

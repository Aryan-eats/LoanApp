import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import { Request, Response } from 'express';
import {
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  getLeadStats,
  updateLeadStatus,
  assignBank,
} from '../controllers/leadController.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

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

/**
 * @desc    Get all partners (users with role='partner')
 * @route   GET /api/admin/partners
 * @access  Private/Admin
 */
router.get('/partners', async (req: Request, res: Response): Promise<void> => {
  try {
    // Build query
    const query: Record<string, unknown> = { role: 'partner' };
    
    // Filter by status if provided
    if (req.query.status) {
      query.isActive = req.query.status === 'approved';
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    // Format response to match frontend Partner type
    const partners = users.map((user) => ({
      id: user._id.toString(),
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      partnerType: user.partnerType || 'freelancer',
      city: user.city || 'N/A',
      status: user.isActive ? 'approved' : 'pending',
      leadsSubmitted: 0, // Would need Lead aggregation for real count
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

/**
 * @desc    Get single user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
router.get('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');

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

/**
 * @desc    Update user by ID
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin
 */
router.put('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone, role, isActive, isEmailVerified, isPhoneVerified } = req.body;

    const updateData: Record<string, unknown> = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isEmailVerified !== undefined) updateData.isEmailVerified = isEmailVerified;
    if (isPhoneVerified !== undefined) updateData.isPhoneVerified = isPhoneVerified;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
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

/**
 * @desc    Delete user by ID
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
router.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Prevent admin from deleting themselves
    if (req.user && user._id.toString() === req.user._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account from here',
      });
      return;
    }

    await User.findByIdAndDelete(req.params.id);

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

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const partners = await User.countDocuments({ role: 'partner' });
    const admins = await User.countDocuments({ role: 'admin' });
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

    // Get users registered in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
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

/**
 * Lead Management Routes for Admins
 * Admins have full access to all leads
 */

// Get lead statistics (must be before /:id route)
router.get('/leads/stats', getLeadStats);

// Lead CRUD operations
router.route('/leads')
  .get(getLeads);      // GET /api/admin/leads - Get all leads

router.route('/leads/:id')
  .get(getLeadById)    // GET /api/admin/leads/:id - Get single lead
  .put(updateLead)     // PUT /api/admin/leads/:id - Update lead
  .delete(deleteLead); // DELETE /api/admin/leads/:id - Delete lead

// Update lead status with timeline entry
router.patch('/leads/:id/status', updateLeadStatus);

// Assign bank to a lead
router.patch('/leads/:id/assign-bank', assignBank);

export default router;

import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getPartners,
  getPartnerById,
  updatePartner,
  updatePartnerStatus,
  getPartnerLeads,
  getPartnerCommissions,
  updatePartnerProfile,
  submitPartnerKYC,
  updatePartnerKYCStatus,
  getPartnerStats,
} from '../controllers/partnerController.js';
import { registerPartner } from '../controllers/authController.js';

const router = Router();

/**
 * Partner Management Routes
 * Base path: /api/partners
 */

// Public route - Partner registration/onboarding
// POST /api/partners - Create/Register new partner (onboarding)
router.post('/', registerPartner);

// All routes below require authentication
router.use(protect);

// Admin-only routes
router.use(authorize('admin'));

// GET /api/partners/stats - Get partner statistics (must be before /:id)
router.get('/stats', getPartnerStats);

// GET /api/partners - Get all partners (with filters)
router.get('/', getPartners);

// GET /api/partners/:id - Get partner details
router.get('/:id', getPartnerById);

// PUT /api/partners/:id - Update partner details
router.put('/:id', updatePartner);

// PATCH /api/partners/:id/status - Approve/Reject/Suspend partner
router.patch('/:id/status', updatePartnerStatus);

// GET /api/partners/:id/leads - Get leads for specific partner
router.get('/:id/leads', getPartnerLeads);

// GET /api/partners/:id/commissions - Get commissions for partner
router.get('/:id/commissions', getPartnerCommissions);

// PUT /api/partners/:id/profile - Update partner profile
router.put('/:id/profile', updatePartnerProfile);

// POST /api/partners/:id/kyc - Submit KYC documents
router.post('/:id/kyc', submitPartnerKYC);

// PATCH /api/partners/:id/kyc/status - Update KYC status
router.patch('/:id/kyc/status', updatePartnerKYCStatus);

export default router;

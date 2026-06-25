import { Router } from 'express';
import { protect, authorizeAdmin, requirePermission } from '../shared/middleware/auth.js';
import { validateUUID, validateUUIDParam } from '../shared/middleware/validateUUID.js';
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

router.param('id', validateUUIDParam);

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
router.use(authorizeAdmin);
router.use(validateUUID);

// GET /api/partners/stats - Get partner statistics (must be before /:id)
router.get('/stats', requirePermission('partners', 'read'), getPartnerStats);

// GET /api/partners - Get all partners (with filters)
router.get('/', requirePermission('partners', 'read'), getPartners);

// GET /api/partners/:id - Get partner details
router.get('/:id', requirePermission('partners', 'read'), getPartnerById);

// PUT /api/partners/:id - Update partner details
router.put('/:id', requirePermission('partners', 'update'), updatePartner);

// PATCH /api/partners/:id/status - Approve/Reject/Suspend partner
router.patch('/:id/status', requirePermission('partners', 'update'), updatePartnerStatus);

// GET /api/partners/:id/leads - Get leads for specific partner
router.get('/:id/leads', requirePermission('partners', 'read'), getPartnerLeads);

// GET /api/partners/:id/commissions - Get commissions for partner
router.get('/:id/commissions', requirePermission('partners', 'read'), getPartnerCommissions);

// PUT /api/partners/:id/profile - Update partner profile
router.put('/:id/profile', requirePermission('partners', 'update'), updatePartnerProfile);

// POST /api/partners/:id/kyc - Submit KYC documents
router.post('/:id/kyc', requirePermission('partners', 'update'), submitPartnerKYC);

// PATCH /api/partners/:id/kyc/status - Update KYC status
router.patch('/:id/kyc/status', requirePermission('partners', 'update'), updatePartnerKYCStatus);

export default router;

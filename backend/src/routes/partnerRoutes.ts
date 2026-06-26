import { Router } from 'express';
import { protect, authorize } from '../shared/middleware/auth.js';
import { validateUUID, validateUUIDParam } from '../shared/middleware/validateUUID.js';
import { cacheControl } from '../shared/middleware/cacheControl.js';
import { resolvePartnerOrg } from '../shared/middleware/partnerContext.js';
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  getLeadStats,
  updateLeadStatus,
} from '../controllers/leadController.js';
import { getCurrentPartnerProfile } from '../modules/partners/partners.controller.js';
import partnerDataRoutes from '../modules/partner-data/partnerData.routes.js';

const router = Router();

router.param('id', validateUUIDParam);

// All partner routes require authentication and partner role
router.use(protect);
router.use(authorize('partner'));
router.use(resolvePartnerOrg);
router.use(validateUUID);

/**
 * Lead Management Routes
 */

// GET /api/partner/profile - Get current partner profile
router.get('/profile', getCurrentPartnerProfile);

// Get lead statistics (must be before /:id route)
router.get('/leads/stats', getLeadStats);

// Lead CRUD operations
router.route('/leads')
  .get(getLeads)      // GET /api/partner/leads - Get all leads for this partner
  .post(createLead);  // POST /api/partner/leads - Submit a lead via consent-backed handoff

router.route('/leads/:id')
  .get(getLeadById)   // GET /api/partner/leads/:id - Get single lead
  .put(updateLead);   // PUT /api/partner/leads/:id - Update lead

// Update lead status with timeline entry
router.patch('/leads/:id/status', updateLeadStatus);

router.use(partnerDataRoutes);

/**
 * Partner Dashboard Route
 */
router.get('/dashboard', async (req, res) => {
  // This will be expanded with more dashboard data
  // For now, redirect to stats
  res.redirect('/api/partner/leads/stats');
});

/**
 * Bank listing for partners (all configured banks/NBFCs)
 * Reuses cached query output for dropdown-backed bank selection.
 */
router.get('/banks', cacheControl(15), async (_req, res) => {
  // Inline handler rather than importing the full admin controller
  const { cacheWrap } = await import('../shared/utils/cache.js');
  const { basePrisma } = await import('../shared/db/prisma.js');
  try {
    const banks = await cacheWrap(
      'banks:all',
      () => basePrisma.bank.findMany({
        include: { commissionRates: true },
        orderBy: { name: 'asc' },
      }),
      300
    );
    res.status(200).json({ success: true, count: banks.length, data: { banks } });
  } catch (error) {
    console.error('Partner banks list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

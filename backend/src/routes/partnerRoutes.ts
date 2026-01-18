import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  getLeadStats,
  updateLeadStatus,
} from '../controllers/leadController.js';

const router = Router();

// All partner routes require authentication and partner role
router.use(protect);
router.use(authorize('partner'));

/**
 * Lead Management Routes
 */

// Get lead statistics (must be before /:id route)
router.get('/leads/stats', getLeadStats);

// Lead CRUD operations
router.route('/leads')
  .get(getLeads)      // GET /api/partner/leads - Get all leads for this partner
  .post(createLead);  // POST /api/partner/leads - Create a new lead

router.route('/leads/:id')
  .get(getLeadById)   // GET /api/partner/leads/:id - Get single lead
  .put(updateLead);   // PUT /api/partner/leads/:id - Update lead

// Update lead status with timeline entry
router.patch('/leads/:id/status', updateLeadStatus);

/**
 * Partner Dashboard Route
 */
router.get('/dashboard', async (req, res) => {
  // This will be expanded with more dashboard data
  // For now, redirect to stats
  res.redirect('/api/partner/leads/stats');
});

export default router;

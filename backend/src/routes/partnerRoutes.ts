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
import { getCurrentPartnerProfile } from '../controllers/partnerController.js';
import {
  getStoredClients,
  createStoredClient,
  updateStoredClientStatus,
  updateStoredClientNotes,
  deleteStoredClient,
  bulkCreateStoredClients,
} from '../controllers/partnerDataController.js';

const router = Router();

// All partner routes require authentication and partner role
router.use(protect);
router.use(authorize('partner'));

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
  .post(createLead);  // POST /api/partner/leads - Create a new lead

router.route('/leads/:id')
  .get(getLeadById)   // GET /api/partner/leads/:id - Get single lead
  .put(updateLead);   // PUT /api/partner/leads/:id - Update lead

// Update lead status with timeline entry
router.patch('/leads/:id/status', updateLeadStatus);

/**
 * Stored Clients (PartnerData) Routes
 * Leads a partner saves privately before submitting to admin.
 */
// Bulk create (must be before /:id routes)
router.post('/stored-clients/bulk', bulkCreateStoredClients);

router.route('/stored-clients')
  .get(getStoredClients)       // GET  /api/partner/stored-clients
  .post(createStoredClient);   // POST /api/partner/stored-clients

router.patch('/stored-clients/:id/status', updateStoredClientStatus);
router.patch('/stored-clients/:id/notes',  updateStoredClientNotes);
router.delete('/stored-clients/:id',       deleteStoredClient);

/**
 * Partner Dashboard Route
 */
router.get('/dashboard', async (req, res) => {
  // This will be expanded with more dashboard data
  // For now, redirect to stats
  res.redirect('/api/partner/leads/stats');
});

export default router;

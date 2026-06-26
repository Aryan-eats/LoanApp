import { Router } from 'express';
import { validateUUIDParam } from '../../shared/middleware/validateUUID.js';
import {
  createLead,
  getLeadById,
  getLeads,
  getLeadStats,
  updateLead,
  updateLeadStatus,
} from './lead.controller.js';

const router = Router();

router.param('id', validateUUIDParam);

router.get('/leads/stats', getLeadStats);
router.route('/leads')
  .get(getLeads)
  .post(createLead);
router.route('/leads/:id')
  .get(getLeadById)
  .put(updateLead);
router.patch('/leads/:id/status', updateLeadStatus);

export default router;

import { Router } from 'express';
import { requirePermission } from '../../shared/middleware/auth.js';
import { validateUUIDParam } from '../../shared/middleware/validateUUID.js';
import {
  assignBank,
  createLead,
  deleteLead,
  getLeadById,
  getLeads,
  getLeadStats,
  updateLead,
  updateLeadStatus,
} from './lead.controller.js';

const router = Router();

router.param('id', validateUUIDParam);

router.get('/leads/stats', requirePermission('leads', 'read'), getLeadStats);
router.route('/leads')
  .get(requirePermission('leads', 'read'), getLeads)
  .post(requirePermission('leads', 'create'), createLead);
router.route('/leads/:id')
  .get(requirePermission('leads', 'read'), getLeadById)
  .put(requirePermission('leads', 'update'), updateLead)
  .delete(requirePermission('leads', 'delete'), deleteLead);
router.patch('/leads/:id/status', requirePermission('leads', 'update'), updateLeadStatus);
router.patch('/leads/:id/assign-bank', requirePermission('leads', 'update'), assignBank);

export default router;

import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validateUUID } from '../middleware/validateUUID.js';
import {
  listUsers,
  listPartners,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getStats,
  listAuditLogs,
  exportAuditLogsCsv,
  createAuditLogsExportJob,
  getAuditLogsExportJob,
  downloadAuditLogsExportJob,
  listDocRequirements,
  createDocRequirement,
  updateDocRequirement,
  deleteDocRequirement,
  listBanks,
  getBank,
  toggleBankStatus,
  updateBank,
} from '../controllers/adminController.js';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats,
  updateLeadStatus,
  assignBank,
} from '../controllers/leadController.js';

const router = Router();

router.use(protect);
router.use(authorize('admin'));
router.use(validateUUID);

// -- Users -------------------------------------------------------------------
router.get('/users', listUsers);
router.post('/users', createUser);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// -- Partners ----------------------------------------------------------------
router.get('/partners', listPartners);

// -- Stats -------------------------------------------------------------------
router.get('/stats', getStats);

// -- Audit Logs --------------------------------------------------------------
router.get('/audit-logs', listAuditLogs);
router.get('/audit-logs/export', exportAuditLogsCsv);
router.post('/audit-logs/export/jobs', createAuditLogsExportJob);
router.get('/audit-logs/export/jobs/:jobId', getAuditLogsExportJob);
router.get('/audit-logs/export/jobs/:jobId/download', downloadAuditLogsExportJob);

// -- Leads -------------------------------------------------------------------
router.get('/leads/stats', getLeadStats);
router.route('/leads').get(getLeads).post(createLead);
router.route('/leads/:id').get(getLeadById).put(updateLead).delete(deleteLead);
router.patch('/leads/:id/status', updateLeadStatus);
router.patch('/leads/:id/assign-bank', assignBank);

// -- Lender Document Requirements --------------------------------------------
router.get('/docs/reqdoc', listDocRequirements);
router.post('/docs/reqdoc', createDocRequirement);
router.patch('/docs/reqdoc/:id', updateDocRequirement);
router.delete('/docs/reqdoc/:id', deleteDocRequirement);

// -- Banks -------------------------------------------------------------------
router.get('/banks', listBanks);
router.get('/banks/:id', getBank);
router.patch('/banks/:id/status', toggleBankStatus);
router.put('/banks/:id', updateBank);

export default router;

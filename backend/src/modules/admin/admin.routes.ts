import { Router } from 'express';
import { protect, authorizeAdmin, authorizeAdminOperator, requirePermission } from '../../shared/middleware/auth.js';
import { validateUUID, validateUUIDParam } from '../../shared/middleware/validateUUID.js';
import { cacheControl } from '../../shared/middleware/cacheControl.js';
import {
  listUsers,
  listRoles,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  updateRolePermissions,
} from '../users/users.controller.js';
import { getPartners as listPartners } from '../partners/partners.controller.js';
import { getStats } from './admin.controller.js';
import {
  listAuditLogs,
  exportAuditLogsCsv,
  createAuditLogsExportJob,
  getAuditLogsExportJob,
  downloadAuditLogsExportJob,
} from '../audit/audit.controller.js';
import {
  listDocRequirements,
  createDocRequirement,
  updateDocRequirement,
  deleteDocRequirement,
} from '../doc-requirements/docRequirements.controller.js';
import {
  listBanks,
  getBank,
  toggleBankStatus,
  updateBank,
} from '../banks/banks.controller.js';
import adminLeadRoutes from '../leads/adminLead.routes.js';

const router = Router();

router.param('id', validateUUIDParam);
router.param('jobId', validateUUIDParam);

router.use(protect);
router.use(authorizeAdmin);
router.use(validateUUID);

// -- Users -------------------------------------------------------------------
router.get('/users', requirePermission('users', 'read'), listUsers);
router.post('/users', requirePermission('users', 'create'), createUser);
router.get('/users/:id', requirePermission('users', 'read'), getUser);
router.put('/users/:id', requirePermission('users', 'update'), updateUser);
router.delete('/users/:id', requirePermission('users', 'delete'), deleteUser);

// -- Roles -------------------------------------------------------------------
router.get('/roles', requirePermission('roles', 'read'), listRoles);
router.put('/roles/:role/permissions', requirePermission('roles', 'update'), updateRolePermissions);

// -- Partners ----------------------------------------------------------------
router.get('/partners', requirePermission('partners', 'read'), listPartners);

// -- Stats -------------------------------------------------------------------
router.get('/stats', authorizeAdminOperator, getStats);

// -- Audit Logs --------------------------------------------------------------
router.get('/audit-logs', authorizeAdminOperator, listAuditLogs);
router.get('/audit-logs/export', authorizeAdminOperator, exportAuditLogsCsv);
router.post('/audit-logs/export/jobs', authorizeAdminOperator, createAuditLogsExportJob);
router.get('/audit-logs/export/jobs/:jobId', authorizeAdminOperator, getAuditLogsExportJob);
router.get('/audit-logs/export/jobs/:jobId/download', authorizeAdminOperator, downloadAuditLogsExportJob);

// -- Leads -------------------------------------------------------------------
router.use(adminLeadRoutes);

// -- Lender Document Requirements --------------------------------------------
router.get('/docs/reqdoc', authorizeAdminOperator, cacheControl(30), listDocRequirements);
router.post('/docs/reqdoc', authorizeAdminOperator, createDocRequirement);
router.patch('/docs/reqdoc/:id', authorizeAdminOperator, updateDocRequirement);
router.delete('/docs/reqdoc/:id', authorizeAdminOperator, deleteDocRequirement);

// -- Banks -------------------------------------------------------------------
router.get('/banks', requirePermission('banks', 'read'), cacheControl(15), listBanks);
router.get('/banks/:id', requirePermission('banks', 'read'), getBank);
router.patch('/banks/:id/status', requirePermission('banks', 'update'), toggleBankStatus);
router.put('/banks/:id', requirePermission('banks', 'update'), updateBank);

export default router;

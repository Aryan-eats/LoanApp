import express from 'express';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ok = (name: string) => vi.fn((_req: express.Request, res: express.Response) =>
  res.status(200).json({ success: true, handler: name }),
);

const listUsers = ok('listUsers');
const createUser = ok('createUser');
const getUser = ok('getUser');
const updateUser = ok('updateUser');
const deleteUser = ok('deleteUser');
const listRoles = ok('listRoles');
const updateRolePermissions = ok('updateRolePermissions');
const listPartners = ok('listPartners');
const getStats = ok('getStats');
const listAuditLogs = ok('listAuditLogs');
const exportAuditLogsCsv = ok('exportAuditLogsCsv');
const createAuditLogsExportJob = ok('createAuditLogsExportJob');
const getAuditLogsExportJob = ok('getAuditLogsExportJob');
const downloadAuditLogsExportJob = ok('downloadAuditLogsExportJob');
const listDocRequirements = ok('listDocRequirements');
const createDocRequirement = ok('createDocRequirement');
const updateDocRequirement = ok('updateDocRequirement');
const deleteDocRequirement = ok('deleteDocRequirement');
const listBanks = ok('listBanks');
const getBank = ok('getBank');
const toggleBankStatus = ok('toggleBankStatus');
const updateBank = ok('updateBank');

const getLeads = ok('getLeads');
const getLeadById = ok('getLeadById');
const createLead = ok('createLead');
const updateLead = ok('updateLead');
const deleteLead = ok('deleteLead');
const getLeadStats = ok('getLeadStats');
const updateLeadStatus = ok('updateLeadStatus');
const assignBank = ok('assignBank');
type JsonObject = Record<string, any>;

vi.mock('../controllers/adminController.js', () => ({
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  updateRolePermissions,
  getStats,
  listAuditLogs,
  exportAuditLogsCsv,
  createAuditLogsExportJob,
  getAuditLogsExportJob,
  downloadAuditLogsExportJob,
  listRoles,
  listPartners,
  listDocRequirements,
  createDocRequirement,
  updateDocRequirement,
  deleteDocRequirement,
  listBanks,
  getBank,
  toggleBankStatus,
  updateBank,
}));

vi.mock('../controllers/leadController.js', () => ({
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats,
  updateLeadStatus,
  assignBank,
}));

vi.mock('../middleware/cacheControl.js', () => ({
  cacheControl: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock('../middleware/auth.js', () => ({
  protect: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      next();
      return;
    }
    res.status(401).json({ success: false, message: 'Not authorized' });
  },
  authorizeAdmin: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers['x-role'] === 'admin') {
      next();
      return;
    }
    res.status(403).json({ success: false, message: 'Forbidden' });
  },
  authorize: (...roles: string[]) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (roles.includes(String(req.headers['x-role']))) {
        next();
        return;
      }
      res.status(403).json({ success: false, message: 'Forbidden' });
    },
  authorizeAdminOperator: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requirePermission: (resource: string, action: string) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const permissions = String(req.headers['x-permissions'] ?? '').split(',');
      if (permissions.includes(`${resource}:${action}`)) {
        next();
        return;
      }
      res.status(403).json({ success: false, message: 'Missing permission' });
    },
}));

const adminRoutes = (await import('../routes/adminRoutes.js')).default;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
};

const requestJson = async (
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) => {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address() as AddressInfo;

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json() as JsonObject;
    return { response, json };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
};

const adminHeaders = (permissions = '') => ({
  authorization: 'Bearer valid-token',
  'x-role': 'admin',
  'x-permissions': permissions,
});

describe('admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication before admin access', async () => {
    const { response, json } = await requestJson('GET', '/api/admin/users');

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('requires the admin role before checking endpoint permissions', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/admin/users',
      undefined,
      { authorization: 'Bearer valid-token', 'x-role': 'partner', 'x-permissions': 'users:read' },
    );

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('requires endpoint-specific permissions', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/admin/users',
      undefined,
      adminHeaders('leads:read'),
    );

    expect(response.status).toBe(403);
    expect(json.message).toBe('Missing permission');
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('routes permitted admin users list access to the controller', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/admin/users',
      undefined,
      adminHeaders('users:read'),
    );

    expect(response.status).toBe(200);
    expect(json.handler).toBe('listUsers');
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid UUID path parameters before controller access', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/admin/users/not-a-uuid',
      undefined,
      adminHeaders('users:read'),
    );

    expect(response.status).toBe(400);
    expect(json.message).toBe('Invalid ID format for "id"');
    expect(getUser).not.toHaveBeenCalled();
  });

  it('enforces update permission for lead status changes', async () => {
    const leadId = '33333333-3333-4333-8333-333333333333';
    const { response, json } = await requestJson(
      'PATCH',
      `/api/admin/leads/${leadId}/status`,
      { status: 'approved' },
      adminHeaders('leads:update'),
    );

    expect(response.status).toBe(200);
    expect(json.handler).toBe('updateLeadStatus');
    expect(updateLeadStatus).toHaveBeenCalledTimes(1);
  });

  it('routes bank status updates only with bank update permission', async () => {
    const bankId = '44444444-4444-4444-8444-444444444444';
    const { response, json } = await requestJson(
      'PATCH',
      `/api/admin/banks/${bankId}/status`,
      { status: 'inactive' },
      adminHeaders('banks:update'),
    );

    expect(response.status).toBe(200);
    expect(json.handler).toBe('toggleBankStatus');
    expect(toggleBankStatus).toHaveBeenCalledTimes(1);
  });
});

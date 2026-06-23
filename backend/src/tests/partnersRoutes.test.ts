import express from 'express';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type JsonObject = Record<string, any>;

const ok = (name: string) => vi.fn((_req: express.Request, res: express.Response) =>
  res.status(200).json({ success: true, handler: name }),
);

const registerPartner = vi.fn((_req: express.Request, res: express.Response) =>
  res.status(201).json({ success: true, handler: 'registerPartner' }),
);
const getPartners = ok('getPartners');
const getPartnerById = ok('getPartnerById');
const updatePartner = ok('updatePartner');
const updatePartnerStatus = ok('updatePartnerStatus');
const getPartnerLeads = ok('getPartnerLeads');
const getPartnerCommissions = ok('getPartnerCommissions');
const updatePartnerProfile = ok('updatePartnerProfile');
const submitPartnerKYC = ok('submitPartnerKYC');
const updatePartnerKYCStatus = ok('updatePartnerKYCStatus');
const getPartnerStats = ok('getPartnerStats');

vi.mock('../controllers/authController.js', () => ({
  registerPartner,
}));

vi.mock('../controllers/partnerController.js', () => ({
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

const partnersRoutes = (await import('../routes/partnersRoutes.js')).default;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/partners', partnersRoutes);
  return app;
};

const requestJson = async (
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
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

const id = '22222222-2222-4222-8222-222222222222';

describe('partners management routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows public partner onboarding without admin authentication', async () => {
    const { response, json } = await requestJson('POST', '/api/partners', {
      email: 'partner@example.com',
    });

    expect(response.status).toBe(201);
    expect(json.handler).toBe('registerPartner');
    expect(registerPartner).toHaveBeenCalledTimes(1);
  });

  it('requires authentication for protected partner management routes', async () => {
    const { response, json } = await requestJson('GET', '/api/partners');

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(getPartners).not.toHaveBeenCalled();
  });

  it('requires admin role for protected partner management routes', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/partners',
      undefined,
      { authorization: 'Bearer valid-token', 'x-role': 'partner', 'x-permissions': 'partners:read' },
    );

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(getPartners).not.toHaveBeenCalled();
  });

  it('requires endpoint-specific partner permissions', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/partners',
      undefined,
      adminHeaders('users:read'),
    );

    expect(response.status).toBe(403);
    expect(json.message).toBe('Missing permission');
    expect(getPartners).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', '/api/partners/stats', 'partners:read', getPartnerStats],
    ['GET', '/api/partners', 'partners:read', getPartners],
    ['GET', `/api/partners/${id}`, 'partners:read', getPartnerById],
    ['PUT', `/api/partners/${id}`, 'partners:update', updatePartner],
    ['PATCH', `/api/partners/${id}/status`, 'partners:update', updatePartnerStatus],
    ['GET', `/api/partners/${id}/leads`, 'partners:read', getPartnerLeads],
    ['GET', `/api/partners/${id}/commissions`, 'partners:read', getPartnerCommissions],
    ['PUT', `/api/partners/${id}/profile`, 'partners:update', updatePartnerProfile],
    ['POST', `/api/partners/${id}/kyc`, 'partners:update', submitPartnerKYC],
    ['PATCH', `/api/partners/${id}/kyc/status`, 'partners:update', updatePartnerKYCStatus],
  ])('routes %s %s to its controller', async (method, path, permission, handler) => {
    const { response, json } = await requestJson(
      method as 'GET' | 'POST' | 'PUT' | 'PATCH',
      path,
      method === 'GET' ? undefined : {},
      adminHeaders(permission),
    );

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid partner UUID params before controller access', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/partners/not-a-uuid',
      undefined,
      adminHeaders('partners:read'),
    );

    expect(response.status).toBe(400);
    expect(json.message).toBe('Invalid ID format for "id"');
    expect(getPartnerById).not.toHaveBeenCalled();
  });
});

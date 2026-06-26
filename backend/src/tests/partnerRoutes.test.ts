import express from 'express';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type JsonObject = Record<string, any>;

const ok = (name: string) => vi.fn((_req: express.Request, res: express.Response) =>
  res.status(200).json({ success: true, handler: name }),
);

const createLead = ok('createLead');
const getLeads = ok('getLeads');
const getLeadById = ok('getLeadById');
const updateLead = ok('updateLead');
const getLeadStats = ok('getLeadStats');
const updateLeadStatus = ok('updateLeadStatus');
const getCurrentPartnerProfile = ok('getCurrentPartnerProfile');
const getStoredClients = ok('getStoredClients');
const createStoredClient = ok('createStoredClient');
const updateStoredClientStatus = ok('updateStoredClientStatus');
const updateStoredClientNotes = ok('updateStoredClientNotes');
const updateStoredClientAssignedBank = ok('updateStoredClientAssignedBank');
const updateStoredClientPreferredBank = ok('updateStoredClientPreferredBank');
const deleteStoredClient = ok('deleteStoredClient');
const bulkCreateStoredClients = ok('bulkCreateStoredClients');
const saveStoredClientDocuments = ok('saveStoredClientDocuments');
const submitStoredClientToGPS = ok('submitStoredClientToGPS');
const getPartnerCustomerById = ok('getPartnerCustomerById');
const getPartnerCustomerActivity = ok('getPartnerCustomerActivity');
const runPartnerSoftCheck = ok('runPartnerSoftCheck');
const softCheckLimiter = vi.fn((_req: express.Request, _res: express.Response, next: express.NextFunction) => next());

vi.mock('../modules/leads/lead.controller.js', () => ({
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  getLeadStats,
  updateLeadStatus,
}));

vi.mock('../modules/partners/partners.controller.js', () => ({
  getCurrentPartnerProfile,
}));

vi.mock('../modules/partner-data/partnerData.controller.js', () => ({
  getStoredClients,
  createStoredClient,
  updateStoredClientStatus,
  updateStoredClientNotes,
  updateStoredClientAssignedBank,
  updateStoredClientPreferredBank,
  deleteStoredClient,
  bulkCreateStoredClients,
  saveStoredClientDocuments,
  submitStoredClientToGPS,
  getPartnerCustomerById,
  getPartnerCustomerActivity,
}));

vi.mock('../modules/soft-check/softCheck.controller.js', () => ({
  runPartnerSoftCheck,
}));

vi.mock('../shared/middleware/auth.js', () => ({
  protect: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      next();
      return;
    }
    res.status(401).json({ success: false, message: 'Not authorized' });
  },
  authorize: (...roles: string[]) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (roles.includes(String(req.headers['x-role']))) {
        next();
        return;
      }
      res.status(403).json({ success: false, message: 'Forbidden' });
    },
}));

vi.mock('../shared/middleware/partnerContext.js', () => ({
  resolvePartnerOrg: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock('../shared/middleware/cacheControl.js', () => ({
  cacheControl: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock('../shared/middleware/rateLimiter.js', () => ({
  softCheckLimiter,
}));

vi.mock('../shared/utils/cache.js', () => ({
  cacheWrap: vi.fn((_key: string, loader: () => Promise<unknown>) => loader()),
}));

vi.mock('../shared/db/prisma.js', () => ({
  basePrisma: {
    bank: {
      findMany: vi.fn().mockResolvedValue([{ id: 'bank-1', name: 'Test Bank' }]),
    },
  },
}));

const partnerRoutes = (await import('../modules/partners/partner.routes.js')).default;
const softCheckRoutes = (await import('../modules/soft-check/softCheck.routes.js')).default;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/partner/soft-check', softCheckRoutes);
  app.use('/api/partner', partnerRoutes);
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
      redirect: 'manual',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const json = text && response.headers.get('content-type')?.includes('application/json')
      ? JSON.parse(text) as JsonObject
      : {};
    return { response, json };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
};

const partnerHeaders = {
  authorization: 'Bearer valid-token',
  'x-role': 'partner',
};

const id = '11111111-1111-4111-8111-111111111111';

describe('partner routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication before partner route access', async () => {
    const { response, json } = await requestJson('GET', '/api/partner/profile');

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(getCurrentPartnerProfile).not.toHaveBeenCalled();
  });

  it('requires partner role access', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/partner/profile',
      undefined,
      { authorization: 'Bearer valid-token', 'x-role': 'admin' },
    );

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(getCurrentPartnerProfile).not.toHaveBeenCalled();
  });

  it('requires authentication before soft-check endpoint access', async () => {
    const { response, json } = await requestJson('POST', '/api/partner/soft-check', {});

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(runPartnerSoftCheck).not.toHaveBeenCalled();
  });

  it('requires partner role before soft-check endpoint access', async () => {
    const { response, json } = await requestJson(
      'POST',
      '/api/partner/soft-check',
      {},
      { authorization: 'Bearer valid-token', 'x-role': 'admin' },
    );

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(runPartnerSoftCheck).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', '/api/partner/profile', getCurrentPartnerProfile],
    ['GET', '/api/partner/leads/stats', getLeadStats],
    ['GET', '/api/partner/leads', getLeads],
    ['POST', '/api/partner/leads', createLead],
    ['GET', `/api/partner/leads/${id}`, getLeadById],
    ['PUT', `/api/partner/leads/${id}`, updateLead],
    ['PATCH', `/api/partner/leads/${id}/status`, updateLeadStatus],
    ['POST', '/api/partner/stored-clients/bulk', bulkCreateStoredClients],
    ['POST', '/api/partner/soft-check', runPartnerSoftCheck],
    ['GET', `/api/partner/customers/${id}`, getPartnerCustomerById],
    ['GET', `/api/partner/customers/${id}/activity`, getPartnerCustomerActivity],
    ['GET', '/api/partner/stored-clients', getStoredClients],
    ['POST', '/api/partner/stored-clients', createStoredClient],
    ['PATCH', `/api/partner/stored-clients/${id}/status`, updateStoredClientStatus],
    ['PATCH', `/api/partner/stored-clients/${id}/notes`, updateStoredClientNotes],
    ['PATCH', `/api/partner/stored-clients/${id}/assigned-bank`, updateStoredClientAssignedBank],
    ['PATCH', `/api/partner/stored-clients/${id}/preferred-bank`, updateStoredClientPreferredBank],
    ['PUT', `/api/partner/stored-clients/${id}/documents`, saveStoredClientDocuments],
    ['POST', `/api/partner/stored-clients/${id}/submit`, submitStoredClientToGPS],
    ['DELETE', `/api/partner/stored-clients/${id}`, deleteStoredClient],
  ])('routes %s %s to its controller', async (method, path, handler) => {
    const { response, json } = await requestJson(
      method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      path,
      method === 'GET' || method === 'DELETE' ? undefined : {},
      partnerHeaders,
    );

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid UUID params before controller access', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/partner/leads/not-a-uuid',
      undefined,
      partnerHeaders,
    );

    expect(response.status).toBe(400);
    expect(json.message).toBe('Invalid ID format for "id"');
    expect(getLeadById).not.toHaveBeenCalled();
  });

  it('rejects invalid stored-client UUID params before controller access', async () => {
    const { response, json } = await requestJson(
      'PATCH',
      '/api/partner/stored-clients/not-a-uuid/status',
      { localStatus: 'processing' },
      partnerHeaders,
    );

    expect(response.status).toBe(400);
    expect(json.message).toBe('Invalid ID format for "id"');
    expect(updateStoredClientStatus).not.toHaveBeenCalled();
  });

  it('rejects invalid soft-check body IDs before controller access', async () => {
    const { response, json } = await requestJson(
      'POST',
      '/api/partner/soft-check',
      { storedClientId: 'not-a-uuid', consentCredit: true },
      partnerHeaders,
    );

    expect(response.status).toBe(400);
    expect(json).toEqual(expect.objectContaining({
      success: false,
      message: 'Validation failed',
    }));
    expect(runPartnerSoftCheck).not.toHaveBeenCalled();
  });

  it('applies the dedicated soft-check rate limiter before the controller', async () => {
    await requestJson(
      'POST',
      '/api/partner/soft-check',
      { consentCredit: true },
      partnerHeaders,
    );

    expect(softCheckLimiter).toHaveBeenCalledTimes(1);
    expect(runPartnerSoftCheck).toHaveBeenCalledTimes(1);
  });

  it('redirects dashboard requests to partner lead stats', async () => {
    const { response } = await requestJson('GET', '/api/partner/dashboard', undefined, partnerHeaders);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/api/partner/leads/stats');
  });

  it('returns partner bank dropdown data', async () => {
    const { response, json } = await requestJson('GET', '/api/partner/banks', undefined, partnerHeaders);

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.count).toBe(1);
    expect(json.data.banks[0].name).toBe('Test Bank');
  });
});

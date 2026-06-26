import express from 'express';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type JsonObject = Record<string, any>;

const ok = (name: string) => vi.fn((_req: express.Request, res: express.Response) =>
  res.status(200).json({ success: true, handler: name }),
);

const upload = ok('upload');
const list = ok('list');
const download = ok('download');
const remove = ok('remove');
const uploadLeadDoc = ok('uploadLeadDoc');
const getLeadDocUrl = ok('getLeadDocUrl');
const deleteLeadDoc = ok('deleteLeadDoc');
const updateLeadDocStatus = ok('updateLeadDocStatus');
const bulkUpdateLeadDocStatus = ok('bulkUpdateLeadDocStatus');
const generateUploadToken = ok('generateUploadToken');
const uploadViaToken = ok('uploadViaToken');
const validateUploadToken = ok('validateUploadToken');

const reqDocRows = [
  {
    lenderCode: 'BANK',
    lenderName: 'Test Bank',
    loanCode: 'personal_loan',
    docId: 'pan',
    docName: 'PAN Card',
    description: 'PAN document',
    mandatory: true,
    acceptedFormats: ['pdf'],
    maxSizeMB: 3,
    sortOrder: 1,
  },
];

vi.mock('../modules/documents/document.controller.js', () => ({
  upload,
  list,
  download,
  remove,
  uploadLeadDoc,
  getLeadDocUrl,
  deleteLeadDoc,
  updateLeadDocStatus,
  bulkUpdateLeadDocStatus,
  generateUploadToken,
  uploadViaToken,
  validateUploadToken,
}));

vi.mock('../shared/middleware/auth.js', () => ({
  protect: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      next();
      return;
    }
    res.status(401).json({ success: false, message: 'Not authorized' });
  },
}));

vi.mock('../shared/middleware/cacheControl.js', () => ({
  cacheControl: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock('../shared/middleware/upload.js', () => ({
  MAX_FILE_SIZE: 3 * 1024 * 1024,
  uploadSingle: (_req: express.Request, _res: express.Response, next: (err?: unknown) => void) => next(),
  validateMagicBytes: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock('../shared/utils/cache.js', () => ({
  cacheWrap: vi.fn((_key: string, loader: () => Promise<unknown>) => loader()),
}));

vi.mock('../shared/db/prisma.js', () => ({
  basePrisma: {
    lenderDocRequirement: {
      findMany: vi.fn().mockResolvedValue(reqDocRows),
    },
  },
}));

const documentRoutes = (await import('../modules/documents/document.routes.js')).default;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/documents', documentRoutes);
  return app;
};

const requestJson = async (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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

const authHeader = { authorization: 'Bearer valid-token' };
const leadId = '33333333-3333-4333-8333-333333333333';
const documentId = '44444444-4444-4444-8444-444444444444';

describe('document routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['GET', '/api/documents/upload-via-token', validateUploadToken],
    ['POST', '/api/documents/upload-via-token', uploadViaToken],
    ['GET', '/api/documents/upload-via-token/test-token', validateUploadToken],
    ['POST', '/api/documents/upload-via-token/test-token', uploadViaToken],
  ])('allows public token route %s %s', async (method, path, handler) => {
    const { response, json } = await requestJson(
      method as 'GET' | 'POST',
      path,
      method === 'GET' ? undefined : {},
    );

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('requires authentication for protected document routes', async () => {
    const { response, json } = await requestJson('GET', '/api/documents');

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(list).not.toHaveBeenCalled();
  });

  it('returns grouped document requirements for authenticated users', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/documents/req-docs?loanCode=personal_loan',
      undefined,
      authHeader,
    );

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data[0].lenderCode).toBe('BANK');
    expect(json.data[0].docs[0].docName).toBe('PAN Card');
  });

  it('requires loanCode for flat document requirements', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/documents/req-docs/flat',
      undefined,
      authHeader,
    );

    expect(response.status).toBe(400);
    expect(json.message).toBe('loanCode query parameter is required');
  });

  it('returns flat deduped document requirements for authenticated users', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/documents/req-docs/flat?loanCode=personal_loan',
      undefined,
      authHeader,
    );

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.count).toBe(1);
    expect(json.data[0]).toMatchObject({ id: 'pan', name: 'PAN Card', mandatory: true });
  });

  it.each([
    ['POST', '/api/documents/upload', upload],
    ['POST', `/api/documents/lead/${leadId}/doc/${documentId}/upload`, uploadLeadDoc],
    ['GET', `/api/documents/lead/${documentId}/download`, getLeadDocUrl],
    ['PATCH', '/api/documents/lead/bulk-status', bulkUpdateLeadDocStatus],
    ['PATCH', `/api/documents/lead/${documentId}/status`, updateLeadDocStatus],
    ['DELETE', `/api/documents/lead/${documentId}`, deleteLeadDoc],
    ['POST', `/api/documents/lead/${documentId}/upload-token`, generateUploadToken],
    ['GET', '/api/documents', list],
    ['GET', '/api/documents/download/customer/file.pdf', download],
    ['DELETE', '/api/documents/customer/file.pdf', remove],
  ])('routes protected document endpoint %s %s', async (method, path, handler) => {
    const { response, json } = await requestJson(
      method as 'GET' | 'POST' | 'PATCH' | 'DELETE',
      path,
      method === 'GET' || method === 'DELETE' ? undefined : {},
      authHeader,
    );

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid leadId params before upload controller access', async () => {
    const { response, json } = await requestJson(
      'POST',
      `/api/documents/lead/not-a-uuid/doc/${documentId}/upload`,
      {},
      authHeader,
    );

    expect(response.status).toBe(400);
    expect(json.message).toBe('Invalid ID format for "leadId"');
    expect(uploadLeadDoc).not.toHaveBeenCalled();
  });

  it('rejects invalid documentId params before controller access', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/documents/lead/not-a-uuid/download',
      undefined,
      authHeader,
    );

    expect(response.status).toBe(400);
    expect(json.message).toBe('Invalid ID format for "documentId"');
    expect(getLeadDocUrl).not.toHaveBeenCalled();
  });
});

import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const leadFindUnique = vi.fn();
const leadFindMany = vi.fn();
const leadCount = vi.fn();
const leadTransaction = vi.fn();
const partnerDataUpdateMany = vi.fn();
const leadDocumentFindUnique = vi.fn();
const leadDocumentFindFirst = vi.fn();
const documentUploadTokenCreate = vi.fn();
const getLeadDocumentDownloadUrl = vi.fn();
const uploadLeadDocument = vi.fn();
const cacheDelete = vi.fn();

vi.mock('../shared/db/prisma.js', () => ({
  default: {
    lead: {
      findUnique: leadFindUnique,
      findMany: leadFindMany,
      count: leadCount,
    },
    partnerData: {
      updateMany: partnerDataUpdateMany,
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    leadDocument: {
      findUnique: leadDocumentFindUnique,
      findFirst: leadDocumentFindFirst,
      update: vi.fn(),
    },
    documentUploadToken: {
      create: documentUploadTokenCreate,
    },
    bank: { findMany: vi.fn() },
    $transaction: leadTransaction,
  },
  basePrisma: {},
}));

vi.mock('../modules/audit/auditLogger.js', () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock('../shared/utils/cache.js', () => ({
  cacheDelete,
  cacheWrap: vi.fn(),
}));

vi.mock('../modules/leads/lead.helpers.js', () => ({
  formatLeadResponse: (lead: unknown) => lead,
  getNextGpsifsLeadId: vi.fn(),
}));

vi.mock('../modules/partner-data/consent.service.js', () => ({
  canViewLeadPII: vi.fn().mockResolvedValue(true),
  grantAccess: vi.fn(),
}));

vi.mock('../modules/users/adminPermissions.service.js', () => ({
  isAdminRole: (role: string) => role === 'admin',
}));

vi.mock('../shared/utils/crmHelpers.js', () => ({
  computeLeadScore: vi.fn(),
  deriveCustomerIdentity: vi.fn(),
  matchesCustomerIdentity: vi.fn(),
  scoreBandForLeadScore: vi.fn(),
  summarizeConsentGrants: vi.fn(),
}));

vi.mock('../modules/documents/document.service.js', () => ({
  uploadDocument: vi.fn(),
  getDownloadUrl: vi.fn(),
  deleteDocument: vi.fn(),
  documentExists: vi.fn(),
  listUserDocuments: vi.fn(),
  uploadLeadDocument,
  getLeadDocumentDownloadUrl,
  updateLeadDocumentStatus: vi.fn(),
  bulkUpdateLeadDocumentStatus: vi.fn(),
}));

const { getLeadById, getLeads, updateLead } = await import('../modules/leads/lead.controller.js');
const { updateStoredClientStatus } = await import('../modules/partner-data/partnerData.controller.js');
const {
  generateUploadToken,
  getLeadDocUrl,
  uploadLeadDoc,
} = await import('../modules/documents/document.controller.js');

const partnerUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'member@partner-a.test',
  firstName: 'Partner',
  lastName: 'Member',
  role: 'partner',
  isActive: true,
};

const createResponse = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

const createRequest = (
  overrides: Partial<Request> & { partnerOrgId?: string } = {},
): Request => ({
  user: partnerUser,
  partnerOrgId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  params: { id: '33333333-3333-4333-8333-333333333333' },
  query: {},
  body: {},
  headers: {},
  ...overrides,
}) as Request;

const lead = {
  id: '33333333-3333-4333-8333-333333333333',
  partnerId: '22222222-2222-4222-8222-222222222222',
  partnerOrgId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  status: 'submitted',
  documents: [],
  timeline: [],
  consentGrants: [],
};

describe('partner organization isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadFindMany.mockResolvedValue([]);
    leadCount.mockResolvedValue(0);
  });

  it('falls back to creator-user scope when partner organization is unresolved', async () => {
    const res = createResponse();

    await getLeads(createRequest({ partnerOrgId: undefined }), res);

    expect(leadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          partnerId: partnerUser.id,
        },
      }),
    );
  });

  it('allows a partner member to read a lead owned by their organization', async () => {
    leadFindUnique.mockResolvedValue(lead);
    const res = createResponse();

    await getLeadById(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects reading a lead owned by another organization', async () => {
    leadFindUnique.mockResolvedValue({
      ...lead,
      partnerOrgId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
    const res = createResponse();

    await getLeadById(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows a partner member to update a lead owned by their organization', async () => {
    leadFindUnique
      .mockResolvedValueOnce(lead)
      .mockResolvedValueOnce(lead);
    leadTransaction.mockImplementation(async (callback) =>
      callback({
        lead: { update: vi.fn() },
        leadTimeline: { create: vi.fn() },
      }),
    );
    const res = createResponse();

    await updateLead(createRequest({ body: { tenure: 24 } }), res);

    expect(leadTransaction).toHaveBeenCalledTimes(1);
    expect(cacheDelete).toHaveBeenCalledWith(
      'lead:stats:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'lead:stats:all',
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('scopes stored-client updates to the resolved partner organization', async () => {
    partnerDataUpdateMany.mockResolvedValue({ count: 1 });
    const res = createResponse();

    await updateStoredClientStatus(
      createRequest({ body: { localStatus: 'processing' } }),
      res,
    );

    expect(partnerDataUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: '33333333-3333-4333-8333-333333333333',
          partnerOrgId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        },
      }),
    );
  });

  it('allows a partner member to download a document owned by their organization', async () => {
    leadDocumentFindUnique.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      leadId: lead.id,
      type: 'pan',
      fileName: 'pan.pdf',
      lead: {
        partnerId: lead.partnerId,
        partnerOrgId: lead.partnerOrgId,
      },
    });
    getLeadDocumentDownloadUrl.mockResolvedValue({
      url: 'https://example.test/download',
      document: { id: '44444444-4444-4444-8444-444444444444' },
    });
    const res = createResponse();

    await getLeadDocUrl(
      createRequest({
        params: { documentId: '44444444-4444-4444-8444-444444444444' },
      }),
      res,
    );

    expect(getLeadDocumentDownloadUrl).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('allows a partner member to upload a document for their organization lead', async () => {
    leadFindUnique.mockResolvedValue(lead);
    leadDocumentFindFirst.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      leadId: lead.id,
      type: 'pan',
    });
    uploadLeadDocument.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      type: 'pan',
      fileName: 'pan.pdf',
      fileSize: 3,
      fileUrl: 'https://example.test/pan.pdf',
      mimeType: 'application/pdf',
      uploadedBy: 'Partner Member',
      uploadedAt: new Date(),
      status: 'uploaded',
    });
    const res = createResponse();
    const req = createRequest({
      params: {
        leadId: lead.id,
        documentId: '44444444-4444-4444-8444-444444444444',
      },
    }) as Request & { file: Express.Multer.File };
    req.file = {
      originalname: 'pan.pdf',
      buffer: Buffer.from('pdf'),
      mimetype: 'application/pdf',
      size: 3,
    } as Express.Multer.File;

    await uploadLeadDoc(req, res);

    expect(uploadLeadDocument).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('allows a partner member to generate an upload token for their organization lead', async () => {
    leadDocumentFindUnique.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      leadId: lead.id,
      type: 'pan',
      lead: {
        id: lead.id,
        partnerId: lead.partnerId,
        partnerOrgId: lead.partnerOrgId,
        clientFullName: 'Customer',
        clientEmail: 'customer@example.test',
      },
    });
    documentUploadTokenCreate.mockResolvedValue({
      token: 'upload-token',
    });
    const res = createResponse();

    await generateUploadToken(
      createRequest({
        params: { documentId: '44444444-4444-4444-8444-444444444444' },
      }),
      res,
    );

    expect(documentUploadTokenCreate).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

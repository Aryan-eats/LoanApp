import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, uploadLeadDocumentMock, logAuditEventMock } = vi.hoisted(() => ({
  prismaMock: {
    leadDocument: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    documentUploadToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  uploadLeadDocumentMock: vi.fn(),
  logAuditEventMock: vi.fn(),
}));

vi.mock('../config/prisma.js', () => ({
  default: prismaMock,
}));

vi.mock('../services/documentService.js', () => ({
  uploadDocument: vi.fn(),
  getDownloadUrl: vi.fn(),
  deleteDocument: vi.fn(),
  documentExists: vi.fn(),
  listUserDocuments: vi.fn(),
  uploadLeadDocument: uploadLeadDocumentMock,
  getLeadDocumentDownloadUrl: vi.fn(),
  updateLeadDocumentStatus: vi.fn(),
  bulkUpdateLeadDocumentStatus: vi.fn(),
}));

vi.mock('../utils/auditLogger.js', () => ({
  logAuditEvent: logAuditEventMock,
}));

import { generateUploadToken, uploadViaToken } from '../controllers/documentController.js';

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
};

describe('documentController security fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks partners from generating upload tokens for another partner\'s lead', async () => {
    prismaMock.leadDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      leadId: 'lead-1',
      type: 'pan_card',
      lead: {
        id: 'lead-1',
        partnerId: 'partner-2',
        clientFullName: 'User',
        clientEmail: 'user@example.com',
      },
    });

    const req = {
      params: { documentId: 'doc-1' },
      user: { id: 'partner-1', role: 'partner' },
    } as any;
    const res = createResponse();

    await generateUploadToken(req, res as any);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.documentUploadToken.create).not.toHaveBeenCalled();
  });

  it('rejects uploads for a different document than the token was created for', async () => {
    prismaMock.documentUploadToken.findUnique.mockResolvedValue({
      id: 'token-1',
      token: 'token-value',
      leadId: 'lead-1',
      documentId: 'doc-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    prismaMock.leadDocument.findFirst.mockResolvedValue(null);

    const req = {
      params: { token: 'token-value' },
      query: { documentId: 'doc-2' },
      file: {
        originalname: 'statement.pdf',
        buffer: Buffer.from('%PDF-1.7\n', 'utf8'),
        mimetype: 'application/pdf',
      },
    } as any;
    const res = createResponse();

    await uploadViaToken(req, res as any);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.documentUploadToken.updateMany).not.toHaveBeenCalled();
  });

  it('releases the token reservation if the upload fails after consumption', async () => {
    prismaMock.documentUploadToken.findUnique.mockResolvedValue({
      id: 'token-1',
      token: 'token-value',
      leadId: 'lead-1',
      documentId: 'doc-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    prismaMock.leadDocument.findFirst.mockResolvedValue({
      id: 'doc-1',
      leadId: 'lead-1',
      type: 'pan_card',
    });
    prismaMock.documentUploadToken.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    uploadLeadDocumentMock.mockRejectedValue(new Error('R2 unavailable'));

    const req = {
      params: { token: 'token-value' },
      query: { documentId: 'doc-1' },
      file: {
        originalname: 'statement.pdf',
        buffer: Buffer.from('%PDF-1.7\n', 'utf8'),
        mimetype: 'application/pdf',
      },
    } as any;
    const res = createResponse();

    await uploadViaToken(req, res as any);

    expect(prismaMock.documentUploadToken.updateMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.documentUploadToken.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: { usedAt: null },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
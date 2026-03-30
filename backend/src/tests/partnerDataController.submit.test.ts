import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, grantAccessMock, logAuditEventMock } = vi.hoisted(() => ({
  prismaMock: {},
  grantAccessMock: vi.fn(),
  logAuditEventMock: vi.fn(),
}));

vi.mock('../config/prisma.js', () => ({
  default: prismaMock,
}));

vi.mock('../services/consent.js', () => ({
  grantAccess: grantAccessMock,
}));

vi.mock('../utils/auditLogger.js', () => ({
  logAuditEvent: logAuditEventMock,
}));

import { submitStoredClientToGPS } from '../controllers/partnerDataController.js';

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('partnerDataController.submitStoredClientToGPS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logAuditEventMock.mockResolvedValue(undefined);
  });

  it('submits stored client and writes audit event', async () => {
    grantAccessMock.mockResolvedValue({ id: 'GPSIFS123' });

    const req = {
      params: { id: 'stored-1' },
      body: { grantedTo: 'gps_india' },
      user: { id: 'user-1' },
      partnerOrgId: 'org-1',
    } as any;
    const res = createResponse();

    await submitStoredClientToGPS(req, res as any);

    expect(grantAccessMock).toHaveBeenCalledWith({
      partnerDataId: 'stored-1',
      partnerId: 'user-1',
      partnerOrgId: 'org-1',
      submittedBy: 'user-1',
      grantedTo: 'gps_india',
      expiresAt: null,
    });
    expect(logAuditEventMock).toHaveBeenCalledWith('LEAD_SUBMITTED_TO_GPS', req, {
      userId: 'user-1',
      entityId: 'GPSIFS123',
      entityType: 'lead',
      metadata: {
        partnerDataId: 'stored-1',
        partnerOrgId: 'org-1',
      },
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 404 when consent service reports missing stored client', async () => {
    grantAccessMock.mockRejectedValue(new Error('Stored client not found'));

    const req = {
      params: { id: 'missing' },
      body: {},
      user: { id: 'user-1' },
      partnerOrgId: 'org-1',
    } as any;
    const res = createResponse();

    await submitStoredClientToGPS(req, res as any);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Stored client not found',
    });
  });

  it('returns 403 when the partner organisation is missing', async () => {
    const req = {
      params: { id: 'stored-1' },
      body: {},
      user: { id: 'user-1' },
      partnerOrgId: undefined,
    } as any;
    const res = createResponse();

    await submitStoredClientToGPS(req, res as any);

    expect(grantAccessMock).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Partner organisation not resolved',
    });
  });

  it('returns 500 when consent handoff does not yield a submitted lead', async () => {
    grantAccessMock.mockResolvedValue(null);

    const req = {
      params: { id: 'stored-1' },
      body: {},
      user: { id: 'user-1' },
      partnerOrgId: 'org-1',
    } as any;
    const res = createResponse();

    await submitStoredClientToGPS(req, res as any);

    expect(logAuditEventMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to submit stored client',
    });
  });
});

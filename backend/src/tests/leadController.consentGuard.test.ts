import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, canViewLeadPIIMock } = vi.hoisted(() => ({
  prismaMock: {
    lead: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
  canViewLeadPIIMock: vi.fn(),
}));

vi.mock('../config/prisma.js', () => ({
  default: prismaMock,
  basePrisma: {},
}));

vi.mock('../services/consent.js', () => ({
  canViewLeadPII: canViewLeadPIIMock,
}));

vi.mock('../utils/cache.js', () => ({
  cacheWrap: vi.fn(),
  cacheDelete: vi.fn(),
}));

vi.mock('../utils/auditLogger.js', () => ({
  logAuditEvent: vi.fn(),
}));

import { getLeadById, getLeads } from '../controllers/leadController.js';

const createResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('leadController consent guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks admin from viewing lead PII when consent is missing', async () => {
    prismaMock.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      partnerId: 'partner-1',
      documents: [],
      timeline: [],
    });
    canViewLeadPIIMock.mockResolvedValue(false);

    const req = {
      params: { id: 'lead-1' },
      query: {},
      user: { id: 'admin-1', role: 'admin' },
    } as any;
    const res = createResponse();

    await getLeadById(req, res as any);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Consent grant is required before viewing this lead PII',
    });
  });

  it('redacts lead PII in admin list when consent is missing', async () => {
    prismaMock.lead.findMany.mockResolvedValue([
      {
        id: 'lead-a',
        clientFullName: 'Alice',
        clientPhone: '9000000001',
        clientEmail: 'alice@example.com',
        clientDateOfBirth: '1990-01-01',
        clientPanNumber: 'ABCDE1234F',
        clientAadhaar: '111122223333',
        documents: [],
        timeline: [],
      },
      {
        id: 'lead-b',
        clientFullName: 'Bob',
        clientPhone: '9000000002',
        clientEmail: 'bob@example.com',
        clientDateOfBirth: '1992-02-02',
        clientPanNumber: 'ABCDE9999F',
        clientAadhaar: '999988887777',
        documents: [],
        timeline: [],
      },
    ]);
    prismaMock.lead.count.mockResolvedValue(2);
    canViewLeadPIIMock.mockImplementation(async (leadId: string) => leadId === 'lead-a');

    const req = {
      params: {},
      query: {},
      user: { id: 'admin-1', role: 'admin' },
    } as any;
    const res = createResponse();

    await getLeads(req, res as any);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.leads).toHaveLength(2);
    expect(payload.data.leads[0].client.fullName).toBe('Alice');
    expect(payload.data.leads[1].client.fullName).toBe('[REDACTED]');
    expect(payload.data.leads[1].client.phone).toBe('[REDACTED]');
    expect(payload.data.leads[1].client.email).toBe('');
    expect(payload.data.leads[1].client.panNumber).toBeUndefined();
  });

  it('filters lead search results in memory when searching encrypted fields', async () => {
    prismaMock.lead.findMany.mockResolvedValue([
      {
        id: 'lead-a',
        clientFullName: 'Alice',
        clientPhone: '9000000001',
        clientEmail: 'alice@example.com',
        clientDateOfBirth: null,
        clientPanNumber: null,
        clientAadhaar: null,
        documents: [],
        timeline: [],
      },
      {
        id: 'lead-b',
        clientFullName: 'Bob',
        clientPhone: '9000000002',
        clientEmail: 'bob@example.com',
        clientDateOfBirth: null,
        clientPanNumber: null,
        clientAadhaar: null,
        documents: [],
        timeline: [],
      },
    ]);

    const req = {
      params: {},
      query: { search: 'alice' },
      user: { id: 'partner-1', role: 'partner' },
    } as any;
    const res = createResponse();

    await getLeads(req, res as any);

    const payload = res.json.mock.calls[0][0];
    expect(prismaMock.lead.findMany).toHaveBeenCalled();
    expect(prismaMock.lead.count).not.toHaveBeenCalled();
    expect(payload.data.leads).toHaveLength(1);
    expect(payload.data.leads[0].id).toBe('lead-a');
    expect(payload.data.pagination.total).toBe(1);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { runPartnerSoftCheck } from '../modules/soft-check/softCheck.controller.js';

const { prismaMock, logAuditEventMock } = vi.hoisted(() => ({
  prismaMock: {
    bank: { findMany: vi.fn() },
    partnerData: { findFirst: vi.fn() },
    lead: { findFirst: vi.fn(), update: vi.fn() },
  },
  logAuditEventMock: vi.fn(),
}));

vi.mock('../shared/db/prisma.js', () => ({ default: prismaMock }));
vi.mock('../modules/audit/auditLogger.js', () => ({ logAuditEvent: logAuditEventMock }));
vi.mock('../modules/soft-check/softCheckRepository.js', () => ({
  getSoftCheckConfiguration: vi.fn().mockResolvedValue(null),
  persistSoftCheckDecision: vi.fn(),
}));

const response = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const req = (body: Record<string, unknown>, partnerOrgId = 'partner-a') =>
  ({
    user: { id: 'user-1' },
    partnerOrgId,
    body: { consentCredit: true, ...body },
  }) as Request;

describe('soft-check tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.partnerData.findFirst.mockResolvedValue(null);
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.lead.update.mockResolvedValue({});
    prismaMock.bank.findMany.mockResolvedValue([]);
  });

  it('uses the resolved partner organization for stored-client source reads', async () => {
    const res = response();

    await runPartnerSoftCheck(req({ storedClientId: 'stored-1' }), res as unknown as Response);

    expect(prismaMock.partnerData.findFirst).toHaveBeenCalledWith({
      where: { id: 'stored-1', partnerOrgId: 'partner-a' },
    });
  });

  it('returns the same generic 404 for cross-tenant and nonexistent stored clients', async () => {
    const crossTenant = response();
    const missing = response();

    await runPartnerSoftCheck(req({ storedClientId: 'same-id' }), crossTenant as unknown as Response);
    await runPartnerSoftCheck(req({ storedClientId: 'missing-id' }), missing as unknown as Response);

    expect(crossTenant.status).toHaveBeenCalledWith(404);
    expect(missing.status).toHaveBeenCalledWith(404);
    expect(crossTenant.json.mock.calls[0][0]).toEqual(missing.json.mock.calls[0][0]);
  });

  it('returns the same generic 404 for cross-tenant and nonexistent leads', async () => {
    const crossTenant = response();
    const missing = response();

    await runPartnerSoftCheck(req({ leadId: 'same-id' }), crossTenant as unknown as Response);
    await runPartnerSoftCheck(req({ leadId: 'missing-id' }), missing as unknown as Response);

    expect(prismaMock.lead.findFirst).toHaveBeenCalledWith({
      where: { id: 'same-id', partnerOrgId: 'partner-a' },
    });
    expect(crossTenant.status).toHaveBeenCalledWith(404);
    expect(missing.status).toHaveBeenCalledWith(404);
    expect(crossTenant.json.mock.calls[0][0]).toEqual(missing.json.mock.calls[0][0]);
  });
});

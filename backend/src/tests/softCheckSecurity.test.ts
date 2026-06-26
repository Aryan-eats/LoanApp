import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { buildBorrowerHash } from '../modules/soft-check/softCheckIntegrity.js';
import { persistSoftCheckDecision } from '../modules/soft-check/softCheckRepository.js';
import { runPartnerSoftCheck } from '../modules/soft-check/softCheck.controller.js';

const txMock = {
  softCheckResultLog: { findUnique: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
  lead: { update: vi.fn() },
};

const { prismaMock, logAuditEventMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
    bank: { findMany: vi.fn() },
    partnerData: { findFirst: vi.fn() },
    lead: { findFirst: vi.fn(), update: vi.fn() },
  },
  logAuditEventMock: vi.fn(),
}));

vi.mock('../shared/db/prisma.js', () => ({ default: prismaMock }));
vi.mock('../modules/audit/auditLogger.js', () => ({ logAuditEvent: logAuditEventMock }));

const response = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe('soft-check security controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SOFT_CHECK_HMAC_KEY = 'borrower-secret';
    process.env.SOFT_CHECK_CHECKSUM_KEY = 'checksum-secret';
    txMock.softCheckResultLog.findUnique.mockResolvedValue(null);
    txMock.softCheckResultLog.create.mockImplementation(async ({ data }) => ({ id: 'result-1', ...data }));
    txMock.auditLog.create.mockResolvedValue({});
    txMock.lead.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SOFT_CHECK_ENGINE_MODE;
    delete process.env.SOFT_CHECK_HMAC_KEY;
    delete process.env.SOFT_CHECK_CHECKSUM_KEY;
  });

  it('uses the partner-scoped borrower HMAC for soft-check rate limit keys', async () => {
    const { buildSoftCheckRateLimitKey } = await import('../shared/middleware/rateLimiter.js');

    const key = buildSoftCheckRateLimitKey({
      partnerOrgId: 'partner-1',
      body: { phone: '9876543210' },
    } as Request);

    expect(key).toBe(`soft-check:partner-1:${buildBorrowerHash('partner-1', '9876543210')}`);
    expect(key).not.toContain('9876543210');
  });

  it('strips direct PII before persisting result, trace, or audit metadata', async () => {
    await persistSoftCheckDecision({
      requestId: '11111111-1111-4111-8111-111111111111',
      partnerOrgId: '22222222-2222-4222-8222-222222222222',
      actorUserId: '33333333-3333-4333-8333-333333333333',
      sourceType: 'RAW',
      sourceId: null,
      borrowerHash: 'a'.repeat(64),
      inputHash: 'b'.repeat(64),
      normalizedInput: { phone: '9876543210', monthlyIncome: 75_000 },
      result: { clientFullName: 'Ravi Sharma', eligibilityStatus: 'ELIGIBLE' },
      ruleTrace: [{ clientPhone: '9876543210', ruleCode: 'PL_MAX_FOIR' }],
      ruleSetIds: ['44444444-4444-4444-8444-444444444444'],
      eligibilityStatus: 'ELIGIBLE',
      confidenceTier: 'STRONG',
      schemaVersion: '2.0',
      engineVersion: 'soft-check-engine-v2',
      consentNoticeVersion: 'soft-check-v1',
      retentionPolicyCode: 'RBI_CREDIT_DECISION_AUDIT_5Y',
      retentionUntil: new Date('2031-01-01T00:00:00.000Z'),
      checksum: 'c'.repeat(64),
    });

    const persisted = txMock.softCheckResultLog.create.mock.calls[0][0].data;
    expect(JSON.stringify(persisted)).not.toContain('9876543210');
    expect(JSON.stringify(persisted)).not.toContain('Ravi Sharma');
    expect(JSON.stringify(txMock.auditLog.create.mock.calls[0][0].data.metadata)).not.toContain('9876543210');
  });

  it('does not log raw request PII when the controller catches an unexpected error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    prismaMock.partnerData.findFirst.mockResolvedValue(null);
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.bank.findMany.mockRejectedValue(new Error('db failed for 9876543210'));

    await runPartnerSoftCheck(
      {
        user: { id: 'user-1' },
        partnerOrgId: 'partner-1',
        body: {
          fullName: 'Ravi Sharma',
          phone: '9876543210',
          monthlyIncome: 75_000,
          employmentType: 'salaried',
          loanType: 'personal_loan',
          loanAmount: 500_000,
          consentCredit: true,
        },
      } as Request,
      response() as unknown as Response,
    );

    const logged = errorSpy.mock.calls
      .flat()
      .map((entry) => entry instanceof Error ? entry.message : String(entry))
      .join(' ');
    expect(logged).not.toContain('9876543210');
    expect(logged).not.toContain('Ravi Sharma');
  });
});

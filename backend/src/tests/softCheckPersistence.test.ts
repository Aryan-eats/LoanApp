import { beforeEach, describe, expect, it, vi } from 'vitest';

const txMock = {
  softCheckResultLog: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  lead: { update: vi.fn() },
};

const prismaMock = {
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
};

vi.mock('../shared/db/prisma.js', () => ({
  default: prismaMock,
}));

const { persistSoftCheckDecision } = await import('../modules/soft-check/softCheckRepository.js');

const request = {
  requestId: '11111111-1111-4111-8111-111111111111',
  partnerOrgId: '22222222-2222-4222-8222-222222222222',
  actorUserId: '33333333-3333-4333-8333-333333333333',
  sourceType: 'RAW' as const,
  sourceId: null,
  borrowerHash: 'a'.repeat(64),
  inputHash: 'b'.repeat(64),
  normalizedInput: { productCode: 'personal_loan', requestedAmount: 500_000 },
  result: {
    schemaVersion: '2.0',
    eligibilityStatus: 'ELIGIBLE',
    confidenceTier: 'STRONG',
    fullName: 'should-never-persist',
  },
  ruleTrace: [{ ruleCode: 'PL_MAX_FOIR', outcome: 'PASS' }],
  ruleSetIds: ['44444444-4444-4444-8444-444444444444'],
  eligibilityStatus: 'ELIGIBLE' as const,
  confidenceTier: 'STRONG' as const,
  schemaVersion: '2.0',
  engineVersion: 'soft-check-engine-v2',
  consentNoticeVersion: 'soft-check-v1',
  retentionPolicyCode: 'RBI_CREDIT_DECISION_AUDIT_5Y',
  retentionUntil: new Date('2031-01-01T00:00:00.000Z'),
  checksum: 'c'.repeat(64),
  leadUpdate: {
    leadId: '55555555-5555-4555-8555-555555555555',
    data: {
      isEligible: true,
      maxLoanAmount: 500_000,
      minLoanAmount: 50_000,
      estimatedEMI: 11_122,
      eligibilityCheckedAt: new Date('2026-06-26T00:00:00.000Z'),
    },
  },
};

describe('persistSoftCheckDecision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.softCheckResultLog.findUnique.mockResolvedValue(null);
    txMock.softCheckResultLog.create.mockImplementation(async ({ data }) => ({
      id: 'result-1',
      ...data,
    }));
    txMock.auditLog.create.mockResolvedValue({});
    txMock.lead.update.mockResolvedValue({});
  });

  it('persists result log, audit event, and legacy lead columns in one transaction', async () => {
    const persisted = await persistSoftCheckDecision(request);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.softCheckResultLog.findUnique).toHaveBeenCalledWith({
      where: {
        partnerOrgId_requestId: {
          partnerOrgId: request.partnerOrgId,
          requestId: request.requestId,
        },
      },
    });
    expect(txMock.softCheckResultLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: request.requestId,
        partnerOrgId: request.partnerOrgId,
        bureauPulled: false,
        result: expect.not.objectContaining({ fullName: expect.any(String) }),
      }),
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event: 'SOFT_CHECK_RUN',
        userId: request.actorUserId,
        entityId: 'result-1',
        entityType: 'soft_check_result',
      }),
    });
    expect(txMock.lead.update).toHaveBeenCalledWith({
      where: { id: request.leadUpdate.leadId },
      data: request.leadUpdate.data,
    });
    expect(persisted.created).toBe(true);
  });

  it('returns the existing own-tenant result for duplicate request ids without mutating append-only tables', async () => {
    txMock.softCheckResultLog.findUnique.mockResolvedValue({
      id: 'existing-result',
      result: { schemaVersion: '2.0', eligibilityStatus: 'ELIGIBLE' },
    });

    const persisted = await persistSoftCheckDecision(request);

    expect(txMock.softCheckResultLog.create).not.toHaveBeenCalled();
    expect(txMock.auditLog.create).not.toHaveBeenCalled();
    expect(txMock.lead.update).not.toHaveBeenCalled();
    expect(persisted).toEqual({
      created: false,
      record: expect.objectContaining({ id: 'existing-result' }),
    });
  });
});

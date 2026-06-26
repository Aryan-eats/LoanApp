import { beforeEach, describe, expect, it, vi } from 'vitest';

const txMock = {
  eligibilityRuleSet: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  ruleChangeAuditLog: { create: vi.fn() },
};

const prismaMock = {
  eligibilityRuleSet: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  baseRuleDefinition: { findMany: vi.fn() },
  lenderRuleOverride: { findMany: vi.fn() },
  ruleChangeAuditLog: { create: vi.fn() },
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
};

vi.mock('../shared/db/prisma.js', () => ({ default: prismaMock }));

const {
  approveRuleSet,
  activateRuleSet,
} = await import('../modules/soft-check/softCheckRuleAdmin.service.js');

describe('soft-check rule admin service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.baseRuleDefinition.findMany.mockResolvedValue([{
      id: 'rule-1',
      ruleCode: 'PL_MAX_FOIR',
      name: 'Maximum FOIR',
      fieldPath: 'derived.foirPercent',
      operator: 'LTE',
      threshold: 50,
      conditions: null,
      employmentScopes: [],
      severity: 'HARD_FAIL',
      priority: 1,
      regulatoryClass: 'LENDER_VARIABLE',
      confidenceWeight: { toString: () => '1' },
    }]);
    prismaMock.lenderRuleOverride.findMany.mockResolvedValue([]);
    txMock.eligibilityRuleSet.findUnique.mockResolvedValue({
      id: 'ruleset-1',
      productId: 'product-1',
      createdBy: 'maker-1',
      approvedBy: 'checker-1',
      status: 'PENDING_APPROVAL',
      configHash: 'hash-1',
      product: { code: 'personal_loan' },
    });
  });

  it('prevents the maker from approving their own rule release', async () => {
    prismaMock.eligibilityRuleSet.findUnique.mockResolvedValue({
      id: 'ruleset-1',
      createdBy: 'maker-1',
      status: 'PENDING_APPROVAL',
    });

    await expect(approveRuleSet('ruleset-1', 'maker-1', 'self approve')).rejects.toThrow(
      'Maker cannot approve their own rule release'
    );
    expect(prismaMock.eligibilityRuleSet.update).not.toHaveBeenCalled();
  });

  it('activates an approved release atomically and audits the change', async () => {
    await activateRuleSet('ruleset-1', 'admin-2', 'activate approved release');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.eligibilityRuleSet.updateMany).toHaveBeenCalledWith({
      where: { productId: 'product-1', status: 'ACTIVE' },
      data: { status: 'RETIRED', effectiveTo: expect.any(Date) },
    });
    expect(txMock.eligibilityRuleSet.update).toHaveBeenCalledWith({
      where: { id: 'ruleset-1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        activatedBy: 'admin-2',
        activatedAt: expect.any(Date),
      }),
    });
    expect(txMock.ruleChangeAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'admin-2',
        action: 'ACTIVATE_RULE_SET',
        entityId: 'ruleset-1',
        reason: 'activate approved release',
      }),
    });
  });
});

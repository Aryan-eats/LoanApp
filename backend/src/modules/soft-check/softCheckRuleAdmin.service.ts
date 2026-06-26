import { randomUUID, createHash } from 'node:crypto';
import prisma from '../../shared/db/prisma.js';
import { validateEligibilityRules, type EligibilityRule } from './softCheckEngine.js';

const checksum = (payload: unknown): string =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex');

const audit = async (
  client: typeof prisma,
  actorUserId: string,
  action: string,
  entityId: string,
  beforeValue: unknown,
  afterValue: unknown,
  reason: string
) =>
  client.ruleChangeAuditLog.create({
    data: {
      actorUserId,
      action,
      entityType: 'eligibility_rule_set',
      entityId,
      beforeValue: beforeValue ?? undefined,
      afterValue: afterValue ?? undefined,
      reason,
      requestId: randomUUID(),
      checksum: checksum({ action, entityId, beforeValue, afterValue, reason }),
    },
  });

const mapBaseRule = (productCode: string, ruleSetId: string, rule: any): EligibilityRule => ({
  id: rule.id,
  ruleCode: rule.ruleCode,
  name: rule.name,
  productCode,
  ruleSetId,
  fieldPath: rule.fieldPath,
  operator: rule.operator,
  threshold: rule.threshold,
  conditions: rule.conditions ?? undefined,
  employmentScopes: rule.employmentScopes ?? [],
  severity: rule.severity,
  priority: rule.priority,
  regulatoryClass: rule.regulatoryClass,
  confidenceWeight: Number(rule.confidenceWeight?.toString?.() ?? rule.confidenceWeight ?? 1),
});

const validateRuleSetForActivation = async (ruleSetId: string, productCode: string) => {
  const baseRows = await prisma.baseRuleDefinition.findMany({ where: { ruleSetId, active: true } });
  if (!baseRows.length) throw new Error('Rule release must contain at least one active base rule');

  const baseRules = baseRows.map((rule) => mapBaseRule(productCode, ruleSetId, rule));
  const baseById = new Map(baseRules.map((rule) => [rule.id, rule]));
  const baseByCode = new Map(baseRules.map((rule) => [rule.ruleCode, rule]));
  const overrides = await prisma.lenderRuleOverride.findMany({ where: { ruleSetId } });
  const overlayRules = overrides.map((override: any): EligibilityRule => {
    const base = baseById.get(override.baseRuleId) ?? baseByCode.get(override.ruleCode);
    return {
      ...mapBaseRule(productCode, ruleSetId, { ...override, name: base?.name ?? override.ruleCode }),
      lenderId: override.bankId,
      fieldPath: base?.fieldPath ?? '',
      overrideMode: override.overrideMode,
    };
  });

  validateEligibilityRules([...baseRules, ...overlayRules]);
};

export const listRuleSets = (productCode?: string) =>
  prisma.eligibilityRuleSet.findMany({
    where: productCode ? { product: { code: productCode } } : undefined,
    include: { product: true },
    orderBy: [{ createdAt: 'desc' }],
  });

export const createDraftRuleSet = async (input: {
  productId: string;
  version: number;
  configHash: string;
  changeReason: string;
  actorUserId: string;
}) => {
  const created = await prisma.eligibilityRuleSet.create({
    data: {
      productId: input.productId,
      version: input.version,
      configHash: input.configHash,
      changeReason: input.changeReason,
      createdBy: input.actorUserId,
      status: 'DRAFT',
    },
  });
  await audit(prisma, input.actorUserId, 'CREATE_RULE_SET', created.id, null, created, input.changeReason);
  return created;
};

export const submitRuleSet = async (ruleSetId: string, actorUserId: string, reason: string) => {
  const before = await prisma.eligibilityRuleSet.findUnique({ where: { id: ruleSetId } });
  const updated = await prisma.eligibilityRuleSet.update({
    where: { id: ruleSetId },
    data: { status: 'PENDING_APPROVAL', changeReason: reason },
  });
  await audit(prisma, actorUserId, 'SUBMIT_RULE_SET', ruleSetId, before, updated, reason);
  return updated;
};

export const approveRuleSet = async (ruleSetId: string, actorUserId: string, reason: string) => {
  const before = await prisma.eligibilityRuleSet.findUnique({ where: { id: ruleSetId } });
  if (!before) throw new Error('Rule release not found');
  if (before.createdBy === actorUserId) throw new Error('Maker cannot approve their own rule release');

  const updated = await prisma.eligibilityRuleSet.update({
    where: { id: ruleSetId },
    data: { approvedBy: actorUserId, approvedAt: new Date(), changeReason: reason },
  });
  await audit(prisma, actorUserId, 'APPROVE_RULE_SET', ruleSetId, before, updated, reason);
  return updated;
};

export const activateRuleSet = async (ruleSetId: string, actorUserId: string, reason: string) =>
  prisma.$transaction(async (tx) => {
    const before = await tx.eligibilityRuleSet.findUnique({
      where: { id: ruleSetId },
      include: { product: { select: { code: true } } },
    });
    if (!before) throw new Error('Rule release not found');
    if (!before.approvedBy) throw new Error('Rule release must be approved before activation');

    await validateRuleSetForActivation(ruleSetId, before.product.code);
    const now = new Date();
    await tx.eligibilityRuleSet.updateMany({
      where: { productId: before.productId, status: 'ACTIVE' },
      data: { status: 'RETIRED', effectiveTo: now },
    });
    const updated = await tx.eligibilityRuleSet.update({
      where: { id: ruleSetId },
      data: {
        status: 'ACTIVE',
        effectiveFrom: now,
        effectiveTo: null,
        activatedBy: actorUserId,
        activatedAt: now,
        changeReason: reason,
      },
    });
    await audit(tx as typeof prisma, actorUserId, 'ACTIVATE_RULE_SET', ruleSetId, before, updated, reason);
    return updated;
  });

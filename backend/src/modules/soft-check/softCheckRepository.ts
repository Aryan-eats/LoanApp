import { Prisma } from '@prisma/client';
import prisma from '../../shared/db/prisma.js';
import type {
  EligibilityRule,
  EmploymentType,
  SoftCheckLender,
} from './softCheckEngine.js';
import { validateEligibilityRules } from './softCheckEngine.js';

export interface SoftCheckConfiguration {
  productId: string;
  ruleSetId: string;
  ruleSetVersion: number;
  configHash: string;
  lenders: SoftCheckLender[];
  rules: EligibilityRule[];
}

type PersistedStatus = 'ELIGIBLE' | 'REFER_TO_UNDERWRITER' | 'INELIGIBLE';
type PersistedConfidence = 'STRONG' | 'MODERATE' | 'WEAK' | 'INELIGIBLE';
type PersistedSource = 'RAW' | 'PARTNER_DATA' | 'LEAD';

export interface SoftCheckLegacyLeadUpdate {
  leadId: string;
  data: {
    isEligible: boolean;
    maxLoanAmount: number;
    minLoanAmount: number;
    estimatedEMI: number;
    eligibilityCheckedAt: Date;
  };
}

export interface PersistSoftCheckDecisionInput {
  requestId: string;
  partnerOrgId: string;
  actorUserId: string;
  sourceType: PersistedSource;
  sourceId?: string | null;
  borrowerHash: string;
  inputHash: string;
  normalizedInput: unknown;
  result: unknown;
  ruleTrace: unknown;
  ruleSetIds: string[];
  eligibilityStatus: PersistedStatus;
  confidenceTier: PersistedConfidence;
  schemaVersion: string;
  engineVersion: string;
  consentNoticeVersion: string;
  retentionPolicyCode: string;
  retentionUntil: Date;
  checksum: string;
  leadUpdate?: SoftCheckLegacyLeadUpdate;
}

const piiKeys = new Set([
  'fullName',
  'name',
  'phone',
  'email',
  'pan',
  'panNumber',
  'aadhaar',
  'aadhaarNumber',
  'dateOfBirth',
  'clientFullName',
  'clientPhone',
  'clientEmail',
  'clientPanNumber',
  'clientAadhaar',
]);

const stripPii = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripPii);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
    if (!piiKeys.has(key)) acc[key] = stripPii(entry);
    return acc;
  }, {});
};

export const persistSoftCheckDecision = async (
  input: PersistSoftCheckDecisionInput
) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.softCheckResultLog.findUnique({
      where: {
        partnerOrgId_requestId: {
          partnerOrgId: input.partnerOrgId,
          requestId: input.requestId,
        },
      },
    });
    if (existing) return { created: false, record: existing };

    const record = await tx.softCheckResultLog.create({
      data: {
        requestId: input.requestId,
        partnerOrgId: input.partnerOrgId,
        actorUserId: input.actorUserId,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? undefined,
        borrowerHash: input.borrowerHash,
        inputHash: input.inputHash,
        normalizedInput: stripPii(input.normalizedInput) as Prisma.InputJsonValue,
        result: stripPii(input.result) as Prisma.InputJsonValue,
        ruleTrace: stripPii(input.ruleTrace) as Prisma.InputJsonValue,
        ruleSetIds: input.ruleSetIds,
        eligibilityStatus: input.eligibilityStatus,
        confidenceTier: input.confidenceTier,
        schemaVersion: input.schemaVersion,
        engineVersion: input.engineVersion,
        consentNoticeVersion: input.consentNoticeVersion,
        bureauPulled: false,
        retentionPolicyCode: input.retentionPolicyCode,
        retentionUntil: input.retentionUntil,
        checksum: input.checksum,
      },
    });

    await tx.auditLog.create({
      data: {
        event: 'SOFT_CHECK_RUN',
        userId: input.actorUserId,
        entityId: record.id,
        entityType: 'soft_check_result',
        metadata: {
          requestId: input.requestId,
          partnerOrgId: input.partnerOrgId,
          ruleSetIds: input.ruleSetIds,
          schemaVersion: input.schemaVersion,
          engineVersion: input.engineVersion,
        },
        severity: 'LOW',
        checksum: input.checksum,
      },
    });

    if (input.leadUpdate) {
      await tx.lead.update({
        where: { id: input.leadUpdate.leadId },
        data: input.leadUpdate.data,
      });
    }

    return { created: true, record };
  });

export const validateSoftCheckConfiguration = (
  configuration: SoftCheckConfiguration
): SoftCheckConfiguration => {
  const baseRules = configuration.rules.filter((rule) => !rule.lenderId);
  if (!baseRules.length) {
    throw new Error('Malformed soft-check base configuration: no active base rules');
  }

  try {
    validateEligibilityRules(baseRules);
  } catch (error) {
    throw new Error(
      `Malformed soft-check base configuration: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
  }

  const validOverlays = configuration.rules
    .filter((rule) => rule.lenderId)
    .filter((overlay) => {
      try {
        validateEligibilityRules([...baseRules, overlay]);
        return true;
      } catch {
        return false;
      }
    });

  return {
    ...configuration,
    rules: [...baseRules, ...validOverlays],
  };
};

const employmentTypes = (values: string[]): EmploymentType[] =>
  values.filter((value): value is EmploymentType =>
    ['SALARIED', 'SELF_EMPLOYED_PROFESSIONAL', 'SELF_EMPLOYED_NON_PROFESSIONAL', 'UNKNOWN'].includes(value)
  );

export const getSoftCheckConfiguration = async (
  productCode: string
): Promise<SoftCheckConfiguration | null> => {
  const now = new Date();
  const product = await prisma.loanProduct.findFirst({
    where: { code: productCode, active: true },
    include: {
      ruleSets: {
        where: {
          status: 'ACTIVE',
          OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
          AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }],
        },
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          rules: { where: { active: true }, orderBy: [{ priority: 'asc' }, { ruleCode: 'asc' }] },
          overrides: { orderBy: [{ priority: 'asc' }, { ruleCode: 'asc' }] },
        },
      },
      lenderEligibility: {
        where: {
          active: true,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
          bank: { status: 'active' },
        },
        include: { bank: { select: { id: true, code: true, name: true } } },
      },
    },
  });
  const ruleSet = product?.ruleSets[0];
  if (!product || !ruleSet) return null;

  const rules: EligibilityRule[] = [
    ...ruleSet.rules.map((entry) => ({
      id: entry.id,
      ruleCode: entry.ruleCode,
      name: entry.name,
      productCode: product.code,
      ruleSetId: ruleSet.id,
      fieldPath: entry.fieldPath,
      operator: entry.operator,
      threshold: entry.threshold,
      conditions: entry.conditions as EligibilityRule['conditions'],
      employmentScopes: employmentTypes(entry.employmentScopes),
      severity: entry.severity,
      priority: entry.priority,
      regulatoryClass: entry.regulatoryClass,
      confidenceWeight: Number(entry.confidenceWeight.toString()),
      reasonTemplate: entry.reasonTemplate ?? undefined,
      suggestionTemplate: entry.suggestionTemplate ?? undefined,
    })),
    ...ruleSet.overrides
      .map((entry) => ({
        id: entry.id,
        ruleCode: entry.ruleCode,
        name:
          ruleSet.rules.find((base) => base.id === entry.baseRuleId)?.name ??
          ruleSet.rules.find((base) => base.ruleCode === entry.ruleCode)?.name ??
          entry.ruleCode,
        productCode: product.code,
        lenderId: entry.bankId,
        ruleSetId: ruleSet.id,
        overrideMode: entry.overrideMode,
        fieldPath:
          ruleSet.rules.find((base) => base.id === entry.baseRuleId)?.fieldPath ??
          ruleSet.rules.find((base) => base.ruleCode === entry.ruleCode)?.fieldPath ??
          '',
        operator: entry.operator,
        threshold: entry.threshold,
        conditions: entry.conditions as EligibilityRule['conditions'],
        employmentScopes: employmentTypes(entry.employmentScopes),
        severity: entry.severity,
        priority: entry.priority,
        regulatoryClass: entry.regulatoryClass,
        confidenceWeight: Number(entry.confidenceWeight.toString()),
        reasonTemplate: entry.reasonTemplate ?? undefined,
        suggestionTemplate: entry.suggestionTemplate ?? undefined,
      })),
  ];

  return validateSoftCheckConfiguration({
    productId: product.id,
    ruleSetId: ruleSet.id,
    ruleSetVersion: ruleSet.version,
    configHash: ruleSet.configHash,
    rules,
    lenders: product.lenderEligibility.map((entry) => ({
      id: entry.bank.id,
      code: entry.bank.code,
      name: entry.bank.name,
      productCode: product.code,
      ticketMin: Number(entry.ticketMin.toString()),
      ticketMax: Number(entry.ticketMax.toString()),
      rateMin: Number(entry.rateMin.toString()),
      rateMax: Number(entry.rateMax.toString()),
      tenureMinMonths: entry.tenureMinMonths,
      tenureMaxMonths: entry.tenureMaxMonths,
      employmentTypes: employmentTypes(entry.employmentTypes),
    })),
  });
};

import prisma from '../../shared/db/prisma.js';
import type {
  EligibilityRule,
  EmploymentType,
  SoftCheckLender,
} from './softCheckEngine.js';

export interface SoftCheckConfiguration {
  productId: string;
  ruleSetId: string;
  ruleSetVersion: number;
  configHash: string;
  lenders: SoftCheckLender[];
  rules: EligibilityRule[];
}

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

  return {
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
  };
};

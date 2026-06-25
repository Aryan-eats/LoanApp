import crypto from 'crypto';
import prisma from '../src/shared/db/prisma.js';
import type {
  EligibilityRegulatoryClass,
  EligibilityRuleOperator,
  EligibilityRuleSeverity,
  Prisma,
} from '@prisma/client';

type SeedRule = {
  ruleCode: string;
  name: string;
  fieldPath: string;
  operator: EligibilityRuleOperator;
  threshold: Prisma.InputJsonValue;
  conditions?: Prisma.InputJsonValue;
  employmentScopes?: string[];
  severity: EligibilityRuleSeverity;
  priority: number;
  regulatoryClass: EligibilityRegulatoryClass;
  confidenceWeight?: number;
  sourceReference?: string;
  suggestionTemplate?: string;
};

type ProductSeed = {
  code: string;
  name: string;
  rules: SeedRule[];
};

const rule = (
  ruleCode: string,
  name: string,
  fieldPath: string,
  operator: EligibilityRuleOperator,
  threshold: Prisma.InputJsonValue,
  priority: number,
  options: Partial<Omit<SeedRule, 'ruleCode' | 'name' | 'fieldPath' | 'operator' | 'threshold' | 'priority'>> = {}
): SeedRule => ({
  ruleCode,
  name,
  fieldPath,
  operator,
  threshold,
  severity: options.severity ?? 'HARD_FAIL',
  priority,
  regulatoryClass: options.regulatoryClass ?? 'LENDER_VARIABLE',
  confidenceWeight: options.confidenceWeight ?? 1,
  ...options,
});

const amountCondition = (
  operator: Exclude<EligibilityRuleOperator, 'REQUIRED'>,
  threshold: number
): Prisma.InputJsonValue => [{ fieldPath: 'requestedAmount', operator, threshold }];

const products: ProductSeed[] = [
  {
    code: 'home_loan',
    name: 'Home Loan',
    rules: [
      rule('HL_AGE_REQUIRED', 'Applicant age', 'age', 'REQUIRED', true, 1, { severity: 'REFER' }),
      rule('HL_MIN_AGE', 'Minimum age', 'age', 'GTE', 21, 2),
      rule('HL_MAX_AGE_SALARIED', 'Maximum age at maturity', 'derived.ageAtMaturity', 'LTE', 65, 3, {
        employmentScopes: ['SALARIED'],
      }),
      rule('HL_MAX_AGE_SELF_EMPLOYED', 'Maximum age at maturity', 'derived.ageAtMaturity', 'LTE', 70, 3, {
        employmentScopes: ['SELF_EMPLOYED_PROFESSIONAL', 'SELF_EMPLOYED_NON_PROFESSIONAL'],
      }),
      rule('HL_MIN_INCOME_SALARIED', 'Minimum monthly income', 'monthlyIncome', 'GTE', 25_000, 4, {
        employmentScopes: ['SALARIED'],
      }),
      rule('HL_MIN_INCOME_SELF_EMPLOYED', 'Minimum monthly income', 'monthlyIncome', 'GTE', 50_000, 4, {
        employmentScopes: ['SELF_EMPLOYED_PROFESSIONAL', 'SELF_EMPLOYED_NON_PROFESSIONAL'],
      }),
      rule('HL_MAX_FOIR_SALARIED', 'Maximum FOIR', 'derived.foirPercent', 'LTE', 50, 5, {
        employmentScopes: ['SALARIED', 'SELF_EMPLOYED_NON_PROFESSIONAL'],
        confidenceWeight: 3,
        suggestionTemplate: 'Reduce the requested amount or verified monthly obligations.',
      }),
      rule('HL_MAX_FOIR_PROFESSIONAL', 'Maximum FOIR', 'derived.foirPercent', 'LTE', 55, 5, {
        employmentScopes: ['SELF_EMPLOYED_PROFESSIONAL'],
        confidenceWeight: 3,
      }),
      rule('HL_PROPERTY_VALUE_REQUIRED', 'Declared property value', 'propertyValue', 'REQUIRED', true, 6, {
        severity: 'REFER',
      }),
      rule('HL_LTV_SMALL', 'Maximum LTV up to ₹30 lakh', 'derived.ltvPercent', 'LTE', 90, 7, {
        conditions: amountCondition('LTE', 3_000_000),
        regulatoryClass: 'RBI_REGULATORY',
        confidenceWeight: 4,
        sourceReference: 'RBI individual housing loan LTV ceiling',
      }),
      rule('HL_LTV_MEDIUM', 'Maximum LTV above ₹30 lakh and up to ₹75 lakh', 'derived.ltvPercent', 'LTE', 80, 8, {
        conditions: [
          { fieldPath: 'requestedAmount', operator: 'GT', threshold: 3_000_000 },
          { fieldPath: 'requestedAmount', operator: 'LTE', threshold: 7_500_000 },
        ],
        regulatoryClass: 'RBI_REGULATORY',
        confidenceWeight: 4,
        sourceReference: 'RBI individual housing loan LTV ceiling',
      }),
      rule('HL_LTV_LARGE', 'Maximum LTV above ₹75 lakh', 'derived.ltvPercent', 'LTE', 75, 9, {
        conditions: amountCondition('GT', 7_500_000),
        regulatoryClass: 'RBI_REGULATORY',
        confidenceWeight: 4,
        sourceReference: 'RBI individual housing loan LTV ceiling',
      }),
    ],
  },
  {
    code: 'lap',
    name: 'Loan Against Property',
    rules: [
      rule('LAP_AGE_REQUIRED', 'Applicant age', 'age', 'REQUIRED', true, 1, { severity: 'REFER' }),
      rule('LAP_MIN_AGE', 'Minimum age', 'age', 'GTE', 23, 2),
      rule('LAP_MIN_INCOME_SALARIED', 'Minimum monthly income', 'monthlyIncome', 'GTE', 30_000, 3, {
        employmentScopes: ['SALARIED'],
      }),
      rule('LAP_MIN_INCOME_SELF_EMPLOYED', 'Minimum monthly income', 'monthlyIncome', 'GTE', 50_000, 3, {
        employmentScopes: ['SELF_EMPLOYED_PROFESSIONAL', 'SELF_EMPLOYED_NON_PROFESSIONAL'],
      }),
      rule('LAP_MAX_FOIR', 'Maximum FOIR', 'derived.foirPercent', 'LTE', 50, 4, {
        confidenceWeight: 3,
      }),
      rule('LAP_PROPERTY_VALUE_REQUIRED', 'Declared property value', 'propertyValue', 'REQUIRED', true, 5, {
        severity: 'REFER',
      }),
      rule('LAP_PROPERTY_TYPE_REQUIRED', 'Property type', 'propertyType', 'REQUIRED', true, 6, {
        severity: 'REFER',
      }),
      rule('LAP_LTV_RESIDENTIAL', 'Residential property LTV', 'derived.ltvPercent', 'LTE', 60, 7, {
        conditions: [{ fieldPath: 'propertyType', operator: 'EQ', threshold: 'RESIDENTIAL' }],
        confidenceWeight: 4,
      }),
      rule('LAP_LTV_COMMERCIAL', 'Commercial property LTV', 'derived.ltvPercent', 'LTE', 50, 8, {
        conditions: [{ fieldPath: 'propertyType', operator: 'EQ', threshold: 'COMMERCIAL' }],
        confidenceWeight: 4,
      }),
    ],
  },
  {
    code: 'personal_loan',
    name: 'Personal Loan',
    rules: [
      rule('PL_AGE_REQUIRED', 'Applicant age', 'age', 'REQUIRED', true, 1, { severity: 'REFER' }),
      rule('PL_MIN_AGE', 'Minimum age', 'age', 'GTE', 21, 2),
      rule('PL_MAX_AGE', 'Maximum age at maturity', 'derived.ageAtMaturity', 'LTE', 60, 3, {
        employmentScopes: ['SALARIED'],
      }),
      rule('PL_MIN_INCOME_SALARIED', 'Minimum monthly income', 'monthlyIncome', 'GTE', 25_000, 4, {
        employmentScopes: ['SALARIED'],
      }),
      rule('PL_MIN_INCOME_SELF_EMPLOYED', 'Minimum monthly income', 'monthlyIncome', 'GTE', 50_000, 4, {
        employmentScopes: ['SELF_EMPLOYED_PROFESSIONAL', 'SELF_EMPLOYED_NON_PROFESSIONAL'],
      }),
      rule('PL_MAX_FOIR_SALARIED', 'Maximum FOIR', 'derived.foirPercent', 'LTE', 50, 5, {
        employmentScopes: ['SALARIED', 'SELF_EMPLOYED_PROFESSIONAL'],
        confidenceWeight: 3,
      }),
      rule('PL_MAX_FOIR_BUSINESS', 'Maximum FOIR', 'derived.foirPercent', 'LTE', 45, 5, {
        employmentScopes: ['SELF_EMPLOYED_NON_PROFESSIONAL'],
        confidenceWeight: 3,
      }),
    ],
  },
  {
    code: 'business_loan',
    name: 'Business Loan',
    rules: [
      rule('BL_AGE_REQUIRED', 'Applicant age', 'age', 'REQUIRED', true, 1, { severity: 'REFER' }),
      rule('BL_MIN_AGE', 'Minimum age', 'age', 'GTE', 21, 2),
      rule('BL_MAX_AGE', 'Maximum age at maturity', 'derived.ageAtMaturity', 'LTE', 65, 3),
      rule('BL_MIN_INCOME', 'Minimum monthly income', 'monthlyIncome', 'GTE', 50_000, 4),
      rule('BL_MAX_FOIR', 'Maximum obligation ratio', 'derived.foirPercent', 'LTE', 55, 5, {
        confidenceWeight: 3,
      }),
      rule('BL_VINTAGE_REQUIRED', 'Business vintage', 'businessProfile.businessVintageMonths', 'REQUIRED', true, 6, {
        severity: 'REFER',
      }),
      rule('BL_MIN_VINTAGE', 'Minimum business vintage', 'businessProfile.businessVintageMonths', 'GTE', 24, 7),
      rule('BL_TURNOVER_REQUIRED', 'Annual turnover', 'businessProfile.annualTurnover', 'REQUIRED', true, 8, {
        severity: 'REFER',
      }),
      rule('BL_MIN_TURNOVER', 'Minimum annual turnover', 'businessProfile.annualTurnover', 'GTE', 1_000_000, 9),
    ],
  },
  {
    code: 'gold_loan',
    name: 'Gold Loan',
    rules: [
      rule('GL_AGE_REQUIRED', 'Applicant age', 'age', 'REQUIRED', true, 1, { severity: 'REFER' }),
      rule('GL_MIN_AGE', 'Minimum age', 'age', 'GTE', 18, 2),
      rule('GL_MAX_AGE', 'Maximum age', 'age', 'LTE', 70, 3),
      rule('GL_VALUE_REQUIRED', 'Declared gold value', 'goldProfile.declaredGoldValue', 'REQUIRED', true, 4, {
        severity: 'REFER',
      }),
      rule('GL_FORM_REQUIRED', 'Gold form', 'goldProfile.goldForm', 'REQUIRED', true, 5, {
        severity: 'REFER',
      }),
      rule('GL_FORM_ALLOWED', 'Eligible gold form', 'goldProfile.goldForm', 'NOT_IN', ['BULLION', 'ETF', 'MUTUAL_FUND'], 6, {
        regulatoryClass: 'RBI_REGULATORY',
        sourceReference: 'RBI gold and silver collateral restrictions',
      }),
      rule('GL_WEIGHT_LIMIT', 'Maximum pledged ornament weight', 'goldProfile.goldWeightGrams', 'LTE', 1_000, 7, {
        regulatoryClass: 'RBI_REGULATORY',
      }),
      rule('GL_COIN_WEIGHT_LIMIT', 'Maximum pledged coin weight', 'goldProfile.goldWeightGrams', 'LTE', 50, 8, {
        conditions: [{ fieldPath: 'goldProfile.goldForm', operator: 'EQ', threshold: 'COIN' }],
        regulatoryClass: 'RBI_REGULATORY',
      }),
      rule('GL_LTV_SMALL', 'Maximum LTV up to ₹2.5 lakh', 'derived.ltvPercent', 'LTE', 85, 9, {
        conditions: amountCondition('LTE', 250_000),
        regulatoryClass: 'RBI_REGULATORY',
        confidenceWeight: 4,
      }),
      rule('GL_LTV_MEDIUM', 'Maximum LTV above ₹2.5 lakh and up to ₹5 lakh', 'derived.ltvPercent', 'LTE', 80, 10, {
        conditions: [
          { fieldPath: 'requestedAmount', operator: 'GT', threshold: 250_000 },
          { fieldPath: 'requestedAmount', operator: 'LTE', threshold: 500_000 },
        ],
        regulatoryClass: 'RBI_REGULATORY',
        confidenceWeight: 4,
      }),
      rule('GL_LTV_LARGE', 'Maximum LTV above ₹5 lakh', 'derived.ltvPercent', 'LTE', 75, 11, {
        conditions: amountCondition('GT', 500_000),
        regulatoryClass: 'RBI_REGULATORY',
        confidenceWeight: 4,
      }),
    ],
  },
];

const main = async () => {
  const actor = await prisma.user.findFirst({
    where: { role: { in: ['super_admin', 'admin'] }, isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!actor) throw new Error('An active admin user is required to seed soft-check rules');

  for (const productSeed of products) {
    const product = await prisma.loanProduct.upsert({
      where: { code: productSeed.code },
      update: { name: productSeed.name, active: true, retiredAt: null },
      create: { code: productSeed.code, name: productSeed.name },
    });
    const configHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(productSeed.rules))
      .digest('hex');

    await prisma.eligibilityRuleSet.updateMany({
      where: { productId: product.id, status: 'ACTIVE', version: { not: 1 } },
      data: { status: 'RETIRED', effectiveTo: new Date() },
    });
    const ruleSet = await prisma.eligibilityRuleSet.upsert({
      where: { productId_version: { productId: product.id, version: 1 } },
      update: {
        status: 'ACTIVE',
        configHash,
        approvedBy: actor.id,
        activatedBy: actor.id,
        approvedAt: new Date(),
        activatedAt: new Date(),
        effectiveFrom: new Date(),
      },
      create: {
        productId: product.id,
        version: 1,
        status: 'ACTIVE',
        configHash,
        createdBy: actor.id,
        approvedBy: actor.id,
        activatedBy: actor.id,
        changeReason: 'Initial industry-grade soft-check policy seed',
        approvedAt: new Date(),
        activatedAt: new Date(),
        effectiveFrom: new Date(),
      },
    });

    await prisma.baseRuleDefinition.deleteMany({ where: { ruleSetId: ruleSet.id } });
    await prisma.baseRuleDefinition.createMany({
      data: productSeed.rules.map((entry) => ({
        ruleSetId: ruleSet.id,
        ...entry,
        conditions: entry.conditions ?? undefined,
        employmentScopes: entry.employmentScopes ?? [],
      })),
    });
  }

  const banks = await prisma.bank.findMany({ where: { status: 'active' } });
  const productRows = await prisma.loanProduct.findMany({
    where: { code: { in: products.map(({ code }) => code) } },
  });
  const productByCode = new Map(productRows.map((product) => [product.code, product]));

  for (const bank of banks) {
    for (const productCode of bank.supportedLoanTypes) {
      const product = productByCode.get(productCode);
      if (!product) continue;
      const existing = await prisma.productLenderEligibility.findFirst({
        where: { productId: product.id, bankId: bank.id, active: true },
      });
      if (existing) continue;
      await prisma.productLenderEligibility.create({
        data: {
          productId: product.id,
          bankId: bank.id,
          ticketMin: bank.minAmount,
          ticketMax: bank.maxAmount,
          rateMin: bank.interestRateMin,
          rateMax: bank.interestRateMax,
          tenureMinMonths: 1,
          tenureMaxMonths: bank.maxTenure,
        },
      });
    }
  }
};

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error('Soft-check rule seed failed:', error instanceof Error ? error.message : 'unknown error');
    await prisma.$disconnect();
    process.exitCode = 1;
  });

import {
  evaluateSoftCheck,
  type NormalizedSoftCheckInput,
  type SoftCheckEngineResult,
} from './softCheckEngine.js';
import type { SoftCheckConfiguration } from './softCheckRepository.js';

export type SoftCheckInput = {
  fullName: string;
  phone: string;
  monthlyIncome: number;
  existingEMI?: number;
  employmentType: string;
  loanType: string;
  loanAmount: number;
  consentCredit: boolean;
  age?: number;
  requestedTenureMonths?: number;
  propertyValue?: number;
  propertyType?: string;
  declaredCibilRange?: string;
  purpose?: string;
  cityTier?: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNKNOWN';
  residenceType?: string;
  businessProfile?: NormalizedSoftCheckInput['businessProfile'];
  goldProfile?: NormalizedSoftCheckInput['goldProfile'];
};

export type SoftCheckBank = {
  id: string;
  name: string;
  code: string;
  status: string;
  supportedLoanTypes: string[];
  interestRateMin: number | string;
  interestRateMax: number | string;
  processingFee: string;
  maxTenure: number;
  minAmount: number | string;
  maxAmount: number | string;
  processingTime: string;
  isPopular: boolean;
  features: string[];
  logo?: string | null;
};

export type SoftCheckResult = {
  checkType: 'soft';
  creditImpact: 'none';
  isEligible: boolean;
  score: number;
  maxLoanAmount: number;
  minLoanAmount: number;
  estimatedEMI: number;
  eligibleBanks: Array<SoftCheckBank & { displayAmount: number }>;
  factors: Array<{
    factor: string;
    status: 'positive' | 'neutral' | 'negative';
    description: string;
    weight: number;
  }>;
  disclaimer: string;
};

export type ConfiguredSoftCheckResult = SoftCheckResult &
  SoftCheckEngineResult & {
    schemaVersion: '2.0';
    ruleConfigReleaseId: string;
    ruleConfigHash: string;
  };

export type SoftCheckEngineMode = 'legacy' | 'shadow' | 'v2';

export type SoftCheckShadowMetrics = {
  mode: 'shadow';
  failed: boolean;
  ruleConfigReleaseId: string;
  ruleConfigVersion: number;
  ruleConfigHash: string;
  legacyEligible: boolean;
  v2Status?: SoftCheckEngineResult['eligibilityStatus'];
  matchedLenderCount?: number;
  borderlineLenderCount?: number;
  disqualifiedLenderCount?: number;
  errorCode?: 'SOFT_CHECK_SHADOW_EVALUATION_FAILED';
};

export type SoftCheckModeRun = {
  response: SoftCheckResult | ConfiguredSoftCheckResult;
  shadowMetrics?: SoftCheckShadowMetrics;
};

export const getSoftCheckEngineMode = (
  value = process.env.SOFT_CHECK_ENGINE_MODE
): SoftCheckEngineMode =>
  value === 'shadow' || value === 'v2' || value === 'legacy' ? value : 'legacy';

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const estimateEmi = (amount: number, annualRate = 12, months = 60) => {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return Math.round(amount / months);
  return Math.round(
    (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1)
  );
};

export function runSoftCheck({
  input,
  banks,
}: {
  input: SoftCheckInput;
  banks: SoftCheckBank[];
}): SoftCheckResult {
  if (!input.consentCredit) throw new Error('Soft check consent is required');

  const income = toNumber(input.monthlyIncome);
  const existingEMI = toNumber(input.existingEMI);
  const requestedAmount = toNumber(input.loanAmount);
  const disposableForEmi = Math.max(0, income * 0.5 - existingEMI);
  const estimatedEMI = estimateEmi(requestedAmount);
  const maxLoanAmount = Math.max(0, Math.round(disposableForEmi * 36));
  const eligibleBanks = banks
    .filter((bank) => bank.status === 'active' && bank.supportedLoanTypes.includes(input.loanType))
    .filter(
      (bank) =>
        requestedAmount >= toNumber(bank.minAmount) &&
        requestedAmount <= Math.min(toNumber(bank.maxAmount), maxLoanAmount)
    )
    .map((bank) => ({ ...bank, displayAmount: Math.min(toNumber(bank.maxAmount), maxLoanAmount) }));

  const score = Math.min(
    100,
    25 +
      (income >= 50_000 ? 25 : 10) +
      (existingEMI <= income * 0.25 ? 25 : 10) +
      (eligibleBanks.length ? 25 : 0)
  );

  return {
    checkType: 'soft',
    creditImpact: 'none',
    isEligible: eligibleBanks.length > 0 && estimatedEMI <= disposableForEmi,
    score,
    maxLoanAmount,
    minLoanAmount: eligibleBanks.length
      ? Math.min(...eligibleBanks.map((bank) => toNumber(bank.minAmount)))
      : 0,
    estimatedEMI,
    eligibleBanks,
    factors: [
      {
        factor: 'Income Level',
        status: income >= 50_000 ? 'positive' : 'neutral',
        description: 'Based on declared monthly income',
        weight: 30,
      },
      {
        factor: 'Debt-to-Income Ratio',
        status: estimatedEMI <= disposableForEmi ? 'positive' : 'negative',
        description: 'Based on declared existing EMI obligations',
        weight: 35,
      },
      {
        factor: 'Bank Fit',
        status: eligibleBanks.length ? 'positive' : 'negative',
        description: 'Matched against active lender limits',
        weight: 35,
      },
    ],
    disclaimer:
      'Soft eligibility check only. No credit score impact. Final approval requires lender verification and may involve a hard inquiry.',
  };
}

const normalizeEmploymentType = (
  value: string
): NormalizedSoftCheckInput['employmentType'] => {
  switch (value) {
    case 'salaried':
    case 'SALARIED':
      return 'SALARIED';
    case 'professional':
    case 'SELF_EMPLOYED_PROFESSIONAL':
      return 'SELF_EMPLOYED_PROFESSIONAL';
    case 'self_employed':
    case 'business_owner':
    case 'SELF_EMPLOYED_NON_PROFESSIONAL':
      return 'SELF_EMPLOYED_NON_PROFESSIONAL';
    default:
      return 'UNKNOWN';
  }
};

export const normalizeSoftCheckInput = (
  input: SoftCheckInput
): NormalizedSoftCheckInput => ({
  employmentType: normalizeEmploymentType(input.employmentType),
  monthlyIncome: toNumber(input.monthlyIncome),
  existingEmiObligations: toNumber(input.existingEMI),
  age: input.age,
  cityTier: input.cityTier,
  residenceType: input.residenceType,
  productCode: input.loanType,
  requestedAmount: toNumber(input.loanAmount),
  requestedTenureMonths: input.requestedTenureMonths,
  propertyValue: input.propertyValue,
  propertyType: input.propertyType,
  declaredCibilRange: input.declaredCibilRange,
  purpose: input.purpose,
  businessProfile: input.businessProfile,
  goldProfile: input.goldProfile,
});

export const runConfiguredSoftCheck = ({
  input,
  banks,
  configuration,
}: {
  input: SoftCheckInput;
  banks: SoftCheckBank[];
  configuration: SoftCheckConfiguration;
}): ConfiguredSoftCheckResult => {
  const legacy = runSoftCheck({ input, banks });
  const engine = evaluateSoftCheck({
    input: normalizeSoftCheckInput(input),
    lenders: configuration.lenders,
    rules: configuration.rules,
    configId: configuration.ruleSetId,
    configVersion: configuration.ruleSetVersion,
  });

  return {
    ...legacy,
    ...engine,
    schemaVersion: '2.0',
    ruleConfigReleaseId: configuration.ruleSetId,
    ruleConfigHash: configuration.configHash,
    disclaimer:
      'Indicative pre-qualification based on declared information and current lender rules. This is not a sanction, loan offer, or guarantee. Final terms require lender verification, KYC, and separate consent before any bureau check.',
  };
};

export const runSoftCheckForMode = ({
  input,
  banks,
  configuration,
  mode = getSoftCheckEngineMode(),
}: {
  input: SoftCheckInput;
  banks: SoftCheckBank[];
  configuration?: SoftCheckConfiguration | null;
  mode?: SoftCheckEngineMode;
}): SoftCheckModeRun => {
  if (mode === 'v2' && configuration) {
    return { response: runConfiguredSoftCheck({ input, banks, configuration }) };
  }

  const legacy = runSoftCheck({ input, banks });
  if (mode !== 'shadow' || !configuration) return { response: legacy };

  try {
    const engine = evaluateSoftCheck({
      input: normalizeSoftCheckInput(input),
      lenders: configuration.lenders,
      rules: configuration.rules,
      configId: configuration.ruleSetId,
      configVersion: configuration.ruleSetVersion,
    });
    return {
      response: legacy,
      shadowMetrics: {
        mode: 'shadow',
        failed: false,
        ruleConfigReleaseId: configuration.ruleSetId,
        ruleConfigVersion: configuration.ruleSetVersion,
        ruleConfigHash: configuration.configHash,
        legacyEligible: legacy.isEligible,
        v2Status: engine.eligibilityStatus,
        matchedLenderCount: engine.matchedLenders.length,
        borderlineLenderCount: engine.borderlineLenders.length,
        disqualifiedLenderCount: engine.disqualifiedLenders.length,
      },
    };
  } catch {
    return {
      response: legacy,
      shadowMetrics: {
        mode: 'shadow',
        failed: true,
        ruleConfigReleaseId: configuration.ruleSetId,
        ruleConfigVersion: configuration.ruleSetVersion,
        ruleConfigHash: configuration.configHash,
        legacyEligible: legacy.isEligible,
        errorCode: 'SOFT_CHECK_SHADOW_EVALUATION_FAILED',
      },
    };
  }
};

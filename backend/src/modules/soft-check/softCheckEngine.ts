import { Decimal } from '@prisma/client/runtime/client';

export type EmploymentType =
  | 'SALARIED'
  | 'SELF_EMPLOYED_PROFESSIONAL'
  | 'SELF_EMPLOYED_NON_PROFESSIONAL'
  | 'UNKNOWN';

export type EligibilityStatus = 'ELIGIBLE' | 'REFER_TO_UNDERWRITER' | 'INELIGIBLE';
export type ConfidenceTier = 'STRONG' | 'MODERATE' | 'WEAK' | 'INELIGIBLE';
export type RuleOperator = 'REQUIRED' | 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'BETWEEN' | 'IN' | 'NOT_IN';
export type RuleSeverity = 'HARD_FAIL' | 'REFER' | 'WARNING';
export type RuleOutcome = 'PASS' | 'FAIL' | 'REFER' | 'NOT_APPLICABLE';

export interface NormalizedSoftCheckInput {
  employmentType: EmploymentType;
  monthlyIncome: number;
  existingEmiObligations: number;
  age?: number;
  cityTier?: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNKNOWN';
  residenceType?: string;
  productCode: string;
  requestedAmount: number;
  requestedTenureMonths?: number;
  propertyValue?: number;
  propertyType?: string;
  declaredCibilRange?: string;
  purpose?: string;
  businessProfile?: {
    businessVintageMonths?: number;
    annualTurnover?: number;
    businessType?: string;
    gstRegistrationStatus?: string;
  };
  goldProfile?: {
    goldWeightGrams?: number;
    goldPurityCarat?: number;
    declaredGoldValue?: number;
    goldForm?: string;
  };
}

export interface SoftCheckLender {
  id: string;
  code: string;
  name: string;
  productCode: string;
  ticketMin: number;
  ticketMax: number;
  rateMin: number;
  rateMax: number;
  tenureMinMonths: number;
  tenureMaxMonths: number;
  employmentTypes?: EmploymentType[];
}

export interface EligibilityRule {
  id: string;
  ruleCode: string;
  name: string;
  productCode: string;
  lenderId?: string;
  employmentScopes?: EmploymentType[];
  conditions?: Array<{
    fieldPath: string;
    operator: Exclude<RuleOperator, 'REQUIRED'>;
    threshold: unknown;
  }>;
  fieldPath: string;
  operator: RuleOperator;
  threshold: unknown;
  severity: RuleSeverity;
  priority: number;
  regulatoryClass: 'RBI_REGULATORY' | 'INDUSTRY_CONSENSUS' | 'LENDER_VARIABLE';
  confidenceWeight: number;
  reasonTemplate?: string;
  suggestionTemplate?: string;
}

export interface RuleTrace {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  lenderId: string;
  fieldPath: string;
  inputValue: unknown;
  operator: RuleOperator;
  threshold: unknown;
  outcome: RuleOutcome;
  severity: RuleSeverity;
  marginPercent?: number;
}

export interface MatchedLender {
  lenderId: string;
  code: string;
  name: string;
  productCode: string;
  estimatedEligibleAmount: number;
  estimatedRateBand: { min: number; max: number; type: 'indicative' };
  estimatedEmi: number;
  confidenceTier: Exclude<ConfidenceTier, 'INELIGIBLE'>;
  matchReason: string;
}

export interface BorderlineLender {
  lenderId: string;
  code: string;
  name: string;
  missingFields: string[];
  ruleCodes: string[];
}

export interface DisqualifiedLender {
  lenderId: string;
  code: string;
  name: string;
  ruleCode: string;
  inputValue: unknown;
  operator: RuleOperator;
  threshold: unknown;
  reason: string;
}

export interface SoftCheckEngineResult {
  eligibilityStatus: EligibilityStatus;
  confidenceTier: ConfidenceTier;
  reasonCode?: 'NO_LENDER_PANEL_MATCH';
  matchedLenders: MatchedLender[];
  borderlineLenders: BorderlineLender[];
  disqualifiedLenders: DisqualifiedLender[];
  auditTrail: RuleTrace[];
  improvementSuggestions: string[];
}

type DerivedValues = {
  proposedEmi: number;
  foirPercent: number;
  ltvPercent?: number;
  ageAtMaturity?: number;
};

const calculateEmi = (principal: number, annualRate: number, months: number): number => {
  if (principal <= 0 || months <= 0) return 0;
  const rate = new Decimal(annualRate).div(1200);
  if (rate.isZero()) return new Decimal(principal).div(months).round().toNumber();
  const growth = rate.plus(1).pow(months);
  return new Decimal(principal)
    .mul(rate)
    .mul(growth)
    .div(growth.minus(1))
    .round()
    .toNumber();
};

const deriveValues = (input: NormalizedSoftCheckInput, lender: SoftCheckLender): DerivedValues => {
  const tenure = input.requestedTenureMonths ?? lender.tenureMaxMonths;
  const proposedEmi = calculateEmi(input.requestedAmount, lender.rateMin, tenure);
  const foirPercent = new Decimal(input.existingEmiObligations)
    .plus(proposedEmi)
    .div(input.monthlyIncome)
    .mul(100)
    .toDecimalPlaces(4)
    .toNumber();
  const collateralValue = input.propertyValue ?? input.goldProfile?.declaredGoldValue;

  return {
    proposedEmi,
    foirPercent,
    ltvPercent: collateralValue
      ? new Decimal(input.requestedAmount).div(collateralValue).mul(100).toDecimalPlaces(4).toNumber()
      : undefined,
    ageAtMaturity:
      input.age === undefined ? undefined : input.age + tenure / 12,
  };
};

const getValue = (
  input: NormalizedSoftCheckInput,
  derived: DerivedValues,
  path: string
): unknown => {
  const root: Record<string, unknown> = { ...input, derived };
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, root);
};

const isMissing = (value: unknown): boolean =>
  value === undefined || value === null || value === '';

const compare = (value: unknown, operator: RuleOperator, threshold: unknown): boolean => {
  if (operator === 'REQUIRED') return !isMissing(value);
  if (isMissing(value)) return false;

  switch (operator) {
    case 'EQ':
      return value === threshold;
    case 'NEQ':
      return value !== threshold;
    case 'GT':
      return Number(value) > Number(threshold);
    case 'GTE':
      return Number(value) >= Number(threshold);
    case 'LT':
      return Number(value) < Number(threshold);
    case 'LTE':
      return Number(value) <= Number(threshold);
    case 'BETWEEN': {
      const [min, max] = threshold as [number, number];
      return Number(value) >= min && Number(value) <= max;
    }
    case 'IN':
      return (threshold as unknown[]).includes(value);
    case 'NOT_IN':
      return !(threshold as unknown[]).includes(value);
    default:
      return false;
  }
};

const marginPercent = (
  value: unknown,
  operator: RuleOperator,
  threshold: unknown
): number | undefined => {
  if (typeof value !== 'number' || typeof threshold !== 'number' || threshold === 0) return undefined;
  if (operator === 'GTE' || operator === 'GT') return ((value - threshold) / Math.abs(threshold)) * 100;
  if (operator === 'LTE' || operator === 'LT') return ((threshold - value) / Math.abs(threshold)) * 100;
  return undefined;
};

const effectiveRules = (
  rules: EligibilityRule[],
  input: NormalizedSoftCheckInput,
  lenderId: string
): EligibilityRule[] => {
  const selected = new Map<string, EligibilityRule>();
  rules
    .filter((rule) => rule.productCode === input.productCode)
    .filter((rule) => !rule.employmentScopes?.length || rule.employmentScopes.includes(input.employmentType))
    .filter((rule) => !rule.lenderId)
    .forEach((rule) => selected.set(rule.ruleCode, rule));
  rules
    .filter((rule) => rule.productCode === input.productCode && rule.lenderId === lenderId)
    .filter((rule) => !rule.employmentScopes?.length || rule.employmentScopes.includes(input.employmentType))
    .forEach((rule) => selected.set(rule.ruleCode, rule));
  return [...selected.values()].sort((a, b) => a.priority - b.priority || a.ruleCode.localeCompare(b.ruleCode));
};

const tierForMargins = (traces: RuleTrace[]): Exclude<ConfidenceTier, 'INELIGIBLE'> => {
  const margins = traces
    .filter((trace) => trace.outcome === 'PASS' && trace.marginPercent !== undefined)
    .map((trace) => trace.marginPercent as number);
  const minimum = margins.length ? Math.min(...margins) : 5;
  if (minimum >= 15) return 'STRONG';
  if (minimum >= 5) return 'MODERATE';
  return 'WEAK';
};

export const evaluateSoftCheck = ({
  input,
  lenders,
  rules,
}: {
  input: NormalizedSoftCheckInput;
  lenders: SoftCheckLender[];
  rules: EligibilityRule[];
}): SoftCheckEngineResult => {
  const candidates = lenders.filter((lender) => lender.productCode === input.productCode);
  if (!candidates.length) {
    return {
      eligibilityStatus: 'REFER_TO_UNDERWRITER',
      confidenceTier: 'WEAK',
      reasonCode: 'NO_LENDER_PANEL_MATCH',
      matchedLenders: [],
      borderlineLenders: [],
      disqualifiedLenders: [],
      auditTrail: [],
      improvementSuggestions: [],
    };
  }

  const matchedLenders: MatchedLender[] = [];
  const borderlineLenders: BorderlineLender[] = [];
  const disqualifiedLenders: DisqualifiedLender[] = [];
  const auditTrail: RuleTrace[] = [];
  const improvementSuggestions = new Set<string>();

  for (const lender of candidates) {
    const derived = deriveValues(input, lender);
    const traces = effectiveRules(rules, input, lender.id).map((rule): RuleTrace => {
      const inputValue = getValue(input, derived, rule.fieldPath);
      const applies = !rule.conditions?.length || rule.conditions.every((condition) =>
        compare(
          getValue(input, derived, condition.fieldPath),
          condition.operator,
          condition.threshold
        )
      );
      if (!applies) {
        return {
          ruleId: rule.id,
          ruleCode: rule.ruleCode,
          ruleName: rule.name,
          lenderId: lender.id,
          fieldPath: rule.fieldPath,
          inputValue,
          operator: rule.operator,
          threshold: rule.threshold,
          outcome: 'NOT_APPLICABLE',
          severity: rule.severity,
        };
      }
      const passed = compare(inputValue, rule.operator, rule.threshold);
      const outcome: RuleOutcome = passed
        ? 'PASS'
        : rule.severity === 'HARD_FAIL'
          ? 'FAIL'
          : rule.severity === 'REFER'
            ? 'REFER'
            : 'PASS';
      if (!passed && rule.suggestionTemplate) improvementSuggestions.add(rule.suggestionTemplate);
      return {
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleName: rule.name,
        lenderId: lender.id,
        fieldPath: rule.fieldPath,
        inputValue,
        operator: rule.operator,
        threshold: rule.threshold,
        outcome,
        severity: rule.severity,
        marginPercent: marginPercent(inputValue, rule.operator, rule.threshold),
      };
    });
    auditTrail.push(...traces);

    const ticketFailed =
      input.requestedAmount < lender.ticketMin ||
      input.requestedAmount > lender.ticketMax ||
      (input.requestedTenureMonths !== undefined &&
        (input.requestedTenureMonths < lender.tenureMinMonths ||
          input.requestedTenureMonths > lender.tenureMaxMonths)) ||
      (lender.employmentTypes?.length &&
        !lender.employmentTypes.includes(input.employmentType));
    const failed = traces.find((trace) => trace.outcome === 'FAIL');
    const referred = traces.filter((trace) => trace.outcome === 'REFER');

    if (failed || ticketFailed) {
      disqualifiedLenders.push({
        lenderId: lender.id,
        code: lender.code,
        name: lender.name,
        ruleCode: failed?.ruleCode ?? 'LENDER_PRODUCT_MATRIX',
        inputValue: failed?.inputValue ?? input.requestedAmount,
        operator: failed?.operator ?? 'BETWEEN',
        threshold: failed?.threshold ?? [lender.ticketMin, lender.ticketMax],
        reason: failed
          ? `${failed.ruleName} did not meet the configured threshold`
          : 'Requested terms do not fit the lender product matrix',
      });
      continue;
    }

    if (referred.length) {
      borderlineLenders.push({
        lenderId: lender.id,
        code: lender.code,
        name: lender.name,
        missingFields: referred
          .filter((trace) => isMissing(trace.inputValue))
          .map((trace) => trace.fieldPath),
        ruleCodes: referred.map((trace) => trace.ruleCode),
      });
      continue;
    }

    const confidenceTier = tierForMargins(traces);
    matchedLenders.push({
      lenderId: lender.id,
      code: lender.code,
      name: lender.name,
      productCode: input.productCode,
      estimatedEligibleAmount: Math.min(input.requestedAmount, lender.ticketMax),
      estimatedRateBand: { min: lender.rateMin, max: lender.rateMax, type: 'indicative' },
      estimatedEmi: derived.proposedEmi,
      confidenceTier,
      matchReason: `Indicative match based on ${traces.length} configured rules`,
    });
  }

  const eligibilityStatus: EligibilityStatus = matchedLenders.length
    ? 'ELIGIBLE'
    : borderlineLenders.length
      ? 'REFER_TO_UNDERWRITER'
      : 'INELIGIBLE';

  return {
    eligibilityStatus,
    confidenceTier:
      eligibilityStatus === 'INELIGIBLE'
        ? 'INELIGIBLE'
        : matchedLenders.length
          ? matchedLenders.map((lender) => lender.confidenceTier).sort(
              (a, b) => ['STRONG', 'MODERATE', 'WEAK'].indexOf(a) - ['STRONG', 'MODERATE', 'WEAK'].indexOf(b)
            )[0]
          : 'WEAK',
    matchedLenders,
    borderlineLenders,
    disqualifiedLenders,
    auditTrail,
    improvementSuggestions: [...improvementSuggestions],
  };
};

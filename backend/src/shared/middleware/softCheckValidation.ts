import type { NextFunction, Request, Response } from 'express';

export interface SoftCheckValidationIssue {
  field: string;
  code: string;
  message: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPLOYMENT_TYPES = new Set([
  'salaried',
  'self_employed',
  'business_owner',
  'professional',
  'SALARIED',
  'SELF_EMPLOYED_PROFESSIONAL',
  'SELF_EMPLOYED_NON_PROFESSIONAL',
  'UNKNOWN',
]);
const V2_FIELDS = new Set([
  'storedClientId',
  'leadId',
  'requestId',
  'schemaVersion',
  'fullName',
  'phone',
  'monthlyIncome',
  'existingEMI',
  'employmentType',
  'loanType',
  'productCode',
  'loanAmount',
  'consentCredit',
  'age',
  'requestedTenureMonths',
  'propertyValue',
  'propertyType',
  'declaredCibilRange',
  'purpose',
  'cityTier',
  'residenceType',
  'businessProfile',
  'goldProfile',
]);
const V2_PRODUCTS = new Set(['home_loan', 'lap', 'personal_loan', 'business_loan', 'gold_loan']);
const CITY_TIERS = new Set(['TIER_1', 'TIER_2', 'TIER_3', 'UNKNOWN']);
const CIBIL_RANGES = new Set(['NO_HISTORY', 'LT_650', '650_699', '700_749', '750_799', '800_PLUS']);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const numericIssue = (
  payload: Record<string, unknown>,
  field: string,
  { min, max }: { min: number; max: number }
): SoftCheckValidationIssue | null => {
  if (payload[field] === undefined) return null;
  const value = Number(payload[field]);
  return Number.isFinite(value) && value >= min && value <= max
    ? null
    : { field, code: 'INVALID_NUMBER', message: `${field} is outside the accepted range` };
};

export const validateSoftCheckPayload = (raw: unknown): SoftCheckValidationIssue[] => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [{ field: 'body', code: 'INVALID_BODY', message: 'Request body must be an object' }];
  }

  const payload = raw as Record<string, unknown>;
  const issues: SoftCheckValidationIssue[] = [];
  const isV2 = payload.schemaVersion === '2.0' || process.env.SOFT_CHECK_ENGINE_MODE === 'v2';

  if (isV2) {
    for (const field of Object.keys(payload)) {
      if (!V2_FIELDS.has(field)) {
        issues.push({ field, code: 'UNKNOWN_FIELD', message: `${field} is not allowed` });
      }
    }
  }

  for (const field of ['storedClientId', 'leadId', 'requestId']) {
    const value = payload[field];
    if (value !== undefined && (typeof value !== 'string' || !UUID_RE.test(value))) {
      issues.push({ field, code: 'INVALID_UUID', message: `${field} must be a valid UUID` });
    }
  }

  if (payload.storedClientId && payload.leadId) {
    issues.push({
      field: 'source',
      code: 'SOURCE_CONFLICT',
      message: 'Provide storedClientId or leadId, not both',
    });
  }

  for (const issue of [
    numericIssue(payload, 'monthlyIncome', { min: 1, max: 1_000_000_000 }),
    numericIssue(payload, 'existingEMI', { min: 0, max: 1_000_000_000 }),
    numericIssue(payload, 'loanAmount', { min: 1, max: 10_000_000_000 }),
    numericIssue(payload, 'requestedTenureMonths', { min: 1, max: 600 }),
    numericIssue(payload, 'age', { min: 18, max: 100 }),
    numericIssue(payload, 'propertyValue', { min: 1, max: 100_000_000_000 }),
  ]) {
    if (issue) issues.push(issue);
  }

  if (payload.phone !== undefined && !/^[0-9]{10}$/.test(String(payload.phone))) {
    issues.push({ field: 'phone', code: 'INVALID_PHONE', message: 'phone must be a valid 10-digit number' });
  }
  if (payload.fullName !== undefined && String(payload.fullName).trim().length > 100) {
    issues.push({ field: 'fullName', code: 'TOO_LONG', message: 'fullName cannot exceed 100 characters' });
  }
  if (
    payload.employmentType !== undefined &&
    !EMPLOYMENT_TYPES.has(String(payload.employmentType))
  ) {
    issues.push({
      field: 'employmentType',
      code: 'INVALID_ENUM',
      message: 'employmentType is not supported',
    });
  }
  if (payload.consentCredit !== undefined && typeof payload.consentCredit !== 'boolean') {
    issues.push({
      field: 'consentCredit',
      code: 'INVALID_BOOLEAN',
      message: 'consentCredit must be a boolean',
    });
  }

  if (isV2) {
    const product = String(payload.productCode ?? payload.loanType ?? '');
    if (!V2_PRODUCTS.has(product)) {
      issues.push({ field: 'loanType', code: 'INVALID_ENUM', message: 'loanType is not supported for V2 soft checks' });
    }
    if (payload.cityTier !== undefined && !CITY_TIERS.has(String(payload.cityTier))) {
      issues.push({ field: 'cityTier', code: 'INVALID_ENUM', message: 'cityTier is not supported' });
    }
    if (payload.declaredCibilRange !== undefined && !CIBIL_RANGES.has(String(payload.declaredCibilRange))) {
      issues.push({ field: 'declaredCibilRange', code: 'INVALID_ENUM', message: 'declaredCibilRange is not supported' });
    }
    if ((product === 'home_loan' || product === 'lap') && payload.propertyValue === undefined) {
      issues.push({ field: 'propertyValue', code: 'REQUIRED', message: 'propertyValue is required for this product' });
    }
    if ((product === 'home_loan' || product === 'lap') && payload.propertyType === undefined) {
      issues.push({ field: 'propertyType', code: 'REQUIRED', message: 'propertyType is required for this product' });
    }
    if (product === 'business_loan' && !payload.businessProfile) {
      issues.push({ field: 'businessProfile', code: 'REQUIRED', message: 'businessProfile is required for business loans' });
    }
    if (product === 'business_loan' && payload.businessProfile !== undefined) {
      const profile = payload.businessProfile;
      if (!isPlainObject(profile)) {
        issues.push({ field: 'businessProfile', code: 'INVALID_OBJECT', message: 'businessProfile must be an object' });
      } else {
        for (const field of ['businessVintageMonths', 'annualTurnover']) {
          const issue = numericIssue(profile, field, { min: 0, max: 10_000_000_000 });
          if (issue) issues.push({ ...issue, field: `businessProfile.${field}` });
        }
        for (const field of ['businessVintageMonths', 'annualTurnover', 'businessType', 'gstRegistrationStatus']) {
          if (profile[field] === undefined) {
            issues.push({ field: `businessProfile.${field}`, code: 'REQUIRED', message: `${field} is required for business loans` });
          }
        }
      }
    }
    if (product === 'gold_loan' && !payload.goldProfile) {
      issues.push({ field: 'goldProfile', code: 'REQUIRED', message: 'goldProfile is required for gold loans' });
    }
    if (product === 'gold_loan' && payload.goldProfile !== undefined) {
      const profile = payload.goldProfile;
      if (!isPlainObject(profile)) {
        issues.push({ field: 'goldProfile', code: 'INVALID_OBJECT', message: 'goldProfile must be an object' });
      } else {
        for (const issue of [
          numericIssue(profile, 'goldWeightGrams', { min: 0.01, max: 100_000 }),
          numericIssue(profile, 'goldPurityCarat', { min: 18, max: 24 }),
          numericIssue(profile, 'declaredGoldValue', { min: 1, max: 100_000_000_000 }),
        ]) {
          if (issue) issues.push({ ...issue, field: `goldProfile.${issue.field}` });
        }
        for (const field of ['goldWeightGrams', 'goldPurityCarat', 'declaredGoldValue', 'goldForm']) {
          if (profile[field] === undefined) {
            issues.push({ field: `goldProfile.${field}`, code: 'REQUIRED', message: `${field} is required for gold loans` });
          }
        }
      }
    }
  }

  return issues;
};

export const validateSoftCheckRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validateSoftCheckPayload(req.body);
  if (errors.length) {
    res.status(400).json({ success: false, message: 'Validation failed', errors });
    return;
  }
  next();
};

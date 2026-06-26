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

  if (payload.schemaVersion === '2.0') {
    const product = String(payload.productCode ?? payload.loanType ?? '');
    if ((product === 'home_loan' || product === 'lap') && payload.propertyValue === undefined) {
      issues.push({ field: 'propertyValue', code: 'REQUIRED', message: 'propertyValue is required for this product' });
    }
    if (product === 'business_loan' && !payload.businessProfile) {
      issues.push({ field: 'businessProfile', code: 'REQUIRED', message: 'businessProfile is required for business loans' });
    }
    if (product === 'gold_loan' && !payload.goldProfile) {
      issues.push({ field: 'goldProfile', code: 'REQUIRED', message: 'goldProfile is required for gold loans' });
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

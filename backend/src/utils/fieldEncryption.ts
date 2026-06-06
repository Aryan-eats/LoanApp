import { Prisma } from '@prisma/client';
import {
  decryptAsGPSIndia,
  decryptField,
  encryptField,
  encryptForGPSIndia,
  isEncryptedCiphertext,
} from '../services/encryption.js';

export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User: [
    'aadhaarNumber',
    'panNumber',
    'gstNumber',
    'accountNumber',
    'ifscCode',
    'upiId',
    'otpHash',
    'resetPasswordToken',
    'refreshToken',
  ],
  Lead: [
    'clientFullName',
    'clientPhone',
    'clientEmail',
    'clientAadhaar',
    'clientPanNumber',
    'clientDateOfBirth',
  ],
  PartnerData: ['fullName', 'phone', 'email', 'panNumber', 'dateOfBirth'],
};

const VERSIONED_MODELS = new Set(['User', 'Lead', 'PartnerData']);
const modelRelationMap = Object.fromEntries(
  Prisma.dmmf.datamodel.models.map((model) => [
    model.name,
    Object.fromEntries(
      model.fields
        .filter((field) => field.kind === 'object')
        .map((field) => [field.name, field.type])
    ),
  ])
) as Record<string, Record<string, string>>;

type BridgeCleanupPlan = {
  stripPartnerOrgId?: boolean;
  relations?: Record<string, BridgeCleanupPlan>;
};

/**
 * These fields store one-way SHA-256 digests, not reversible secrets or raw
 * PII. They must remain stable so equality checks keep working without Vault.
 */
const AUTH_HASH_FIELDS = new Set(['otpHash', 'resetPasswordToken', 'refreshToken']);
const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;

const shouldBypassWriteEncryption = (field: string, value: string): boolean =>
  AUTH_HASH_FIELDS.has(field) && SHA256_HEX_RE.test(value);

const throwUnsupportedFilter = (model: string, field: string, operator: string): never => {
  throw new Error(`Unsupported ${operator} filter on encrypted field "${model}.${field}".`);
};

const throwOnUnsupportedSubstringFilters = (
  model: string,
  field: string,
  filter: Record<string, unknown>,
  location: 'filter' | 'not'
) => {
  const unsupported = ['contains', 'startsWith', 'endsWith'].find(
    (operator) => filter[operator] !== undefined && filter[operator] !== null
  );

  if (unsupported) {
    throw new Error(
      `Unsupported ${unsupported} filter on encrypted field "${model}.${field}" (${location}).`
    );
  }
};

const markEncryptionVersion = (model: string, data: Record<string, unknown>) => {
  if (VERSIONED_MODELS.has(model)) {
    data.encryptionVersion = 1;
  }
};

const ensurePartnerOrgId = (partnerOrgId: string | null): string => {
  if (!partnerOrgId) {
    throw new Error('partnerOrgId is required to encrypt or decrypt PartnerData fields');
  }

  return partnerOrgId;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const hasEncryptedFieldSelection = (model: string, selection: Record<string, unknown>): boolean => {
  const fields = ENCRYPTED_FIELDS[model];
  return !!fields?.some((field) => selection[field] === true);
};

const attachRelationPlan = (
  plan: BridgeCleanupPlan,
  relationName: string,
  relationPlan: BridgeCleanupPlan | null
) => {
  if (!relationPlan) return;
  if (!plan.relations) {
    plan.relations = {};
  }
  plan.relations[relationName] = relationPlan;
};

const finalizePlan = (plan: BridgeCleanupPlan): BridgeCleanupPlan | null =>
  plan.stripPartnerOrgId || (plan.relations && Object.keys(plan.relations).length > 0) ? plan : null;

const buildCleanupPlan = (
  model: string,
  selectionArgs: Record<string, unknown> | undefined | null
): BridgeCleanupPlan | null => {
  if (!selectionArgs) return null;

  const plan: BridgeCleanupPlan = {};
  const select = isPlainObject(selectionArgs.select) ? selectionArgs.select : null;
  const include = isPlainObject(selectionArgs.include) ? selectionArgs.include : null;

  if (model === 'PartnerData' && select && hasEncryptedFieldSelection(model, select)) {
    if (select.partnerOrgId === undefined) {
      select.partnerOrgId = true;
      plan.stripPartnerOrgId = true;
    }
  }

  for (const container of [select, include]) {
    if (!container) continue;

    for (const [fieldName, value] of Object.entries(container)) {
      const relatedModel = modelRelationMap[model]?.[fieldName];
      if (!relatedModel || value === true || !isPlainObject(value)) {
        continue;
      }

      attachRelationPlan(plan, fieldName, buildCleanupPlan(relatedModel, value));
    }
  }

  return finalizePlan(plan);
};

const handleAuthHashWhere = (
  model: string,
  field: string,
  value: Record<string, unknown> | string | null
) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }

  throwOnUnsupportedSubstringFilters(model, field, value, 'filter');

  if (value.not && typeof value.not === 'object' && !Array.isArray(value.not)) {
    throwOnUnsupportedSubstringFilters(model, field, value.not as Record<string, unknown>, 'not');
  }
};

const handleEncryptedPiiWhere = (
  model: string,
  field: string,
  value: Record<string, unknown> | string
) => {
  if (typeof value === 'string') {
    throwUnsupportedFilter(model, field, 'equals');
  }

  const filter = value as Record<string, unknown>;

  throwOnUnsupportedSubstringFilters(model, field, filter, 'filter');

  if (typeof filter.equals === 'string') {
    throwUnsupportedFilter(model, field, 'equals');
  }

  if (Array.isArray(filter.in) && filter.in.some((entry: unknown) => typeof entry === 'string')) {
    throwUnsupportedFilter(model, field, 'in');
  }

  if (
    Array.isArray(filter.notIn) && filter.notIn.some((entry: unknown) => typeof entry === 'string')
  ) {
    throwUnsupportedFilter(model, field, 'notIn');
  }

  if (typeof filter.not === 'string') {
    throwUnsupportedFilter(model, field, 'not');
  }

  if (filter.not && typeof filter.not === 'object' && !Array.isArray(filter.not)) {
    const notFilter = filter.not as Record<string, unknown>;
    throwOnUnsupportedSubstringFilters(model, field, notFilter, 'not');

    if (typeof notFilter.equals === 'string') {
      throwUnsupportedFilter(model, field, 'not');
    }

    if (Array.isArray(notFilter.in) && notFilter.in.some((entry: unknown) => typeof entry === 'string')) {
      throwUnsupportedFilter(model, field, 'not');
    }

    if (
      Array.isArray(notFilter.notIn)
      && notFilter.notIn.some((entry: unknown) => typeof entry === 'string')
    ) {
      throwUnsupportedFilter(model, field, 'not');
    }
  }
};

export const encryptFields = async (
  model: string,
  data: Record<string, unknown> | undefined | null
) => {
  if (!data) return;

  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return;

  markEncryptionVersion(model, data);

  const partnerOrgId =
    model === 'PartnerData' && typeof data.partnerOrgId === 'string' ? data.partnerOrgId : null;

  if (model === 'PartnerData') {
    const hasPartnerEncryptedFields = fields.some((field) => typeof data[field] === 'string');
    if (hasPartnerEncryptedFields) {
      ensurePartnerOrgId(partnerOrgId);
    }
  }

  for (const field of fields) {
    if (typeof data[field] !== 'string') {
      continue;
    }

    const current = data[field] as string;
    if (shouldBypassWriteEncryption(field, current) || isEncryptedCiphertext(current)) {
      continue;
    }

    if (model === 'PartnerData') {
      data[field] = await encryptField(ensurePartnerOrgId(partnerOrgId), current);
      continue;
    }

    data[field] = await encryptForGPSIndia(current);
  }
};

export const encryptWhere = (model: string, where: Record<string, unknown> | undefined | null) => {
  if (!where) return;

  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return;

  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      if (Array.isArray(value)) {
        value.forEach((entry) => encryptWhere(model, entry as Record<string, unknown>));
      } else if (value && typeof value === 'object') {
        encryptWhere(model, value as Record<string, unknown>);
      }
      continue;
    }

    if (!fields.includes(key)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        encryptWhere(model, value as Record<string, unknown>);
      }
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    if (AUTH_HASH_FIELDS.has(key)) {
      handleAuthHashWhere(model, key, value as Record<string, unknown> | string | null);
      continue;
    }

    if (typeof value === 'string') {
      handleEncryptedPiiWhere(model, key, value);
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      handleEncryptedPiiWhere(model, key, value as Record<string, unknown>);
    }
  }
};

const decryptRecordWithBridge = async (model: string, record: Record<string, unknown> | null) => {
  if (!record) return;

  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return;

  const partnerOrgId =
    model === 'PartnerData' && typeof record.partnerOrgId === 'string'
      ? record.partnerOrgId
      : null;

  for (const field of fields) {
    if (typeof record[field] !== 'string') {
      continue;
    }

    const value = record[field] as string;
    if (!isEncryptedCiphertext(value)) {
      continue;
    }

    if (model === 'PartnerData') {
      record[field] = await decryptField(ensurePartnerOrgId(partnerOrgId), value);
      continue;
    }

    record[field] = await decryptAsGPSIndia(value);
  }
};

const decryptObjectGraphWithBridge = async (
  model: string,
  result: Record<string, unknown>,
  plan: BridgeCleanupPlan | null
) => {
  await decryptRecordWithBridge(model, result);

  const relations = modelRelationMap[model] ?? {};
  for (const [fieldName, relatedModel] of Object.entries(relations)) {
    const value = result[fieldName];
    if (!value) {
      continue;
    }

    await decryptResultWithBridge(
      relatedModel,
      value,
      plan?.relations?.[fieldName] ?? null
    );
  }

  if (model === 'PartnerData' && plan?.stripPartnerOrgId) {
    delete result.partnerOrgId;
  }
};

export const prepareReadArgsForBridge = (
  model: string,
  args: Record<string, unknown> | undefined | null
): BridgeCleanupPlan | null => buildCleanupPlan(model, args);

export const decryptResultWithBridge = async (
  model: string,
  result: unknown,
  plan: BridgeCleanupPlan | null = null
) => {
  if (!result) return;

  if (Array.isArray(result)) {
    for (const entry of result) {
      if (isPlainObject(entry)) {
        await decryptObjectGraphWithBridge(model, entry, plan);
      }
    }
    return;
  }

  if (isPlainObject(result)) {
    await decryptObjectGraphWithBridge(model, result, plan);
  }
};

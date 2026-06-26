import crypto from 'node:crypto';

const sorted = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sorted);
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== 'object') return value;

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sorted((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
};

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

const hmac = (key: string, value: string): string =>
  crypto.createHmac('sha256', key).update(value).digest('hex');

export const canonicalJson = (value: unknown): string => JSON.stringify(sorted(value));

export const buildBorrowerHash = (partnerOrgId: string, borrowerIdentifier: string): string =>
  hmac(
    requiredEnv('SOFT_CHECK_HMAC_KEY'),
    `${partnerOrgId}|${borrowerIdentifier.trim().toLowerCase()}`
  );

export const buildInputHash = (normalizedInput: unknown): string =>
  hmac(requiredEnv('SOFT_CHECK_CHECKSUM_KEY'), canonicalJson(normalizedInput));

export const buildResultChecksum = (resultPayload: unknown): string =>
  hmac(requiredEnv('SOFT_CHECK_CHECKSUM_KEY'), canonicalJson(resultPayload));

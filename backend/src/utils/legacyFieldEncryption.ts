import crypto from 'node:crypto';

const LEGACY_ENCRYPTION_PREFIX = 'enc:v1';

const getLegacyEncryptionKey = (): Buffer => {
  const raw = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error('FIELD_ENCRYPTION_KEY is required to decrypt legacy enc:v1 ciphertext');
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('FIELD_ENCRYPTION_KEY must be a 32-byte base64 string');
  }

  return key;
};

const decodeBase64Strict = (value: string, label: string): Buffer => {
  if (!value) {
    throw new Error(`Invalid encrypted payload ${label}`);
  }

  const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Pattern.test(value)) {
    throw new Error(`Invalid encrypted payload ${label}`);
  }

  const decoded = Buffer.from(value, 'base64');
  if (decoded.length === 0 || decoded.toString('base64') !== value) {
    throw new Error(`Invalid encrypted payload ${label}`);
  }

  return decoded;
};

export const isLegacyCiphertext = (value: string): boolean =>
  value.startsWith(`${LEGACY_ENCRYPTION_PREFIX}:`);

export const decryptLegacyString = (
  value: string | null | undefined
): string | null | undefined => {
  if (value === null || value === undefined) return value;
  if (value === '') return value;
  if (!isLegacyCiphertext(value)) return value;

  const key = getLegacyEncryptionKey();
  const parts = value.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted payload format');
  }

  const iv = decodeBase64Strict(parts[2], 'iv');
  const tag = decodeBase64Strict(parts[3], 'tag');
  const ciphertext = decodeBase64Strict(parts[4], 'ciphertext');

  if (iv.length !== 12) {
    throw new Error('Invalid encrypted payload iv');
  }

  if (tag.length !== 16) {
    throw new Error('Invalid encrypted payload tag');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let plaintext: Buffer;
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return null;
  }

  return plaintext.toString('utf8');
};

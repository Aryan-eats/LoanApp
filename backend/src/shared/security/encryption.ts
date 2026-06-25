/**
 * Shared AES-256-GCM field encryption service.
 *
 * Replaces the Vault transit-encryption approach with a self-contained
 * Node.js crypto implementation. No external service required.
 *
 * Ciphertext format:  enc:v1:<base64(12B_iv | 16B_authTag | N_ciphertext)>
 *
 * Key derivation:
 *  - GPS-India data:     master key (from FIELD_ENCRYPTION_KEY) used directly
 *  - Partner-scoped data: HKDF(master, salt = partnerOrgId, info = 'partner-field-enc')
 *
 * Backward compatibility:
 *  - Plaintext values (no enc:v1: prefix) pass through decrypt unchanged.
 *  - Any legacy vault:v1: values are also passed through unchanged so the app
 *    does not crash on old rows; they will appear as raw ciphertext strings
 *    until the row is rewritten.
 */

import crypto from 'crypto';

const CIPHER_ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const CIPHERTEXT_PREFIX = 'enc:v1:';
const HKDF_HASH = 'sha256';
const KEY_BYTES = 32;

// ---------------------------------------------------------------------------
// Master key loading
// ---------------------------------------------------------------------------

let _masterKey: Buffer | null = null;

const getMasterKey = (): Buffer => {
  if (_masterKey) return _masterKey;

  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY environment variable is required for field encryption. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }

  const key = Buffer.from(raw.trim(), 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY must be a base64-encoded 32-byte key (got ${key.length} bytes). ` +
        'Re-generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }

  _masterKey = key;
  return _masterKey;
};

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

const derivePartnerKey = (partnerOrgId: string): Buffer =>
  crypto.hkdfSync(
    HKDF_HASH,
    getMasterKey(),
    Buffer.from(partnerOrgId, 'utf8'),   // salt = partnerOrgId
    Buffer.from('partner-field-enc'),    // info
    KEY_BYTES
  ) as unknown as Buffer;

// ---------------------------------------------------------------------------
// Core encrypt / decrypt
// ---------------------------------------------------------------------------

const encryptWithKey = (key: Buffer, plaintext: string): string => {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, authTag, ciphertext]);
  return `${CIPHERTEXT_PREFIX}${payload.toString('base64')}`;
};

const decryptWithKey = (key: Buffer, ciphertext: string): string => {
  const payload = Buffer.from(ciphertext.slice(CIPHERTEXT_PREFIX.length), 'base64');

  if (payload.length < IV_BYTES + AUTH_TAG_BYTES) {
    throw new Error('Malformed ciphertext: payload too short');
  }

  const iv = payload.subarray(0, IV_BYTES);
  const authTag = payload.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const data = payload.subarray(IV_BYTES + AUTH_TAG_BYTES);

  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

// ---------------------------------------------------------------------------
// Public API — mirrors the contract expected by fieldEncryption.ts
// ---------------------------------------------------------------------------

/**
 * Returns true when the value was encrypted by this service.
 * Values without the prefix are treated as plaintext (not yet encrypted).
 */
export const isEncryptedCiphertext = (value: string): boolean =>
  value.startsWith(CIPHERTEXT_PREFIX);

/**
 * Encrypt a GPS-India internal field (uses master key directly).
 */
export const encryptForGPSIndia = async (plaintext: string): Promise<string> =>
  encryptWithKey(getMasterKey(), plaintext);

/**
 * Decrypt a GPS-India internal field.
 * Passes through values that are not encrypted (no enc:v1: prefix).
 */
export const decryptAsGPSIndia = async (value: string): Promise<string> => {
  if (!isEncryptedCiphertext(value)) return value;
  return decryptWithKey(getMasterKey(), value);
};

/**
 * Encrypt a partner-scoped field (key derived from partnerOrgId).
 */
export const encryptField = async (partnerOrgId: string, plaintext: string): Promise<string> =>
  encryptWithKey(derivePartnerKey(partnerOrgId), plaintext);

/**
 * Decrypt a partner-scoped field.
 * Passes through values that are not encrypted.
 */
export const decryptField = async (partnerOrgId: string, value: string): Promise<string> => {
  if (!isEncryptedCiphertext(value)) return value;
  return decryptWithKey(derivePartnerKey(partnerOrgId), value);
};

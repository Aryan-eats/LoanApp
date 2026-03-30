import { envConfig } from '../config/env.js';

type VaultJson = Record<string, unknown>;

const VAULT_PREFIX = 'vault:v1:';
const LEGACY_VAULT_PREFIX = 'vault:v:';

const encode = (plaintext: string): string => Buffer.from(plaintext, 'utf8').toString('base64');
const decode = (plaintextBase64: string): string => Buffer.from(plaintextBase64, 'base64').toString('utf8');

const assertNonEmpty = (value: string, label: string): void => {
  if (!value || value.trim() === '') {
    throw new Error(`Vault ${label} value is empty`);
  }
};

const getTransitBaseUrl = (): string => {
  const vaultAddr = envConfig.VAULT_ADDR.replace(/\/+$/, '');
  const transitPath = envConfig.VAULT_TRANSIT_PATH.replace(/^\/+|\/+$/g, '');
  return `${vaultAddr}/v1/${transitPath}`;
};

const getVaultHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (envConfig.VAULT_NAMESPACE) {
    headers['X-Vault-Namespace'] = envConfig.VAULT_NAMESPACE;
  }

  if (envConfig.VAULT_TOKEN) {
    headers['X-Vault-Token'] = envConfig.VAULT_TOKEN;
  }

  return headers;
};

const parseVaultJson = async (response: Response, path: string): Promise<VaultJson> => {
  let payload: unknown;
  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw new Error(`Vault request failed for ${path}: invalid JSON (${response.status})`);
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { errors?: unknown }).errors)
        ? ((payload as { errors: string[] }).errors || []).join(', ')
        : `HTTP ${response.status}`;
    throw new Error(`Vault request failed for ${path}: ${message}`);
  }

  return payload as VaultJson;
};

const vaultRequest = async <T extends VaultJson>(
  path: string,
  body?: Record<string, unknown>
): Promise<T> => {
  const response = await fetch(`${getTransitBaseUrl()}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: getVaultHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  return (await parseVaultJson(response, path)) as T;
};

export const getPartnerKeyName = (partnerId: string): string => `partner-${partnerId}`;

const normalizeCiphertext = (ciphertext: string): string => {
  if (!ciphertext) {
    return ciphertext;
  }

  if (ciphertext.startsWith(VAULT_PREFIX)) {
    return ciphertext.slice(VAULT_PREFIX.length);
  }

  if (ciphertext.startsWith(LEGACY_VAULT_PREFIX)) {
    const encoded = ciphertext.slice(LEGACY_VAULT_PREFIX.length);
    const legacyCiphertext = Buffer.from(encoded, 'base64').toString('utf8');
    if (!legacyCiphertext) {
      throw new Error('Vault ciphertext payload is invalid');
    }
    return legacyCiphertext;
  }

  return ciphertext;
};

export const isVaultCiphertext = (value: string): boolean =>
  value.startsWith(VAULT_PREFIX) || value.startsWith(LEGACY_VAULT_PREFIX);

export const wrapVaultCiphertext = (ciphertext: string): string => `${VAULT_PREFIX}${ciphertext}`;

export const provisionTransitKey = async (keyName: string): Promise<void> => {
  assertNonEmpty(keyName, 'key name');
  await vaultRequest(`keys/${keyName}`, { type: 'aes256-gcm96' });
};

export const provisionPartnerKey = async (partnerId: string): Promise<string> => {
  assertNonEmpty(partnerId, 'partnerId');
  const keyName = getPartnerKeyName(partnerId);
  await provisionTransitKey(keyName);
  return keyName;
};

export const provisionGpsIndiaKey = async (): Promise<string> => {
  const keyName = envConfig.VAULT_GPS_INDIA_KEY;
  await provisionTransitKey(keyName);
  return keyName;
};

export const encryptForTransitKey = async (keyName: string, plaintext: string): Promise<string> => {
  assertNonEmpty(keyName, 'key name');
  assertNonEmpty(plaintext, 'encrypt');

  const result = await vaultRequest<{ data?: { ciphertext?: string } }>(`encrypt/${keyName}`, {
    plaintext: encode(plaintext),
  });

  const ciphertext = result.data?.ciphertext?.trim();
  if (!ciphertext) {
    throw new Error(`Vault encrypt failed for key ${keyName}`);
  }

  // Vault Transit already returns ciphertext in vault:vN:... format.
  return ciphertext;
};

export const decryptForTransitKey = async (keyName: string, ciphertext: string): Promise<string> => {
  assertNonEmpty(keyName, 'key name');

  const normalizedCiphertext = normalizeCiphertext(ciphertext);
  assertNonEmpty(normalizedCiphertext, 'decrypt');

  const result = await vaultRequest<{ data?: { plaintext?: string } }>(`decrypt/${keyName}`, {
    ciphertext: normalizedCiphertext,
  });

  const plaintext = result.data?.plaintext?.trim();
  if (!plaintext) {
    throw new Error(`Vault decrypt failed for key ${keyName}`);
  }

  return decode(plaintext);
};

export const encryptField = async (partnerId: string, plaintext: string): Promise<string> =>
  encryptForTransitKey(getPartnerKeyName(partnerId), plaintext);

export const decryptField = async (partnerId: string, ciphertext: string): Promise<string> =>
  decryptForTransitKey(getPartnerKeyName(partnerId), ciphertext);

export const encryptForGPSIndia = async (plaintext: string): Promise<string> =>
  encryptForTransitKey(envConfig.VAULT_GPS_INDIA_KEY, plaintext);

export const decryptAsGPSIndia = async (ciphertext: string): Promise<string> =>
  decryptForTransitKey(envConfig.VAULT_GPS_INDIA_KEY, ciphertext);

import 'dotenv/config';

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const optionalEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
const vaultRoleId = optionalEnv('VAULT_ROLE_ID');
const vaultSecretId = optionalEnv('VAULT_SECRET_ID');
const vaultToken = optionalEnv('VAULT_TOKEN');

// The current Vault client authenticates with X-Vault-Token. Until AppRole
// login is implemented in services/vault.ts, startup validation must require
// the token path that the runtime actually uses.
if (!vaultToken) {
  throw new Error('Missing required environment variable: VAULT_TOKEN');
}

export const envConfig = Object.freeze({
  NODE_ENV: nodeEnv,
  VAULT_ADDR: getRequiredEnv('VAULT_ADDR'),
  VAULT_TOKEN: vaultToken,
  VAULT_TRANSIT_PATH: getRequiredEnv('VAULT_TRANSIT_PATH'),
  // GPS India internal transit key for submitted-lead PII. Never share/namespace this under partners.
  VAULT_GPS_INDIA_KEY: getRequiredEnv('VAULT_GPS_INDIA_KEY'),
  VAULT_NAMESPACE: optionalEnv('VAULT_NAMESPACE'),
  VAULT_ROLE_ID: vaultRoleId,
  VAULT_SECRET_ID: vaultSecretId,
});

export type EnvConfig = typeof envConfig;

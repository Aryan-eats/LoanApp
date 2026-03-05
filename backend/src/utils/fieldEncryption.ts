import crypto from 'crypto';
import { Prisma } from '@prisma/client';

const ENCRYPTION_PREFIX = 'enc:v1';
const ENCRYPTION_KEY_ENV = 'FIELD_ENCRYPTION_KEY';

const getEncryptionKey = (): Buffer => {
  const raw = process.env[ENCRYPTION_KEY_ENV];
  if (!raw) {
    throw new Error(`${ENCRYPTION_KEY_ENV} is not set`);
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(`${ENCRYPTION_KEY_ENV} must be a 32-byte base64 string`);
  }

  return key;
};

const isEncrypted = (value: string): boolean => value.startsWith(`${ENCRYPTION_PREFIX}:`);

const generateIv = (): Buffer => crypto.randomBytes(12);

export const encryptString = (value: string | null | undefined): string | null | undefined => {
  if (value === null || value === undefined) return value;
  if (value === '') return value;
  if (isEncrypted(value)) return value;

  const key = getEncryptionKey();
  const iv = generateIv();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
};

export const decryptString = (value: string | null | undefined): string | null | undefined => {
  if (value === null || value === undefined) return value;
  if (value === '') return value;
  if (!isEncrypted(value)) return value;

  const key = getEncryptionKey();
  const parts = value.split(':');
  // Format: enc:v1:iv:tag:ciphertext (5 parts after split)
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted payload format');
  }

  const iv = Buffer.from(parts[2], 'base64');
  const tag = Buffer.from(parts[3], 'base64');
  const ciphertext = Buffer.from(parts[4], 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plaintext.toString('utf8');
};

const ENCRYPTED_FIELDS: Record<string, string[]> = {
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
  Lead: ['clientAadhaar', 'clientPanNumber', 'clientDateOfBirth'],
};

const throwOnUnsupportedSubstringFilters = (
  model: string,
  field: string,
  filter: Record<string, unknown>,
  location: 'filter' | 'not'
) => {
  const unsupported = ['contains', 'startsWith', 'endsWith'].find(
    (op) => filter[op] !== undefined && filter[op] !== null
  );

  if (unsupported) {
    throw new Error(
      `Unsupported ${unsupported} filter on encrypted field "${model}.${field}" (${location}).`
    );
  }
};

const shouldHandleModel = (model?: string): model is keyof typeof ENCRYPTED_FIELDS =>
  !!model && Object.prototype.hasOwnProperty.call(ENCRYPTED_FIELDS, model);

const encryptFields = (model: string, data: Record<string, unknown> | undefined | null) => {
  if (!data) return;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return;

  fields.forEach((field) => {
    if (typeof data[field] === 'string') {
      data[field] = encryptString(data[field] as string) as string;
    }
  });
};

const encryptWhere = (model: string, where: Record<string, unknown> | undefined | null) => {
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

    if (typeof value === 'string') {
      where[key] = encryptString(value) as string;
      continue;
    }

    if (value && typeof value === 'object') {
      const filter = value as Record<string, unknown>;
      throwOnUnsupportedSubstringFilters(model, key, filter, 'filter');

      if (typeof filter.equals === 'string') {
        filter.equals = encryptString(filter.equals) as string;
      }
      if (Array.isArray(filter.in)) {
        filter.in = filter.in.map((item) =>
          typeof item === 'string' ? encryptString(item) : item
        );
      }
      if (Array.isArray(filter.notIn)) {
        filter.notIn = filter.notIn.map((item) =>
          typeof item === 'string' ? encryptString(item) : item
        );
      }
      if (typeof filter.not === 'string') {
        filter.not = encryptString(filter.not) as string;
      } else if (filter.not && typeof filter.not === 'object') {
        const notFilter = filter.not as Record<string, unknown>;
        throwOnUnsupportedSubstringFilters(model, key, notFilter, 'not');

        if (typeof notFilter.equals === 'string') {
          notFilter.equals = encryptString(notFilter.equals) as string;
        }
      }
    }
  }
};

const decryptRecord = (model: string, record: Record<string, unknown> | null) => {
  if (!record) return;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return;

  fields.forEach((field) => {
    if (typeof record[field] === 'string') {
      record[field] = decryptString(record[field] as string) as string;
    }
  });
};

const decryptResult = (model: string, result: unknown) => {
  if (!result) return;
  if (Array.isArray(result)) {
    result.forEach((entry) => decryptRecord(model, entry as Record<string, unknown>));
  } else if (typeof result === 'object') {
    decryptRecord(model, result as Record<string, unknown>);
  }
};

export const fieldEncryptionExtension = Prisma.defineExtension({
  name: 'fieldEncryption',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!shouldHandleModel(model)) {
          return query(args);
        }

        const m = model;
        // Cast args to a generic record to access properties safely
        const a = args as Record<string, unknown>;

        if (a.where && typeof a.where === 'object') {
          encryptWhere(m, a.where as Record<string, unknown>);
        }

        if (a.data && typeof a.data === 'object') {
          if (Array.isArray(a.data)) {
            (a.data as Record<string, unknown>[]).forEach((entry) =>
              encryptFields(m, entry)
            );
          } else {
            encryptFields(m, a.data as Record<string, unknown>);
          }
        }

        if (a.create && typeof a.create === 'object') {
          encryptFields(m, a.create as Record<string, unknown>);
        }

        if (a.update && typeof a.update === 'object') {
          encryptFields(m, a.update as Record<string, unknown>);
        }

        const result = await query(args);

        const actionsWithResults = new Set([
          'findUnique',
          'findUniqueOrThrow',
          'findFirst',
          'findFirstOrThrow',
          'findMany',
          'create',
          'update',
          'upsert',
          'delete',
        ]);

        if (actionsWithResults.has(operation)) {
          decryptResult(m, result);
        }

        return result;
      },
    },
  },
});

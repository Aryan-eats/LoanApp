/**
 * Repairs rows with an accidentally duplicated Vault prefix
 * (vault:v1:vault:v1:...).
 *
 * For each affected field the script:
 *   1. Strips the extra vault:v1: prefix.
 *   2. Writes the normalized ciphertext (vault:v1:...) back to the database.
 *
 * Safe to re-run: rows already normalized are skipped.
 *
 * Usage:
 *   npx tsx src/scripts/fixDoubleEncryption.ts           # dry-run (default)
 *   npx tsx src/scripts/fixDoubleEncryption.ts --apply   # actually write
 */

import { basePrisma as prisma } from '../config/prisma.js';
import crypto from 'crypto';
import pLimit from 'p-limit';

const DOUBLE_PREFIX = 'vault:v1:vault:v1:';
const SINGLE_PREFIX = 'vault:v1:';
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 500);
const CONCURRENCY = Number(process.env.CONCURRENCY || 5);

const isDryRun = !process.argv.includes('--apply');

type FieldConfig = {
  table: string;
  idColumn: string;
  fields: string[];
  columnMap: Record<string, string>;
};

const CONFIGS: FieldConfig[] = [
  {
    table: 'users',
    idColumn: 'id',
    fields: ['aadhaarNumber', 'panNumber', 'gstNumber', 'accountNumber', 'ifscCode', 'upiId'],
    columnMap: {
      aadhaarNumber: 'aadhaar_number',
      panNumber: 'pan_number',
      gstNumber: 'gst_number',
      accountNumber: 'account_number',
      ifscCode: 'ifsc_code',
      upiId: 'upi_id',
    },
  },
  {
    table: 'leads',
    idColumn: 'id',
    fields: [
      'clientFullName',
      'clientPhone',
      'clientEmail',
      'clientAadhaar',
      'clientPanNumber',
      'clientDateOfBirth',
    ],
    columnMap: {
      clientFullName: 'client_full_name',
      clientPhone: 'client_phone',
      clientEmail: 'client_email',
      clientAadhaar: 'client_aadhaar',
      clientPanNumber: 'client_pan_number',
      clientDateOfBirth: 'client_date_of_birth',
    },
  },
  {
    table: 'partner_data',
    idColumn: 'id',
    fields: ['fullName', 'phone', 'email', 'panNumber', 'dateOfBirth'],
    columnMap: {
      fullName: 'full_name',
      phone: 'phone',
      email: 'email',
      panNumber: 'pan_number',
      dateOfBirth: 'date_of_birth',
    },
  },
];

const isDoublePrefixed = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(DOUBLE_PREFIX);

const normalizeCiphertext = (value: string): string =>
  `${SINGLE_PREFIX}${value.slice(DOUBLE_PREFIX.length)}`;

const hash = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const processBatch = async (config: FieldConfig, lastId: string | null) => {
  const columns = [config.idColumn, ...config.fields.map((field) => config.columnMap[field])];
  const colList = columns.map((column) => `"${column}"`).join(', ');

  const whereClause = config.fields
    .map((field) => `"${config.columnMap[field]}" LIKE '${DOUBLE_PREFIX}%'`)
    .join(' OR ');

  const cursorClause = lastId ? ` AND "${config.idColumn}" > $1::uuid` : '';
  const limitPlaceholder = lastId ? '$2' : '$1';
  const query = `
    SELECT ${colList}
    FROM "${config.table}"
    WHERE (${whereClause})${cursorClause}
    ORDER BY "${config.idColumn}" ASC
    LIMIT ${limitPlaceholder}
  `;

  return lastId
    ? prisma.$queryRawUnsafe<Record<string, unknown>[]>(query, lastId, BATCH_SIZE)
    : prisma.$queryRawUnsafe<Record<string, unknown>[]>(query, BATCH_SIZE);
};

const processRow = async (row: Record<string, unknown>, config: FieldConfig) => {
  const updates: Array<{ column: string; value: string }> = [];

  for (const field of config.fields) {
    const column = config.columnMap[field];
    const rawValue = row[column];

    if (!isDoublePrefixed(rawValue)) {
      continue;
    }

    const fixed = normalizeCiphertext(rawValue);
    updates.push({ column, value: fixed });

    console.log({
      id: row[config.idColumn],
      column,
      beforeHash: hash(rawValue),
      afterHash: hash(fixed),
    });
  }

  if (updates.length === 0) {
    return false;
  }

  if (isDryRun) {
    return true;
  }

  await prisma.$transaction(async (tx) => {
    const setClause = updates.map((update, index) => `"${update.column}" = $${index + 2}`).join(', ');
    const params = [row[config.idColumn], ...updates.map((update) => update.value)];

    await tx.$executeRawUnsafe(
      `UPDATE "${config.table}" SET ${setClause} WHERE "${config.idColumn}" = $1`,
      ...params
    );
  });

  return true;
};

const main = async () => {
  console.log(`\nFix Double Prefix Script (${isDryRun ? 'DRY RUN' : 'APPLY'})\n`);

  const limit = pLimit(CONCURRENCY);

  for (const config of CONFIGS) {
    console.log(`\nProcessing ${config.table}`);

    let lastId: string | null = null;
    let total = 0;

    while (true) {
      const rows = await processBatch(config, lastId);
      if (rows.length === 0) {
        break;
      }

      await Promise.all(
        rows.map((row) =>
          limit(async () => {
            const changed = await processRow(row, config);
            if (changed) {
              total++;
            }
          })
        )
      );

      lastId = String(rows[rows.length - 1]?.[config.idColumn]);
      console.log(`Processed up to ID: ${lastId}`);
    }

    console.log(`-> ${total} rows ${isDryRun ? 'would be fixed' : 'fixed'}`);
  }

  console.log('\nDone.');
};

main()
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

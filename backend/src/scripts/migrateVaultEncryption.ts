import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import prisma, { basePrisma } from '../config/prisma.js';
import {
  decryptAsGPSIndia,
  decryptField,
  encryptField,
  encryptForGPSIndia,
  isVaultCiphertext,
} from '../services/vault.js';
import { decryptLegacyString, isLegacyCiphertext } from '../utils/legacyFieldEncryption.js';

type CursorState = {
  userLastId: string | null;
  leadLastId: string | null;
  partnerDataLastId: string | null;
};

type ScriptOptions = {
  batchSize: number;
  cursorFile: string;
};

type TableCursor = {
  userLastId: string | null;
  leadLastId: string | null;
  partnerDataLastId: string | null;
};

type UserRow = {
  id: string;
  aadhaarNumber: string | null;
  panNumber: string | null;
  gstNumber: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  upiId: string | null;
  otpHash: string | null;
  resetPasswordToken: string | null;
  refreshToken: string | null;
};

type LeadRow = {
  id: string;
  clientFullName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientDateOfBirth: string | null;
  clientPanNumber: string | null;
  clientAadhaar: string | null;
};

type PartnerDataRow = {
  id: string;
  partnerOrgId: string;
  fullName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  panNumber: string | null;
};

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_CURSOR_FILE = path.resolve(process.cwd(), '.vault-backfill-cursor.json');
const MAX_RETRIES = 5;
const VAULT_PREFIX = 'vault:v1:%';
const LEGACY_PREFIX = 'enc:v1:%';

const parseArgs = (): ScriptOptions => {
  const options: ScriptOptions = {
    batchSize: DEFAULT_BATCH_SIZE,
    cursorFile: DEFAULT_CURSOR_FILE,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--batch-size=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value) && value > 0) {
        options.batchSize = Math.min(1000, Math.floor(value));
      }
    }

    if (arg.startsWith('--cursor-file=')) {
      const value = arg.split('=')[1];
      if (value) {
        options.cursorFile = path.resolve(process.cwd(), value);
      }
    }
  }

  return options;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const withRetries = async <T>(label: string, fn: () => Promise<T>, attempt = 1): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`${label} failed after ${MAX_RETRIES} attempts`);
    }

    const backoffMs = Math.min(10_000, 500 * 2 ** (attempt - 1));
    console.warn(`[backfill] transient failure in ${label}, retry ${attempt}/${MAX_RETRIES - 1}`);
    await sleep(backoffMs);
    return withRetries(label, fn, attempt + 1);
  }
};

const readCursor = async (cursorFile: string): Promise<CursorState> => {
  try {
    const raw = await fs.readFile(cursorFile, 'utf8');
    const parsed = JSON.parse(raw) as Partial<CursorState>;
    return {
      userLastId: parsed.userLastId ?? null,
      leadLastId: parsed.leadLastId ?? null,
      partnerDataLastId: parsed.partnerDataLastId ?? null,
    };
  } catch {
    return {
      userLastId: null,
      leadLastId: null,
      partnerDataLastId: null,
    };
  }
};

const writeCursor = async (cursorFile: string, state: CursorState): Promise<void> => {
  const payload = `${JSON.stringify(state, null, 2)}\n`;
  await fs.writeFile(cursorFile, payload, 'utf8');
};

const withCursorCheckpoint = async (
  cursorFile: string,
  cursor: CursorState,
  updates: Partial<TableCursor>
): Promise<void> => {
  Object.assign(cursor, updates);
  await writeCursor(cursorFile, cursor);
};

const toGpsCiphertext = async (value: string | null): Promise<string | null> => {
  if (!value) return null;
  if (isVaultCiphertext(value)) return value;

  if (isLegacyCiphertext(value)) {
    const plaintext = decryptLegacyString(value);
    if (!plaintext) return null;
    return withRetries('encryptForGPSIndia', () => encryptForGPSIndia(plaintext));
  }

  return withRetries('encryptForGPSIndia', () => encryptForGPSIndia(value));
};

const toRequiredGpsCiphertext = async (value: string | null, fieldName: string): Promise<string> => {
  const ciphertext = await toGpsCiphertext(value);
  if (!ciphertext) {
    throw new Error(`Expected non-null ciphertext for required Lead field ${fieldName}`);
  }

  return ciphertext;
};

const toStableAuthHash = async (value: string | null): Promise<string | null> => {
  if (!value) return null;

  if (isLegacyCiphertext(value)) {
    return decryptLegacyString(value) ?? null;
  }

  if (isVaultCiphertext(value)) {
    return withRetries('decryptAsGPSIndia(auth hash)', () => decryptAsGPSIndia(value));
  }

  return value;
};

const toPartnerCiphertext = async (
  partnerOrgId: string,
  value: string | null
): Promise<string | null> => {
  if (!value) return null;

  if (isLegacyCiphertext(value)) {
    const plaintext = decryptLegacyString(value);
    if (!plaintext) return null;
    return withRetries('encryptField(partner)', () => encryptField(partnerOrgId, plaintext));
  }

  if (isVaultCiphertext(value)) {
    const plaintext = await withRetries('decrypt partner/gps ciphertext', async () => {
      try {
        return await decryptField(partnerOrgId, value);
      } catch (error) {
        console.warn(
          `[backfill] partner decrypt failed for org=${partnerOrgId}, attempting GPS fallback: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return decryptAsGPSIndia(value);
      }
    });

    return withRetries('encryptField(partner)', () => encryptField(partnerOrgId, plaintext));
  }

  return withRetries('encryptField(partner)', () => encryptField(partnerOrgId, value));
};

const toRequiredPartnerCiphertext = async (
  partnerOrgId: string,
  value: string,
  fieldName: string
): Promise<string> => {
  const ciphertext = await toPartnerCiphertext(partnerOrgId, value);
  if (ciphertext === null) {
    console.warn(
      `[backfill] ${fieldName} produced null for org=${partnerOrgId}; preserving original value`
    );
    return value;
  }

  return ciphertext;
};

const loadPendingUsers = async (lastId: string | null, batchSize: number): Promise<UserRow[]> =>
  basePrisma.$queryRaw<UserRow[]>(
    Prisma.sql`
      SELECT
        id,
        aadhaar_number AS "aadhaarNumber",
        pan_number AS "panNumber",
        gst_number AS "gstNumber",
        account_number AS "accountNumber",
        ifsc_code AS "ifscCode",
        upi_id AS "upiId",
        otp AS "otpHash",
        reset_password_token AS "resetPasswordToken",
        refresh_token AS "refreshToken"
      FROM users
      WHERE
        (${lastId ? Prisma.sql`id > ${lastId}::uuid AND` : Prisma.empty}
        (
          encryption_version = 0
          OR (aadhaar_number IS NOT NULL AND aadhaar_number NOT LIKE ${VAULT_PREFIX})
          OR (pan_number IS NOT NULL AND pan_number NOT LIKE ${VAULT_PREFIX})
          OR (gst_number IS NOT NULL AND gst_number NOT LIKE ${VAULT_PREFIX})
          OR (account_number IS NOT NULL AND account_number NOT LIKE ${VAULT_PREFIX})
          OR (ifsc_code IS NOT NULL AND ifsc_code NOT LIKE ${VAULT_PREFIX})
          OR (upi_id IS NOT NULL AND upi_id NOT LIKE ${VAULT_PREFIX})
          OR (otp IS NOT NULL AND (otp LIKE ${VAULT_PREFIX} OR otp LIKE ${LEGACY_PREFIX}))
          OR (
            reset_password_token IS NOT NULL
            AND (
              reset_password_token LIKE ${VAULT_PREFIX}
              OR reset_password_token LIKE ${LEGACY_PREFIX}
            )
          )
          OR (
            refresh_token IS NOT NULL
            AND (refresh_token LIKE ${VAULT_PREFIX} OR refresh_token LIKE ${LEGACY_PREFIX})
          )
        ))
      ORDER BY id ASC
      LIMIT ${batchSize}
    `
  );

const loadPendingLeads = async (lastId: string | null, batchSize: number): Promise<LeadRow[]> =>
  basePrisma.$queryRaw<LeadRow[]>(
    Prisma.sql`
      SELECT
        id,
        client_full_name AS "clientFullName",
        client_phone AS "clientPhone",
        client_email AS "clientEmail",
        client_date_of_birth AS "clientDateOfBirth",
        client_pan_number AS "clientPanNumber",
        client_aadhaar AS "clientAadhaar"
      FROM leads
      WHERE
        (${lastId ? Prisma.sql`id > ${lastId}::uuid AND` : Prisma.empty}
        (
          encryption_version = 0
          OR (client_full_name IS NOT NULL AND client_full_name NOT LIKE ${VAULT_PREFIX})
          OR (client_phone IS NOT NULL AND client_phone NOT LIKE ${VAULT_PREFIX})
          OR (client_email IS NOT NULL AND client_email NOT LIKE ${VAULT_PREFIX})
          OR (client_date_of_birth IS NOT NULL AND client_date_of_birth NOT LIKE ${VAULT_PREFIX})
          OR (client_pan_number IS NOT NULL AND client_pan_number NOT LIKE ${VAULT_PREFIX})
          OR (client_aadhaar IS NOT NULL AND client_aadhaar NOT LIKE ${VAULT_PREFIX})
        ))
      ORDER BY id ASC
      LIMIT ${batchSize}
    `
  );

const loadPendingPartnerData = async (
  lastId: string | null,
  batchSize: number
): Promise<PartnerDataRow[]> =>
  basePrisma.$queryRaw<PartnerDataRow[]>(
    Prisma.sql`
      SELECT
        id,
        partner_org_id AS "partnerOrgId",
        full_name AS "fullName",
        phone,
        email,
        date_of_birth AS "dateOfBirth",
        pan_number AS "panNumber"
      FROM partner_data
      WHERE
        (${lastId ? Prisma.sql`id > ${lastId}::uuid AND` : Prisma.empty}
        (
          encryption_version = 0
          OR (full_name IS NOT NULL AND full_name NOT LIKE ${VAULT_PREFIX})
          OR (phone IS NOT NULL AND phone NOT LIKE ${VAULT_PREFIX})
          OR (email IS NOT NULL AND email NOT LIKE ${VAULT_PREFIX})
          OR (date_of_birth IS NOT NULL AND date_of_birth NOT LIKE ${VAULT_PREFIX})
          OR (pan_number IS NOT NULL AND pan_number NOT LIKE ${VAULT_PREFIX})
        ))
      ORDER BY id ASC
      LIMIT ${batchSize}
    `
  );

const processUsers = async (
  lastId: string | null,
  options: ScriptOptions,
  onRowDone: (lastProcessedId: string) => Promise<void>
): Promise<number> => {
  const rows = await loadPendingUsers(lastId, options.batchSize);

  for (const row of rows) {
    await basePrisma.user.update({
      where: { id: row.id },
      data: {
        aadhaarNumber: await toGpsCiphertext(row.aadhaarNumber),
        panNumber: await toGpsCiphertext(row.panNumber),
        gstNumber: await toGpsCiphertext(row.gstNumber),
        accountNumber: await toGpsCiphertext(row.accountNumber),
        ifscCode: await toGpsCiphertext(row.ifscCode),
        upiId: await toGpsCiphertext(row.upiId),
        otpHash: await toStableAuthHash(row.otpHash),
        resetPasswordToken: await toStableAuthHash(row.resetPasswordToken),
        refreshToken: await toStableAuthHash(row.refreshToken),
        encryptionVersion: 1,
      },
    });

    await onRowDone(row.id);
  }

  return rows.length;
};

const processLeads = async (
  lastId: string | null,
  options: ScriptOptions,
  onRowDone: (lastProcessedId: string) => Promise<void>
): Promise<number> => {
  const rows = await loadPendingLeads(lastId, options.batchSize);

  for (const row of rows) {
    await basePrisma.lead.update({
      where: { id: row.id },
      data: {
        clientFullName: await toRequiredGpsCiphertext(row.clientFullName, 'clientFullName'),
        clientPhone: await toRequiredGpsCiphertext(row.clientPhone, 'clientPhone'),
        clientEmail: await toGpsCiphertext(row.clientEmail),
        clientDateOfBirth: await toGpsCiphertext(row.clientDateOfBirth),
        clientPanNumber: await toGpsCiphertext(row.clientPanNumber),
        clientAadhaar: await toGpsCiphertext(row.clientAadhaar),
        encryptionVersion: 1,
      },
    });

    await onRowDone(row.id);
  }

  return rows.length;
};

const processPartnerData = async (
  lastId: string | null,
  options: ScriptOptions,
  onRowDone: (lastProcessedId: string) => Promise<void>
): Promise<number> => {
  const rows = await loadPendingPartnerData(lastId, options.batchSize);

  for (const row of rows) {
    await basePrisma.partnerData.update({
      where: { id: row.id },
      data: {
        fullName: await toRequiredPartnerCiphertext(row.partnerOrgId, row.fullName, 'fullName'),
        phone: await toRequiredPartnerCiphertext(row.partnerOrgId, row.phone, 'phone'),
        email: await toPartnerCiphertext(row.partnerOrgId, row.email),
        dateOfBirth: await toPartnerCiphertext(row.partnerOrgId, row.dateOfBirth),
        panNumber: await toPartnerCiphertext(row.partnerOrgId, row.panNumber),
        encryptionVersion: 1,
      },
    });

    await onRowDone(row.id);
  }

  return rows.length;
};

const main = async (): Promise<void> => {
  const options = parseArgs();
  const cursor = await readCursor(options.cursorFile);
  let totalUsers = 0;
  let totalLeads = 0;
  let totalPartnerData = 0;

  console.log(`[backfill] starting with batch size ${options.batchSize}`);
  console.log(`[backfill] cursor file: ${options.cursorFile}`);

  while (true) {
    const users = await processUsers(cursor.userLastId, options, async (lastProcessedId) => {
      await withCursorCheckpoint(options.cursorFile, cursor, { userLastId: lastProcessedId });
    });
    const leads = await processLeads(cursor.leadLastId, options, async (lastProcessedId) => {
      await withCursorCheckpoint(options.cursorFile, cursor, { leadLastId: lastProcessedId });
    });
    const partnerData = await processPartnerData(
      cursor.partnerDataLastId,
      options,
      async (lastProcessedId) => {
        await withCursorCheckpoint(options.cursorFile, cursor, {
          partnerDataLastId: lastProcessedId,
        });
      }
    );

    totalUsers += users;
    totalLeads += leads;
    totalPartnerData += partnerData;

    console.log(
      `[backfill] batch complete users=${users} leads=${leads} partnerData=${partnerData}`
    );

    if (users === 0 && leads === 0 && partnerData === 0) {
      break;
    }
  }

  console.log(
    `[backfill] completed users=${totalUsers} leads=${totalLeads} partnerData=${totalPartnerData}`
  );
};

main()
  .catch((error) => {
    console.error('[backfill] failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await basePrisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });

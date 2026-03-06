import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from '../utils/fieldEncryption.js';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  basePrisma: PrismaClient | undefined;
  pool: Pool | undefined;
  adapter: PrismaPg | undefined;
};

const getDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required before initializing Prisma');
  }

  return databaseUrl;
};

const createPool = (): Pool =>
  new Pool({
    connectionString: getDatabaseUrl(),
    max: parseInt(process.env.PG_POOL_MAX ?? '20', 10),
    min: parseInt(process.env.PG_POOL_MIN ?? '2', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
    application_name: 'loan-app-backend',
    // Enforce TLS in production to protect PII (Aadhaar, PAN, loan amounts) in transit.
    // Set DB_SSL=false to opt-out when the DB enforces SSL at the server level via sslmode.
    ssl:
      process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'
        ? { rejectUnauthorized: true }
        : false,
  });

const pool = globalForPrisma.pool ?? createPool();
const adapter = globalForPrisma.adapter ?? new PrismaPg(pool);

function createPrismaClient() {
  const base = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  return base.$extends(fieldEncryptionExtension);
}

/**
 * PRIMARY CLIENT — use for all models that contain encrypted fields.
 *
 * Models routed through `prisma` (field-encryption extension active):
 *   - User          (panNumber, aadhaarNumber, accountNumber, ifscCode are encrypted)
 *   - Lead
 *   - Document
 *   - LeadTimeline
 *   - AuditLog
 *   - ActiveSession
 *   - PasswordHistory
 *   - UserConsent
 *
 * ⚠️  Any Prisma middleware / $use hooks added here will NOT apply to basePrisma.
 *     Keep the two clients in sync if you add global middleware.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

/**
 * BASE CLIENT — use only for models with NO encrypted fields.
 *
 * Reason this exists: the field-encryption $extends call changes the inferred
 * TypeScript return type of PrismaClient, breaking type inference for models
 * that have no encrypted columns. basePrisma exposes the plain PrismaClient
 * types so those models resolve correctly.
 *
 * Models routed through `basePrisma` (no encrypted fields):
 *   - Bank            (includes CommissionRate via relation)
 *   - LenderDocRequirement
 *
 * ⚠️  Do NOT use basePrisma for User, Lead, Document, or any model that
 *     stores encrypted fields — encrypted values will be written/read raw.
 */
export const basePrisma: PrismaClient = globalForPrisma.basePrisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.basePrisma = basePrisma;
  globalForPrisma.pool = pool;
  globalForPrisma.adapter = adapter;
}

/** Transaction client type that matches the extended prisma instance. */
export type ExtendedTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export default prisma;

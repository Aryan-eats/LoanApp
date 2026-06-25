import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { envConfig } from '../config/env.js';

void envConfig;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
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
    ssl:
      process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'
        ? { rejectUnauthorized: true }
        : false,
  });

const pool = globalForPrisma.pool ?? createPool();
const adapter = globalForPrisma.adapter ?? new PrismaPg(pool);

/**
 * PRIMARY CLIENT — use for all application queries.
 *
 * Field-level PII encryption is handled explicitly in the service layer
 * via src/shared/security/encryption.ts (AES-256-GCM), not via a Prisma extension.
 * This keeps the encryption contract visible and the type system happy.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

/**
 * BASE CLIENT — alias kept for backward compatibility with code that imports
 * `basePrisma`. Both clients are identical; the distinction is no longer
 * needed without the Prisma extension.
 */
export const basePrisma: PrismaClient =
  globalForPrisma.basePrisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.basePrisma = basePrisma;
  globalForPrisma.pool = pool;
  globalForPrisma.adapter = adapter;
}

/** Transaction client type compatible with prisma.$transaction. */
export type ExtendedTransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

export default prisma;

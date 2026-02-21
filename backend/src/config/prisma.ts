import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from '../utils/fieldEncryption.js';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  basePrisma: PrismaClient | undefined;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);

function createPrismaClient() {
  const base = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  return base.$extends(fieldEncryptionExtension);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

/**
 * Base Prisma client without the field encryption extension.
 * Use this for models that have no encrypted fields (e.g. LenderDocRequirement)
 * so TypeScript can resolve the model types correctly.
 */
export const basePrisma: PrismaClient = globalForPrisma.basePrisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.basePrisma = basePrisma;
}

export default prisma;

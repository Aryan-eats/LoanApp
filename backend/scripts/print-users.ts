import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const maskEmail = (email: string): string => {
  const [localPart = '', domain = ''] = email.split('@');
  if (!localPart || !domain) return '***';
  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal}${'*'.repeat(Math.max(localPart.length - visibleLocal.length, 1))}@${domain}`;
};

const maskPhone = (phone: string | null): string | null => {
  if (!phone) return null;
  if (phone.length <= 4) return '****';
  return `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}`;
};

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('print-users.ts can only be run when NODE_ENV=development');
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      isActive: true,
    },
  });
  console.table(
    users.map((user) => ({
      ...user,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
    }))
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    if (process.exitCode && process.exitCode !== 0) {
      process.exit(process.exitCode);
    }
  });

import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nTotal Users: ${users.length}\n`);
  console.table(users.map(u => ({
    ID: u.id.slice(0, 8) + '...',
    Name: `${u.firstName} ${u.lastName ?? ''}`.trim(),
    Email: u.email,
    Phone: u.phone ?? '-',
    Role: u.role,
    Active: u.isActive,
    Created: u.createdAt.toISOString().split('T')[0],
  })));

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });

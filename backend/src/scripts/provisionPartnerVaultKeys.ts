import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { basePrisma } from '../config/prisma.js';
import { provisionGpsIndiaKey, provisionPartnerKey } from '../services/vault.js';

const main = async (): Promise<void> => {
  await provisionGpsIndiaKey();

  const partners = await basePrisma.$queryRaw<Array<{ id: string; vault_key_ref: string | null }>>(
    Prisma.sql`SELECT id, vault_key_ref FROM partners ORDER BY created_at ASC`
  );

  for (const partner of partners) {
    const keyRef = await provisionPartnerKey(partner.id);

    if (partner.vault_key_ref !== keyRef) {
      await basePrisma.$executeRaw(
        Prisma.sql`UPDATE partners SET vault_key_ref = ${keyRef} WHERE id = ${partner.id}::uuid`
      );
    }
  }

  console.log(`Provisioned Vault keys for ${partners.length} partner records.`);
};

main()
  .catch((error) => {
    console.error('Failed to provision partner Vault keys:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await basePrisma.$disconnect();
  });

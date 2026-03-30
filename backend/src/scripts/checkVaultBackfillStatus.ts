import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { basePrisma } from '../config/prisma.js';

const VAULT_PREFIX = 'vault:v1:%';
const LEGACY_PREFIX = 'enc:v1:%';

const countUsersPending = async (): Promise<number> => {
  const rows = await basePrisma.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM users
      WHERE
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
    `
  );

  return Number(rows[0]?.count ?? 0n);
};

const countLeadsPending = async (): Promise<number> => {
  const rows = await basePrisma.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM leads
      WHERE
        encryption_version = 0
        OR (client_full_name IS NOT NULL AND client_full_name NOT LIKE ${VAULT_PREFIX})
        OR (client_phone IS NOT NULL AND client_phone NOT LIKE ${VAULT_PREFIX})
        OR (client_email IS NOT NULL AND client_email NOT LIKE ${VAULT_PREFIX})
        OR (client_date_of_birth IS NOT NULL AND client_date_of_birth NOT LIKE ${VAULT_PREFIX})
        OR (client_pan_number IS NOT NULL AND client_pan_number NOT LIKE ${VAULT_PREFIX})
        OR (client_aadhaar IS NOT NULL AND client_aadhaar NOT LIKE ${VAULT_PREFIX})
    `
  );

  return Number(rows[0]?.count ?? 0n);
};

const countPartnerDataPending = async (): Promise<number> => {
  const rows = await basePrisma.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM partner_data
      WHERE
        encryption_version = 0
        OR (full_name IS NOT NULL AND full_name NOT LIKE ${VAULT_PREFIX})
        OR (phone IS NOT NULL AND phone NOT LIKE ${VAULT_PREFIX})
        OR (email IS NOT NULL AND email NOT LIKE ${VAULT_PREFIX})
        OR (date_of_birth IS NOT NULL AND date_of_birth NOT LIKE ${VAULT_PREFIX})
        OR (pan_number IS NOT NULL AND pan_number NOT LIKE ${VAULT_PREFIX})
    `
  );

  return Number(rows[0]?.count ?? 0n);
};

const main = async (): Promise<void> => {
  const [usersPending, leadsPending, partnerDataPending] = await Promise.all([
    countUsersPending(),
    countLeadsPending(),
    countPartnerDataPending(),
  ]);

  const totalPending = usersPending + leadsPending + partnerDataPending;
  console.log(
    JSON.stringify(
      {
        usersPending,
        leadsPending,
        partnerDataPending,
        totalPending,
        phase6Ready: totalPending === 0,
      },
      null,
      2
    )
  );
};

main()
  .catch((error) => {
    console.error(
      'Failed to check vault backfill status:',
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await basePrisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });

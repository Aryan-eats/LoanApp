import { Prisma } from '@prisma/client';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GPSIFS_LEAD_ID_REGEX = /^GPSIFS\d+$/;
const GPSIFS_LEAD_ID_QUERY_REGEX = '^GPSIFS[0-9]+$';

type LeadIdDbClient = Pick<Prisma.TransactionClient, '$queryRaw'>;

export const isUuid = (value: string): boolean => UUID_V4_REGEX.test(value);

export const isGpsifsLeadId = (value: string): boolean => GPSIFS_LEAD_ID_REGEX.test(value);

export const isValidLeadId = (value: string): boolean => isUuid(value) || isGpsifsLeadId(value);

export const getNextGpsifsLeadId = async (db: LeadIdDbClient): Promise<string> => {
  const rows = await db.$queryRaw<Array<{ maxSuffix: bigint | number | string | null }>>`
    SELECT MAX(CAST(regexp_replace(id, '^GPSIFS', '') AS BIGINT)) AS "maxSuffix"
    FROM leads
    WHERE id ~ ${GPSIFS_LEAD_ID_QUERY_REGEX}
  `;

  const rawMaxSuffix = rows[0]?.maxSuffix;
  const maxSuffix =
    rawMaxSuffix == null
      ? -1
      : typeof rawMaxSuffix === 'bigint'
        ? Number(rawMaxSuffix)
        : Number(rawMaxSuffix);

  if (!Number.isSafeInteger(maxSuffix)) {
    throw new Error('Unable to determine the next GPSIFS lead ID');
  }

  return `GPSIFS${maxSuffix + 1}`;
};

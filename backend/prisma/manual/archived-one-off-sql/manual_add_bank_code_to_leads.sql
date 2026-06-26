-- Safe, additive migration: adds bank_code column to leads table.
-- Can be run multiple times safely (IF NOT EXISTS).

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "bank_code" TEXT;

-- Back-fill existing rows: resolve bank_code from banks.code where bank_assigned matches banks.name
UPDATE "leads" l
SET "bank_code" = b."code"
FROM "banks" b
WHERE l."bank_assigned" = b."name"
  AND l."bank_code" IS NULL;

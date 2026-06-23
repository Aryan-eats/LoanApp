-- Backfill deterministic key refs before enforcing the final NOT NULL cutover.
UPDATE "partners"
SET "vault_key_ref" = CONCAT('partner-', "id"::text)
WHERE "vault_key_ref" IS NULL OR BTRIM("vault_key_ref") = '';

ALTER TABLE "partners"
  ALTER COLUMN "vault_key_ref" SET NOT NULL;

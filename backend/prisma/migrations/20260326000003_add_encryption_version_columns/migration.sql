-- Add encryptionVersion columns for PII-bearing models
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "encryption_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "encryption_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "partner_data"
  ADD COLUMN IF NOT EXISTS "encryption_version" INTEGER NOT NULL DEFAULT 0;

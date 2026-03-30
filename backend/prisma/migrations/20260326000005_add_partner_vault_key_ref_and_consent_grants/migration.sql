-- Add partner Vault metadata and consent grant audit trail.
ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "vault_key_ref" TEXT;

CREATE TABLE IF NOT EXISTS "consent_grants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "partner_data_id" UUID NOT NULL,
  "partner_id" UUID NOT NULL,
  "submitted_by" UUID NOT NULL,
  "granted_to" TEXT NOT NULL,
  "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "submission_context" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "consent_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "consent_grants_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "consent_grants_partner_data_id_fkey"
    FOREIGN KEY ("partner_data_id") REFERENCES "partner_data"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "consent_grants_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "consent_grants_submitted_by_fkey"
    FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "consent_grants_lead_id_idx"
  ON "consent_grants"("lead_id");

CREATE INDEX IF NOT EXISTS "consent_grants_partner_data_id_idx"
  ON "consent_grants"("partner_data_id");

CREATE INDEX IF NOT EXISTS "consent_grants_partner_id_granted_at_idx"
  ON "consent_grants"("partner_id", "granted_at" DESC);

CREATE INDEX IF NOT EXISTS "consent_grants_granted_to_revoked_at_idx"
  ON "consent_grants"("granted_to", "revoked_at");

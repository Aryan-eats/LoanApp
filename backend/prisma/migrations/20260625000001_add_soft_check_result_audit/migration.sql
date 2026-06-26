ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'SOFT_CHECK_RUN';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'ELIGIBILITY_RULE_CHANGED';

CREATE TYPE "SoftCheckSourceType" AS ENUM ('RAW', 'PARTNER_DATA', 'LEAD');
CREATE TYPE "SoftCheckEligibilityStatus" AS ENUM ('ELIGIBLE', 'REFER_TO_UNDERWRITER', 'INELIGIBLE');
CREATE TYPE "SoftCheckConfidenceTier" AS ENUM ('STRONG', 'MODERATE', 'WEAK', 'INELIGIBLE');

CREATE TABLE "rule_change_audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_user_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "before_value" JSONB,
  "after_value" JSONB,
  "reason" TEXT NOT NULL,
  "request_id" UUID NOT NULL,
  "checksum" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rule_change_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "soft_check_result_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL,
  "partner_org_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "source_type" "SoftCheckSourceType" NOT NULL,
  "source_id" UUID,
  "borrower_hash" TEXT NOT NULL,
  "input_hash" TEXT NOT NULL,
  "normalized_input" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "rule_trace" JSONB NOT NULL,
  "rule_set_ids" UUID[] NOT NULL,
  "eligibility_status" "SoftCheckEligibilityStatus" NOT NULL,
  "confidence_tier" "SoftCheckConfidenceTier" NOT NULL,
  "schema_version" TEXT NOT NULL,
  "engine_version" TEXT NOT NULL,
  "consent_notice_version" TEXT NOT NULL,
  "bureau_pulled" BOOLEAN NOT NULL DEFAULT false,
  "retention_policy_code" TEXT NOT NULL,
  "retention_until" TIMESTAMP(3) NOT NULL,
  "checksum" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "soft_check_result_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "soft_check_result_logs_no_bureau_check" CHECK ("bureau_pulled" = false)
);

CREATE INDEX "rule_change_audit_logs_entity_type_entity_id_idx"
  ON "rule_change_audit_logs"("entity_type", "entity_id");
CREATE INDEX "rule_change_audit_logs_actor_user_id_created_at_idx"
  ON "rule_change_audit_logs"("actor_user_id", "created_at" DESC);
CREATE UNIQUE INDEX "soft_check_result_logs_partner_org_id_request_id_key"
  ON "soft_check_result_logs"("partner_org_id", "request_id");
CREATE INDEX "soft_check_result_logs_partner_org_id_created_at_idx"
  ON "soft_check_result_logs"("partner_org_id", "created_at" DESC);
CREATE INDEX "soft_check_result_logs_borrower_hash_created_at_idx"
  ON "soft_check_result_logs"("borrower_hash", "created_at" DESC);

ALTER TABLE "rule_change_audit_logs"
  ADD CONSTRAINT "rule_change_audit_logs_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "soft_check_result_logs"
  ADD CONSTRAINT "soft_check_result_logs_partner_org_id_fkey"
  FOREIGN KEY ("partner_org_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "soft_check_result_logs"
  ADD CONSTRAINT "soft_check_result_logs_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_soft_check_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Soft-check audit records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rule_change_audit_no_update
  BEFORE UPDATE OR DELETE ON "rule_change_audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_soft_check_audit_mutation();

CREATE TRIGGER soft_check_result_no_update
  BEFORE UPDATE OR DELETE ON "soft_check_result_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_soft_check_audit_mutation();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT INSERT, SELECT ON "soft_check_result_logs" TO app_user;
    GRANT INSERT, SELECT ON "rule_change_audit_logs" TO app_user;
  END IF;
END;
$$;

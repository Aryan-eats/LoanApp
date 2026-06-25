CREATE TYPE "EligibilityRuleSetStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'RETIRED');
CREATE TYPE "EligibilityRuleOperator" AS ENUM ('REQUIRED', 'EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN', 'IN', 'NOT_IN');
CREATE TYPE "EligibilityRuleSeverity" AS ENUM ('HARD_FAIL', 'REFER', 'WARNING');
CREATE TYPE "EligibilityRegulatoryClass" AS ENUM ('RBI_REGULATORY', 'INDUSTRY_CONSENSUS', 'LENDER_VARIABLE');
CREATE TYPE "EligibilityOverrideMode" AS ENUM ('REPLACE', 'DISABLE', 'TIGHTEN', 'RELAX');

CREATE TABLE "loan_products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "input_schema_version" TEXT NOT NULL DEFAULT '2.0',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retired_at" TIMESTAMP(3),
  CONSTRAINT "loan_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eligibility_rule_sets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "EligibilityRuleSetStatus" NOT NULL DEFAULT 'DRAFT',
  "effective_from" TIMESTAMP(3),
  "effective_to" TIMESTAMP(3),
  "config_hash" TEXT NOT NULL,
  "created_by" UUID NOT NULL,
  "approved_by" UUID,
  "activated_by" UUID,
  "change_reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approved_at" TIMESTAMP(3),
  "activated_at" TIMESTAMP(3),
  CONSTRAINT "eligibility_rule_sets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "base_rule_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rule_set_id" UUID NOT NULL,
  "rule_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "field_path" TEXT NOT NULL,
  "operator" "EligibilityRuleOperator" NOT NULL,
  "threshold" JSONB NOT NULL,
  "conditions" JSONB,
  "employment_scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "severity" "EligibilityRuleSeverity" NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "regulatory_class" "EligibilityRegulatoryClass" NOT NULL,
  "confidence_weight" DECIMAL(6,3) NOT NULL DEFAULT 1,
  "reason_template" TEXT,
  "suggestion_template" TEXT,
  "source_reference" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "base_rule_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lender_rule_overrides" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rule_set_id" UUID NOT NULL,
  "bank_id" UUID NOT NULL,
  "base_rule_id" UUID,
  "rule_code" TEXT NOT NULL,
  "override_mode" "EligibilityOverrideMode" NOT NULL,
  "operator" "EligibilityRuleOperator" NOT NULL,
  "threshold" JSONB NOT NULL,
  "conditions" JSONB,
  "employment_scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "severity" "EligibilityRuleSeverity" NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "regulatory_class" "EligibilityRegulatoryClass" NOT NULL,
  "confidence_weight" DECIMAL(6,3) NOT NULL DEFAULT 1,
  "reason_template" TEXT,
  "suggestion_template" TEXT,
  "approved_by" UUID NOT NULL,
  "approved_at" TIMESTAMP(3) NOT NULL,
  "change_reason" TEXT NOT NULL,
  CONSTRAINT "lender_rule_overrides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lender_rule_overrides_regulatory_check"
    CHECK (NOT ("regulatory_class" = 'RBI_REGULATORY' AND "override_mode" IN ('DISABLE', 'RELAX')))
);

CREATE TABLE "product_lender_eligibility" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "bank_id" UUID NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "ticket_min" DECIMAL(15,2) NOT NULL,
  "ticket_max" DECIMAL(15,2) NOT NULL,
  "rate_min" DECIMAL(7,4) NOT NULL,
  "rate_max" DECIMAL(7,4) NOT NULL,
  "tenure_min_months" INTEGER NOT NULL,
  "tenure_max_months" INTEGER NOT NULL,
  "employment_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "property_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_to" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "product_lender_eligibility_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_lender_ticket_check" CHECK ("ticket_min" > 0 AND "ticket_max" >= "ticket_min"),
  CONSTRAINT "product_lender_rate_check" CHECK ("rate_min" >= 0 AND "rate_max" >= "rate_min"),
  CONSTRAINT "product_lender_tenure_check" CHECK ("tenure_min_months" > 0 AND "tenure_max_months" >= "tenure_min_months")
);

CREATE UNIQUE INDEX "loan_products_code_key" ON "loan_products"("code");
CREATE INDEX "loan_products_active_idx" ON "loan_products"("active");
CREATE UNIQUE INDEX "eligibility_rule_sets_product_id_version_key" ON "eligibility_rule_sets"("product_id", "version");
CREATE INDEX "eligibility_rule_sets_product_id_status_idx" ON "eligibility_rule_sets"("product_id", "status");
CREATE UNIQUE INDEX "eligibility_rule_sets_one_active_per_product"
  ON "eligibility_rule_sets"("product_id") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "base_rule_definitions_scope_key"
  ON "base_rule_definitions"("rule_set_id", "rule_code", "employment_scopes");
CREATE INDEX "base_rule_definitions_rule_set_id_priority_idx" ON "base_rule_definitions"("rule_set_id", "priority");
CREATE UNIQUE INDEX "lender_rule_overrides_scope_key"
  ON "lender_rule_overrides"("rule_set_id", "bank_id", "rule_code", "employment_scopes");
CREATE INDEX "lender_rule_overrides_bank_id_rule_set_id_idx" ON "lender_rule_overrides"("bank_id", "rule_set_id");
CREATE UNIQUE INDEX "product_lender_eligibility_period_key"
  ON "product_lender_eligibility"("product_id", "bank_id", "effective_from");
CREATE INDEX "product_lender_eligibility_product_id_active_idx" ON "product_lender_eligibility"("product_id", "active");
CREATE INDEX "product_lender_eligibility_bank_id_active_idx" ON "product_lender_eligibility"("bank_id", "active");

ALTER TABLE "eligibility_rule_sets"
  ADD CONSTRAINT "eligibility_rule_sets_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "loan_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "base_rule_definitions"
  ADD CONSTRAINT "base_rule_definitions_rule_set_id_fkey"
  FOREIGN KEY ("rule_set_id") REFERENCES "eligibility_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lender_rule_overrides"
  ADD CONSTRAINT "lender_rule_overrides_rule_set_id_fkey"
  FOREIGN KEY ("rule_set_id") REFERENCES "eligibility_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lender_rule_overrides"
  ADD CONSTRAINT "lender_rule_overrides_bank_id_fkey"
  FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lender_rule_overrides"
  ADD CONSTRAINT "lender_rule_overrides_base_rule_id_fkey"
  FOREIGN KEY ("base_rule_id") REFERENCES "base_rule_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_lender_eligibility"
  ADD CONSTRAINT "product_lender_eligibility_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "loan_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_lender_eligibility"
  ADD CONSTRAINT "product_lender_eligibility_bank_id_fkey"
  FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

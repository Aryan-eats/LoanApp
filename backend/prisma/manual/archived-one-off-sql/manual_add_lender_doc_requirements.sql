-- Safe, additive migration: adds lender_doc_requirements table.
-- Does NOT touch any existing tables or data.

CREATE TABLE IF NOT EXISTS "lender_doc_requirements" (
  "id"               TEXT          NOT NULL,
  "lender_code"      TEXT          NOT NULL,
  "lender_name"      TEXT          NOT NULL,
  "loan_code"        TEXT          NOT NULL,
  "doc_id"           TEXT          NOT NULL,
  "doc_name"         TEXT          NOT NULL,
  "description"      TEXT,
  "mandatory"        BOOLEAN       NOT NULL DEFAULT TRUE,
  "accepted_formats" TEXT[]        NOT NULL,
  "max_size_mb"      INTEGER       NOT NULL DEFAULT 5,
  "sort_order"       INTEGER       NOT NULL DEFAULT 0,
  "created_by"       TEXT,
  "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "lender_doc_requirements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lender_doc_requirements_lender_code_loan_code_doc_id_key"
    UNIQUE ("lender_code", "loan_code", "doc_id")
);

CREATE INDEX IF NOT EXISTS "lender_doc_requirements_lender_code_idx"
  ON "lender_doc_requirements" ("lender_code");

CREATE INDEX IF NOT EXISTS "lender_doc_requirements_lender_code_loan_code_idx"
  ON "lender_doc_requirements" ("lender_code", "loan_code");

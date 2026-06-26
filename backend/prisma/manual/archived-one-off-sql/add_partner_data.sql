-- Create LocalLeadStatus enum (skip if already exists)
DO $$ BEGIN
  CREATE TYPE "LocalLeadStatus" AS ENUM ('new', 'contacted', 'docs_collected', 'processing', 'approved', 'rejected', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create partner_data table
CREATE TABLE IF NOT EXISTS "partner_data" (
    "id"               TEXT           NOT NULL,
    "partner_id"       TEXT           NOT NULL,
    "local_status"     "LocalLeadStatus" NOT NULL DEFAULT 'new',
    "notes"            TEXT,
    "full_name"        TEXT           NOT NULL,
    "phone"            TEXT           NOT NULL,
    "email"            TEXT,
    "date_of_birth"    TEXT,
    "gender"           TEXT,
    "pan_number"       TEXT,
    "employment_type"  TEXT,
    "monthly_income"   DECIMAL(15, 2),
    "company_name"     TEXT,
    "designation"      TEXT,
    "work_experience"  TEXT,
    "city"             TEXT,
    "pincode"          TEXT,
    "state"            TEXT,
    "current_address"  TEXT,
    "residence_type"   TEXT,
    "loan_category"    TEXT,
    "loan_type"        TEXT           NOT NULL,
    "loan_amount"      DECIMAL(15, 2) NOT NULL,
    "tenure"           INTEGER,
    "loan_purpose"     TEXT,
    "created_at"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_data_pkey" PRIMARY KEY ("id")
);

-- Foreign key to users
DO $$ BEGIN
  ALTER TABLE "partner_data"
    ADD CONSTRAINT "partner_data_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "partner_data_partner_id_idx"                ON "partner_data"("partner_id");
CREATE INDEX IF NOT EXISTS "partner_data_partner_id_local_status_idx"  ON "partner_data"("partner_id", "local_status");
CREATE INDEX IF NOT EXISTS "partner_data_created_at_idx"               ON "partner_data"("created_at" DESC);

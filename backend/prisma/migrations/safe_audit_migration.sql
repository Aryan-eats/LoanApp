-- Safe Additive Migration: Audit Log Entity Tracking + Severity + Checksum
-- This migration ONLY adds new columns and enum values.
-- It does NOT drop, rename, or modify any existing data.
-- All new columns are nullable or have defaults, so existing rows are unaffected.

-- ============================================================
-- Step 1: Add new enum values to AuditEventType
-- Using IF NOT EXISTS pattern to be idempotent (safe to re-run).
-- ============================================================

DO $$
BEGIN
  -- Lead lifecycle
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LEAD_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_CREATED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LEAD_UPDATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_UPDATED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LEAD_STATUS_CHANGED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_STATUS_CHANGED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LEAD_DELETED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_DELETED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LEAD_ASSIGNED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_ASSIGNED';
  END IF;

  -- Documents
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DOCUMENT_UPLOADED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_UPLOADED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DOCUMENT_VIEWED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_VIEWED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DOCUMENT_DOWNLOADED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_DOWNLOADED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DOCUMENT_VERIFIED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_VERIFIED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DOCUMENT_REJECTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_REJECTED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DOCUMENT_DELETED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_DELETED';
  END IF;

  -- Partners
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PARTNER_UPDATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_UPDATED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PARTNER_APPROVED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_APPROVED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PARTNER_SUSPENDED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_SUSPENDED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PARTNER_KYC_UPDATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_KYC_UPDATED';
  END IF;

  -- Financials
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'COMMISSION_CALCULATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'COMMISSION_CALCULATED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'COMMISSION_PAID' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'COMMISSION_PAID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'COMMISSION_RATE_CHANGED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'COMMISSION_RATE_CHANGED';
  END IF;

  -- Consent & Data Rights
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONSENT_GIVEN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'CONSENT_GIVEN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONSENT_WITHDRAWN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'CONSENT_WITHDRAWN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DATA_DELETION_REQUEST' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'DATA_DELETION_REQUEST';
  END IF;

  -- Admin
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN_ROLE_CHANGED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'ADMIN_ROLE_CHANGED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN_USER_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'ADMIN_USER_CREATED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN_USER_DELETED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'ADMIN_USER_DELETED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BULK_EXPORT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'BULK_EXPORT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PII_ACCESS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'PII_ACCESS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BANK_UPDATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'BANK_UPDATED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BANK_STATUS_CHANGED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditEventType')) THEN
    ALTER TYPE "AuditEventType" ADD VALUE 'BANK_STATUS_CHANGED';
  END IF;
END $$;

-- ============================================================
-- Step 2: Add new columns to audit_logs table (IF NOT EXISTS)
-- All columns are nullable or have defaults — existing rows stay intact.
-- ============================================================

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_type" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "severity" TEXT NOT NULL DEFAULT 'LOW';
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "checksum" TEXT;

-- ============================================================
-- Step 3: Add indexes for new columns
-- Using IF NOT EXISTS via CREATE INDEX ... IF NOT EXISTS (PG 9.5+)
-- ============================================================

CREATE INDEX IF NOT EXISTS "audit_logs_entity_id_entity_type_idx" ON "audit_logs" ("entity_id", "entity_type");
CREATE INDEX IF NOT EXISTS "audit_logs_severity_idx" ON "audit_logs" ("severity");

-- ============================================================
-- Step 4: Backfill severity for existing rows (set all old logs to MEDIUM)
-- ============================================================

UPDATE "audit_logs" SET "severity" = 'MEDIUM' WHERE "severity" = 'LOW' AND "entity_id" IS NULL;

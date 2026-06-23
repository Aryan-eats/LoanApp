-- CreateEnum
CREATE TYPE "LocalLeadStatus" AS ENUM ('new', 'contacted', 'docs_pending', 'docs_collected', 'processing', 'approved', 'rejected', 'closed');

-- CreateEnum
CREATE TYPE "PartnerOrgStatus" AS ENUM ('active', 'suspended', 'deactivated');

-- CreateEnum
CREATE TYPE "PartnerUserRole" AS ENUM ('admin', 'agent', 'viewer');

-- CreateEnum
CREATE TYPE "BankStatus" AS ENUM ('active', 'inactive');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'OTP_SEND_FAILED';
ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_UPDATED';
ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_STATUS_CHANGED';
ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_DELETED';
ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_ASSIGNED';
ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_UPLOADED';
ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_VIEWED';
ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_DOWNLOADED';
ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_VERIFIED';
ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_REJECTED';
ALTER TYPE "AuditEventType" ADD VALUE 'DOCUMENT_DELETED';
ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_UPDATED';
ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_APPROVED';
ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_SUSPENDED';
ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_KYC_UPDATED';
ALTER TYPE "AuditEventType" ADD VALUE 'COMMISSION_CALCULATED';
ALTER TYPE "AuditEventType" ADD VALUE 'COMMISSION_PAID';
ALTER TYPE "AuditEventType" ADD VALUE 'COMMISSION_RATE_CHANGED';
ALTER TYPE "AuditEventType" ADD VALUE 'CONSENT_GIVEN';
ALTER TYPE "AuditEventType" ADD VALUE 'CONSENT_WITHDRAWN';
ALTER TYPE "AuditEventType" ADD VALUE 'DATA_DELETION_REQUEST';
ALTER TYPE "AuditEventType" ADD VALUE 'ADMIN_ROLE_CHANGED';
ALTER TYPE "AuditEventType" ADD VALUE 'ADMIN_USER_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'ADMIN_USER_DELETED';
ALTER TYPE "AuditEventType" ADD VALUE 'BULK_EXPORT';
ALTER TYPE "AuditEventType" ADD VALUE 'PII_ACCESS';
ALTER TYPE "AuditEventType" ADD VALUE 'BANK_UPDATED';
ALTER TYPE "AuditEventType" ADD VALUE 'BANK_STATUS_CHANGED';
ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_ORG_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_USER_ADDED';
ALTER TYPE "AuditEventType" ADD VALUE 'PARTNER_USER_REMOVED';
ALTER TYPE "AuditEventType" ADD VALUE 'LEAD_SUBMITTED_TO_GPS';
ALTER TYPE "AuditEventType" ADD VALUE 'SUBMISSION_STATUS_CHANGED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'super_admin';
ALTER TYPE "UserRole" ADD VALUE 'manager';
ALTER TYPE "UserRole" ADD VALUE 'agent';
ALTER TYPE "UserRole" ADD VALUE 'viewer';

-- DropForeignKey
ALTER TABLE "active_sessions" DROP CONSTRAINT "active_sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "lead_documents" DROP CONSTRAINT "lead_documents_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "lead_timeline" DROP CONSTRAINT "lead_timeline_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_partner_id_fkey";

-- DropForeignKey
ALTER TABLE "password_history" DROP CONSTRAINT "password_history_user_id_fkey";

-- AlterTable
ALTER TABLE "active_sessions" DROP CONSTRAINT "active_sessions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "active_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_pkey",
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "entity_id" TEXT,
ADD COLUMN     "entity_type" TEXT,
ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'LOW',
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID,
ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "lead_documents" DROP CONSTRAINT "lead_documents_pkey",
ADD COLUMN     "mime_type" TEXT,
ADD COLUMN     "r2_object_key" TEXT,
ADD COLUMN     "uploaded_by" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "lead_id",
ADD COLUMN     "lead_id" UUID NOT NULL,
ADD CONSTRAINT "lead_documents_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "lead_timeline" DROP CONSTRAINT "lead_timeline_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "lead_id",
ADD COLUMN     "lead_id" UUID NOT NULL,
ADD CONSTRAINT "lead_timeline_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "leads" DROP CONSTRAINT "leads_pkey",
ADD COLUMN     "bank_code" TEXT,
ADD COLUMN     "encryption_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "partner_org_id" UUID,
ADD COLUMN     "source_partner_data_id" UUID,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "client_email" DROP NOT NULL,
DROP COLUMN "partner_id",
ADD COLUMN     "partner_id" UUID,
ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "password_history" DROP CONSTRAINT "password_history_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "password_history_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "otp_hash",
ADD COLUMN     "encryption_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otp" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "role_permissions" (
    "role" "UserRole" NOT NULL,
    "permissions" JSONB NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "partner_type" TEXT NOT NULL DEFAULT 'freelancer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "owner_user_id" UUID NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "business_name" TEXT,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_users" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_events" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "partner_org_id" UUID,
    "old_status" TEXT,
    "new_status" TEXT NOT NULL,
    "changed_by" UUID,
    "change_source" TEXT NOT NULL DEFAULT 'manual',
    "note" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_upload_tokens" (
    "id" UUID NOT NULL,
    "token" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_upload_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_client_document_upload_tokens" (
    "id" UUID NOT NULL,
    "token" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "partner_data_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_client_document_upload_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "otp_hash" TEXT,
    "otp_expires_at" TIMESTAMP(3) NOT NULL,
    "verification_token" TEXT,
    "verification_token_expires" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lender_doc_requirements" (
    "id" UUID NOT NULL,
    "lender_code" TEXT NOT NULL,
    "lender_name" TEXT NOT NULL,
    "loan_code" TEXT NOT NULL,
    "doc_id" TEXT NOT NULL,
    "doc_name" TEXT NOT NULL,
    "description" TEXT,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "accepted_formats" TEXT[],
    "max_size_mb" INTEGER NOT NULL DEFAULT 5,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lender_doc_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "logo" TEXT,
    "status" "BankStatus" NOT NULL DEFAULT 'active',
    "supported_loan_types" TEXT[],
    "interest_rate_min" DECIMAL(5,2) NOT NULL,
    "interest_rate_max" DECIMAL(5,2) NOT NULL,
    "processing_fee" TEXT NOT NULL,
    "max_tenure" INTEGER NOT NULL,
    "min_amount" DECIMAL(15,2) NOT NULL,
    "max_amount" DECIMAL(15,2) NOT NULL,
    "processing_time" TEXT NOT NULL,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[],
    "avg_tat" INTEGER NOT NULL,
    "active_leads" INTEGER NOT NULL DEFAULT 0,
    "approval_rate" INTEGER NOT NULL DEFAULT 0,
    "total_disbursed" TEXT NOT NULL DEFAULT '₹0',
    "contact_person" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_commission_rates" (
    "id" UUID NOT NULL,
    "bank_id" UUID NOT NULL,
    "loan_type" TEXT NOT NULL,
    "partner_commission" DECIMAL(5,2) NOT NULL,
    "interest_rate" TEXT,
    "max_amount" DECIMAL(15,2),
    "min_amount" DECIMAL(15,2),
    "max_tenure" INTEGER,

    CONSTRAINT "bank_commission_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_data" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "partner_org_id" UUID NOT NULL,
    "local_status" "LocalLeadStatus" NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "date_of_birth" TEXT,
    "gender" TEXT,
    "pan_number" TEXT,
    "employment_type" TEXT,
    "monthly_income" DECIMAL(15,2),
    "company_name" TEXT,
    "designation" TEXT,
    "work_experience" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "state" TEXT,
    "current_address" TEXT,
    "residence_type" TEXT,
    "loan_category" TEXT,
    "loan_type" TEXT NOT NULL,
    "loan_amount" DECIMAL(15,2) NOT NULL,
    "tenure" INTEGER,
    "loan_purpose" TEXT,
    "preferred_bank" TEXT,
    "encryption_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_grants" (
    "id" UUID NOT NULL,
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

    CONSTRAINT "consent_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_data_documents" (
    "id" UUID NOT NULL,
    "partner_data_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "accepted_formats" TEXT[] DEFAULT ARRAY['pdf', 'jpg', 'png']::TEXT[],
    "max_size_mb" INTEGER NOT NULL DEFAULT 10,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "file_name" TEXT NOT NULL DEFAULT '',
    "file_size" TEXT,
    "file_url" TEXT,
    "r2_object_key" TEXT,
    "mime_type" TEXT,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,

    CONSTRAINT "partner_data_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partners_owner_user_id_idx" ON "partners"("owner_user_id");

-- CreateIndex
CREATE INDEX "partners_status_idx" ON "partners"("status");

-- CreateIndex
CREATE INDEX "partner_users_partner_id_idx" ON "partner_users"("partner_id");

-- CreateIndex
CREATE INDEX "partner_users_user_id_idx" ON "partner_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_users_partner_id_user_id_key" ON "partner_users"("partner_id", "user_id");

-- CreateIndex
CREATE INDEX "submission_events_lead_id_created_at_idx" ON "submission_events"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "submission_events_partner_org_id_idx" ON "submission_events"("partner_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_upload_tokens_token_key" ON "document_upload_tokens"("token");

-- CreateIndex
CREATE INDEX "document_upload_tokens_token_idx" ON "document_upload_tokens"("token");

-- CreateIndex
CREATE INDEX "document_upload_tokens_document_id_idx" ON "document_upload_tokens"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "stored_client_document_upload_tokens_token_key" ON "stored_client_document_upload_tokens"("token");

-- CreateIndex
CREATE INDEX "stored_client_document_upload_tokens_token_idx" ON "stored_client_document_upload_tokens"("token");

-- CreateIndex
CREATE INDEX "stored_client_document_upload_tokens_document_id_idx" ON "stored_client_document_upload_tokens"("document_id");

-- CreateIndex
CREATE INDEX "stored_client_document_upload_tokens_partner_data_id_idx" ON "stored_client_document_upload_tokens"("partner_data_id");

-- CreateIndex
CREATE UNIQUE INDEX "otp_challenges_phone_key" ON "otp_challenges"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "otp_challenges_verification_token_key" ON "otp_challenges"("verification_token");

-- CreateIndex
CREATE INDEX "otp_challenges_phone_idx" ON "otp_challenges"("phone");

-- CreateIndex
CREATE INDEX "lender_doc_requirements_lender_code_idx" ON "lender_doc_requirements"("lender_code");

-- CreateIndex
CREATE INDEX "lender_doc_requirements_lender_code_loan_code_idx" ON "lender_doc_requirements"("lender_code", "loan_code");

-- CreateIndex
CREATE UNIQUE INDEX "lender_doc_requirements_lender_code_loan_code_doc_id_key" ON "lender_doc_requirements"("lender_code", "loan_code", "doc_id");

-- CreateIndex
CREATE UNIQUE INDEX "banks_code_key" ON "banks"("code");

-- CreateIndex
CREATE INDEX "banks_status_idx" ON "banks"("status");

-- CreateIndex
CREATE INDEX "bank_commission_rates_bank_id_idx" ON "bank_commission_rates"("bank_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_commission_rates_bank_id_loan_type_key" ON "bank_commission_rates"("bank_id", "loan_type");

-- CreateIndex
CREATE INDEX "partner_data_partner_id_idx" ON "partner_data"("partner_id");

-- CreateIndex
CREATE INDEX "partner_data_partner_id_local_status_idx" ON "partner_data"("partner_id", "local_status");

-- CreateIndex
CREATE INDEX "partner_data_created_at_idx" ON "partner_data"("created_at" DESC);

-- CreateIndex
CREATE INDEX "partner_data_partner_org_id_idx" ON "partner_data"("partner_org_id");

-- CreateIndex
CREATE INDEX "partner_data_partner_org_id_local_status_idx" ON "partner_data"("partner_org_id", "local_status");

-- CreateIndex
CREATE INDEX "consent_grants_lead_id_idx" ON "consent_grants"("lead_id");

-- CreateIndex
CREATE INDEX "consent_grants_partner_data_id_idx" ON "consent_grants"("partner_data_id");

-- CreateIndex
CREATE INDEX "consent_grants_partner_id_granted_at_idx" ON "consent_grants"("partner_id", "granted_at" DESC);

-- CreateIndex
CREATE INDEX "consent_grants_granted_to_revoked_at_idx" ON "consent_grants"("granted_to", "revoked_at");

-- CreateIndex
CREATE INDEX "partner_data_documents_partner_data_id_idx" ON "partner_data_documents"("partner_data_id");

-- CreateIndex
CREATE INDEX "active_sessions_user_id_idx" ON "active_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "active_sessions_user_id_device_fingerprint_key" ON "active_sessions"("user_id", "device_fingerprint");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_entity_type_idx" ON "audit_logs"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

-- CreateIndex
CREATE INDEX "lead_documents_lead_id_idx" ON "lead_documents"("lead_id");

-- CreateIndex
CREATE INDEX "lead_timeline_lead_id_idx" ON "lead_timeline"("lead_id");

-- CreateIndex
CREATE INDEX "leads_partner_id_idx" ON "leads"("partner_id");

-- CreateIndex
CREATE INDEX "leads_partner_id_status_idx" ON "leads"("partner_id", "status");

-- CreateIndex
CREATE INDEX "leads_partner_org_id_idx" ON "leads"("partner_org_id");

-- CreateIndex
CREATE INDEX "leads_partner_org_id_status_idx" ON "leads"("partner_org_id", "status");

-- CreateIndex
CREATE INDEX "leads_source_partner_data_id_idx" ON "leads"("source_partner_data_id");

-- CreateIndex
CREATE INDEX "password_history_user_id_idx" ON "password_history"("user_id");

-- CreateIndex
CREATE INDEX "password_history_user_id_changed_at_idx" ON "password_history"("user_id", "changed_at");

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_partner_org_id_fkey" FOREIGN KEY ("partner_org_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_partner_org_id_fkey" FOREIGN KEY ("partner_org_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_source_partner_data_id_fkey" FOREIGN KEY ("source_partner_data_id") REFERENCES "partner_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_documents" ADD CONSTRAINT "lead_documents_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_upload_tokens" ADD CONSTRAINT "document_upload_tokens_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "lead_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_client_document_upload_tokens" ADD CONSTRAINT "stored_client_document_upload_tokens_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "partner_data_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_client_document_upload_tokens" ADD CONSTRAINT "stored_client_document_upload_tokens_partner_data_id_fkey" FOREIGN KEY ("partner_data_id") REFERENCES "partner_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_timeline" ADD CONSTRAINT "lead_timeline_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_commission_rates" ADD CONSTRAINT "bank_commission_rates_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_data" ADD CONSTRAINT "partner_data_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_data" ADD CONSTRAINT "partner_data_partner_org_id_fkey" FOREIGN KEY ("partner_org_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_partner_data_id_fkey" FOREIGN KEY ("partner_data_id") REFERENCES "partner_data"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_data_documents" ADD CONSTRAINT "partner_data_documents_partner_data_id_fkey" FOREIGN KEY ("partner_data_id") REFERENCES "partner_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;



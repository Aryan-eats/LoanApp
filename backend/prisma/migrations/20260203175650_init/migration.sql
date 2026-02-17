-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'partner');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('freelancer', 'used_car_dealer', 'property_dealer', 'builder', 'sub_dsa');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('draft', 'submitted', 'docs_pending', 'docs_uploaded', 'bank_processing', 'approved', 'disbursed', 'rejected');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('salaried', 'self_employed', 'business_owner', 'professional');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('pending', 'uploaded', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('pending', 'processing', 'paid');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'REGISTER', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS', 'PASSWORD_CHANGE', 'OTP_SENT', 'OTP_VERIFIED', 'ACCOUNT_LOCKED', 'TOKEN_REFRESH', 'SUSPICIOUS_ACTIVITY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'partner',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login" TIMESTAMP(3),
    "reset_password_token" TEXT,
    "reset_password_expires" TIMESTAMP(3),
    "otp_hash" TEXT,
    "otp_expires" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "lock_until" TIMESTAMP(3),
    "refresh_token" TEXT,
    "refresh_token_expires" TIMESTAMP(3),
    "partner_type" "PartnerType",
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "aadhaar_number" TEXT,
    "business_name" TEXT,
    "business_address" TEXT,
    "years_in_operation" TEXT,
    "pan_number" TEXT,
    "gst_number" TEXT,
    "has_experience" TEXT,
    "expected_leads" TEXT,
    "account_holder_name" TEXT,
    "bank_name" TEXT,
    "account_number" TEXT,
    "ifsc_code" TEXT,
    "upi_id" TEXT,
    "consent_data_share" BOOLEAN NOT NULL DEFAULT false,
    "consent_commission" BOOLEAN NOT NULL DEFAULT false,
    "declaration_not_employed" BOOLEAN NOT NULL DEFAULT false,
    "consent_privacy_policy" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_status" "OnboardingStatus" DEFAULT 'pending',
    "onboarding_completed_at" TIMESTAMP(3),
    "kyc_status" "KycStatus" DEFAULT 'pending',
    "kyc_rejection_reason" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_fingerprint" TEXT NOT NULL,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    "ip" TEXT,

    CONSTRAINT "active_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "client_full_name" TEXT NOT NULL,
    "client_phone" TEXT NOT NULL,
    "client_email" TEXT NOT NULL,
    "client_date_of_birth" TEXT,
    "client_pan_number" TEXT,
    "client_aadhaar" TEXT,
    "client_employment" "EmploymentType",
    "client_income" DECIMAL(15,2),
    "client_company" TEXT,
    "client_experience" INTEGER,
    "client_city" TEXT,
    "client_pincode" TEXT,
    "loan_type" TEXT NOT NULL,
    "loan_amount" DECIMAL(15,2) NOT NULL,
    "tenure" INTEGER,
    "sanctioned_amount" DECIMAL(15,2),
    "disbursed_amount" DECIMAL(15,2),
    "interest_rate" DECIMAL(5,2),
    "emi" DECIMAL(15,2),
    "status" "LeadStatus" NOT NULL DEFAULT 'submitted',
    "bank_assigned" TEXT,
    "bank_logo" TEXT,
    "preferred_bank" TEXT,
    "partner_id" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "is_eligible" BOOLEAN,
    "max_loan_amount" DECIMAL(15,2),
    "min_loan_amount" DECIMAL(15,2),
    "estimated_emi" DECIMAL(15,2),
    "eligibility_checked_at" TIMESTAMP(3),
    "commission_amount" DECIMAL(15,2),
    "commission_rate" DECIMAL(5,2),
    "commission_status" "CommissionStatus",
    "commission_paid_at" TIMESTAMP(3),
    "internal_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_documents" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" TEXT,
    "file_url" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,

    CONSTRAINT "lead_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_timeline" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "lead_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "event" "AuditEventType" NOT NULL,
    "user_id" TEXT,
    "hashed_email" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "device_fingerprint" TEXT,
    "metadata" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "password_history_user_id_idx" ON "password_history"("user_id");

-- CreateIndex
CREATE INDEX "password_history_user_id_changed_at_idx" ON "password_history"("user_id", "changed_at");

-- CreateIndex
CREATE INDEX "active_sessions_user_id_idx" ON "active_sessions"("user_id");

-- CreateIndex
CREATE INDEX "active_sessions_device_fingerprint_idx" ON "active_sessions"("device_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "active_sessions_user_id_device_fingerprint_key" ON "active_sessions"("user_id", "device_fingerprint");

-- CreateIndex
CREATE INDEX "leads_partner_id_idx" ON "leads"("partner_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_partner_id_status_idx" ON "leads"("partner_id", "status");

-- CreateIndex
CREATE INDEX "leads_client_phone_idx" ON "leads"("client_phone");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at" DESC);

-- CreateIndex
CREATE INDEX "lead_documents_lead_id_idx" ON "lead_documents"("lead_id");

-- CreateIndex
CREATE INDEX "lead_timeline_lead_id_idx" ON "lead_timeline"("lead_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_event_created_at_idx" ON "audit_logs"("event", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_ip_created_at_idx" ON "audit_logs"("ip", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_documents" ADD CONSTRAINT "lead_documents_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_timeline" ADD CONSTRAINT "lead_timeline_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

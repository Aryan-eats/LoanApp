CREATE TYPE "OAuthProvider" AS ENUM ('google');

CREATE TABLE "oauth_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "provider" "OAuthProvider" NOT NULL,
  "provider_user_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "oauth_accounts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "oauth_accounts_provider_provider_user_id_key"
  ON "oauth_accounts"("provider", "provider_user_id");

CREATE UNIQUE INDEX "oauth_accounts_provider_user_id_key"
  ON "oauth_accounts"("provider", "user_id");

CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");
CREATE INDEX "oauth_accounts_email_idx" ON "oauth_accounts"("email");

ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'OAUTH_START';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'OAUTH_SUCCESS';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'OAUTH_FAILURE';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'OAUTH_ACCOUNT_LINKED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'OAUTH_ACCOUNT_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'OAUTH_ACCOUNT_LINK_BLOCKED';

DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'super_admin';
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'manager';
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'agent';
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'viewer';
END $$;

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role" "UserRole" PRIMARY KEY,
  "permissions" JSONB NOT NULL,
  "updated_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

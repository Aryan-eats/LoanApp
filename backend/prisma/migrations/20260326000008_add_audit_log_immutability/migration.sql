-- Audit Log Immutability Triggers
-- Prevents modification or deletion of audit log records (RBI/IT Act compliance)
-- Run this as a raw SQL migration after the Prisma schema migration.

-- Prevent UPDATE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. Updates and deletes are not permitted on the audit_logs table.';
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_log_no_update'
  ) THEN
    CREATE TRIGGER audit_log_no_update
      BEFORE UPDATE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
  END IF;
END $$;

-- Prevent DELETE on audit_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_log_no_delete'
  ) THEN
    CREATE TRIGGER audit_log_no_delete
      BEFORE DELETE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
  END IF;
END $$;

-- Note: To perform administrative maintenance (e.g. archiving after 5 years),
-- temporarily disable these triggers:
--   ALTER TABLE audit_logs DISABLE TRIGGER audit_log_no_update;
--   ALTER TABLE audit_logs DISABLE TRIGGER audit_log_no_delete;
--   -- perform maintenance --
--   ALTER TABLE audit_logs ENABLE TRIGGER audit_log_no_update;
--   ALTER TABLE audit_logs ENABLE TRIGGER audit_log_no_delete;

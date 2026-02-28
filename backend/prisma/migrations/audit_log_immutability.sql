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

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Prevent DELETE on audit_logs
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Note: To perform administrative maintenance (e.g. archiving after 5 years),
-- temporarily disable these triggers:
--   ALTER TABLE audit_logs DISABLE TRIGGER audit_log_no_update;
--   ALTER TABLE audit_logs DISABLE TRIGGER audit_log_no_delete;
--   -- perform maintenance --
--   ALTER TABLE audit_logs ENABLE TRIGGER audit_log_no_update;
--   ALTER TABLE audit_logs ENABLE TRIGGER audit_log_no_delete;

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const backendRoot = path.resolve(__dirname, '../..');
const read = (relativePath: string) => readFileSync(path.join(backendRoot, relativePath), 'utf8');

describe('soft-check immutable audit schema', () => {
  it('models immutable soft-check result logs with tenant idempotency and no bureau pull', () => {
    const schema = read('prisma/schema.prisma');
    const migration = read('prisma/migrations/20260625000001_add_soft_check_result_audit/migration.sql');

    expect(schema).toContain('model SoftCheckResultLog');
    expect(schema).toContain('@@unique([partnerOrgId, requestId])');
    expect(schema).toContain('bureauPulled         Boolean                    @default(false)');
    expect(schema).toContain('retentionPolicyCode  String');
    expect(schema).toContain('retentionUntil       DateTime');
    expect(migration).toContain('CONSTRAINT "soft_check_result_logs_no_bureau_check" CHECK ("bureau_pulled" = false)');
  });

  it('models rule-change audit logs as append-only governance records', () => {
    const schema = read('prisma/schema.prisma');
    const migration = read('prisma/migrations/20260625000001_add_soft_check_result_audit/migration.sql');

    expect(schema).toContain('model RuleChangeAuditLog');
    for (const field of ['beforeValue Json?', 'afterValue  Json?', 'reason      String', 'checksum    String']) {
      expect(schema).toContain(field);
    }
    expect(migration).toContain('CREATE TRIGGER rule_change_audit_no_update');
    expect(migration).toContain('CREATE TRIGGER soft_check_result_no_update');
    expect(migration).toContain('RAISE EXCEPTION \'Soft-check audit records are immutable\'');
  });

  it('limits managed application role access to insert and select when that role exists', () => {
    const migration = read('prisma/migrations/20260625000001_add_soft_check_result_audit/migration.sql');

    expect(migration).toContain("rolname = 'app_user'");
    expect(migration).toContain('GRANT INSERT, SELECT ON "soft_check_result_logs" TO app_user');
    expect(migration).toContain('GRANT INSERT, SELECT ON "rule_change_audit_logs" TO app_user');
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import prisma from '../shared/db/prisma.js';

const backendRoot = path.resolve(__dirname, '../..');
const read = (relativePath: string) => readFileSync(path.join(backendRoot, relativePath), 'utf8');
const uniqueEmail = (): string =>
  `soft-check-audit-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const isSafeDatabaseTarget = (): boolean => {
  const dbUrl = process.env.DATABASE_URL ?? '';
  return process.env.NODE_ENV === 'test'
    && process.env.RUN_DB_TESTS === 'true'
    && ['localhost', '127.0.0.1', 'host.docker.internal', '_test', 'test'].some((marker) => dbUrl.includes(marker));
};
const describeDb = isSafeDatabaseTarget() ? describe : describe.skip;

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

describeDb('soft-check audit database immutability', () => {
  it('rejects UPDATE and DELETE against soft-check audit tables in PostgreSQL', async () => {
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail(),
        password: 'hashed-password',
        firstName: 'Audit',
        lastName: 'Tester',
        role: 'partner',
      },
    });
    const partner = await prisma.partner.create({
      data: {
        name: 'Audit Partner',
        ownerUserId: user.id,
        status: 'active',
        vaultKeyRef: `partner-audit-${Date.now()}`,
      },
    });
    const result = await prisma.softCheckResultLog.create({
      data: {
        requestId: '11111111-1111-4111-8111-111111111111',
        partnerOrgId: partner.id,
        actorUserId: user.id,
        sourceType: 'RAW',
        borrowerHash: 'a'.repeat(64),
        inputHash: 'b'.repeat(64),
        normalizedInput: { productCode: 'personal_loan' },
        result: { eligibilityStatus: 'ELIGIBLE' },
        ruleTrace: [],
        ruleSetIds: ['22222222-2222-4222-8222-222222222222'],
        eligibilityStatus: 'ELIGIBLE',
        confidenceTier: 'STRONG',
        schemaVersion: '2.0',
        engineVersion: 'soft-check-engine-v2',
        consentNoticeVersion: 'soft-check-v1',
        retentionPolicyCode: 'RBI_CREDIT_DECISION_AUDIT_5Y',
        retentionUntil: new Date('2031-01-01T00:00:00.000Z'),
        checksum: 'c'.repeat(64),
      },
    });
    const ruleChange = await prisma.ruleChangeAuditLog.create({
      data: {
        actorUserId: user.id,
        action: 'SUBMIT',
        entityType: 'eligibility_rule_set',
        entityId: '33333333-3333-4333-8333-333333333333',
        reason: 'db immutability test',
        requestId: '44444444-4444-4444-8444-444444444444',
        checksum: 'd'.repeat(64),
      },
    });

    await expect(
      prisma.$executeRaw`UPDATE soft_check_result_logs SET checksum = ${'changed'} WHERE id = ${result.id}::uuid`
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`DELETE FROM soft_check_result_logs WHERE id = ${result.id}::uuid`
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`UPDATE rule_change_audit_logs SET checksum = ${'changed'} WHERE id = ${ruleChange.id}::uuid`
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`DELETE FROM rule_change_audit_logs WHERE id = ${ruleChange.id}::uuid`
    ).rejects.toThrow();
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const backendRoot = path.resolve(__dirname, '../..');
const read = (relativePath: string) => readFileSync(path.join(backendRoot, relativePath), 'utf8');

describe('soft-check rule schema and seed lifecycle', () => {
  it('keeps Bank as lender master and enforces one active release per product', () => {
    const schema = read('prisma/schema.prisma');
    const migration = read('prisma/migrations/20260625000000_add_soft_check_rule_config/migration.sql');

    expect(schema).toContain('model Bank');
    expect(schema).toContain('eligibilityMatrix  ProductLenderEligibility[]');
    expect(migration).toContain('eligibility_rule_sets_one_active_per_product');
    expect(migration).toContain('WHERE "status" = \'ACTIVE\'');
  });

  it('stores rule governance fields and blocks RBI relax/disable overrides in SQL', () => {
    const migration = read('prisma/migrations/20260625000000_add_soft_check_rule_config/migration.sql');

    for (const column of [
      '"conditions" JSONB',
      '"employment_scopes" TEXT[]',
      '"severity" "EligibilityRuleSeverity"',
      '"regulatory_class" "EligibilityRegulatoryClass"',
      '"reason_template" TEXT',
      '"suggestion_template" TEXT',
      '"source_reference" TEXT',
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain('"regulatory_class" = \'RBI_REGULATORY\'');
    expect(migration).toContain('"override_mode" IN (\'DISABLE\', \'RELAX\')');
  });

  it('seeds five DRAFT products without same-user approval or lender matrix overwrites', () => {
    const seed = read('scripts/seedSoftCheckRules.ts');

    for (const code of ['home_loan', 'lap', 'personal_loan', 'business_loan', 'gold_loan']) {
      expect(seed).toContain(`code: '${code}'`);
    }
    expect(seed).toContain("status: 'DRAFT'");
    expect(seed).not.toContain("status: 'ACTIVE'");
    expect(seed).not.toContain('approvedBy: actor.id');
    expect(seed).not.toContain('activatedBy: actor.id');
    expect(seed).toContain('if (existing) continue;');
  });
});

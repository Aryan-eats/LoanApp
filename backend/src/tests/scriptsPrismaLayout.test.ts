import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const backendRoot = path.resolve(__dirname, '../..');

const exists = (relativePath: string) => existsSync(path.join(backendRoot, relativePath));

const readJson = (relativePath: string) =>
  JSON.parse(readFileSync(path.join(backendRoot, relativePath), 'utf8')) as Record<string, unknown>;

describe('scripts and Prisma layout', () => {
  it('keeps runtime source separate from scripts, seeds, and manual SQL', () => {
    expect(exists('src/scripts')).toBe(false);

    for (const script of [
      'scripts/createAdmin.ts',
      'scripts/createPartner.ts',
      'scripts/get-id.ts',
      'scripts/investigateDb.ts',
      'scripts/listUsers.ts',
      'scripts/print-users.ts',
      'scripts/testDbConnection.ts',
    ]) {
      expect(exists(script), script).toBe(true);
    }

    for (const seed of ['prisma/seeds/seedBanks.ts', 'prisma/seeds/seedDocRequirements.ts']) {
      expect(exists(seed), seed).toBe(true);
    }

    expect(exists('prisma/migrations/audit_log_immutability.sql')).toBe(false);
    expect(exists('prisma/migrations/20260326000008_add_audit_log_immutability/migration.sql')).toBe(true);

    const manualArchive = path.join(backendRoot, 'prisma/manual/archived-one-off-sql');
    expect(readdirSync(manualArchive).sort()).toEqual([
      'README.md',
      'add_partner_data.sql',
      'manual_add_admin_role_permissions.sql',
      'manual_add_bank_code_to_leads.sql',
      'manual_add_lender_doc_requirements.sql',
      'safe_audit_migration.sql',
    ]);

    const packageJson = readJson('package.json');
    const scriptText = JSON.stringify(packageJson.scripts ?? {});
    expect(scriptText).not.toContain('src/scripts');

    const tsconfigScripts = readFileSync(path.join(backendRoot, 'tsconfig.scripts.json'), 'utf8');
    expect(tsconfigScripts).not.toContain('src/scripts');
  });
});

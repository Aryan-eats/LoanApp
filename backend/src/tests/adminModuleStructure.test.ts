import { describe, expect, it } from 'vitest';

describe('admin capability modules', () => {
  it('exposes each admin capability from its owning module', async () => {
    const [admin, audit, users, banks, docs, permissions, matching, auditLogger, loanDocs] =
      await Promise.all([
        import('../modules/admin/admin.controller.js'),
        import('../modules/audit/audit.controller.js'),
        import('../modules/users/users.controller.js'),
        import('../modules/banks/banks.controller.js'),
        import('../modules/doc-requirements/docRequirements.controller.js'),
        import('../modules/users/adminPermissions.service.js'),
        import('../modules/banks/bankMatching.service.js'),
        import('../modules/audit/auditLogger.js'),
        import('../modules/doc-requirements/loanDocsMap.js'),
      ]);

    expect(admin.getStats).toBeTypeOf('function');
    expect(audit.listAuditLogs).toBeTypeOf('function');
    expect(users.listUsers).toBeTypeOf('function');
    expect(banks.listBanks).toBeTypeOf('function');
    expect(docs.listDocRequirements).toBeTypeOf('function');
    expect(permissions.hasRolePermission).toBeTypeOf('function');
    expect(matching.matchLeadOffers).toBeTypeOf('function');
    expect(auditLogger.logAuditEvent).toBeTypeOf('function');
    expect(loanDocs.getRequiredDocTypes).toBeTypeOf('function');
  });
});

# Archived one-off SQL

These files are kept for history only. Their schema changes are already represented by committed Prisma migrations:

- `add_partner_data.sql`
- `manual_add_admin_role_permissions.sql`
- `manual_add_bank_code_to_leads.sql`
- `manual_add_lender_doc_requirements.sql`
- `safe_audit_migration.sql`

Do not run these against a fresh database. Use `prisma migrate deploy` plus explicit seed commands.

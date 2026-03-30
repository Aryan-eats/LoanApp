<!--
Migration discrepancy audit (schema.prisma is source of truth):

1) 20260324000000_multi_tenant_lead_management.sql declared several ID/FK columns as TEXT:
   - partners.id, partners.owner_user_id
   - partner_users.id, partner_users.partner_id, partner_users.user_id
   - partner_data.partner_org_id
   - leads.partner_org_id, leads.source_partner_data_id
   - submission_events.id, submission_events.lead_id, submission_events.partner_org_id, submission_events.changed_by
   schema.prisma requires UUID-backed columns (@db.Uuid).

2) 20260324000000_multi_tenant_lead_management.sql used TEXT-style UUID generation/casts
   (`gen_random_uuid()::TEXT`) and direct TEXT writes for submission_events.changed_by;
   schema.prisma requires UUID values for these columns.

3) RLS policy predicates in 20260324000000_multi_tenant_lead_management.sql compared UUID columns
   against uncast current_setting(...) TEXT values, which conflicts with UUID column types.

4) Session variable naming in migration policies used legacy app.current_partner_id;
   canonical variable is app.current_partner_org_id.

5) Tenant-scoped table stored_client_document_upload_tokens existed in schema.prisma and migration SQL,
   but RLS enablement/policies were missing in both in-progress migration files.
-->

# Migration Audit Notes

All discrepancies above were reconciled in:
- `prisma/migrations/20260324000000_multi_tenant_lead_management.sql`
- `prisma/migrations/20260324000002_sync_current_schema/migration.sql`

Both files are now marked frozen for baseline stability.

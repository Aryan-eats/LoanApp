# Phase 0 Security And Migration Baseline

Recorded: 2026-06-25

This file records the decisions that must remain stable during the backend
structure migration. It does not claim knowledge of environments that were not
queried.

## Migration Inventory

Repository contains nine Prisma migration directories:

1. `20260203175650_init`
2. `20260307000000_add_docs_collected_bank_logged_statuses`
3. `20260318000000_add_preferred_bank_to_partner_data`
4. `20260324000002_sync_current_schema`
5. `20260326000003_add_encryption_version_columns`
6. `20260326000004_make_lead_client_email_nullable`
7. `20260326000005_add_partner_vault_key_ref_and_consent_grants`
8. `20260326000006_add_consent_grants_rls`
9. `20260326000007_make_partner_vault_key_ref_required`

Local database status from `npx prisma migrate status`:

- Migrations 1-7 are applied.
- `20260326000006_add_consent_grants_rls` is not applied.
- `20260326000007_make_partner_vault_key_ref_required` is not applied.

The repository also contains standalone SQL files that Prisma Migrate does not
track:

- `prisma/migrations/audit_log_immutability.sql`
- `prisma/migrations/manual_add_admin_role_permissions.sql`
- `prisma/migrations/manual_add_bank_code_to_leads.sql`
- `prisma/migrations/manual_add_lender_doc_requirements.sql`
- `prisma/migrations/safe_audit_migration.sql`
- `prisma/add_partner_data.sql`

Whether those files were applied cannot be proven from Git or
`_prisma_migrations`. Their state remains **unverified** for local, staging, and
production until each environment is inspected by an operator.

Staging and production Prisma migration state is also **unverified** because no
connection or deployment inventory was supplied.

## Tenant Isolation Decision

Application-layer organization scoping is authoritative during this migration.

- Partner-owned records are scoped by `partnerOrgId`.
- `partnerId` remains the user that created/submitted a record where that audit
  information is needed.
- Legacy leads with a null `partnerOrgId` retain a compatibility fallback to
  their original `partnerId`.
- Tests pin same-organization access and cross-organization denial for leads,
  stored clients, documents, and consent handoff.

## RLS Decision

PostgreSQL RLS is deferred and must not be treated as active protection.

Reasons:

- The local database has not applied
  `20260326000006_add_consent_grants_rls`.
- The policy requires `app.current_partner_org_id`, `app.current_user_id`, and
  `app.current_user_role`.
- Runtime code does not set any of those PostgreSQL session variables.

Do not deploy the RLS migration until one transaction helper sets all three
values and integration tests prove partner and internal-user behavior. If RLS
is abandoned, archive or reverse that migration in the later Prisma cleanup
phase.

## Encryption Decision

The intended policy is explicit service-layer encryption, not an implicit
Prisma extension.

Current verified state:

- `src/config/prisma.ts` installs no encryption extension.
- `src/services/consent.ts` encrypts partner data for GPS India during consent
  handoff.
- `src/utils/fieldEncryption.ts` remains a compatibility bridge and has direct
  unit tests.

Known gap:

- Repository-wide service-layer encryption is not yet proven for every
  `PartnerData` and `Lead` create/update path.

Therefore, do not delete or relocate either encryption implementation during
structural moves. A separate security task must inventory every PII write and
make the selected service-layer policy complete before claiming encryption is
enforced application-wide.

## Auth Session Contract

Controller tests pin these behaviors:

- Refresh validates the stored refresh-token hash and expiry.
- Refresh rotates both the stored refresh token and httpOnly cookie.
- Logout blacklists a presented access token until its expiry.
- Logout clears stored refresh state, removes the active session, and clears
  the refresh cookie.

## Verification

Run from `backend/`:

```powershell
npm.cmd test
npm.cmd run build
```

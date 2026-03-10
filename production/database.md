# Database Schema — Red Flag Analysis

> **Analyzed**: `backend/prisma/schema.prisma`, all migration SQL, and backend query patterns  
> **Date**: 2026-03-10 (re-verified)  
> **Scope**: 14 tables, 7 enums, 40+ audit event types

---

## SUMMARY

- **Total issues found: 37** (🔴 Critical: 3 | 🟠 High: 12 | 🟡 Medium: 15 | 🔵 Low: 7)
- **Top 3 most urgent fixes:**
  1. 🔴 All `TIMESTAMP(3)` columns are timezone-naive — must be `TIMESTAMPTZ`
  2. 🔴 `users` table is a 50+ column god table mixing auth, profile, KYC, banking, and consent
  3. 🔴 `audit_logs` and `lead_timeline` tables have no partitioning strategy — will degrade at scale
- **Verification result:** The current list was not complete. After checking the live Prisma schema, manual SQL, and controller/service query paths, there are additional index, uniqueness, enum-drift, and query-shape issues that should be included before calling the database production-ready.

---

## CAPACITY VERDICT

- **Short answer:** No. The issues already listed are not the only database issues, and those fixes alone are not enough to confidently support `10k` partner-dashboard users plus `5k` website users.
- **Important nuance:** `15k` total users is not a large number for PostgreSQL by itself. The real risk is not user count; it is the shape of the hot queries, audit-log growth, and whether Redis plus proper pooling are enabled in production.
- **Current state after code verification:**
  1. Website traffic is mostly read-heavy and should be manageable if Redis caching is enabled for banks and stats endpoints.
  2. Partner/admin dashboard traffic is the real bottleneck because it relies on `%contains%` searches, offset pagination, repeated counts, and lead lists that do not yet have the right composite indexes.
  3. The backend pool is currently configured with `PG_POOL_MAX=20` by default. That is fine for a small deployment, but it is not enough evidence by itself that the system is ready for multi-instance production traffic.
- **Minimum bar before claiming this scale target is safe:**
```text
- Enable Redis in production and verify cache hit rates on banks/stats/audit counts
- Add pgBouncer or equivalent external connection pooling if running multiple app instances
- Add the missing search/list composite indexes documented below
- Replace repeated audit COUNT scans with a single aggregate query or rollup table
- Load test with realistic lead volume, not just user count
- Run EXPLAIN ANALYZE on partner list, lead list, audit log list, and commission queries after indexing
```

---

## RED FLAGS

### 1. DATA INTEGRITY

**🔴 `leads.partner_id` — Prisma schema says nullable but DB enforces NOT NULL**
- **Location:** `leads.partner_id`
- **Problem:** The Prisma schema declares `partnerId String?` (optional), but the init migration creates the column as `TEXT NOT NULL`. This mismatch means the Prisma client allows `null` in TypeScript code, but the database will reject it at runtime. The `ON DELETE SetNull` in the current Prisma schema is also incompatible with a NOT NULL column — if the referenced partner is deleted, the DB cannot set the column to NULL and will throw.
- **Fix:**
```prisma
-- Option A: Align Prisma to match DB (recommended — partner_id is always set)
partnerId  String   @map("partner_id")
partner    User     @relation(fields: [partnerId], references: [id], onDelete: Restrict)
```

**🟠 Missing CHECK constraints on bounded numeric columns**
- **Location:** `leads.interest_rate`, `leads.commission_rate`, `banks.interest_rate_min/max`, `banks.approval_rate`
- **Problem:** Interest rates should be bounded (e.g., 0–100), approval rates 0–100. Without CHECK constraints, invalid data (negative rates, 999%) can be inserted by any code path or migration script.
- **Fix:**
```sql
ALTER TABLE leads ADD CONSTRAINT chk_leads_interest_rate
  CHECK (interest_rate >= 0 AND interest_rate <= 100);

ALTER TABLE leads ADD CONSTRAINT chk_leads_commission_rate
  CHECK (commission_rate >= 0 AND commission_rate <= 100);

ALTER TABLE banks ADD CONSTRAINT chk_banks_approval_rate
  CHECK (approval_rate >= 0 AND approval_rate <= 100);

ALTER TABLE banks ADD CONSTRAINT chk_banks_interest_rates
  CHECK (interest_rate_min >= 0 AND interest_rate_max >= interest_rate_min);
```

**🟠 No UNIQUE constraint on `leads.client_phone + leads.loan_type + leads.partner_id` for deduplication**
- **Location:** `leads`
- **Problem:** Nothing prevents the same partner from submitting duplicate leads for the same client and loan type. At scale, this leads to data quality issues and wasted bank processing effort.
- **Fix:**
```sql
-- Partial unique index to prevent active duplicates
CREATE UNIQUE INDEX uq_leads_active_dedup
  ON leads (partner_id, client_phone, loan_type)
  WHERE status NOT IN ('rejected', 'disbursed');
```

**🟠 `users.email` uniqueness is case-sensitive and `users.phone` has no DB-enforced uniqueness**
- **Location:** `users.email`, `users.phone`
- **Problem:** Controllers lowercase email and manually check for duplicate phone numbers, but the database does not enforce normalized uniqueness. That leaves race conditions under concurrent registration and allows duplicate rows from scripts, raw SQL, or future code paths. This is especially risky for login, OTP, and partner onboarding flows.
- **Fix:**
```sql
-- Better fix: use normalized uniqueness at the DB layer
CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE users
  ALTER COLUMN email TYPE CITEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone_normalized
  ON users ((regexp_replace(phone, '\\D', '', 'g')))
  WHERE phone IS NOT NULL;
```

- **Alternate fix:** If you do not want `CITEXT`, keep `TEXT` and create `UNIQUE INDEX uq_users_email_lower ON users (LOWER(email));`.

**🟡 `lead_documents.file_size` stored as TEXT instead of INTEGER**
- **Location:** `lead_documents.file_size`
- **Problem:** Storing file size as text prevents numeric comparisons (e.g., "find documents > 5MB"). Aggregation queries (`SUM`, `AVG`) are impossible without casting.
- **Fix:**
```sql
-- In a new migration:
ALTER TABLE lead_documents
  ALTER COLUMN file_size TYPE BIGINT USING file_size::BIGINT;
```

**🟡 `document_upload_tokens` — no constraint preventing reuse**
- **Location:** `document_upload_tokens.used_at`
- **Problem:** Token consumption relies purely on application logic checking `usedAt IS NULL`. A CHECK constraint or partial unique index would provide database-level protection against token reuse.
- **Fix:**
```sql
-- Partial index: only one unused token per document at a time
CREATE UNIQUE INDEX uq_upload_token_unused
  ON document_upload_tokens (document_id)
  WHERE used_at IS NULL;
```

**🟡 `otp_challenges.failed_attempts` — no CHECK constraint**
- **Location:** `otp_challenges.failed_attempts`
- **Problem:** No constraint prevents negative values. Should be bounded.
- **Fix:**
```sql
ALTER TABLE otp_challenges ADD CONSTRAINT chk_otp_failed_attempts
  CHECK (failed_attempts >= 0);
```

---

### 2. PERFORMANCE TRAPS

**🔴 `audit_logs` and `lead_timeline` — unbounded append-only tables with no partitioning**
- **Location:** `audit_logs`, `lead_timeline`
- **Problem:** Both tables grow unboundedly. `audit_logs` in particular will accumulate millions of rows in production (40+ event types, every login/action logged). Without range partitioning on `created_at`, queries degrade, VACUUM becomes expensive, and archival requires full table scans. The immutability triggers make maintenance even harder.
- **Fix:**
```sql
-- Convert audit_logs to range-partitioned table (requires recreation)
CREATE TABLE audit_logs_new (
  LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_y2026m01 PARTITION OF audit_logs_new
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_logs_y2026m02 PARTITION OF audit_logs_new
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... create partitions for each month

-- Automate partition creation with pg_partman or a cron job
```

**🟠 Missing indexes on `clientFullName` and `clientEmail` used in lead search**
- **Location:** `leads.client_full_name`, `leads.client_email`
- **Problem:** Lead search uses `contains` with `mode: 'insensitive'` on `client_full_name`, `client_phone`, and `client_email`. Only `client_phone` is indexed. The insensitive `LIKE '%term%'` on unindexed text columns causes sequential scans on every search.
- **Fix:**
```sql
-- pg_trgm GIN indexes for ILIKE/contains queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_leads_client_full_name_trgm
  ON leads USING GIN (client_full_name gin_trgm_ops);

CREATE INDEX idx_leads_client_email_trgm
  ON leads USING GIN (client_email gin_trgm_ops);
```

**🟠 Missing trigram search indexes on `users` fields used by partner/admin search**
- **Location:** `users.first_name`, `users.last_name`, `users.email`, `users.phone`, `users.city`
- **Problem:** `partnerController.getPartners` uses `contains`/`mode: 'insensitive'` on first name, last name, email, phone, and city. The current `role` and `phone` B-tree indexes do not help for `%term%` searches, so admin/partner search will degrade into sequential scans as the `users` table grows.
- **Fix:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_users_first_name_trgm ON users USING GIN (first_name gin_trgm_ops);
CREATE INDEX idx_users_last_name_trgm  ON users USING GIN (last_name gin_trgm_ops);
CREATE INDEX idx_users_email_trgm      ON users USING GIN (email gin_trgm_ops);
CREATE INDEX idx_users_phone_trgm      ON users USING GIN (phone gin_trgm_ops);
CREATE INDEX idx_users_city_trgm       ON users USING GIN (city gin_trgm_ops);
```

- **Better fix:** Create a stored search column such as `search_document = concat_ws(' ', first_name, last_name, email, phone, city)` and put a single trigram GIN index on that column.

**🟠 UUIDs as primary keys — B-tree fragmentation on high-insert tables**
- **Location:** All tables (UUID v4 PKs)
- **Problem:** Random UUIDs cause B-tree index page splits and poor cache locality. On high-insert tables (`audit_logs`, `leads`, `lead_timeline`), this degrades write throughput by 20-40% compared to sequential keys. UUIDs are 16 bytes vs 8 bytes for BIGINT, doubling index size.
- **Fix:**
```sql
-- For new high-insert tables, prefer UUIDv7 (time-ordered) or BIGSERIAL
-- UUIDv7 maintains the benefits of UUIDs (distributed generation)
-- while preserving insert order for B-tree efficiency.
-- Prisma doesn't natively support UUIDv7; use gen_random_uuid() with
-- a custom function or switch to BIGSERIAL for audit_logs/lead_timeline.

CREATE OR REPLACE FUNCTION uuid_v7() RETURNS uuid AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes = unix_ts_ms || gen_random_bytes(10);
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;
```

**🟡 `banks.supported_loan_types` — array column queried with `hasSome` but no GIN index**
- **Location:** `banks.supported_loan_types`
- **Problem:** Bank matching service filters `supportedLoanTypes: { hasSome: [loanType] }` which translates to `&& ARRAY[...]`. Without a GIN index, this is a seq scan. With few banks it's fine, but the pattern is incorrect.
- **Fix:**
```sql
CREATE INDEX idx_banks_supported_loan_types
  ON banks USING GIN (supported_loan_types);
```

**🟡 `users` table wide scans for admin partner listing**
- **Location:** `users`
- **Problem:** The admin controller queries users with `role = 'partner'` and paginates by `createdAt DESC`. The existing index on `role` alone doesn't cover the sort. This forces a sort operation after index scan.
- **Fix:**
```sql
CREATE INDEX idx_users_role_created_at
  ON users (role, created_at DESC);
```

**🟠 Missing composite indexes for partner/admin lead listing and dashboard sorting**
- **Location:** `leads.partner_id`, `leads.status`, `leads.created_at`, `leads.updated_at`
- **Problem:** The hot lead queries are not just `WHERE partner_id = ?`; they are `WHERE partner_id = ? ORDER BY created_at DESC`, `WHERE partner_id = ? AND status = ? ORDER BY created_at DESC`, and commission/history views ordered by `updated_at DESC`. The current index set is too fragmented, so PostgreSQL will often bitmap-scan then sort instead of serving these pages directly from an index.
- **Fix:**
```sql
CREATE INDEX idx_leads_partner_created_at
  ON leads (partner_id, created_at DESC);

CREATE INDEX idx_leads_partner_status_created_at
  ON leads (partner_id, status, created_at DESC);

CREATE INDEX idx_leads_partner_updated_at
  ON leads (partner_id, updated_at DESC);

CREATE INDEX idx_leads_partner_disbursed_commissions
  ON leads (partner_id, updated_at DESC)
  WHERE status = 'disbursed' AND commission_amount IS NOT NULL;
```

- **Better fix:** After adding the indexes, move partner/admin lead lists to cursor pagination instead of `OFFSET`, because deep pages will still degrade on large lead tables.

**🟡 `active_sessions` recent-session query lacks a composite sort index**
- **Location:** `active_sessions.user_id`, `active_sessions.last_active`
- **Problem:** The user service fetches sessions by `user_id` ordered by `last_active DESC`. The current index on `user_id` alone does not cover the sort, so session-management pages do unnecessary extra work.
- **Fix:**
```sql
CREATE INDEX idx_active_sessions_user_last_active
  ON active_sessions (user_id, last_active DESC);
```

---

### 3. DATA TYPE MISUSE

**🔴 All `TIMESTAMP(3)` columns should be `TIMESTAMPTZ`**
- **Location:** Every table — `created_at`, `updated_at`, `last_login`, `otp_expires`, `lock_until`, `changed_at`, `last_active`, `uploaded_at`, `timestamp`, `eligibility_checked_at`, `commission_paid_at`, `onboarding_completed_at`, `expires_at`, `used_at`
- **Problem:** Prisma maps `DateTime` to `TIMESTAMP(3)` (without timezone). This is dangerous for a fintech app: if the server timezone changes, or the app is deployed across regions, all stored times silently become incorrect. Commission payout timestamps, audit log times, and OTP expiry checks become unreliable. The `lender_doc_requirements` manual migration correctly uses `TIMESTAMPTZ` but the Prisma-managed tables do not.
- **Fix:**
```sql
-- For each table, alter timestamp columns:
ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN last_login TYPE TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN otp_expires TYPE TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN lock_until TYPE TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN reset_password_expires TYPE TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN refresh_token_expires TYPE TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN onboarding_completed_at TYPE TIMESTAMPTZ;
-- ... repeat for all tables

-- In Prisma, use the @db.Timestamptz annotation or native type:
-- createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
```

**🟠 `leads.client_date_of_birth` stored as TEXT**
- **Location:** `leads.client_date_of_birth`, `partner_data.date_of_birth`
- **Problem:** Storing dates as free-form text allows invalid values ("32-13-2000", "tomorrow", "abc"). Age calculations require parsing. Date-based queries (e.g., "leads where client is under 21") are impossible without casting.
- **Fix:**
```sql
-- Migrate to DATE type (after data cleanup):
ALTER TABLE leads
  ALTER COLUMN client_date_of_birth TYPE DATE
  USING client_date_of_birth::DATE;
-- Note: encrypted fields may need decryption before migration
```

**🔵 `BankCommissionRate.interestRate` stored as TEXT instead of DECIMAL**
- **Location:** `bank_commission_rates.interest_rate`
- **Problem:** All other rate fields in the schema use `@db.Decimal(5, 2)` (e.g., `leads.interest_rate`, `banks.interest_rate_min/max`, `partnerCommission`). This one field stores interest rate as free-form text, making numeric comparisons, sorting, and aggregation impossible. This also defeats CHECK constraints.
- **Fix:**
```sql
ALTER TABLE bank_commission_rates
  ALTER COLUMN interest_rate TYPE DECIMAL(5,2)
  USING interest_rate::DECIMAL;
```

**🟡 `users.years_in_operation` and `users.expected_leads` stored as TEXT**
- **Location:** `users.years_in_operation`, `users.expected_leads`
- **Problem:** These are logically numeric values stored as text. Range queries ("partners with > 5 years experience") and aggregations are impossible without casting, and the schema allows garbage values.
- **Fix:**
```sql
ALTER TABLE users
  ALTER COLUMN years_in_operation TYPE INTEGER USING years_in_operation::INTEGER;
ALTER TABLE users
  ALTER COLUMN expected_leads TYPE INTEGER USING expected_leads::INTEGER;
```

**🟡 `users.has_experience` stored as TEXT instead of BOOLEAN**
- **Location:** `users.has_experience`
- **Problem:** This is semantically a boolean ("yes"/"no" or "true"/"false") stored as free-form text. Querying requires string matching with potential inconsistencies ("Yes", "yes", "Y", "true").
- **Fix:**
```sql
ALTER TABLE users
  ALTER COLUMN has_experience TYPE BOOLEAN
  USING CASE WHEN has_experience IN ('yes', 'true', '1') THEN TRUE ELSE FALSE END;
```

**🔵 `banks.total_disbursed` stored as TEXT with currency symbol**
- **Location:** `banks.total_disbursed`
- **Problem:** Default value is `'₹0'` — mixing formatting with data storage. Numeric comparisons and summation are impossible. Sorting by disbursed amount will be lexicographic.
- **Fix:**
```sql
ALTER TABLE banks ADD COLUMN total_disbursed_amount DECIMAL(15,2) DEFAULT 0;
-- Backfill from text column, then drop the text column
UPDATE banks SET total_disbursed_amount = REPLACE(REPLACE(total_disbursed, '₹', ''), ',', '')::DECIMAL;
ALTER TABLE banks DROP COLUMN total_disbursed;
ALTER TABLE banks RENAME COLUMN total_disbursed_amount TO total_disbursed;
```

---

### 4. SECURITY & COMPLIANCE

**🟠 No Row-Level Security (RLS) on multi-tenant tables**
- **Location:** `leads`, `partner_data`, `lead_documents`
- **Problem:** Partner data isolation relies entirely on application-layer WHERE clauses (`WHERE partner_id = ?`). If any code path misses this filter (new endpoint, admin tool, direct DB access), one partner can view another's leads and client PII. In fintech, this is a regulatory violation. RLS provides defense-in-depth.
- **Fix:**
```sql
-- Enable RLS on leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Partners can only see their own leads
CREATE POLICY partner_isolation ON leads
  FOR ALL
  USING (
    partner_id = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) IN ('admin', 'super_admin')
  );

-- Set session variables in your connection middleware:
-- SET LOCAL app.current_user_id = '<user_id>';
-- SET LOCAL app.current_user_role = '<role>';
```

**🟠 `partner_data` stores PII (PAN, DOB, phone, address) without documented encryption**
- **Location:** `partner_data.pan_number`, `partner_data.date_of_birth`, `partner_data.phone`, `partner_data.current_address`
- **Problem:** The `leads` table has field encryption for `clientPanNumber`, `clientAadhaar`, and `clientDateOfBirth` via the Prisma middleware. However, `partner_data` contains the same sensitive fields (`pan_number`, `date_of_birth`) and it's unclear if the encryption middleware covers this table. If not, PII is stored in plaintext.
- **Fix:**
```typescript
// Ensure fieldEncryption middleware covers partner_data model:
const PARTNER_DATA_ENCRYPTED_FIELDS = ['panNumber', 'dateOfBirth', 'currentAddress'];
// Add to the Prisma encryption middleware config
```

**🟡 `audit_logs` has no retention/archival policy enforced at DB level**
- **Location:** `audit_logs`
- **Problem:** RBI guidelines require 5-year retention of financial audit trails. The immutability triggers prevent deletion, but there's no mechanism to archive old records or enforce minimum retention. If someone bypasses triggers (e.g., disabling them as the comment suggests), data could be lost.
- **Fix:**
```sql
-- Add a retention check trigger
CREATE OR REPLACE FUNCTION enforce_audit_retention()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.created_at > NOW() - INTERVAL '5 years' THEN
    RAISE EXCEPTION 'Cannot delete audit logs less than 5 years old (RBI compliance)';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

**🟡 No `updated_at` trigger — relies on Prisma `@updatedAt`**
- **Location:** All tables with `updated_at`
- **Problem:** `@updatedAt` only works through the Prisma client. Direct SQL updates (migrations, admin scripts, raw queries) will not update this field. The `partner_data` manual migration sets `DEFAULT CURRENT_TIMESTAMP` for both `created_at` and `updated_at`, but `updated_at` won't auto-update on subsequent writes without a trigger.
- **Fix:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_partner_data_updated_at BEFORE UPDATE ON partner_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_banks_updated_at BEFORE UPDATE ON banks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_otp_challenges_updated_at BEFORE UPDATE ON otp_challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 5. SCHEMA DESIGN SMELLS

**🔴 `users` table is a god table — 50+ columns mixing 5+ concerns**
- **Location:** `users`
- **Problem:** This single table contains: authentication fields (password, OTP, tokens, locked state, failed attempts), personal profile (name, phone, city), partner onboarding (partnerType, businessName, yearsInOperation), KYC (aadhaarNumber, panNumber, kycStatus), banking details (accountNumber, ifscCode, upiId), and consent flags. This causes:
  - Every query loads/locks all 50+ columns even when only checking auth
  - Schema changes for onboarding affect the auth-critical table
  - NULL-heavy rows (most columns are optional) waste storage and complicate validation
  - Adding new partner types or KYC requirements requires altering this massive table
- **Fix:**
```sql
-- Vertical partition into focused tables:

-- 1. users (auth only)
-- Keep: id, email, password, phone, role, isActive, failedLoginAttempts, 
--        lockUntil, refreshToken, refreshTokenExpires, otpHash, otpExpires,
--        resetPasswordToken, resetPasswordExpires, isEmailVerified, isPhoneVerified,
--        lastLogin, createdAt, updatedAt

-- 2. partner_profiles (1:1 with users WHERE role='partner')
CREATE TABLE partner_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  partner_type "PartnerType",
  business_name TEXT,
  business_address TEXT,
  years_in_operation INTEGER,
  has_experience BOOLEAN,
  expected_leads INTEGER,
  city TEXT,
  state TEXT,
  pincode TEXT,
  onboarding_status "OnboardingStatus" DEFAULT 'pending',
  onboarding_completed_at TIMESTAMPTZ,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. partner_kyc (1:1, encrypted PII)
CREATE TABLE partner_kyc (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  aadhaar_number TEXT,  -- encrypted
  pan_number TEXT,       -- encrypted
  gst_number TEXT,       -- encrypted
  kyc_status "KycStatus" DEFAULT 'pending',
  kyc_rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. partner_banking (1:1, encrypted)
CREATE TABLE partner_banking (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  account_holder_name TEXT,
  bank_name TEXT,
  account_number TEXT,   -- encrypted
  ifsc_code TEXT,        -- encrypted
  upi_id TEXT,           -- encrypted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. partner_consents (1:1)
CREATE TABLE partner_consents (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  consent_data_share BOOLEAN DEFAULT FALSE,
  consent_commission BOOLEAN DEFAULT FALSE,
  declaration_not_employed BOOLEAN DEFAULT FALSE,
  consent_privacy_policy BOOLEAN DEFAULT FALSE,
  consented_at TIMESTAMPTZ DEFAULT NOW()
);
```

**🟠 `leads` table has denormalized `partner_name` alongside `partner_id` FK**
- **Location:** `leads.partner_name`
- **Problem:** `partner_name` is denormalized from `users.first_name + last_name`. If a partner updates their name, all existing leads show stale data unless a backfill is run. This is a classic update anomaly. The field is NOT NULL, adding brittleness.
- **Fix:**
```sql
-- Option A: Drop the column and JOIN at query time
ALTER TABLE leads DROP COLUMN partner_name;
-- Query: SELECT l.*, u.first_name || ' ' || u.last_name AS partner_name
--        FROM leads l JOIN users u ON l.partner_id = u.id;

-- Option B: If denormalization is intentional for performance,
-- document it and add a trigger to keep it in sync:
CREATE OR REPLACE FUNCTION sync_partner_name() RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads SET partner_name = NEW.first_name || ' ' || NEW.last_name
  WHERE partner_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_partner_name AFTER UPDATE OF first_name, last_name ON users
  FOR EACH ROW EXECUTE FUNCTION sync_partner_name();
```

**🟠 `leads.bank_assigned` is free-text instead of FK to `banks`**
- **Location:** `leads.bank_assigned`, `leads.bank_code`
- **Problem:** `bank_assigned` stores the bank name as free text, and `bank_code` was added later as a backfill. Neither has a foreign key to the `banks` table, so referential integrity is not enforced. A typo in bank name or a deleted bank creates orphan references.
- **Fix:**
```sql
-- Add FK from bank_code to banks.code
ALTER TABLE leads ADD CONSTRAINT fk_leads_bank_code
  FOREIGN KEY (bank_code) REFERENCES banks(code) ON DELETE SET NULL;

CREATE INDEX idx_leads_bank_code ON leads (bank_code);
```

**🟡 `leads.bank_logo` duplicates data from `banks.logo`**
- **Location:** `leads.bank_logo`
- **Problem:** Bank logo URL is stored redundantly on every lead. If the bank updates their logo, all existing leads show the old one. This should be resolved via a JOIN to `banks`.
- **Fix:**
```sql
ALTER TABLE leads DROP COLUMN bank_logo;
-- Resolve via JOIN: SELECT b.logo FROM leads l JOIN banks b ON l.bank_code = b.code;
```

**🔵 Naming inconsistency in FK columns**
- **Location:** Various tables
- **Problem:** Some FK columns use `_id` suffix (`partner_id`, `lead_id`, `bank_id`, `user_id`, `document_id`) which is consistent. But `leads.bank_assigned` and `leads.preferred_bank` store names rather than IDs, breaking the convention. `lead_timeline.updated_by` stores a user ID but isn't named `updated_by_id`.
- **Fix:** Rename `updated_by` → `updated_by_user_id` and add proper FK constraint.

**🔵 `LocalLeadStatus` enum drift exists between Prisma schema and the manual SQL bootstrap**
- **Location:** `backend/prisma/schema.prisma`, `backend/prisma/add_partner_data.sql`
- **Problem:** The current Prisma schema includes `docs_pending` in `LocalLeadStatus`, but the manual SQL file that creates the enum omits it. That means a database created from the manual SQL path can drift from a database created via the current Prisma schema. The previous version of this review said the schema itself was missing `docs_pending`; that is no longer accurate.
- **Fix:**
```sql
ALTER TYPE "LocalLeadStatus"
  ADD VALUE IF NOT EXISTS 'docs_pending' AFTER 'contacted';
```

- **Follow-up:** Keep the intentional divergence from `LeadStatus` documented if `contacted` remains local-only.

---

### 6. OPERATIONAL RISKS

**🟠 ON DELETE CASCADE on `lead_documents` → `leads` risks losing document audit trail**
- **Location:** `lead_documents` FK to `leads`
- **Problem:** If a lead is deleted, all associated documents (including uploaded file references) are silently cascade-deleted. For a fintech app, document records are part of the compliance trail. The R2 object storage files would become orphaned (storage leak), and there's no record that documents ever existed.
- **Fix:**
```sql
-- Change to RESTRICT and implement soft delete on leads:
ALTER TABLE lead_documents DROP CONSTRAINT lead_documents_lead_id_fkey;
ALTER TABLE lead_documents ADD CONSTRAINT lead_documents_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE RESTRICT;

-- Add soft delete column to leads:
ALTER TABLE leads ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_leads_deleted_at ON leads (deleted_at) WHERE deleted_at IS NULL;
```

**🟠 `partner_data` ON DELETE CASCADE silently destroys client PII records**
- **Location:** `partner_data` FK to `users`
- **Problem:** If a partner user is deleted, all their `partner_data` records (which contain client PII: name, phone, DOB, PAN, address) are silently cascade-deleted. For a fintech app with compliance requirements, this client data should be retained for audit and regulatory purposes even if the partner account is removed. This is the same class of issue as `lead_documents` CASCADE.
- **Fix:**
```sql
-- Change to RESTRICT and require soft delete on users for partner accounts:
ALTER TABLE partner_data DROP CONSTRAINT partner_data_partner_id_fkey;
ALTER TABLE partner_data ADD CONSTRAINT partner_data_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE RESTRICT;
```

**🟠 No soft delete on `leads` table**
- **Location:** `leads`
- **Problem:** Leads represent financial transactions with compliance requirements. Hard deletion means loss of audit trail, inability to recover from accidental deletion, and potential regulatory issues. The `lead_timeline` cascade delete compounds this — the entire history is wiped.
- **Fix:**
```sql
ALTER TABLE leads ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN deleted_by TEXT;

-- Partial index for "active" queries (most queries filter out deleted):
CREATE INDEX idx_leads_active ON leads (partner_id, status, created_at DESC)
  WHERE deleted_at IS NULL;
```

**🟡 Missing composite index for cursor-based pagination on `audit_logs`**
- **Location:** `audit_logs`
- **Problem:** Admin controller uses cursor-based pagination with `orderBy: [{createdAt: 'desc'}, {id: 'desc'}]`, but there's no composite index on `(created_at DESC, id DESC)`. The existing `created_at DESC` index doesn't cover the tie-breaking `id` column.
- **Fix:**
```sql
CREATE INDEX idx_audit_logs_cursor ON audit_logs (created_at DESC, id DESC);
```

**🟡 `audit_logs` summary endpoint executes four separate count scans per request**
- **Location:** Admin audit counts query path
- **Problem:** The admin controller calculates total, login, security, and auth counts using four separate `COUNT(*)` queries over the same filtered dataset. As `audit_logs` grows, that multiplies I/O and becomes one of the first dashboard bottlenecks even if the underlying table is indexed correctly.
- **Fix:**
```sql
-- Better served as one aggregate query instead of 4 Prisma counts
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE event IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT')) AS login_events,
  COUNT(*) FILTER (WHERE event IN ('ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY')) AS security_events,
  COUNT(*) FILTER (WHERE event IN ('REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS')) AS auth_events
FROM audit_logs
WHERE /* same filters */;
```

- **Better fix at larger scale:** Maintain daily rollups in a summary table or materialized view and read dashboards from that instead of raw audit logs.

**🟡 `otp_challenges` and `active_sessions` — no TTL cleanup mechanism**
- **Location:** `otp_challenges`, `active_sessions`
- **Problem:** Expired OTP challenges and stale sessions accumulate forever. Without a cleanup job or PostgreSQL `pg_cron` scheduled deletion, these tables grow unboundedly with dead rows.
- **Fix:**
```sql
-- Scheduled cleanup (run via pg_cron or application cron):
DELETE FROM otp_challenges WHERE otp_expires_at < NOW() - INTERVAL '1 hour';
DELETE FROM active_sessions WHERE last_active < NOW() - INTERVAL '30 days';

-- Partial index to make cleanup efficient:
CREATE INDEX idx_otp_expired ON otp_challenges (otp_expires_at)
  WHERE verified_at IS NULL;
CREATE INDEX idx_sessions_stale ON active_sessions (last_active);
```

**🟡 `document_upload_tokens` — no TTL cleanup**
- **Location:** `document_upload_tokens`
- **Problem:** Expired/used tokens remain in the table forever. With high document upload volume, this table grows with dead data.
- **Fix:**
```sql
DELETE FROM document_upload_tokens
  WHERE expires_at < NOW() - INTERVAL '24 hours';

CREATE INDEX idx_document_upload_tokens_expires_at
  ON document_upload_tokens (expires_at);
```

**🟡 Document flows are missing a supporting index on `lead_documents(lead_id, type)`**
- **Location:** `lead_documents`
- **Problem:** Public token validation loads all documents for a lead ordered by `type`, and the upload flow repeatedly verifies `id + lead_id` ownership. The current index on `lead_id` is acceptable at small scale but is not the right shape for repeated document-list and sort operations.
- **Fix:**
```sql
CREATE INDEX idx_lead_documents_lead_id_type
  ON lead_documents (lead_id, type);
```

**� `partner_data.phone` — no index for client deduplication lookups**
- **Location:** `partner_data.phone`
- **Problem:** Partner data contains client phone numbers used for deduplication and lookups. The table has indexes on `partner_id` and `partner_id + local_status`, but none on `phone`. As the table grows, any search or dedup check by client phone requires a sequential scan.
- **Fix:**
```sql
CREATE INDEX idx_partner_data_phone ON partner_data (phone);
```

**🟡 `document_upload_tokens` — missing composite index for token validation flow**
- **Location:** `document_upload_tokens.document_id`, `document_upload_tokens.used_at`
- **Problem:** The token validation flow checks `WHERE document_id = ? AND used_at IS NULL`. The current index on `document_id` alone doesn't cover the `used_at` filter, forcing a recheck on every validation. At scale with high document upload volume, this adds unnecessary I/O.
- **Fix:**
```sql
CREATE INDEX idx_upload_tokens_doc_unused
  ON document_upload_tokens (document_id)
  WHERE used_at IS NULL;
```

**�🔵 Adding NOT NULL columns to large tables will lock**
- **Location:** `audit_logs`, `leads`
- **Problem:** The `safe_audit_migration.sql` correctly uses nullable columns with defaults. But future migrations adding NOT NULL columns to `audit_logs` (which grows unboundedly) will require a full table rewrite and exclusive lock. This can cause minutes of downtime on large tables.
- **Fix:** Always add columns as nullable with a DEFAULT, then backfill, then add NOT NULL constraint using `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` (which does check scan but not rewrite in PG 12+).

**🔵 No `pg_stat_statements` or query monitoring setup documented**
- **Location:** Schema-wide
- **Problem:** No evidence of `pg_stat_statements` extension being enabled. Without it, identifying slow queries and optimization opportunities requires external tooling.
- **Fix:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- Configure in postgresql.conf:
-- shared_preload_libraries = 'pg_stat_statements'
-- pg_stat_statements.track = all
```

---

## WHAT LOOKS GOOD

- **Field-level encryption** for PII (AES-256-GCM) on User and Lead models with the `enc:v1` prefix pattern — well-implemented
- **Audit log immutability triggers** with proper compliance-oriented design (prevents UPDATE/DELETE)
- **Audit checksum integrity** using SHA-256 — enables tamper detection
- **Proper use of `DECIMAL(15,2)`** for all monetary fields (loan amounts, EMI, commission) — no float/real misuse
- **Good index coverage** on the most critical query paths: `leads(partner_id, status)`, `audit_logs(event, created_at)`, `partner_data(partner_id, local_status)`
- **Redis-backed caching already exists** for banks, dashboard stats, and audit counts — that materially helps the `5k` website-user target if Redis is enabled in production rather than treated as optional

---

## RECOMMENDED NEXT STEPS

1. **[CRITICAL] Migrate all `TIMESTAMP(3)` to `TIMESTAMPTZ`** — This affects every table and is a ticking time bomb for a fintech app. Create a single migration that alters all timestamp columns. Test timezone handling end-to-end.

2. **[CRITICAL] Decompose the `users` god table** — Split into `users` (auth), `partner_profiles`, `partner_kyc`, `partner_banking`, `partner_consents`. This is a large effort but prevents schema rot and improves query performance.

3. **[CRITICAL] Implement partitioning on `audit_logs`** — Set up range partitioning by month on `created_at`. Use `pg_partman` for automated partition management. This must be done before the table grows past ~10M rows.

4. **[HIGH] Fix `leads.partner_id` nullability mismatch** — Align the Prisma schema to `String` (non-optional) to match the database constraint and change `onDelete` to `Restrict`.

5. **[HIGH] Add `updated_at` database triggers** — Don't rely solely on Prisma `@updatedAt`. Add PostgreSQL triggers for all tables with `updated_at` columns.

6. **[HIGH] Add DB-enforced normalized uniqueness for auth/onboarding** — Make `users.email` case-insensitively unique and enforce normalized uniqueness on `users.phone`.

7. **[HIGH] Add missing indexes for search and dashboard lists** — `leads.client_full_name` (trgm), `leads.client_email` (trgm), `users` search trigram indexes, `users(role, created_at DESC)`, `leads(partner_id, created_at DESC)`, `leads(partner_id, status, created_at DESC)`, `active_sessions(user_id, last_active DESC)`, `lead_documents(lead_id, type)`, `document_upload_tokens(expires_at)`, `banks.supported_loan_types` (GIN).

8. **[HIGH] Implement soft delete on `leads`** — Add `deleted_at` column, change `lead_documents` FK from CASCADE to RESTRICT, add partial indexes.

9. **[HIGH] Add RLS policies** on `leads`, `partner_data`, `lead_documents` for defense-in-depth tenant isolation.

10. **[MEDIUM] Replace repeated audit dashboard counts with aggregate or rollup queries** — The current four-count approach will age badly even with indexes.

11. **[MEDIUM] Add CHECK constraints** on rate/percentage columns and bounded numeric fields.

12. **[MEDIUM] Establish TTL cleanup jobs** for `otp_challenges`, `active_sessions`, and `document_upload_tokens` — either via `pg_cron` or application scheduler.

13. **[MEDIUM] Add FK from `leads.bank_code` to `banks.code`** and eventually drop the free-text `bank_assigned` column.

14. **[MEDIUM] Validate the capacity target with load tests and query plans** — For `10k` dashboard users and `5k` website users, verify p95 latency on partner list, lead list, commission list, audit counts, and audit export endpoints with realistic row counts.

15. **[LOW] Convert `file_size` to BIGINT, `years_in_operation`/`expected_leads` to INTEGER, `has_experience` to BOOLEAN, `total_disbursed` to DECIMAL, `BankCommissionRate.interestRate` to DECIMAL, and fix the `LocalLeadStatus` bootstrap drift.**

16. **[HIGH] Change `partner_data` FK from CASCADE to RESTRICT** — Prevent silent destruction of client PII records when a partner account is deleted.

17. **[LOW] Add missing indexes on `partner_data.phone` and `document_upload_tokens(document_id, used_at IS NULL)`** — Support deduplication lookups and token validation at scale.
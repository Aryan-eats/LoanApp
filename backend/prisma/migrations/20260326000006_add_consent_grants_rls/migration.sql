-- Enable and enforce RLS for consent_grants.
ALTER TABLE "consent_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_grants" FORCE ROW LEVEL SECURITY;

-- Partner can read grants that belong to their own partner org.
DROP POLICY IF EXISTS "consent_grants_partner_select" ON "consent_grants";
CREATE POLICY "consent_grants_partner_select" ON "consent_grants"
  FOR SELECT
  USING (
    "partner_id" = NULLIF(current_setting('app.current_partner_org_id', true), '')::uuid
  );

-- Partner can create grants only for their own org and own submitter identity.
DROP POLICY IF EXISTS "consent_grants_partner_insert" ON "consent_grants";
CREATE POLICY "consent_grants_partner_insert" ON "consent_grants"
  FOR INSERT
  WITH CHECK (
    "partner_id" = NULLIF(current_setting('app.current_partner_org_id', true), '')::uuid
    AND "submitted_by" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );

-- GPS India internal users can read all grants.
DROP POLICY IF EXISTS "consent_grants_gps_india_select" ON "consent_grants";
CREATE POLICY "consent_grants_gps_india_select" ON "consent_grants"
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('admin', 'manager', 'super_admin')
  );

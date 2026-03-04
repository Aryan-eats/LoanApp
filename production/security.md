# MVP Security Must-Do Checklist

Date: 2026-03-02
Scope: Launch-blocking security actions only (fintech MVP)

## What You Must Do Before Production

### 1) Block fake phone verification (CRITICAL)
- Fix: Do not trust `phoneVerificationToken` presence. Verify it server-side (signature + expiry + phone binding) before setting `isPhoneVerified=true`.
- Files:
  - `backend/src/controllers/authController.ts` (line around 162)
  - `backend/src/controllers/otpController.ts`
- Done when:
  - Registration fails with random/fake token.
  - Registration succeeds only after valid OTP verification proof.

### 2) Fix partner IDOR on document upload link generation (HIGH)
- Fix: Partners can generate upload links only for leads they own.
- Files:
  - `backend/src/controllers/documentController.ts` (`generateUploadToken`)
- Done when:
  - Partner A cannot generate token for Partner B's `documentId`.
  - Admin can still generate for any lead.

### 3) Remove exposed MSG91 credential from frontend (HIGH)
- Fix: Remove hardcoded `tokenAuth` from client code and rotate exposed credential.
- Files:
  - `src/hooks/useMsg91.ts` (line around 68)
- Done when:
  - No provider secret/token is embedded in built JS.
  - Old leaked token is revoked/rotated.

### 4) Stop leaking sensitive user fields in admin APIs (HIGH)
- Fix: Return allowlisted fields only. Never return password/OTP/reset/refresh token hashes.
- Files:
  - `backend/src/controllers/adminController.ts` (`listUsers`, `getUser`, `createUser`, `updateUser` responses)
- Done when:
  - API responses contain no sensitive auth or reset fields.

### 5) Protect public preferred-bank update endpoint (MEDIUM, must for fintech abuse)
- Fix: Remove unauthenticated object update by raw lead ID. Require auth or signed one-time action token.
- Files:
  - `backend/src/routes/leadsRoutes.ts` (`PATCH /:id/preferred-bank`)
- Done when:
  - Random lead ID cannot be updated by anonymous caller.

### 6) Enforce one-time upload tokens (MEDIUM)
- Fix: Use `usedAt` properly. Mark token used after first successful upload and reject replay.
- Files:
  - `backend/src/controllers/documentController.ts` (`validateUploadToken`, `uploadViaToken`)
  - `backend/prisma/schema.prisma` (`DocumentUploadToken.usedAt` already exists)
- Done when:
  - Same token cannot be reused after first upload.

### 7) Harden file upload validation (MEDIUM)
- Fix: Validate file signature/magic bytes, not MIME header only.
- Files:
  - `backend/src/middleware/upload.ts`
- Done when:
  - Spoofed MIME uploads are rejected.

## Must-Fix Configuration Items

### 8) Remove default JWT secret fallbacks from production compose
- Fix: Fail startup if `JWT_SECRET` / `JWT_REFRESH_SECRET` are missing.
- Files:
  - `docker-compose.yml`
- Done when:
  - Production deployment cannot boot with default secrets.

### 9) Disable OTP bypass path outside isolated local testing
- Fix: Remove or hard-fail if bypass is enabled in deployable environments.
- Files:
  - `backend/src/controllers/otpController.ts` (`MSG91_BYPASS_VERIFY`, `NODE_ENV !== 'production'` logic)
- Done when:
  - Wrong OTP never succeeds in staging/prod-like environments.

## Can Be Deferred (Not Launch Blockers For MVP)
- Full SIEM/SOC pipeline and advanced alerting.
- Deep fraud analytics/anomaly ML.
- Large-scale red-team and fuzzing program.
- Extended compliance automation/reporting.

##  Security Gate (Simple)
Ship only when all below are true:
1. Critical + High issues above are closed.
2. Endpoint authz tests exist for IDOR/BOLA paths.
3. No hardcoded secrets in frontend/backend repos.
4. Upload token replay test passes.
5. Security regression tests run in CI on every merge.

# GPS India – Pre-Production Phases
> Last updated: 2026-03-06
> Rule: complete + merge each phase before starting the next. Later phases depend on earlier ones.

---

## ✅ Already Done – Do Not Redo

- [x] Express 5 + TypeScript setup
- [x] JWT access + refresh token flow
- [x] Role-based access (admin / partner)
- [x] Partner onboarding workflow
- [x] Helmet, rate limiters (global, login, OTP, register, password-reset), 12-round bcrypt
- [x] `redis.scan()` replacing `redis.keys()` in tokenBlacklist
- [x] Prisma `$transaction` for lead timeline + status updates (race conditions fixed)
- [x] Token refresh race condition (`isRefreshing` + subscriber queue)
- [x] Sort field injection whitelist in `leadController.ts`
- [x] ESLint ignore fixes (`backend/dist`, `migration-archive`)
- [x] Encoding normalization + `.editorconfig`
- [x] Cursor-based pagination for audit logs
- [x] `DocsReq.ts` moved to backend API
- [x] God files refactored (authController, adminRoutes, AddClientPage)
- [x] Typed DTOs for audit/leads paths
- [x] React hook violations fixed (useFetch, useLocalStorage, useMediaQuery, usePrevious)
- [x] Customer document upload page (multi-doc, token reuse, expired link handling)

---

## Phase 0 — Restore Build & Test Gates
> **Goal:** Get a clean passing build and test run. Nothing ships if nothing builds.
> **Rule:** Do not start Phase 1 until `npm run build` and `npm run test` both pass for frontend AND backend.

- [ ] Remove unused `formatFileSize` in `src/pages/CustomerUploadPage.tsx:129` — fixes frontend build
- [ ] Fix backend build: exclude `backend/src/scripts/migPostgres.ts` from production `tsc` (split tsconfig app vs scripts, or move outside `include`)
- [ ] Add `lint:frontend` → `eslint src` and `lint:backend` → `eslint backend/src` scripts to root `package.json`
- [ ] Fix `src/tests/leadsApi.test.ts` — align endpoint expectations with actual routes
- [ ] Fix `src/tests/useFetch.test.ts` — update stale assumptions, add missing `act()` wrappers
- [ ] Fix `src/tests/LeadDetailsModal.test.tsx` — use role/label selectors, remove ambiguous text matches
- [ ] Fix `src/tests/leadsApi.test.ts:99` — replace `as never` cast with `Partial<LeadData>`
- [ ] Add orchestrated scripts: `check:frontend`, `check:backend`, `check` (typecheck + lint + test)

---

## Phase 1 — Config, Secrets & Environment
> **Goal:** All secrets come from env; no hardcoded credentials; app fails fast on bad config.
> **Safe to do standalone** — pure config changes, no logic touched.

- [ ] `docker-compose.yml` — fail startup when `JWT_SECRET`/`JWT_REFRESH_SECRET` are missing (no default fallbacks)
- [ ] `backend/src/config/prisma.ts` — validate `DATABASE_URL` exists before `new Pool()`; move Pool into singleton lifecycle
- [ ] `backend/src/scripts/testDbConnection.ts` — fail fast with clear error when `DATABASE_URL` missing
- [ ] `backend/src/config/redis.ts` — `getRedisClient()` must propagate connection failure (await + rethrow), not return unconnected client
- [ ] `backend/src/utils/jwtValidator.ts` — use `isProduction` consistently (remove `isDevelopment`) for expiry format checks
- [ ] `backend/src/utils/tokenBlacklist.ts` — call `.unref()` on cleanup interval; restore `clear()` for test teardown
- [ ] `src/hooks/useMsg91.ts` — move `widgetId` + `tokenAuth` to `VITE_MSG91_WIDGET_ID` / `VITE_MSG91_TOKEN_AUTH` env vars; update `.env.example`
- [ ] Rotate the leaked MSG91 `tokenAuth` credential (revoke old key, issue new one)
- [ ] `backend/.env.example` — add generation hint for `FIELD_ENCRYPTION_KEY` (base64 32-byte key instruction)
- [ ] `backend/Dockerfile` — remove `COPY src/tests ./src/tests/` from production stage

---

## Phase 2 — Backend Security Fixes
> **Goal:** Close every server-side security hole before the frontend is updated to rely on new flows.
> **Order matters:** Backend must be deployed first; frontend changes in Phase 4 depend on these.

### Auth Flow
- [ ] **Phone verification bypass** — validate `phoneVerificationToken` server-side before setting `isPhoneVerified=true`; reject truthy-but-unverified values (`authController.ts ~L186`)
- [ ] **`verificationToken` hardcoded as `'verified'`** — replace with short-lived signed JWT (contains mobile + expiry); update `verifyMsg91OTP` to validate signature + expiry instead of literal string (`authController.ts ~L997`)
- [ ] **OTP bypass path** — hard-fail when `MSG91_BYPASS_VERIFY` is set outside isolated local `NODE_ENV=test` (`otpController.ts`)
- [ ] **`verifyMsg91OTP` IDOR** — stop trusting client-supplied `userId`; resolve from `req.user` (authenticated principal) (`authController.ts ~L835`)
- [ ] **OTP brute-force** — add `failedAttempts` + `lockedUntil` to `otpChallengeService.ts`; return `{success:false,reason:'locked'}` when threshold hit
- [ ] **OTP replay** — clear `otpHash` to `null` on successful verification so OTP cannot be reused (`otpChallengeService.ts ~L107`)
- [ ] `otpChallengeService.ts` — fix `crypto.randomInt` upper bound to `1000000` (inclusive 999999)
- [ ] `otpChallengeService.ts` — use `crypto.timingSafeEqual` for `verificationToken` comparison

### Data Leakage
- [ ] **Admin APIs leak password hash** — strip `password`/`otpHash`/reset/refresh token fields from `listUsers`, `getUser`, `createUser`, `updateUser` responses (`adminController.ts` + `adminRoutes.ts ~L139`)
- [ ] Mask/hash mobile number before writing to audit log metadata (`authController.ts ~L949`)
- [ ] `backend/print-users.ts` — mask email/phone, gate behind `NODE_ENV=development`, await `$disconnect()`, exit(1) on error

### File & Document Security
- [x] **IDOR on document upload token** — partners can only call `generateUploadToken` for their own leads; admin can access any (`documentController.ts`)
- [x] **Upload token replay** — mark `usedAt` after first successful upload; reject reuse (`documentController.ts → validateUploadToken / uploadViaToken`)
- [x] **File upload MIME spoofing** — validate magic bytes (file signature), not just `Content-Type` header (`middleware/upload.ts`)

### Crypto
- [ ] **Deterministic IV in AES-GCM** — replace `deriveIv(plaintext)` with `crypto.randomBytes(12)` per encryption; prefix random IV to ciphertext for decryption (`fieldEncryption.ts ~L23`)
- [ ] `fieldEncryption.ts` — remove `deleteMany`/`updateMany` from `actionsWithResults` set (they return `{count}`, not records)
- [ ] `fieldEncryption.ts` — throw clear error on unsupported string filters (`contains`, `startsWith`, `endsWith`) on encrypted fields
- [ ] `fieldEncryption.ts` — wrap `decipher.final()` in try-catch; return `null` on corrupted ciphertext

### Routes & Validators
- [ ] **Public preferred-bank endpoint** — add auth or signed one-time token to `PATCH /:id/preferred-bank` (`leadsRoutes.ts:77`)
- [ ] Add `validateVerifyMsg91OTP` middleware to `POST /auth/verify-msg91`
- [ ] Add validators to `POST /auth/otp/send|verify|resend` routes (reuse or create MSG91-specific validators)
- [ ] Password regex in `validators.ts` — add `+` and `$` anchor so full string is validated, not just prefix
- [ ] Consent field validators — replace `.equals('true')` with `.custom(v => v === true)` for boolean fields
- [ ] Move `logAuditEvent('OTP_SENT')` to after `result.success` check in send and resend handlers; add `OTP_SEND_FAILED` log on failure
- [ ] `msg91.ts → verifyMsg91Token` — throw deprecation error instead of silently returning `false`

---

## Phase 3 — Backend Data Integrity & Business Logic
> **Goal:** Harden data validation and reliability. Safe after Phase 2 is deployed.

### Input Validation
- [ ] UUID format middleware for all routes with `:id` params — prevents Prisma 500s on malformed IDs
- [ ] Cap `limit` to 100 with `Math.min(limit, 100)` in `leadController.ts` and `partnerController.ts`
- [ ] Loan amount min/max (`10k–10Cr`) validation in `leadController.ts`; message: "Contact office for high-value loans" above 10Cr
- [ ] Public lead payload — `express-validator` format checks for phone (10 digits), email (format), loanAmount (numeric, positive, proper commas (eg, 5,00,000)
- [ ] `smsService.ts` — `formatIndianNumber` must validate strictly (10-digit or `91`+10-digit); return null/throw on invalid; callers surface clear error
- [ ] `smsService.ts` — add `AbortController` timeout to `fetch`; check `response.ok` before parsing JSON

### Reliability
- [ ] `cache.ts` — wrap cached values in `{cached:true, value}` envelope so cached `null` is distinguished from cache miss
- [ ] `userService.ts → generateOTP` — write to both Redis AND Postgres so Redis outage doesn't break OTP flow
- [ ] `userService.ts → verifyUserOTP` — return discriminated result `{status:'verified'|'invalid'|'use_db'}`; implement Postgres fallback when Redis unavailable
- [ ] Move bank-matching/eligibility logic out of `BestOffers.tsx` to `POST /api/leads/match-offers` backend endpoint
- [ ] Remove hardcoded `consolidatedBanks` from frontend bundle (`src/data/`)
- [ ] Currency precision — ensure `Decimal.js` used for all server-side financial calculations (no JS float arithmetic)
- [ ] EMI calculator — guard `Infinity`/`NaN` when interest or tenure is zero (`src/components/EmiCalculator.tsx`)

### Migration Script Fixes (safe to do anytime, not user-facing)
- [ ] `migPostgres.ts` — fix orphan `idMap.leads.set(...)` — only set after `partnerUuid` is confirmed
- [ ] `migPostgres.ts` — change unknown audit event fallback from `SUSPICIOUS_ACTIVITY` to `'UNKNOWN'`; log warn on fallback
- [ ] `migPostgres.ts` — `upsert` catch should only swallow `P2002` (unique constraint); rethrow other errors
- [ ] `migPostgres.ts` — document or hash `user.otp` before assigning to `otpHash`

### Tests
- [ ] `db.operations.test.ts` — replace hardcoded `pii-user@example.com` with `uniqueEmail()` helper
- [ ] `redis.test.ts` — fix `flushTestKeys` pattern to target only test keys; add `beforeEach` state cleanup; fix '0-second TTL' comment

---

## Phase 4 — Frontend Auth & Security
> **Goal:** Update the frontend to use the new secure backend flows from Phase 2.
> **Must come AFTER Phase 2 is deployed** — these changes would break against the old backend.

- [ ] **Refresh token in localStorage** — remove from `authStore.ts`; expect backend to set/clear via `httpOnly Secure` cookie; update logout to call server endpoint
- [ ] `authStore.ts` persist only `id` + `role` (not full user object with PII); add rehydration call to fetch full profile on load
- [ ] `authStore.ts` — grace-return path must clear `isAuthenticated`/`user` when token is invalid (not leave stale authenticated state)
- [ ] `apiClient.ts` subscriber queue — store both `resolve` + `reject` callbacks; call `reject(error)` on refresh failure so no subscriber promise hangs
- [ ] `src/components/onboarding/StepBasicIdentity.tsx` — wrap `sendOTP`, `verifyOTP`, `resendOTP` in try/catch/finally; always clear `isVerifying` in finally; add accessible `aria-label` to OTP digit inputs
- [ ] `StepBasicIdentity.tsx` — fix stale-closure `otpError` checks in verify and resend flows
- [ ] `StepBasicIdentity.tsx` — remove `console.log`/`console.error` that output `phoneVerificationToken` or full error payloads
- [ ] `src/pages/PartnerOnboarding.tsx` — handle `response.success === false` explicitly: show error, re-enable submit button


---
  
## Phase 5 — Frontend Architecture & Correctness
> **Goal:** Fix correctness bugs and architectural issues. Independent from auth — safe to do in parallel with Phase 3 if needed.

- [ ] `LeadStatus` union — restore `docs_collected` + `bank_logged` (or run coordinated migration with DB); update all switch/case, UI filters, and API serializers (`shared.ts`, `admin/types/admin.ts`)
- [ ] `src/admin/pages/AdminDashboard.tsx ~L89` — normalise `loanAmount` to `0` when undefined/null before `formatCurrency`
- [ ] `useLocalStorage.ts` — storage event handler must always `JSON.parse`; `dispatchEvent` must include serialised `newValue`
- [ ] `usePagination.ts` — `setPageSize` must guard `NaN`/`Infinity`; `setTotalItems` accepts optional `newPageSize` to update atomically
- [ ] `src/components/application-form/SuccessPopup.tsx` — RAF focus falls back to container (`tabIndex="-1"`) when `closeButtonRef` is null
- [ ] `src/admin/components/leads/AddLeadModal.tsx` — loan amount validation: check `isNaN` before `<= 0`
- [ ] `nginx.conf` — add `map $http_upgrade $connection_upgrade` and use mapped variable in `/api/` proxy block; fixes keep-alive breakage
- [x] Consolidate duplicate `PrefetchLink` (`src/components/` vs `src/components/shared/`) — pick one, update imports
- [x] Consolidate `StatsCard`/`StatusBadge` variants between admin/partner into shared primitives with variant props
- [ ] Centralized API error wrapper — map HTTP status codes to user-friendly messages for all `apiClient` calls
- [ ] Session expiry warning modal 5 min before token expires
- [ ] `AbortController` in `useFetch` — cancel in-flight requests on component unmount

---

## Phase 6 — Observability & Audit Hardening
> **Goal:** Make production operations visible. All additive — no breaking changes.

- [ ] Audit log silent failure — add retry queue or file-based fallback for critical events (`auditLogger.ts ~L58`)
- [ ] IP spoofing in audit logs — configure `express` trust proxy; validate `x-forwarded-for` (`auditLogger.ts ~L22`)
- [x] Log `PASSWORD_CHANGE` in `profileController.ts`
- [x] Log account deactivation in `profileController.ts`
- [x] Log admin `lead export` events (large list fetches)
- [x] Move token blacklist to Redis (verify `tokenBlacklist.ts` is fully Redis-backed in prod)
- [ ] Response caching for static lists (banks, doc types) — 15-30s TTL
- [ ] Compression middleware enabled in production `backend/src/index.ts`
- [x] Virtual scrolling for admin lead tables (`react-window` or `tanstack/virtual`)
- [x] CI gates: security regression tests run on every merge (IDOR/BOLA paths, upload token replay)
- [ ] Proper DB indexes for lead queries (verify Prisma schema covers compound query patterns)

---

## Phase 7 — MVP Feature Gaps
> **Goal:** Complete the feature set described in `task.md`. Build on the stable, secure base from Phases 0-5.

### Partner Dashboard Widgets
- [ ] Clients added this month
- [ ] Active pipeline by stage (Lead Received → Docs Pending → File Prep → Submitted → Approved → Disbursed counts)
- [ ] Pending documents widget (client × missing doc × days pending)
- [ ] Recent activity feed (uploads, status changes, admin notes)
- [ ] Monthly disbursal tracker (₹ disbursed, submitted cases, approval rate %)
- [ ] Case conversion funnel (Lead → Submission → Approval → Disbursal)
- [ ] Follow-up reminders
- [ ] Quick tools panel buttons (EMI calc, Balance transfer calc, Lender comparison, Eligibility checklist)

### Client Management
- [ ] Verify `StoredClients.tsx` covers all fields: personal info, employment type, income, EMIs, CIBIL, loan type/amount/tenure/purpose, notes
- [ ] Loan pipeline stage tracking — confirm backend `Lead` model supports all 7 stages

### Document Vault
- [ ] Pre-signed R2 upload URLs: frontend requests URL → uploads direct to R2 → backend saves metadata (avoids backend bandwidth)
- [ ] Per-client document list with type tags visible in partner `DocumentsPage.tsx`

### Lender Criteria Library
- [ ] `BankLoanTypesPage.tsx` / `BankOffersPage.tsx` — verify min income, min CIBIL, FOIR, employment category, max loan amount are all shown
- [ ] Lender-to-lender comparison view

### Loan Calculators
- [ ] EMI calculator output: monthly EMI, total interest, total repayment
- [ ] Balance transfer calculator: current balance + rates + tenure → EMI reduction + total savings

### Case Submission to GPS
- [ ] "Submit to GPS" button flow in `SubmittedToAdminTab.tsx` — creates lead entry in admin dashboard, not just frontend state
- [ ] Manual lender input on submission (for lenders not in DB)

### Admin Features
- [ ] Partner approval workflow + activity view (`PartnersPage.tsx`)
- [ ] Add/edit lender criteria in `BankManagePage.tsx`
- [ ] Warning indicators for inactive partners
- [ ] Import preferred bank from `BestOffers.tsx` into admin lead view

### Customer Features
- [ ] Customer tracking link generation when lead status = `bank_processing` (shows timeline to customer)
- [ ] Verify `CustomerUploadPage.tsx` handles expired/invalid token gracefully with clear UI message

---

## Phase 8 — Performance & Polish
> **Goal:** Production-grade experience. Do last — changes here are cosmetic/non-functional.

- [ ] `src/data/DocsReq.ts` (1339 lines, 45 KB) — confirm fully served from backend API; remove or reduce to a minimal seed fallback in frontend bundle
- [ ] Skeleton loaders instead of spinners for data tables
- [ ] Centralized Indian currency formatter `src/utils/currency.ts` (₹ Lakh/Cr) — remove per-file manual formatters
- [ ] Code splitting: confirm admin dashboard chunks are fully separated from public landing page bundle
- [ ] Add `check:frontend` + `check:backend` + `check` orchestration scripts and gate CI on both

---

## Misc Notes (Carry-Forward)
- Auditor requirement: do not reuse last 5 passwords (enforce in `passwordController.ts`)
- Vite HMR refresh plugin fix still pending
- Consider React Query (TanStack Query) for server state instead of ad-hoc `useEffect` fetching — defer to post-MVP

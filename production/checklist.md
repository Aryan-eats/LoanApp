# Error Handling & Edge Cases Checklist (PostgreSQL/Prisma Edition)

> GPS India Loan Portal - Security & Robustness Audit
> Updated: February 14, 2026

## Progress Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Security Vulnerabilities | 5 | 0 | 5 |
| Race Conditions | 3 | 3 | 0 |
| Input Validation | 5 | 0 | 5 |
| Audit Logging | 3 | 0 | 3 |
| Rate Limiting | 2 | 2 | 0 |
| Frontend Robustness | 4 | 1 | 3 |
| Financial Calculations | 2 | 0 | 2 |
| Infrastructure | 2 | 1 | 1 |
| Completed & Verified | 4 | 4 | 0 |
| **TOTAL** | **30** | **11** | **19** |

---

## Phase 1: Critical Security & Infrastructure (Year 1, Q1)

### [ ] Authentication & Authorization (P0)
- [ ] **Public Endpoint Without Authentication**
  - Location: `backend/src/routes/leadsRoutes.ts:77`
  - Issue: `PATCH /:id/preferred-bank` allows anyone to modify any lead if they have the UUID.
  - Fix: Add token verification or lead-specific access key.
- [ ] **No CSRF Protection**
  - Location: `backend/src/routes/leadsRoutes.ts`
  - Issue: Public POST endpoints vulnerable to forgery.
  - Fix: Implement CSRF tokens or enforce strict SameSite cookies.
- [ ] **IP Spoofing in Audit Logs**
  - Location: `backend/src/utils/auditLogger.ts:22-26`
  - Issue: `x-forwarded-for` used without validation.
  - Fix: Use a trusted proxy middleware (e.g., `express` trust proxy setting) and validate headers.
- [ ] **MSG91 Widget Token Exposed in Client**
  - Location: `src/hooks/useMsg91.ts:47-56`
  - Issue: `tokenAuth` is hard-coded in the client bundle; it can be extracted and reused.
  - Fix: Move token issuance to backend or use a short-lived, server-generated token.
- [ ] **Partner Phone Verification Token Mismatch**
  - Location: `src/components/onboarding/StepBasicIdentity.tsx`, `backend/src/services/otpChallengeService.ts`, `backend/src/controllers/authController.ts:registerPartner`
  - Issue: Frontend stores `data.message` from MSG91 as `phoneVerificationToken`, but backend expects the internal `verificationToken` from `/auth/verify-otp`.
  - Fix: Either use `/auth/verify-otp` to obtain `verificationToken` or add a backend bridge that exchanges MSG91 tokens for internal verification tokens.

### [ ] Rate Limiting (P0)
- [x] **Lead Submission Rate Limit**
  - Location: `backend/src/index.ts:84`, `backend/src/routes/leadsRoutes.ts:11`
  - Issue: Public lead creation can be spammed.
  - Fix: Covered by global `apiLimiter` (100/15m in prod) applied to `/api`.
- [x] **Auth Route Rate Limiter**
  - Location: `backend/src/routes/authRoutes.ts`
  - Issue: Brute force possible on login/OTP endpoints.
  - Fix: `loginLimiter`, `registerLimiter`, `otpLimiter`, and `passwordResetLimiter` are applied.

### [ ] Infrastructure Issues (P0)
- [x] **Redis KEYS Command in Production**
  - Location: `backend/src/utils/tokenBlacklist.ts:95`
  - Issue: `redis.keys()` is O(N) and blocks the event loop.
  - Fix: Replaced with `redis.scan()` cursor-based iteration.
- [ ] **Audit Log Silent Failure**
  - Location: `backend/src/utils/auditLogger.ts:58-61`
  - Issue: Failures are only logged to console, could be lost in production.
  - Fix: Implement a retry queue or fallback to file logging for critical audit events.

---

## Phase 2: Data Integrity & Validation (Year 1, Q1-Q2)

### [ ] Input Validation (P1)
- [ ] **UUID Format Validation**
  - Location: All routes with `:id`
  - Issue: Invalid UUID strings might cause Prisma to throw or server to return 500.
  - Fix: Add `validateUUID` middleware for all ID parameters.
- [ ] **Loan Amount Constants**
  - Location: `backend/src/controllers/leadController.ts:128`, `backend/src/routes/leadsRoutes.ts`
  - Issue: No min/max validation (e.g., 10k to 10Cr).
  - Fix: If loan amount > 100,000,000 throw custom message: "Contact office for high-value loans".
- [ ] **Pagination Limits**
  - Location: `leadController.ts:219`, `partnerController.ts:78`
  - Issue: `limit` isn't capped (e.g., user could request `limit=100000`).
  - Fix: Enforce `Math.min(limit, 100)`.
- [ ] **Form Data Sanitization**
  - Location: All Create/Update controllers.
  - Issue: Potential XSS in string fields (firstName, businessName).
  - Fix: Use `dompurify` or simple string sanitization on input.
- [ ] **Public Lead Payload Validation**
  - Location: `backend/src/routes/leadsRoutes.ts`
  - Issue: No format checks for `phone`, `email`, `loanAmount` numeric/NaN; only required-field checks.
  - Fix: Add `express-validator` rules for formats and reject invalid/negative amounts.

### [ ] Financial Calculation Safety (P1)
- [ ] **Currency Precision**
  - Issue: Schema uses `Decimal` but JS might convert to `Number` (float).
  - Fix: Ensure `Decimal.js` or similar is used for all server-side calculations.
- [ ] **EMI Calculator Input Check**
  - Location: `src/components/EmiCalculator.tsx`
  - Issue: Zero interest or tenure leads to `Infinity` or `NaN`.
  - Fix: Add rigorous validation before math operations.

---

## Phase 3: Monitoring & Logging (Year 1, Q2)

### [ ] Audit Logging Gaps (P1)
- [ ] **Password Change Not Logged**
  - Location: `backend/src/controllers/profileController.ts`
  - Fix: Add `logAuditEvent('PASSWORD_CHANGE', ...)`
- [ ] **Account Deletion Not Logged**
  - Location: `backend/src/controllers/profileController.ts`
  - Fix: Add audit trail for account deactivation.
- [ ] **Lead Export Log**
  - Issue: Admin exporting lead data should be tracked.
  - Fix: Log access when large lists of leads are fetched.

### [ ] Race Conditions (P1)
- [x] **Lead Timeline Corruption** (Fixed via Prisma `$transaction`)
- [x] **Lead Status Update Race** (Fixed via Prisma `$transaction`)
- [x] **Token Refresh Race Condition**
  - Location: `src/api/apiClient.ts`
  - Issue: Simultaneous requests triggering multiple refresh calls.
  - Fix: `isRefreshing` + subscriber queue implemented.

---

## Phase 4: Frontend Robustness & UX (Year 1, Q3)

### [ ] Error Handling (P2)
- [ ] **Centralized API Error Wrapper**
  - Location: `src/api/`
  - Issue: Many API calls lack try/catch, leading to unhandled promise rejections.
  - Fix: Wrap all `apiClient` calls in a utility that maps HTTP errors to user-friendly messages.
- [ ] **AbortController for Hooks**
  - Location: `src/hooks/useFetch.ts`
  - Issue: Requests continue after component unmount.
  - Fix: Link `AbortController` signal to component lifecycle.
- [ ] **Session Expiry Warning**
  - Issue: User suddenly logged out during form filling.
  - Fix: Show modal 5 minutes before token expiry.

### [x] State Management Memory
- [x] **Cleanup setTimeouts**
  - Location: `src/hooks/useApplicationForm.ts:146`
  - Issue: Navigation/State updates inside timeout after unmount.
  - Fix: Timeout stored in `useRef` with `useEffect` cleanup on unmount.

---

## Completed & Verified (Auto-Fixed by Migration)

- [x] **ReDoS Vulnerability in Search**: Prisma `contains` with PostgreSQL `mode: 'insensitive'` handles indexing and special characters safely without raw regex.
- [x] **Sort Field Injection**: `leadController.ts` now uses an `allowedSortFields` whitelist.
- [x] **Timeline Atomicity**: Timeline entries are now created within a Prisma transaction block.
- [x] **Status Update Integrity**: Status changes and timeline logs are now wrapped in `$transaction`.

---

## Technical Notes

- **DB Stack**: PostgreSQL + Prisma ORM.
- **ID Strategy**: UUID v4 (Primary Key).
- **Audit Tooling**: Prisma-based `AuditLog` model + `logAuditEvent` utility.
- ~~**Critical To-Do**: Change `tokenBlacklist.ts` to use `SCAN` instead of `KEYS`.~~ ✅ Done — now uses `redis.scan()`.

# Code Quality and Scalability Optimization Plan

## Audit Snapshot (2026-03-01)

### Repo profile
- TS/TSX files scanned: **193** (`src` + `backend/src`)
- Test files: **14** total (frontend + backend)
- Largest files include:
  - `src/data/DocsReq.ts` (**1339 lines**)
  - `backend/src/controllers/authController.ts` (**1024 lines**)
  - `src/partner/pages/AddClientPage.tsx` (**895 lines**)
  - `src/admin/pages/DocumentsPage.tsx` (**827 lines**)
  - `backend/src/routes/adminRoutes.ts` (**772 lines**)

### Current health checks
- Frontend lint: **fails** (`npm run lint`) with **108 problems** (107 errors, 1 warning)
- Frontend tests: **fails** (`npm run test`) with **6 failed / 25 total**
- Frontend build: **fails** (`npm run build`) due unused symbol in `src/pages/CustomerUploadPage.tsx:129`
- Backend tests: **passes** (`backend/npm run test`) with **100 passed / 42 skipped**
- Backend build: **fails** (`backend/npm run build`) due missing `mongodb` module in `src/scripts/migPostgres.ts`

---

## Priority Findings and Fixes

## P0 - Restore reliable quality gates (do first)

### 1) Lint scope is too broad and includes generated/archived files
Evidence:
- Lint errors reported from `backend/dist/**/*.d.ts` and `production/migration-archive/**`.

Impact:
- CI signal is noisy and blocks merges for non-source artifacts.

Fix:
1. Update root ESLint config ignores to include:
   - `backend/dist/**`
   - `production/migration-archive/**`
   - optionally `**/*.d.ts` for generated declaration output
2. Add package-level lint scripts:
   - `lint:frontend` -> `eslint src`
   - `lint:backend` -> `eslint backend/src`

### 2) Build pipelines are blocked by avoidable errors
Evidence:
- Frontend build fails on `src/pages/CustomerUploadPage.tsx:129` (`formatFileSize` unused).
- Backend build fails because `backend/src/scripts/migPostgres.ts` imports `mongodb` but dependency is absent.

Impact:
- No dependable production build gate.

Fix:
1. Remove/consume unused symbol in `CustomerUploadPage.tsx`.
2. For backend script issue, choose one:
   - install `mongodb` in backend deps, or
   - move migration scripts outside production `tsc` include, or
   - split `tsconfig` into app vs script builds.

### 3) React 19 hook-rule violations are concentrated in shared hooks/components
Evidence from lint:
- `src/hooks/useFetch.ts` (ref writes during render)
- `src/hooks/useLocalStorage.ts` (ref writes during render)
- `src/hooks/useMediaQuery.ts`, `src/components/Navbar.tsx`, `src/components/shared/OptimizedImage.tsx`, `src/hooks/useApplicationForm.ts` (setState in effect warnings)

Impact:
- Render instability risk, hard-to-debug behavior, and future React upgrade friction.

Fix:
1. Refactor shared hooks first (`useFetch`, `useLocalStorage`, `useMediaQuery`, `usePrevious`).
2. Replace render-time ref mutation with effect/event-driven updates.
3. Add regression tests around these hooks before refactor.

### 4) Frontend tests are brittle and out of sync with behavior
Evidence:
- `src/tests/leadsApi.test.ts` endpoint expectation mismatch.
- `src/tests/useFetch.test.ts` stale assumptions + missing `act()` usage.
- `src/tests/LeadDetailsModal.test.tsx` ambiguous text selectors and interaction mismatch.

Impact:
- Test suite cannot protect refactors.

Fix:
1. Stabilize tests using role/label selectors instead of duplicate raw text matching.
2. Align test expectations with actual API routes.
3. Add helper factories for lead fixtures to reduce test drift.

---

## P1 - Reduce structural complexity for maintainability

### 5) Several "god files" are beyond maintainable size
High-risk files:
- `backend/src/controllers/authController.ts` (1024 lines)
- `backend/src/routes/adminRoutes.ts` (772 lines)
- `backend/src/controllers/leadController.ts` (797 lines)
- `src/partner/pages/AddClientPage.tsx` (895 lines)
- `src/admin/pages/DocumentsPage.tsx` (827 lines)

Impact:
- High change risk, merge conflicts, low onboarding speed.

Fix:
1. Introduce target file-size guardrails (soft limit ~300-400 lines).
2. Split by responsibility:
   - backend: `routes` (validation + transport), `services` (business logic), `repositories` (Prisma query modules)
   - frontend: page shell + feature sections + hooks + mappers
3. Enforce no-new-large-file policy in PR checklist.

### 6) Type safety is eroded by repeated `any` in critical paths
Evidence:
- Heavy `any` usage in admin/audit code (`backend/src/routes/adminRoutes.ts`, `backend/src/controllers/*`, `src/admin/pages/DocumentsPage.tsx`, `src/admin/hooks/useLeadsManager.ts`).

Impact:
- Runtime bugs slip through compile-time checks; API contracts drift.

Fix:
1. Create typed DTO mappers for audit logs/leads responses.
2. Replace `as any` audit event casts with strict union typing from Prisma enums.
3. Add `zod` (or equivalent) schema validation at API boundaries for external inputs.

### 7) Duplicate component implementations increase divergence risk
Evidence:
- Two different `PrefetchLink` implementations:
  - `src/components/PrefetchLink.tsx`
  - `src/components/shared/PrefetchLink.tsx`
- Parallel component variants (`StatsCard`, `StatusBadge`) across admin/partner.

Impact:
- Inconsistent behavior and duplicated maintenance.

Fix:
1. Consolidate duplicated components into shared primitives with variant props.
2. Keep domain-specific wrappers thin.

---

## P2 - Scalability and performance improvements

### 8) Audit logs endpoint is offset-paginated and does multiple expensive counts
Evidence:
- `backend/src/routes/adminRoutes.ts` uses `skip/take` plus multiple `count()` queries per request.
- Frontend (`src/admin/pages/AuditLogsPage.tsx`) auto-refreshes every 15s.

Impact:
- Cost grows with dataset size; dashboard refresh amplifies DB load.

Fix:
1. Move audit list to cursor pagination (`createdAt,id` cursor).
2. Cache summary counts briefly (15-30s) or compute asynchronously.
3. Add API support for incremental fetch (`since` cursor) for polling.
4. Move CSV export (>10k rows) to async job + downloadable artifact.

### 9) Oversized static document config in frontend bundle
Evidence:
- `src/data/DocsReq.ts` is 1339 lines / 45KB and static.

Impact:
- Bundle weight and memory overhead on clients.

Fix:
1. Move doc requirements to backend source-of-truth (`lender_doc_requirements`) only.
2. Fetch per lender/loan with cache and schema versioning.
3. Keep frontend fallback as minimal seed subset only.

### 10) Mixed icon stacks increase bundle surface
Evidence:
- `@mui/icons-material` still used in key pages (`AddClientPage`, `MyLeadsPage`, `admin/DocumentsPage`) while `lucide-react` is also present.

Impact:
- Larger dependency graph and slower builds.

Fix:
1. Standardize to one icon library (prefer existing `lucide-react` footprint).
2. Replace high-traffic page icon imports first.

---

## P3 - Operational hardening

### 11) Missing monorepo-style task boundaries
Issue:
- Root scripts run over mixed frontend/backend/archives without clear separation.

Fix:
1. Add orchestrated scripts:
   - `check:frontend` -> typecheck + lint + test (frontend)
   - `check:backend` -> typecheck + lint + test (backend)
   - `check` -> run both
2. Gate CI on both checks.

### 12) Encoding inconsistencies (mojibake) in comments/strings
Evidence:
- Garbled unicode separators visible in files like `backend/src/index.ts`, `src/api/apiClient.ts`, `backend/src/utils/cache.ts`.

Impact:
- Readability and tooling inconsistencies.

Fix:
1. Normalize all source files to UTF-8.
2. Add `.editorconfig` and formatting pre-commit checks.

---

## Recommended Execution Plan

## Week 1 (stabilization)
1. Fix lint ignores and split lint scripts.
2. Unblock frontend and backend builds.
3. Resolve React hook-rule errors in shared hooks/components.
4. Fix failing frontend tests and make test suite green.

## Week 2 (maintainability)
1. Refactor `adminRoutes`, `authController`, and one large frontend page (`AddClientPage`) into modules.
2. Replace `any` in audit/leads paths with typed DTOs.
3. Consolidate duplicate shared components.

## Week 3 (scalability)
1. Implement cursor-based audit-log API.
2. Reduce audit dashboard polling payload.
3. Move heavy docs config from frontend static file to API-first model.
4. Standardize icons to reduce bundle surface.

---

## Acceptance Criteria

1. `npm run lint` passes with source-only scope and zero errors.
2. Frontend `npm run test` passes with stable selectors and no flaky failures.
3. Frontend + backend `npm run build` pass in CI.
4. No files above 500 lines in newly touched code; large legacy files tracked in refactor backlog.
5. Audit logs page can paginate large datasets without linear slowdown.
6. `DocsReq` static payload is removed or reduced to a lightweight fallback.

---

## Immediate Next Fixes (highest ROI)

1. Fix ESLint ignore scope and split scripts by package.
2. Repair `useFetch` and related shared hooks for React 19 compliance.
3. Make failing frontend tests green (`leadsApi`, `useFetch`, `LeadDetailsModal`).
4. Resolve backend `mongodb` build blocker in migration script strategy.
5. Start extracting `adminRoutes` audit + banks flows into dedicated route modules.

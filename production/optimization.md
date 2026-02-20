# Web App Navigation Optimization Guide

## Goal
Make route transitions and page interactions feel smooth by reducing hard reloads, duplicate API calls, and expensive first-load work.

## What is currently slowing navigation

### 1) Auth guard remount causes spinner flashes on protected-route navigation
- `src/components/ProtectedRoute.tsx:20` initializes `isChecking` to `true` on every mount.
- `src/components/ProtectedRoute.tsx:34` shows full-screen loader while `isChecking` is true.
- `src/App.tsx:92` to `src/App.tsx:101` wraps each admin route individually with `ProtectedRoute`, so every admin route change remounts it.

Impact:
- Route-to-route transitions in admin feel blocked even when already authenticated.

### 2) Hard page reloads instead of SPA navigation
- `src/admin/pages/AdminDashboard.tsx:283` uses `<a href="/admin/leads">`.
- `src/partner/components/PartnerHeader.tsx:184`, `src/partner/components/PartnerHeader.tsx:190`, `src/partner/components/PartnerHeader.tsx:196` use `<a href="/partner/...">`.
- `src/partner/components/PartnerHeader.tsx:81` and `src/partner/components/PartnerSidebar.tsx:65` use `window.location.href = '/login'`.

Impact:
- Full document reload, JS re-bootstrap, and extra auth checks.

### 3) Duplicate leads fetching across partner layout/pages
- `src/partner/components/PartnerSidebar.tsx:36` fetches leads on mount.
- `src/partner/pages/PartnerDashboard.tsx:28`, `src/partner/pages/MyLeadsPage.tsx:89`, `src/partner/pages/ProfilePage.tsx:129` also fetch leads.

Impact:
- Extra API traffic and UI waiting during navigation.

### 4) Route mismatch breaks flow and can create perceived lag
- App route is `credit-check`: `src/App.tsx:108`.
- Navigation points to `eligibility`: `src/partner/components/PartnerSidebar.tsx:48`, `src/partner/pages/PartnerDashboard.tsx:289`, `src/partner/pages/AddClientPage.tsx:235`.

Impact:
- Dead route / wrong destination, extra retries and confusion.

### 5) Scroll handler updates state on every scroll tick
- `src/components/Navbar.tsx:25` attaches scroll listener and toggles visibility state every scroll movement.

Impact:
- Re-render pressure on public pages; can feel janky on lower-end devices.

### 6) Bundle pressure from icon package and large shared data chunk
- Build observation: `npx vite build` transformed ~12,901 modules.
- Core chunk is large: `dist/assets/index-*.js` ~315 kB (gzip ~102 kB).
- `@mui/icons-material` emits very large warning volume and contributes heavy processing.
- `dist/assets/loanProducts-*.js` ~103 kB (gzip ~37 kB).

Impact:
- First-route and first-time chunk load delays.

## Priority plan (do in this order)

### P0 (same day, biggest perceived gain)
1. Use nested protected routes so auth check is done once per section.
2. Replace all internal `<a href="/...">` with `<Link to="...">`.
3. Replace `window.location.href` logout redirects with `useNavigate()` after logout.
4. Fix `/partner/eligibility` to `/partner/credit-check` everywhere.

### P1 (1-2 days)
1. Deduplicate leads fetches with store-level TTL cache (for example 30-60 seconds).
2. Move partner profile summary fetch to shared store/context so header does not refetch on each layout mount.
3. Throttle/debounce navbar scroll visibility updates with `requestAnimationFrame` and only update when direction actually changes.

### P2 (2-4 days)
1. Remove `@mui/icons-material` usage in partner pages and standardize on `lucide-react`.
2. Split heavy static data (`loanProducts`) by feature or lazy-load where needed.
3. Add route prefetch on hover/focus for heavy dashboard pages.

## Implementation notes

### A) Protected route nesting pattern
- Keep one parent protected route for `/admin/*` and one for `/partner/*`.
- Child routes render via `<Outlet />` to avoid remount spinner loop.

### B) Store caching pattern for leads
- In `leadsStore`, track `lastFetchedAt` and skip network calls when cache is fresh unless `force=true`.
- This alone will remove repeated fetches during quick route changes.

### C) Navigation consistency
- Use React Router navigation everywhere for in-app routes.
- Keep `<a>` only for external links (`mailto:`, `tel:`, docs outside app).

## Suggested performance acceptance criteria
1. Protected route-to-route transition in admin/partner without full-screen spinner flash.
2. No full page reload for internal nav links (verify via Network tab: no new `index.html` fetch).
3. Max one leads fetch during initial partner section load, none on immediate sibling route switch.
4. Lighthouse: improved TBT/INP and faster route interaction readiness.

## Quick verification checklist
1. Open DevTools Network and filter `partner/leads`; navigate Partner Dashboard -> My Leads -> Profile.
2. Confirm internal nav clicks do not request document again.
3. Confirm `/partner/credit-check` works from sidebar, dashboard CTA, and Add Client redirect.
4. Run build after fixes and compare chunk sizes and module count.

## Important current repo note
`npm run build` currently fails type-checking due existing audit-log type mismatch in `src/admin/data/placeholderData.ts` (`timestamp` field not in `AuditLog`). Fix that separately so CI build gating can reflect performance changes reliably.

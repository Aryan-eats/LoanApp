# Backend API Performance Review

> GPS India Loan Portal — Performance Audit
> Generated: March 2026

---

## 1. Database & Queries

---

### 🔴 [Critical] — Auth Middleware Hits DB on Every Single Request

- **File/Endpoint:** `backend/src/middleware/auth.ts` → ALL protected routes
- **Problem:** The `protect` middleware calls `prisma.user.findUnique({ where: { id: payload.sub } })` on **every authenticated request**. With the field-encryption Prisma extension active, this also triggers a decrypt cycle on ~9 fields. This is the single biggest latency contributor. Every API call pays a ~20-50ms tax for a full User row read + decryption.
- **Fix:** Cache the user object in Redis keyed by user ID with a short TTL (30-60s), and invalidate on profile/role/status changes:

```typescript
// middleware/auth.ts
import { cacheWrap, cacheDelete } from '../utils/cache.js';

const user = await cacheWrap(
  `auth:user:${payload.sub}`,
  () => prisma.user.findUnique({ where: { id: payload.sub } }),
  60 // 60-second TTL
);
```

Invalidate `auth:user:{userId}` in `updateProfile`, `updateUser`, `updatePartnerStatus`, etc.

Alternatively, embed `isActive` in the JWT claims and only hit DB when you need the full user object (not on every request).

- **Expected Impact:** Eliminates 1 DB query + decryption per request. **~60-80% reduction in baseline latency** for all protected routes.

---

### 🔴 [Critical] — Audit Log Checksum Queries the Last Log on Every Write

- **File/Endpoint:** `backend/src/utils/auditLogger.ts` → Every audit-logged route
- **Problem:** `getLastChecksum()` calls `prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' } })` on **every audit event**. Since audit logging is fire-and-forget on most routes (login, lead CRUD, document ops), this adds a sequential DB read to every mutating endpoint. Under concurrent requests, audit writes can also race, producing duplicate checksums.
- **Fix:** Cache the last checksum in Redis (or a module-level variable) and update it after each write:

```typescript
let lastChecksumCache: string | null = null;

const getLastChecksum = async (): Promise<string | null> => {
  if (lastChecksumCache !== null) return lastChecksumCache;
  // Bootstrap from DB only once
  const last = await prisma.auditLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { checksum: true },
  });
  lastChecksumCache = last?.checksum ?? null;
  return lastChecksumCache;
};

// After creating the audit log entry:
lastChecksumCache = checksum;
```

- **Expected Impact:** Removes 1 DB query per audit event. Since most routes emit 1-3 audit events, this saves **1-3 extra DB round trips per request**.

---

### 🔴 [Critical] — `listUsers` Returns All Users With No Pagination

- **File/Endpoint:** `backend/src/controllers/adminController.ts` → `GET /api/admin/users`
- **Problem:** `prisma.user.findMany({ orderBy: { createdAt: 'desc' } })` returns **all users** with **all columns** (including encrypted fields that must be decrypted). No pagination, no field selection. As user count grows, this becomes extremely slow.
- **Fix:** Add pagination and select only needed fields:

```typescript
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, isActive: true, isEmailVerified: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  res.status(200).json({
    success: true,
    data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
};
```

- **Expected Impact:** Reduces data transfer by 70-90%, eliminates unnecessary field decryption.

---

### 🔴 [Critical] — `listPartners` (Admin) Fetches All Partners + N+1 Lead Count

- **File/Endpoint:** `backend/src/controllers/adminController.ts` → `GET /api/admin/partners`
- **Problem:** Fetches **all partners** (no pagination), then does a separate `groupBy` for lead counts. Both queries fetch all data. Also returns all columns including encrypted PAN/Aadhaar/account numbers that get decrypted.
- **Fix:** Add pagination (same pattern as `getPartners` in partnerController, which already does it), add `select` to avoid decrypting sensitive fields unless explicitly needed.
- **Expected Impact:** ~80% faster for large partner lists.

---

### 🟡 [Medium] — `getLeads` Always Includes Documents & Timeline

- **File/Endpoint:** `backend/src/controllers/leadController.ts` → `GET /api/partner/leads`, `GET /api/admin/leads`
- **Problem:** Every lead list query uses `include: { documents: true, timeline: true }`, joining 2 extra tables. For a list view showing 20 leads, this pulls potentially 100+ document rows and 200+ timeline rows that the list UI doesn't display.
- **Fix:** Only include relations when getting a single lead. For list endpoints, omit them or use `_count`:

```typescript
// For list endpoint
const leads = await prisma.lead.findMany({
  where, orderBy: { [sortField]: sortOrder },
  skip, take: limit,
  include: {
    _count: { select: { documents: true, timeline: true } },
  },
});
```

- **Expected Impact:** Reduces query time and payload size by ~50-70% on list endpoints.

---

### 🟡 [Medium] — `updateLead` Reads Full Lead Again After Transaction

- **File/Endpoint:** `backend/src/controllers/leadController.ts` → `PUT /api/partner/leads/:id`
- **Problem:** After `$transaction` (which already updates the lead), there's an additional `findUnique` with includes. The updated lead should be returned from the transaction instead.
- **Fix:** Return the updated lead from inside the transaction or use the `returning` pattern:

```typescript
const updatedLead = await prisma.$transaction(async (tx) => {
  const updated = await tx.lead.update({
    where: { id: leadId },
    data: updateData,
    include: { documents: true, timeline: true },
  });
  if (statusChanged) { /* create timeline */ }
  return updated;
});
```

- **Expected Impact:** Eliminates 1 extra DB query per lead update.

---

### 🟡 [Medium] — `getPartnerById` Makes 2 Sequential Queries

- **File/Endpoint:** `backend/src/controllers/partnerController.ts` → `GET /api/partners/:id`
- **Problem:** First finds the user, then counts leads in a separate sequential query.
- **Fix:** Use `Promise.all` or include `_count`:

```typescript
const user = await prisma.user.findFirst({
  where: { id: partnerId, role: 'partner' },
  include: { _count: { select: { leads: true } } },
});
```

- **Expected Impact:** Reduces from 2 DB round trips to 1.

---

### 🟡 [Medium] — `getCurrentPartnerProfile` is Duplicate of `getPartnerById`

- **File/Endpoint:** `backend/src/controllers/partnerController.ts` → `GET /api/partner/profile`
- **Problem:** Fetches the user again from DB even though `req.user` is already populated by the auth middleware. Then makes a separate lead count query.
- **Fix:** Use `req.user` directly and issue only the lead count:

```typescript
const leadCount = await prisma.lead.count({ where: { partnerId: req.user.id } });
res.json({ success: true, data: { partner: formatPartnerResponse(req.user, leadCount) } });
```

- **Expected Impact:** Eliminates 1 unnecessary DB query.

---

### 🟡 [Medium] — Missing Composite Index for Lead Search

- **File/Endpoint:** `backend/src/controllers/leadController.ts` → `GET /api/partner/leads` (with `search` param)
- **Problem:** Text search on `clientFullName`, `clientPhone`, `clientEmail` uses `contains` + `mode: insensitive` which triggers sequential scans. No trigram/GIN index exists.
- **Fix:** Add a PostgreSQL GIN trigram index in a migration:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX leads_client_search_trgm ON leads
  USING GIN (client_full_name gin_trgm_ops, client_phone gin_trgm_ops, client_email gin_trgm_ops);
```

- **Expected Impact:** 5-10x faster text search as data grows.

---

### 🟡 [Medium] — No `select` on User Queries → Unnecessary Decryption

- **File/Endpoint:** Multiple — `adminController.ts`, `partnerController.ts`, `profileController.ts`
- **Problem:** Most user queries fetch all 40+ columns. The field-encryption extension runs decrypt on ~9 fields (aadhaarNumber, panNumber, gstNumber, accountNumber, ifscCode, upiId, otpHash, resetPasswordToken, refreshToken) for every read. Many endpoints don't need these fields.
- **Fix:** Always use `select` to fetch only needed columns. This skips decryption for fields not selected.
- **Expected Impact:** 30-50% faster user reads by avoiding unnecessary AES-256-GCM decryption.

---

## 2. Caching

---

### 🔴 [Critical] — No Response Compression

- **File/Endpoint:** `backend/src/index.ts` → All routes
- **Problem:** No `compression` middleware is installed. JSON responses (especially lead lists, audit logs, partner lists) are sent uncompressed. A typical 20-lead response with documents/timeline can be 50-100KB raw.
- **Fix:**

```bash
npm install compression @types/compression
```

```typescript
import compression from 'compression';
app.use(compression()); // Add before routes
```

- **Expected Impact:** 60-80% reduction in response payload size → directly reduces "ms" times seen by clients.

---

### 🟡 [Medium] — `getLeadStats` / `getStats` Cache TTL Too Short

- **File/Endpoint:** `leadController.ts` (30s), `adminController.ts` (60s)
- **Problem:** Stats are expensive (multiple `groupBy` + `count` queries) but cached for only 30-60 seconds. Under active admin usage, the cache is constantly cold.
- **Fix:** Increase TTL to 5 minutes and invalidate on lead creation/status change (you already call `cacheDelete` on mutations — just extend TTL):

```typescript
const data = await cacheWrap(cacheKey, fetchStats, 300); // 5 minutes
```

- **Expected Impact:** 80% cache hit rate improvement for dashboard endpoints.

---

### 🟡 [Medium] — `getProfile` is Uncached Despite Being Called on Every Page Load

- **File/Endpoint:** `backend/src/controllers/profileController.ts` → `GET /api/profile`
- **Problem:** Hits DB every time. This is typically called on every page navigation to verify the session.
- **Fix:** Since `protect` middleware already loads `req.user`, just use that:

```typescript
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json(/*...*/); return; }
  res.status(200).json({ success: true, data: { user: formatUserResponse(req.user) } });
};
```

- **Expected Impact:** Eliminates 1 DB query per page load.

---

### 🟢 [Minor] — No HTTP Cache Headers for Static-ish Resources

- **File/Endpoint:** `GET /api/documents/req-docs`, `GET /api/admin/banks`, `GET /api/documents/req-docs/flat`
- **Problem:** Reference data (doc requirements, bank list) changes rarely but no `Cache-Control` headers are set. Clients refetch on every visit.
- **Fix:** Add `Cache-Control` headers:

```typescript
res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
```

- **Expected Impact:** Reduces redundant API calls from browser/frontend.

---

## 3. Payload & Serialization

---

### 🔴 [Critical] — `getUser` and `createUser` Return Full User Object (Including Hashed Password)

- **File/Endpoint:** `backend/src/controllers/adminController.ts` → `GET /api/admin/users/:id`, `POST /api/admin/users`
- **Problem:** `res.json({ data: { user } })` returns the raw Prisma object including `password`, `refreshToken`, `resetPasswordToken`, `otpHash`, and all encrypted fields. This is both a security issue and a payload bloat problem.
- **Fix:** Use `formatUserResponse()` (already exists in authService.ts) for all user-returning endpoints, or add `select` to the query.
- **Expected Impact:** Reduces payload size and eliminates sensitive data exposure.

---

### 🟡 [Medium] — `getPartnerCommissions` Fetches All Disbursed Leads Without Pagination

- **File/Endpoint:** `backend/src/controllers/partnerController.ts` → `GET /api/partners/:id/commissions`
- **Problem:** Fetches all disbursed leads for a partner with no pagination. Returns all lead columns when only commission-related fields are needed.
- **Fix:** Add pagination and select only necessary fields:

```typescript
const leads = await prisma.lead.findMany({
  where: { partnerId, status: 'disbursed', commissionAmount: { gt: 0 } },
  orderBy: { updatedAt: 'desc' },
  skip, take: limit,
  select: {
    id: true, clientFullName: true, loanType: true,
    disbursedAmount: true, loanAmount: true,
    commissionRate: true, commissionAmount: true,
    commissionStatus: true, commissionPaidAt: true, createdAt: true,
  },
});
```

- **Expected Impact:** Faster response, smaller payload.

---

## 4. Concurrency & Async

---

### 🔴 [Critical] — Audit Logging Blocks the Response

- **File/Endpoint:** Multiple controllers — every route that calls `logAuditEvent` **after** `res.json()`
- **Problem:** While many controllers do `res.json()` then `await logAuditEvent(...)`, Express has already written the response headers but the handler still `await`s the audit DB write. If audit logging is slow (which it is, due to the checksum query), it delays the handler's `return` and ties up the event loop. More critically, several controllers call `logAuditEvent` **before** sending the response (e.g., login flow takes multiple audit calls).
- **Fix:** Make audit logging fully fire-and-forget. Don't `await` it after the response:

```typescript
res.status(200).json({ success: true, data });
// Fire-and-forget — don't await
logAuditEvent('LEAD_UPDATED', req, opts).catch(err =>
  console.error('Audit log failed:', err)
);
```

Better yet, push audit events to a Redis queue and process them in a background worker.

- **Expected Impact:** Eliminates audit logging latency from response time. **50-200ms saved per request** with audit events.

---

### 🟡 [Medium] — Login Flow Has 5-6 Sequential DB Operations

- **File/Endpoint:** `backend/src/controllers/authController.ts` → `POST /api/auth/login`
- **Problem:** Login executes sequentially: find user → compare password → resetLoginAttempts → generate fingerprint → checkSuspiciousActivity → update user (lastLogin + refreshToken) → addSession → logAuditEvent → sign tokens. Many of these can be parallelized.
- **Fix:** After password verification, parallelize the non-dependent operations:

```typescript
// After isMatch confirmed
const fingerprint = generateDeviceFingerprint(req); // sync

const refreshToken = signRefreshToken(user as User);
const accessToken = signAccessToken(user as User);

// Parallelize DB writes
await Promise.all([
  resetLoginAttempts(user.id),
  prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      refreshToken: hashToken(refreshToken),
      refreshTokenExpires: refreshExpiresAt ? new Date(refreshExpiresAt) : null,
    },
  }),
  addSession(user.id, {
    deviceFingerprint: fingerprint,
    userAgent: req.headers['user-agent'] || '',
    ip: getClientIP(req),
  }),
]);

// Send response first, then audit
res.json({ success: true, data: { ... } });
logAuditEvent('LOGIN_SUCCESS', req, { ... }).catch(console.error);
```

- **Expected Impact:** Reduces login latency by ~30-40%.

---

### 🟡 [Medium] — `bcrypt.genSalt(12)` is CPU-Intensive

- **File/Endpoint:** `backend/src/services/userService.ts` → Registration, password reset
- **Problem:** Salt rounds of 12 takes ~250ms on a typical server. This is a blocking CPU operation in the event loop.
- **Fix:** Reduce to 10 rounds (still secure, ~60ms) or offload to a worker thread:

```typescript
const salt = await bcrypt.genSalt(10); // ~60ms instead of ~250ms
```

- **Expected Impact:** 3-4x faster registration/password operations.

---

## 5. Code Structure

---

### 🔴 [Critical] — Field Encryption Extension Runs on Every Query for Every Model

- **File/Endpoint:** `backend/src/utils/fieldEncryption.ts` → All Prisma operations
- **Problem:** The `$allModels.$allOperations` hook runs on **every Prisma query** and checks `shouldHandleModel`. Even for models without encrypted fields (LeadDocument, LeadTimeline, AuditLog, Bank, etc.), the hook is invoked. For models with encrypted fields, it iterates through all fields on every read/write. This is especially impactful because `auth.ts` loads a full User on every request.
- **Fix:** The `basePrisma` pattern is already used for some queries but inconsistently. Ensure:
  1. Use `basePrisma` for all queries on tables without encrypted fields (Lead, LeadDocument, LeadTimeline, AuditLog, Bank, etc.)
  2. For the auth middleware user lookup, if you cache the user (fix #1), this becomes moot. Otherwise, use `select` to exclude encrypted fields you don't need.
- **Expected Impact:** Eliminates unnecessary extension overhead on ~60% of queries.

---

### 🟡 [Medium] — Security Headers Middleware is After Routes

- **File/Endpoint:** `backend/src/index.ts`
- **Problem:** The security headers middleware (`X-Content-Type-Options`, `X-Frame-Options`, etc.) is registered **after** all routes. Express middleware runs in order, so these headers are never applied to API responses. They only reach the 404 handler.
- **Fix:** Move the middleware **before** the routes:

```typescript
// Move BEFORE app.use('/api', ...) routes
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

- **Expected Impact:** Security fix (not performance), but also avoids a wasteful middleware call that never hits real routes.

---

### 🟡 [Medium] — `getAllowedOrigins()` is Called on Every Request

- **File/Endpoint:** `backend/src/index.ts`
- **Problem:** `getAllowedOrigins()` parses `process.env.ALLOWED_ORIGINS` and splits the string on **every request**. This is inside the CORS `origin` callback.
- **Fix:** Compute once at startup:

```typescript
const allowedOrigins = getAllowedOrigins();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  // ...
}));
```

- **Expected Impact:** Minor per-request savings, but clean code practice.

---

## 6. Security That Impacts Performance

---

### 🔴 [Critical] — Token Blacklist Check + DB User Lookup on Every Request

- **File/Endpoint:** `backend/src/middleware/auth.ts` → All protected routes
- **Problem:** Every authenticated request does: (1) Redis `EXISTS` for token blacklist, (2) DB `findUnique` for user + field decryption. Combined, this adds ~25-50ms baseline to every API call.
- **Fix:**
  1. Cache user in Redis (as described in fix #1)
  2. Consider using short-lived JWTs (5min) without blacklist checks — if a token is compromised, it auto-expires quickly. Only check blacklist for refresh tokens.
- **Expected Impact:** Eliminates 1 Redis + 1 DB call per request.

---

### 🟡 [Medium] — `isPasswordReused` Calls `bcrypt.compare` Up to 5 Times

- **File/Endpoint:** `backend/src/services/userService.ts` → Password change/reset
- **Problem:** Iterates through up to 5 password history entries, calling `bcrypt.compare` on each. With cost factor 12, this can take ~1.25 seconds.
- **Fix:** Reduce bcrypt cost to 10 (see fix above) and/or parallelize comparisons:

```typescript
const results = await Promise.all(
  history.map(entry => bcrypt.compare(newPassword, entry.hash))
);
return results.some(Boolean);
```

- **Expected Impact:** Reduces password change from ~1.25s to ~0.25s (parallel + lower cost).

---

### 🟡 [Medium] — Connection Pool Not Configured

- **File/Endpoint:** `backend/src/config/prisma.ts`
- **Problem:** `new Pool({ connectionString })` uses `pg` defaults (max 10 connections). Under load, this can become a bottleneck. No `min`, `max`, `idleTimeoutMillis`, or `connectionTimeoutMillis` configured.
- **Fix:**

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '5'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

- **Expected Impact:** Prevents connection pool exhaustion under concurrent load.

---

### 🟡 [Medium] — Two Prisma Clients (Two Connection Pools)

- **File/Endpoint:** `backend/src/config/prisma.ts`
- **Problem:** `basePrisma` creates a **second** PrismaClient with its own `adapter` — but it shares the same `pg` Pool. While the Pool is shared, having two Prisma client instances doubles Prisma's internal overhead (prepared statements, query engine instances). The `adapter` reference is to the same Pool, but the Prisma overhead is duplicated.
- **Fix:** Consider using a single Prisma client and selectively bypassing encryption by using raw queries or `select` to exclude encrypted fields when needed. If you must keep `basePrisma`, at least document that they share the pool.
- **Expected Impact:** Reduces memory footprint and startup time.

---

## Priority Action List (Top 5 Fixes)

| Priority | Fix | Estimated Effort | Impact |
|----------|-----|-----------------|--------|
| **1** | Cache user in auth middleware (Redis, 60s TTL) | 1-2 hours | Eliminates DB hit on every request |
| **2** | Add `compression` middleware | 10 minutes | 60-80% smaller responses |
| **3** | Make audit logging fire-and-forget (don't `await` after response) + cache last checksum | 1 hour | 50-200ms off every mutating request |
| **4** | Add `select` to user queries to avoid unnecessary decryption; paginate `listUsers`/`listPartners` | 2-3 hours | 50-70% faster admin endpoints |
| **5** | Remove `include: { documents, timeline }` from lead list endpoints | 30 minutes | 50% smaller lead list responses |

---

## Architecture Suggestion

The biggest structural issue is that **every request pays a "tax" of: Redis blacklist check + DB user lookup + field decryption + audit log write (with checksum query)**. That's 3-4 DB/Redis round trips before actual business logic even starts.

**Recommended architecture change:**

1. **Embed claims in JWT**: Put `role`, `isActive`, `email` in the access token. For most read-only routes, you don't need the full DB user — just verify the JWT signature (pure CPU, <1ms).
2. **Lazy user loading**: Only fetch the full user from DB when a controller actually needs `req.user` fields beyond what's in the JWT. Expose a `req.loadUser()` helper that fetches + caches.
3. **Async audit pipeline**: Push audit events to a Redis Stream or a simple in-process queue. A background worker drains the queue and writes to Postgres in batches. This fully decouples audit writes from request latency.
4. **Configure the PG pool properly** with min/max connections and add monitoring.

---

## Performance Score

| | Score (1-10) |
|---|---|
| **Before fixes** | **4/10** — Functional but every request carries 3-4 unnecessary DB calls, no compression, expensive encryption on every read, blocking audit writes |
| **After top 5 fixes** | **7.5/10** — Most hot paths cached, responses compressed, audit decoupled, admin pages paginated |
| **After all fixes** | **9/10** — JWT-claim-based auth, async audit pipeline, proper indices, optimal queries |

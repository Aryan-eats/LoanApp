# Database Layer Review — Loan App Backend


> **Date:** 2026-03-03  
> **Stack:** PostgreSQL · Prisma ORM (with `@prisma/adapter-pg`) · Redis (ioredis) · Node.js  
> **Files analysed:** `prisma/schema.prisma`, `src/config/prisma.ts`, `src/config/redis.ts`, `src/utils/cache.ts`, `src/utils/auditLogger.ts`, `src/services/userService.ts`, `src/services/authService.ts`, `src/services/documentService.ts`, `src/controllers/adminController.ts`, `src/controllers/authController.ts`, `src/controllers/leadController.ts`, `src/controllers/partnerController.ts`, `src/controllers/documentController.ts`

---

## Table of Contents

1. [Configuration](#1-configuration)
2. [Query Correctness](#2-query-correctness)
3. [Performance](#3-performance)
4. [Async Opportunities](#4-async-opportunities)
5. [Caching](#5-caching)
6. [Indexing](#6-indexing)
7. [Prioritised Action List](#7-prioritised-action-list)

---

## 1. Configuration

---

<!-- ### CFG-01

**[SEVERITY: critical]**  
**Location:** `backend/src/config/prisma.ts` — `new Pool({ connectionString })`  
**Issue:** PostgreSQL connection pool is created with **no explicit size, timeout, or idle-timeout configuration**. The `pg` default pool size is **10 connections**. Two `PrismaClient` instances (`prisma` + `basePrisma`) share this one `Pool` object, but Prisma itself also holds an internal connection-management layer on top — meaning connections are not perfectly predictable. Under realistic concurrent load (tens of simultaneous API requests), the pool will be exhausted and requests will queue or time out.  
**Why it matters:** Pool exhaustion = hanging requests, cascading timeouts, and 500 errors under load. This is the single most impactful infrastructure risk.  
**Fix:**

```typescript
// src/config/prisma.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.PG_POOL_MAX ?? '20', 10),       // tune per server RAM / PG max_connections
  min: parseInt(process.env.PG_POOL_MIN ?? '2', 10),
  idleTimeoutMillis: 30_000,                                  // release idle connections after 30s
  connectionTimeoutMillis: 5_000,                             // fail fast if pool is exhausted
  statement_timeout: 15_000,                                  // kill runaway queries (ms)
  application_name: 'loan-app-backend',
});
```

Add `PG_POOL_MAX` and `PG_POOL_MIN` to your `.env` files with environment-appropriate values:
- Dev: `max=5`
- Staging: `max=10`
- Production: `max=20--40` (monitor `pg_stat_activity` and tune)

---

### CFG-02

**[SEVERITY: warning]**  
**Location:** `backend/src/config/prisma.ts` — `datasource db`  
**Issue:** The Prisma schema datasource block has **no explicit `url` field**:
```prisma
datasource db {
  provider = "postgresql"
}
```
Prisma implicitly falls back to `DATABASE_URL`. This works but is non-obvious and will cause silent failures if the env var is renamed. It also means `prisma generate` and `prisma migrate` rely on an undocumented convention.  
**Why it matters:** Operational safety. Any env var rename silently breaks migrations without a schema-level hint.  
**Fix:**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
``` -->

---

### CFG-03
<!-- 
**[SEVERITY: warning]**  
**Location:** `backend/src/config/prisma.ts` — two `PrismaClient` instances  
**Issue:** Two Prisma clients (`prisma` with the field-encryption extension, `basePrisma` without) are both sharing the same underlying `pg.Pool`. This is the correct workaround for the TypeScript extension typing issue, but it doubles the Prisma overhead (two query engines, two interceptor chains) and makes connection accounting harder.  
**Why it matters:** Adds cognitive overhead; any future Prisma middleware added to `prisma` won't automatically apply to `basePrisma` and vice-versa, creating silent correctness gaps.  
**Fix (long-term):** Use a single client with proper type casting when calling non-encrypted models. Short-term, document explicitly which models use each client in a comment block.

--- -->

### CFG-04

<!-- **[SEVERITY: warning]**  
**Location:** `backend/src/config/redis.ts`  
**Issue:** The Redis client is created with `lazyConnect: true` but immediately calls `client.connect()` manually. This is technically correct but contradictory — `lazyConnect` was set to prevent auto-connection on construction, then the code connects right away. There is also **no `connectTimeout` or `commandTimeout`** configured. A slow Redis (network partition, overloaded instance) will block node event loop command calls indefinitely.  
**Why it matters:** No command timeout = requests hang forever when Redis is degraded. In a production environment with Redis as a critical dependency for token blacklisting and rate-limiting, this causes cascading failure.  
**Fix:**

```typescript
client = new Redis(redisUrl, {
  lazyConnect: false,               // just connect immediately and be explicit
  maxRetriesPerRequest: 3,
  connectTimeout: 5_000,            // fail fast on connect
  commandTimeout: 2_000,            // fail fast on stalled commands
  retryStrategy(times) {
    if (times > 10) return null;    // stop retrying after 10 attempts
    return Math.min(times * 200, 5_000);
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some((e) => err.message.includes(e));
  },
});
```

--- -->

### CFG-05

<!-- **[SEVERITY: warning]**  
**Location:** Redis server configuration (not in code, but systemic)  
**Issue:** No `maxmemory-policy` is configured or documented. If Redis memory fills up (token blacklist + OTP store + cache all grow unbounded), Redis will either reject writes (`noeviction`) or silently drop wrong keys (`allkeys-lru`).  
**Why it matters:** The token blacklist (`tokenBlacklist`) is security-critical. If Redis evicts blacklisted tokens under memory pressure, previously-invalidated JWTs could be re-accepted, allowing session replay attacks.  
**Fix:** Set `maxmemory-policy volatile-lru` in `redis.conf` (only evict keys with a TTL — cache and OTPs have TTLs, blacklisted tokens have TTLs). Never evict keys without a TTL:

```conf
maxmemory 512mb
maxmemory-policy volatile-lru
```

And add a health check that alerts when Redis memory exceeds 80%.

--- -->

### CFG-06

<!-- **[SEVERITY: suggestion]**  
**Location:** `backend/src/config/prisma.ts` — no SSL in production  
**Issue:** The `pg.Pool` does not configure SSL. If the database is hosted remotely (RDS, Supabase, Neon, etc.) and `sslmode` is not enforced at the database server level, connections may be unencrypted.  
**Why it matters:** Unencrypted DB connections expose PII (loan amounts, Aadhaar numbers, PAN numbers) in transit.  
**Fix:**

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false,
  // ... rest of config
});
```

--- -->

## 2. Query Correctness

---

### QC-01

<!-- **[SEVERITY: critical]**  
**Location:** `adminController.ts` — `listUsers()`  
**Issue:** `prisma.user.findMany({ orderBy: { createdAt: 'desc' } })` — **no pagination, no `select` clause**. Returns every user record in the database with every field, including `password` (bcrypt hash), `resetPasswordToken`, `otpHash`, `refreshToken`, and other sensitive columns.  
**Why it matters:** (1) Unbounded result set will OOM the Node process when user count grows. (2) Sensitive fields like password hashes and reset tokens should never be sent over the wire, even to admins.  
**Fix:**

```typescript
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const page  = parseInt(req.query.page  as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, isActive: true, isEmailVerified: true,
        isPhoneVerified: true, createdAt: true, onboardingStatus: true,
        kycStatus: true, partnerType: true, city: true,
      },
    }),
    prisma.user.count(),
  ]);

  res.status(200).json({ success: true, data: { users, pagination: { page, limit, total } } });
};
```

---

### QC-02

**[SEVERITY: critical]**  
**Location:** `adminController.ts` — `listPartners()` (the inline version, not `partnerController.getPartners`)  
**Issue:** `prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } })` — **no pagination**. On a system with thousands of partners, this returns the entire table in one response. Additionally, `user.panNumber`, `user.accountNumber`, `user.ifscCode`, `user.aadhaarNumber` are unconditionally included in the response, bypassing any field-level encryption masking.  
**Why it matters:** Unbounded response + raw PII leak to admin dashboard.  
**Fix:** Apply pagination (same as QC-01 pattern). Use the already-paginated `partnerController.getPartners` instead of this duplicate. Remove this function entirely or redirect to the canonical one.

---

### QC-03

**[SEVERITY: critical]**  
**Location:** `src/utils/auditLogger.ts` — `logAuditEvent()` → `getLastChecksum()`  
**Issue:** Every single audit event (login, logout, lead create, lead status change, document upload, etc.) triggers **two synchronous sequential DB round trips before the response can complete**:
1. `prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { checksum: true } })` — reads latest row
2. `prisma.auditLog.create(...)` — writes new row

The **checksum chaining has a race condition**: under concurrent requests, multiple calls to `getLastChecksum()` will return the same "previous checksum", causing two logs to have identical `previousChecksum` values. The integrity chain is silently broken under any concurrency.  
**Why it matters:** (1) Adds 2 DB round trips to every user-facing action — login latency +15–40ms. (2) The audit chain correctness guarantee is **invalidated by concurrent requests**, making the checksum feature misleading.  
**Fix:**

For **latency**: fire-and-forget the audit log (see Async section AO-01).  
For **chain integrity**: if true chaining is required, use a PostgreSQL sequence or a dedicated `SERIAL` column + database-side trigger to compute checksums, or accept that checksums are per-row integrity hashes (not chained), removing the `getLastChecksum` query entirely:

```typescript
// Remove getLastChecksum and the chaining. Use a self-contained row checksum only:
const checksum = computeChecksum(event, options.userId, options.entityId, now, null);
// Then just: await prisma.auditLog.create({ data: { ...checksum } })
// No pre-query needed.
``` -->

---

### QC-04

<!-- **[SEVERITY: warning]**  
**Location:** `authController.ts` — `login()` — multi-step writes without a transaction  
**Issue:** After authentication succeeds, the login handler performs **5 sequential, non-transactional DB writes**:
1. `resetLoginAttempts` → `user.update`
2. `user.update` (store refreshToken + lastLogin)
3. `addSession` → transaction (upsert session + prune old sessions)
4. `logAuditEvent` → `auditLog.findFirst` + `auditLog.create`

If the server crashes or a DB error occurs between steps 1 and 4, partial state is left: attempts reset but no refresh token written, or refresh token written but no session created.  
**Why it matters:** Inconsistent session state can cause subtle auth bugs — user appears logged in (has token) but has no active session record, or vice versa.  
**Fix:** Wrap the core login writes (attempts reset + refresh token + session) in a single transaction:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockUntil: null,
      lastLogin: new Date(),
      refreshToken: hashToken(refreshToken),
      refreshTokenExpires: refreshExpiresAt ? new Date(refreshExpiresAt) : null,
    },
  });
  await tx.activeSession.upsert({ ... });
  // prune old sessions in same tx
});
// logAuditEvent AFTER tx — fire-and-forget (see AO-01)
```

--- -->

### QC-05

<!-- **[SEVERITY: warning]**  
**Location:** `authController.ts` — `refreshAccessToken()` — `findFirst` instead of `findUnique`  
**Issue:**

```typescript
const user = await prisma.user.findFirst({
  where: {
    id: refreshPayload.sub,
    refreshToken: hashed,
    refreshTokenExpires: { gt: new Date() },
  },
});
```

Using `findFirst` for a lookup by `id` (primary key) is semantically wrong — `id` is unique, so `findUnique` should be used. The current query asks Prisma to scan for the first matching row rather than doing a direct key lookup. While Prisma/PG optimises this because `id` is a PK, the intent is unclear and `refreshToken + refreshTokenExpires` filters happen after the PK lookup without an index on `refreshToken`.  
**Why it matters:** Code clarity and slight performance: the composite filter cannot use an index on `refreshToken`.  
**Fix:**

```typescript
const user = await prisma.user.findUnique({ where: { id: refreshPayload.sub } });
if (!user || user.refreshToken !== hashed || !user.refreshTokenExpires || user.refreshTokenExpires <= new Date()) {
  return res.status(401).json({ ... });
}
```

--- -->

### QC-06

**[SEVERITY: warning]**  
**Location:** `leadController.ts` — `updateLead()` and `updateLeadStatus()` and `assignBank()` — post-transaction re-fetch  
**Issue:** After every transactional write, these handlers do an additional `findUnique` with `include: { documents: true, timeline: true }`. For a lead with 10 timeline entries and 8 documents, this fetches 18 extra rows **every time**, on every status update.  
**Why it matters:** Unnecessary read amplification on a hot write path. Timeline grows indefinitely per lead, making this worse over time.  
**Fix:** Return only the updated fields in the response (or use Prisma's `include` inside the transaction's final `update` call to return the updated record without a second round trip):

```typescript
const updatedLead = await prisma.$transaction(async (tx) => {
  const lead = await tx.lead.update({
    where: { id: leadId },
    data: { status },
    include: { documents: true, timeline: { orderBy: { timestamp: 'desc' }, take: 20 } },
  });
  await tx.leadTimeline.create({ ... });
  return lead;
});
```

---

### QC-07

**[SEVERITY: warning]**  
**Location:** `partnerController.ts` — `getPartners()` — 3 queries per request  
**Issue:** The handler runs:
1. `user.findMany` (paginated partners)
2. `user.count` (total for pagination)
3. `lead.groupBy` (lead counts per partner)

Even though this is not a classic N+1 (it's 3 fixed queries not N), the third query (`groupBy`) runs separately after the user list is obtained. This can be merged or eliminated:  
**Fix:** For the common case use a raw `SELECT` with `LEFT JOIN ... GROUP BY` or cache partner lead counts (they change rarely relative to page loads).

---

### QC-08

**[SEVERITY: warning]**  
**Location:** `userService.ts` — `addToPasswordHistory()` — fetch-all inside a transaction  
**Issue:**

```typescript
const allHistory = await tx.passwordHistory.findMany({
  where: { userId },
  orderBy: { changedAt: 'asc' },
});
```

This fetches ALL password history records to determine which to delete, while holding a transaction lock. If a user somehow accumulated many records (bug, edge case), this is wasteful.  
**Fix:** Use a targeted delete — delete the oldest entries if count > limit, without fetching all:

```typescript
await tx.passwordHistory.create({ data: { userId, hash: hashedPassword } });

// Delete oldest beyond limit using a subquery
const count = await tx.passwordHistory.count({ where: { userId } });
if (count > PASSWORD_HISTORY_LIMIT) {
  const oldest = await tx.passwordHistory.findMany({
    where: { userId },
    orderBy: { changedAt: 'asc' },
    take: count - PASSWORD_HISTORY_LIMIT,
    select: { id: true },
  });
  await tx.passwordHistory.deleteMany({ where: { id: { in: oldest.map(h => h.id) } } });
}
```

---

### QC-09

**[SEVERITY: warning]**  
**Location:** `partnerController.ts` — `getPartnerById()` and `getCurrentPartnerProfile()` — no caching, 2 queries  
**Issue:** Both handlers do `findFirst` + `lead.count`. These are called on every partner dashboard page load with zero caching.  
**Why it matters:** `getCurrentPartnerProfile` is likely called on every authenticated page load for partner users. At 100 concurrent partners = 200 DB queries per poll cycle.  
**Fix:** Cache the partner profile for 60 seconds (invalidate on partner update events):

```typescript
const profile = await cacheWrap(
  `partner:profile:${userId}`,
  async () => {
    const user = await prisma.user.findFirst({ where: { id: userId, role: 'partner' } });
    const leadCount = await prisma.lead.count({ where: { partnerId: userId } });
    return formatPartnerResponse(user!, leadCount);
  },
  60
);
```

---

### QC-10

**[SEVERITY: warning]**  
**Location:** `leadController.ts` — `getLeads()` — search with `ILIKE '%term%'` (leading wildcard)  
**Issue:**

```typescript
where.OR = [
  { clientFullName: { contains: search, mode: 'insensitive' } },
  { clientPhone:    { contains: search, mode: 'insensitive' } },
  { clientEmail:    { contains: search, mode: 'insensitive' } },
];
```

`contains` with `mode: 'insensitive'` translates to `ILIKE '%term%'`. A **leading wildcard kills index usage** — PostgreSQL cannot use a B-tree index for `ILIKE '%foo%'`. This results in a sequential scan of every lead row on every search.  
**Why it matters:** With 10,000+ leads, every search causes a full table scan. Latency degrades linearly with data growth.  
**Fix (short-term):** Add a `pg_trgm` GIN index:

```sql
-- Migration
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX leads_client_full_name_trgm ON leads USING GIN (client_full_name gin_trgm_ops);
CREATE INDEX leads_client_phone_trgm ON leads USING GIN (client_phone gin_trgm_ops);
CREATE INDEX leads_client_email_trgm ON leads USING GIN (client_email gin_trgm_ops);
```

**Fix (long-term):** Add a PostgreSQL `tsvector` full-text search column, or route search through Meilisearch/Elasticsearch.

---

### QC-11

**[SEVERITY: warning]**  
**Location:** `adminController.ts` — `assignBank()` — loop with individual `create` calls inside transaction  
**Issue:**

```typescript
for (const entry of timelineEntries) {
  await tx.leadTimeline.create({ data: { ... } });
}
```

Sequential awaited creates inside a transaction hold the transaction open longer per entry.  
**Fix:** Use `createMany`:

```typescript
await tx.leadTimeline.createMany({
  data: timelineEntries.map(entry => ({
    leadId,
    status: entry.status,
    timestamp: new Date(),
    updatedBy: `${req.user?.firstName} ${req.user?.lastName}`,
    note: entry.note,
  })),
});
```

---

### QC-12

**[SEVERITY: suggestion]**  
**Location:** `adminController.ts` — `getStats()` — 6 separate COUNT queries  
**Issue:**

```typescript
await Promise.all([
  prisma.user.count(),
  prisma.user.count({ where: { isActive: true } }),
  prisma.user.count({ where: { role: 'partner' } }),
  prisma.user.count({ where: { role: 'admin' } }),
  prisma.user.count({ where: { isEmailVerified: true } }),
  prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
]);
```

6 round trips, even in `Promise.all`. Can be reduced to 1 raw SQL with conditional aggregation:  
**Fix:**

```typescript
const result = await prisma.$queryRaw<[{
  total: bigint; active: bigint; partners: bigint;
  admins: bigint; verified: bigint; new_this_week: bigint;
}]>`
  SELECT
    COUNT(*)                                                   AS total,
    COUNT(*) FILTER (WHERE is_active = true)                   AS active,
    COUNT(*) FILTER (WHERE role = 'partner')                   AS partners,
    COUNT(*) FILTER (WHERE role = 'admin')                     AS admins,
    COUNT(*) FILTER (WHERE is_email_verified = true)           AS verified,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_this_week
  FROM users
`;
```

---

### QC-13

**[SEVERITY: suggestion]**  
**Location:** `auditLogger.ts` — `checkSuspiciousActivity()` — querying audit logs on every login  
**Issue:** On every successful login, `checkSuspiciousActivity` queries the last 5 `LOGIN_SUCCESS` audit logs for the user in the past 24h. This adds a DB read to an already write-heavy login flow.  
**Why it matters:** The `active_sessions` table already tracks device fingerprints — it is a more authoritative and much cheaper source.  
**Fix:** Check for the device fingerprint in `active_sessions` instead of scanning `audit_logs`:

```typescript
export const checkSuspiciousActivity = async (
  userId: string,
  currentFingerprint: string
): Promise<boolean> => {
  const sessionExists = await prisma.activeSession.findUnique({
    where: { userId_deviceFingerprint: { userId, deviceFingerprint: currentFingerprint } },
    select: { id: true },
  });
  return !sessionExists; // new device = suspicious
};
```

This is a single PK lookup instead of a range scan on `audit_logs`.

---

### QC-14

**[SEVERITY: suggestion]**  
**Location:** `adminController.ts` — `auditExportJobs` — in-memory job map  
**Issue:** The export job registry (`const auditExportJobs = new Map<string, AuditExportJob>()`) is **process-local and memory-only**. On server restart, crash, or horizontal scaling (multiple instances), all job state is lost. Users polling a job status after a deploy will receive 404.  
**Why it matters:** Export is triggered by admin for compliance/legal reasons. Job loss = admin has to retry, potentially duplicating massive DB reads.  
**Fix:** Persist job state in Redis with a 24h TTL:

```typescript
const JOB_KEY = (id: string) => `audit:export:job:${id}`;

const saveJob = (job: AuditExportJob) =>
  getRedisClient().set(JOB_KEY(job.id), JSON.stringify(job), 'EX', 86400);

const getJob = async (id: string): Promise<AuditExportJob | null> => {
  const raw = await getRedisClient().get(JOB_KEY(id));
  return raw ? JSON.parse(raw) : null;
};
```

---

## 3. Performance

---

### PERF-01

**[SEVERITY: critical]**  
**Location:** `auditLogger.ts` — `logAuditEvent()` on every request  
**Issue:** Synchronous DB write (preceded by a read for checksum) is called on every audited action — including login, token refresh, lead updates, and document uploads. This adds ~20–60ms to every one of these latency-sensitive requests.  
**Estimate:** At 100 req/s, audit writes alone generate 200 DB operations/s (100 reads + 100 writes) on the `audit_logs` table. At 1000 req/s this becomes a bottleneck.  
**Fix:** See AO-01.

---

### PERF-02

**[SEVERITY: warning]**  
**Location:** `userService.ts` — `isPasswordReused()` — sequential bcrypt compares  
**Issue:**

```typescript
for (const entry of history) {
  const isMatch = await bcrypt.compare(newPassword, entry.hash); // ~300ms each at cost 12
  if (isMatch) return true;
}
```

BCrypt with cost 12 takes ~300ms per compare. In the worst case (5 history entries, none match), this adds **~1.5 seconds** to the password-change flow — fully blocking the event loop on CPU-intensive work.  
**Why it matters:** Entirely blocks the Node.js event loop for 1.5s on a password change. Other requests are starved.  
**Fix:** Run bcrypt compares in parallel and short-circuit on first match:

```typescript
export const isPasswordReused = async (userId: string, newPassword: string): Promise<boolean> => {
  const history = await prisma.passwordHistory.findMany({
    where: { userId }, orderBy: { changedAt: 'desc' }, take: PASSWORD_HISTORY_LIMIT,
    select: { hash: true },
  });

  const results = await Promise.all(history.map(entry => bcrypt.compare(newPassword, entry.hash)));
  return results.some(Boolean);
};
```

---

### PERF-03

**[SEVERITY: warning]**  
**Location:** `adminController.ts` — `queryAuditCounts()` — 4 separate COUNT queries  
**Issue:** `queryAuditCounts` fires 4 separate `auditLog.count()` calls (total, login events, security events, auth events) even though they can be done in one query.  
**Fix:** Same conditional aggregation pattern as QC-12:

```sql
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE event IN ('LOGIN_SUCCESS','LOGIN_FAILED','LOGOUT')) AS login_events,
  COUNT(*) FILTER (WHERE event IN ('ACCOUNT_LOCKED','SUSPICIOUS_ACTIVITY')) AS security_events,
  COUNT(*) FILTER (WHERE event IN ('REGISTER','PASSWORD_CHANGE','PASSWORD_RESET_REQUEST','PASSWORD_RESET_SUCCESS')) AS auth_events
FROM audit_logs
WHERE <filters>
```

---

### PERF-04

**[SEVERITY: warning]**  
**Location:** `leadController.ts` — `getLeads()` — `include: { documents: true, timeline: true }` on list queries  
**Issue:** The `getLeads` endpoint fetches every document AND every timeline entry for every lead in the result page (up to 20 leads × N documents × M timeline entries). A page of 20 leads each with 10 documents and 8 timeline entries = 360 rows fetched per list call.  
**Why it matters:** This is a list endpoint — most consumers only need summary data. This is a classic over-fetch.  
**Fix:** For list endpoints, omit `include` and use `select` with only the fields needed for list display:

```typescript
prisma.lead.findMany({
  where, orderBy, skip, take: limit,
  select: {
    id: true, clientFullName: true, clientPhone: true,
    loanType: true, loanAmount: true, status: true,
    createdAt: true, partnerName: true, bankAssigned: true,
    _count: { select: { documents: true } },   // just the count, not all documents
  },
})
```

Reserve full `include` for single-lead `getLeadById`.

---

### PERF-05

**[SEVERITY: warning]**  
**Location:** `buildAuditExportFile()` — cursor pagination with `withOlderThanCursor`  
**Issue:** The cursor pagination uses an OR condition:

```typescript
OR: [
  { createdAt: { lt: cursor.createdAt } },
  { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
]
```

This `OR` on `(createdAt, id)` can cause PG to evaluate two index scans and union them. For tables with millions of audit rows, this degrades performance.  
**Fix:** Use a composite index on `(createdAt DESC, id DESC)` and express the cursor as a keyset pagination condition. The current `@@index([createdAt(sort: Desc)])` partially helps — add `id` to make it composite (see Indexing section).

---

### PERF-06

**[SEVERITY: suggestion]**  
**Location:** `adminController.ts` — `buildAuditExportFile()` — writes to OS temp dir per batch  
**Issue:** Each 2000-row batch does an `fs.appendFile` — synchronous I/O in a loop. For a 50,000-row export, this means 25 `appendFile` calls.  
**Fix:** Use a writable stream:

```typescript
const stream = fs.createWriteStream(filePath, { flags: 'a' });
// write batches to stream.write(rows.join('\n') + '\n')
await new Promise((resolve, reject) => stream.end(resolve));
```

---

## 4. Async Opportunities

---

### AO-01

**[SEVERITY: critical]**  
**Location:** `src/utils/auditLogger.ts` — `logAuditEvent()` — called synchronously on every action  
**Issue:** Audit logging is awaited inline on every request path — user **never needs to wait for audit confirmation**. Audit failure is already silently swallowed (`catch` just logs to console).  
**Why it matters:** Every login, logout, lead create, and document upload is slowed down by 2 DB round trips for audit. Under any load, this doubles DB write pressure.  
**Fix (recommended — BullMQ):** Queue audit events asynchronously:

```typescript
// utils/auditQueue.ts
import Queue from 'bullmq';
const auditQueue = new Queue('audit-logs', { connection: getRedisClient() });

export const logAuditEvent = async (event, req, options) => {
  // fire-and-forget — do NOT await
  auditQueue.add('log', { event, options, ip: getClientIP(req), userAgent: req.headers['user-agent'] })
    .catch(err => console.error('Audit queue error:', err));
};
```

Create a BullMQ worker that processes audit events and writes them to the DB. This decouples response latency from audit write latency entirely.

**Fix (minimal — setImmediate fire-and-forget):** If BullMQ is too large a change right now:

```typescript
export const logAuditEvent = (event, req, options) => {
  // No await — schedule for after the current I/O cycle
  setImmediate(() => {
    writeAuditLog(event, req, options).catch(err => console.error('Audit log failed:', err));
  });
};
```

Note: `setImmediate` does not survive process crash — events can be lost. BullMQ with Redis is strongly preferred for compliance use cases.

---

### AO-02

**[SEVERITY: warning]**  
**Location:** `authController.ts` — `registerPartner()` — two sequential `logAuditEvent` calls before response  
**Issue:**

```typescript
await logAuditEvent('REGISTER', req, { ... });
await logAuditEvent('CONSENT_GIVEN', req, { ... });
// ... then res.status(201).json(...)
```

Two synchronous audit writes before the 201 response is sent to the partner. Adding ~60–100ms to registration latency.  
**Fix:** After AO-01 is implemented (fire-and-forget audit), this is automatically fixed.

---

### AO-03

**[SEVERITY: warning]**  
**Location:** `documentController.ts` — `logAuditEvent('DOCUMENT_UPLOADED', ...)` after `res.status(200).json()`  
**Issue:** The audit log for document uploads is correctly called AFTER the response is sent — this is good fire-and-forget practice. **However**, it is `await`-ed, meaning any error propagates into an already-completed response cycle and can crash the route handler silently.  
**Why it matters:** The `await` after `res.json()` means an exception in `logAuditEvent` throws in a context where the response is already committed — Node may emit an `unhandledPromiseRejection`.  
**Fix:** Drop the `await` (make it genuinely fire-and-forget) and wrap in `.catch()`:

```typescript
logAuditEvent('DOCUMENT_UPLOADED', req, { ... })
  .catch(err => console.error('Audit log failed for DOCUMENT_UPLOADED:', err));
```

---

### AO-04

**[SEVERITY: suggestion]**  
**Location:** `adminController.ts` — `createUser()` — audit log before response  
**Issue:**

```typescript
res.status(201).json({ success: true, ... });
await logAuditEvent('ADMIN_USER_CREATED', req, { ... }); // after response
```

This is correctly placed after the response. But like AO-03, the `await` after `res.json()` is still a pattern risk.  
**Fix:** Same as AO-03 — drop `await`, add `.catch()`.

---

### AO-05

**[SEVERITY: suggestion]**  
**Location:** `smsService.ts` (not fully reviewed, but implied by usage in OTP flow)  
**Issue:** Any SMS/email notification triggered synchronously in a request handler forces the user to wait for a third-party HTTP call.  
**Fix:** Queue SMS jobs via BullMQ. User gets immediate 200; worker sends SMS. Implement with exponential retry on failure.

---

## 5. Caching

---

### CACHE-01

**[SEVERITY: warning]**  
**Location:** `partnerController.ts` — `getPartners()`, `getPartnerById()`, `getCurrentPartnerProfile()` — no caching  
**Issue:** The partner list and partner profile have zero caching despite being called on every admin dashboard load and every partner page load.  
**Recommended strategy:**

| Data | Cache Key | TTL | Invalidation Trigger |
|------|-----------|-----|----------------------|
| Partner list (paginated) | `partners:list:page:{n}:limit:{l}:filter:{hash}` | 30s | `updatePartner`, `updatePartnerStatus` |
| Single partner profile | `partner:profile:{id}` | 60s | `updatePartner`, `updatePartnerStatus` |
| Current partner profile | `partner:self:{userId}` | 60s | user updates own profile |
| Lead count per partner | `partner:leadcount:{id}` | 60s | lead created/deleted for this partner |

---

### CACHE-02

**[SEVERITY: warning]**  
**Location:** `adminController.ts` — `listUsers()` — no caching  
**Issue:** `listUsers` (once paginated per QC-01) should be cached since it's read-heavy on admin dashboards and user records change infrequently.  
**Recommended strategy:** `users:list:page:{n}` with 30s TTL, invalidated on user create/update/delete.

---

### CACHE-03

**[SEVERITY: suggestion]**  
**Location:** `adminController.ts` — `getStats()` — 60s TTL is appropriate ✓  
**Issue:** Already cached. TTL of 60 seconds is fine for a stats widget that tolerates slight staleness.  
**Note:** The `cacheWrap` pattern used here is correct. No change needed.

---

### CACHE-04

**[SEVERITY: suggestion]**  
**Location:** `adminController.ts` — `listBanks()` — 5-minute TTL ✓  
**Issue:** Already cached. Bank data changes rarely. 5-min TTL appropriate.  
**Note:** Cache invalidation on `updateBank` and `toggleBankStatus` via `cacheDelete('banks:all', ...)` is correctly implemented.

---

### CACHE-05

**[SEVERITY: suggestion]**  
**Location:** `userService.ts` — OTP stored in Redis with `OTP_SECONDS = 300` TTL ✓  
**Issue:** Correct implementation. Redis TTL handles OTP expiry automatically — no cron needed.  
**Note:** The DB fallback (`otpHash`, `otpExpires` columns on `users`) is a good resilience pattern, but the DB columns will remain populated even when Redis is available since `generateOTP` only writes to Redis when Redis is available. Ensure `otpHash`/`otpExpires` are cleared on successful verification in the DB fallback path.

---

### CACHE-06

**[SEVERITY: suggestion]**  
**Location:** `adminController.ts` — `getCachedAuditCounts()` — two-level cache (in-memory Map + Redis)  
**Issue:** The in-memory Map cache is effectively a local L1 in front of Redis L2. This is a valid pattern, but note: in-memory state is not shared across multiple Node.js instances. This means on a multi-instance deployment, each instance maintains its own stale cache for up to 20 seconds.  
**Fix:** Accept this behaviour (minor inconsistency in count numbers across instances is fine for a dashboard) OR rely solely on the Redis TTL and remove the in-memory Map to simplify the code.

---

## 6. Indexing

---

### IDX-01

**[SEVERITY: critical]**  
**Location:** `audit_logs` — missing composite index for `checkSuspiciousActivity`  
**Issue:** `checkSuspiciousActivity` queries: `WHERE userId = ? AND event = 'LOGIN_SUCCESS' AND createdAt >= ?`. The current index `@@index([userId, createdAt(sort: Desc)])` does not include `event`, so PostgreSQL scans all audit rows for the user in the time range and then filters by event.  
**Fix:**

```prisma
@@index([userId, event, createdAt(sort: Desc)])
```

```sql
CREATE INDEX audit_logs_user_event_created_at
  ON audit_logs (user_id, event, created_at DESC);
```

---

### IDX-02

**[SEVERITY: warning]**  
**Location:** `leads` — missing index on `updatedAt` and `loanAmount` for sorting  
**Issue:** `getLeads` allows sorting by `updatedAt` and `loanAmount` but there are no indexes on these columns. Any sort by these fields causes a seq scan + sort.  
**Fix:**

```prisma
@@index([updatedAt(sort: Desc)])
@@index([loanAmount(sort: Desc)])
```

```sql
CREATE INDEX leads_updated_at ON leads (updated_at DESC);
CREATE INDEX leads_loan_amount ON leads (loan_amount DESC);
```

---

### IDX-03

**[SEVERITY: warning]**  
**Location:** `leads` — missing trigram indexes for search  
**Issue:** Full-text search with `ILIKE '%term%'` on `client_full_name`, `client_phone`, `client_email` cannot use B-tree indexes. See QC-10.  
**Fix:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX leads_client_full_name_trgm ON leads USING GIN (client_full_name gin_trgm_ops);
CREATE INDEX leads_client_phone_trgm     ON leads USING GIN (client_phone gin_trgm_ops);
CREATE INDEX leads_client_email_trgm     ON leads USING GIN (client_email gin_trgm_ops);
```

Note: These cannot be expressed in Prisma schema — must be added as raw SQL in a migration.

---

### IDX-04

**[SEVERITY: warning]**  
**Location:** `leads` — missing index on `loanType` alone  
**Issue:** `getLeadStats` does `lead.groupBy({ by: ['loanType'] })`. The existing index `@@index([partnerId, status])` does not help with a full-table `groupBy loanType`. PG will do a sequential scan.  
**Fix:**

```prisma
@@index([loanType])
```

```sql
CREATE INDEX leads_loan_type ON leads (loan_type);
```

---

### IDX-05

**[SEVERITY: warning]**  
**Location:** `audit_logs` — composite cursor index for export pagination  
**Issue:** Export pagination uses `(createdAt DESC, id DESC)` for keyset pagination but the composite index is missing. Current index is only `@@index([createdAt(sort: Desc)])`.  
**Fix:**

```prisma
@@index([createdAt(sort: Desc), id(sort: Desc)])
```

```sql
CREATE INDEX audit_logs_created_at_id ON audit_logs (created_at DESC, id DESC);
```

---

### IDX-06

**[SEVERITY: suggestion]**  
**Location:** `password_history` — redundant index  
**Issue:** Both `@@index([userId])` and `@@index([userId, changedAt])` exist. Any query filtering by `userId` alone will use the composite index (since it leads with `userId`), making the single-column index redundant.  
**Fix:** Remove `@@index([userId])` — the composite covers it:

```prisma
// Remove this:
@@index([userId])
// Keep this:
@@index([userId, changedAt])
```

This saves one index from being maintained on every insert to `password_history`.

---

### IDX-07

**[SEVERITY: suggestion]**  
**Location:** `audit_logs` — low-cardinality `@@index([severity])`  
**Issue:** `severity` has 4 values (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). A B-tree index on a column with 4 distinct values is typically **not used by the query planner** — PG decides a seq scan is cheaper when >5–10% of table rows match. This index adds write overhead for no read benefit.  
**Fix:** Remove `@@index([severity])`. If filtering by severity is needed, add `severity` as a suffix to existing composite indexes (e.g., `@@index([userId, createdAt, severity])`).

---

### IDX-08

**[SEVERITY: suggestion]**  
**Location:** `audit_logs` — `@@index([ip, createdAt(sort: Desc)])`  
**Issue:** IP-based lookups are likely only used for specific security investigations (rare admin queries), not routine operations. This index adds write overhead for infrequent reads.  
**Assessment:** Keep for security audit purposes, but document that it's an investigative index, not an operational one. Consider making it a partial index if most IPs are `NULL`:

```sql
CREATE INDEX audit_logs_ip_created_at ON audit_logs (ip, created_at DESC)
  WHERE ip IS NOT NULL;
```

---

## 7. Prioritised Action List

Order by impact-per-effort. Fix these in sequence:

| Priority | ID | Action | Impact | Effort |
|----------|-----|--------|--------|--------|
| 🔴 **P0** | QC-01 | Paginate `listUsers` + add `select` to hide sensitive fields | Security + stability | Low |
| 🔴 **P0** | QC-03 + AO-01 | Make `logAuditEvent` fire-and-forget (BullMQ queue) + remove `getLastChecksum` serial read | Removes 2 DB round trips from every request | Medium |
| 🔴 **P0** | CFG-01 | Set explicit pool size, timeouts, and `statement_timeout` on `pg.Pool` | Prevents pool exhaustion under load | Low |
| 🔴 **P0** | CFG-05 | Set `maxmemory-policy volatile-lru` on Redis | Prevents security token eviction | Low (infra config) |
| 🟠 **P1** | IDX-03 | Add `pg_trgm` GIN indexes on `leads` for search | Makes search usable at scale | Low |
| 🟠 **P1** | QC-04 | Wrap login writes in a single transaction | Data integrity | Low |
| 🟠 **P1** | IDX-01 | Add composite `audit_logs(user_id, event, created_at DESC)` index | Speeds up suspicious-activity check on every login | Low |
| 🟠 **P1** | PERF-04 | Remove `include: { documents, timeline }` from list endpoints | Reduces read amplification on hottest read path | Low |
| 🟠 **P1** | QC-13 | Replace `checkSuspiciousActivity` audit query with `active_sessions` PK lookup | Removes 1 DB read from every login | Low |
| 🟡 **P2** | IDX-02 | Add indexes on `leads.updated_at`, `leads.loan_amount` | Fixes sort performance | Low |
| 🟡 **P2** | IDX-04 | Add index on `leads.loan_type` | Fixes `groupBy` in stats | Low |
| 🟡 **P2** | QC-09 | Cache partner profile with 60s TTL | Removes 2 DB queries per partner page load | Low |
| 🟡 **P2** | PERF-02 | Parallelise `isPasswordReused` bcrypt compares | Removes 1.5s blocking from password change | Low |
| 🟡 **P2** | QC-06 | Eliminate post-transaction re-fetch in lead update handlers | Removes 1 query per lead write | Low |
| 🟡 **P2** | QC-12 | Consolidate `getStats` 6 COUNTs into 1 raw SQL query | Reduces admin dashboard DB load by 5x | Low |
| 🟡 **P2** | QC-14 | Persist audit export jobs in Redis instead of in-memory Map | Survives server restarts | Medium |
| 🟢 **P3** | CFG-02 | Add `url = env("DATABASE_URL")` to Prisma datasource | Operational safety | Minutes |
| 🟢 **P3** | CFG-04 | Add `connectTimeout` + `commandTimeout` to Redis client | Prevents hanging on Redis failures | Minutes |
| 🟢 **P3** | IDX-06 | Remove redundant `@@index([userId])` from `password_history` | Reduces write overhead | Minutes |
| 🟢 **P3** | IDX-07 | Remove `@@index([severity])` from `audit_logs` | Reduces write overhead | Minutes |
| 🟢 **P3** | PERF-03 | Consolidate `queryAuditCounts` into 1 conditional aggregate SQL | Reduces audit panel queries | Low |
| 🟢 **P3** | QC-11 | Replace loop `create` with `createMany` in `assignBank` | Minor performance | Minutes |
| 🟢 **P3** | CFG-06 | Configure SSL on `pg.Pool` for production | Security compliance | Minutes |

---

### Summary Scorecard

| Category | Grade | Key Issues |
|----------|-------|-----------|
| Schema Design | B+ | Solid — good use of cascade rules, enums, and field types. Minor: `datasource` missing explicit URL. |
| Connection Config | D | Critical: no pool size, no timeouts, no SSL enforcement. Fragile under load. |
| Redis Config | C | No command timeout, no eviction policy documented, potential security risk. |
| Query Correctness | C+ | `listUsers` unbounded + leaking secrets. Audit integrity race condition. Login non-transactional. |
| Performance | C | Sync audit on hot path. Over-fetch on list endpoints. Missing trgm indexes for search. |
| Caching | B | Banks, docs, stats — all correctly cached. Partners and user lists not cached. |
| Indexing | B- | Core indexes present. Missing: trgm for search, composite for audit events, sort columns. Redundant indexes exist. |
| Async Patterns | C | `logAuditEvent` is the biggest missed opportunity — synchronous on every request. |

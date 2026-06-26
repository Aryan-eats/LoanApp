# LoanApp

A full-stack loan management platform for partners and administrators. The repository combines a public lead-capture site, an internal admin console, and a partner dashboard with a built-in client management system.

**Live Demo:** https://moneybiz.vercel.app/

---

## Test Credentials

| Role    | Email                  | Password        |
|---------|------------------------|-----------------|
| Admin   | admin@loanapp.com      | Admin@123456    |
| Partner | testing@test.com       | Testing@123     |

> Admin accounts can manage partners, leads, banks, documents, and audit logs. Partner accounts can submit leads, upload documents, and track commissions.

---

## Overview

Website visitors can submit loan enquiries through a public-facing form. Partners onboard, manage their pipeline, and track commissions through a dedicated dashboard. Admin users review and moderate everything — partner approvals, lead assignments, document verification, bank management, and audit activity.

---

## Stack

**Frontend**
- React 19, Vite 7, TypeScript 5
- Tailwind CSS v4, Framer Motion
- React Router 7, Zustand
- Axios, Vitest + React Testing Library

**Backend**
- Node.js + Express 5, TypeScript
- Prisma ORM 7, PostgreSQL 16, Redis 7
- JWT (access + refresh token), bcryptjs
- Helmet, CORS, express-validator

**Infrastructure**
- Docker + Docker Compose
- Nginx (static serving + reverse proxy)
- Cloudflare R2 (document storage via AWS S3 SDK)

---

## Architecture

The system is a split frontend/backend architecture with role-specific user journeys and separate persistence layers for relational data, ephemeral state, and binary documents.

Browser
→ React app (public + admin + partner)
→ REST API (/api)
→ Express middleware stack
→ Route handlers → Services → Prisma ORM → PostgreSQL

Supporting:
→ Redis         (rate limiting, OTP flows, caching)
→ Cloudflare R2 (document object storage)
→ Nginx         (frontend hosting + API proxy)

### Core Flows

**Admin access update** - Admin subroles manage user access and role permissions through backend permission checks. `super_admin` has full access, while `viewer` is read-only for leads, partners, and banks.

**Soft-check update** - Partners can run a backend soft eligibility check for a stored client or lead. The check normalizes bank decimal values before calculation, returns estimated eligibility data, and does not call a credit bureau.

**Public flow** — Visitors submit loan enquiries via the public site. Leads are stored in PostgreSQL and associated with a system partner for downstream handling.

**Partner flow** — Partners register, wait for approval, then log in to submit leads, upload documents, and track their pipeline and commissions.

**Admin flow** — Admins manage partners, leads, banks, document verification, required-document templates, user access, and audit logs.

**Document flow** — Files are stored in Cloudflare R2. Metadata, review state, ownership, and workflow status live in PostgreSQL.

---

## Security

- **Encryption at rest** — Sensitive fields are encrypted only where service/controller code explicitly applies the field-encryption helpers
- **Auth** — Short-lived JWT access tokens + refresh tokens in `httpOnly` cookies to reduce XSS exposure
- **Mock OTP** — Non-production OTP mocks use `MOCK_OTP` from environment; the documented local value is `123456`
- **Rate limiting** — Redis-backed, distributed-friendly; degrades gracefully on Redis failure instead of blocking requests
- **Security headers** — Helmet with CSP and HSTS; `x-powered-by` disabled
- **CORS** — Allowlisted origins with credentialed request support
- **Uploads** — Hardened middleware; documents stored as objects, not database blobs
- **Graceful shutdown** — Controlled teardown for HTTP, Prisma, Redis, and R2 connections
- **Tests** — Security-focused coverage including encryption, cookie security, PII redaction, upload validation, and spoofing scenarios

---

## Soft Check Engine Operations

The partner soft-check endpoint remains `POST /api/partner/soft-check`. It is backward-compatible by default and returns the legacy response unless explicitly switched.

### Required backend environment

| Variable | Purpose |
|---|---|
| `SOFT_CHECK_ENGINE_MODE` | `legacy`, `shadow`, or `v2`. Defaults to `legacy`. |
| `SOFT_CHECK_HMAC_KEY` | Dedicated key for partner-scoped borrower HMACs. Required for `v2`. |
| `SOFT_CHECK_CHECKSUM_KEY` | Dedicated key for input/result checksums. Required for `v2`. |
| `SOFT_CHECK_RATE_LIMIT_MAX` | Optional per-window soft-check request limit. Defaults to 20 in production. |
| `FIELD_ENCRYPTION_KEY` | Existing AES-256-GCM field encryption key for encrypted PII rows. |
| `REDIS_URL` | Enables distributed rate limiting; limiter degrades open if Redis is unavailable. |

### Cutover order

1. Deploy with `SOFT_CHECK_ENGINE_MODE=legacy`.
2. Switch selected partners to `shadow` only after rule releases and audit tables are migrated.
3. Review shadow metrics and malformed-config logs.
4. Switch internal/test partner to `v2`.
5. Expand `v2` to a limited partner cohort.
6. Enable `v2` globally after compliance and operational approval.

Rollback is configuration-only: set `SOFT_CHECK_ENGINE_MODE=legacy`. Do not roll back migrations that have already written immutable decision/audit records.

The soft-check stage must never call a credit bureau. V2 outputs are indicative pre-qualification results only; final lender review, KYC, and separate bureau consent remain downstream.

---

## Design Decisions

**PostgreSQL + Prisma over MongoDB** — The workflow-driven nature of the product (leads, documents, timelines, approvals, commissions, audit events) required strong relational integrity and queryable status transitions.

**Split storage model** — Structured records in PostgreSQL, transient state in Redis, binary files in Cloudflare R2. Each layer does the job it's best suited for.

**JWT + refresh cookie pattern** — Short-lived access tokens limit exposure on leak. Refresh tokens in `httpOnly` cookies avoid storing long-lived credentials in `localStorage`.

**Layered backend** — Routes, controllers, services, config, and utilities are kept separate to make the codebase testable and independently evolvable.

**Workflow state modeled explicitly** — Leads track current status while timeline tables preserve the full transition history — better than mutable status columns alone for admin-heavy systems.

**Redis-backed rate limiting** — Works across instances when Redis is healthy; designed to degrade safely when it isn't.

**Admin permissions in the backend** — Admin subroles are accepted through `authorizeAdmin`, then checked with `requirePermission(resource, action)`. `super_admin` has full access and can edit role permissions. `viewer` is read-only for leads, partners, and banks.

---

## Project Structure
loan-app/
├── src/                      # React frontend
│   ├── admin/                # Admin dashboard
│   ├── partner/              # Partner dashboard
│   ├── pages/                # Public site pages
│   ├── api/                  # API clients
│   ├── components/           # Shared UI
│   ├── hooks/                # Reusable hooks
│   └── stores/               # Zustand stores
├── backend/
│   ├── src/
│   │   ├── config/           # Prisma, Redis, R2, app config
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth, validation, uploads, rate limits
│   │   ├── routes/           # Express routes
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Tokens, encryption, helpers
│   │   └── tests/            # Backend tests
│   ├── prisma/               # Schema and migrations
│   └── Dockerfile
├── docs/                     # API and database docs
├── production/               # Security, review, and hardening notes
├── docker-compose.yml
├── Dockerfile
└── nginx.conf

---

## Getting Started

### Docker (Recommended)

```bash
# Full stack: Postgres, Redis, API, frontend
docker compose up

# Infra only (run apps locally)
docker compose up db redis

# Hot-reload dev profile
docker compose --profile dev up db redis backend-dev frontend-dev

# Tear down
docker compose down
docker compose down -v   # also removes volumes
```

- Frontend: http://localhost  
- API: http://localhost:5000

> Set `DATABASE_URL_DOCKER` in `.env` if the backend container should connect to an existing host Postgres instance. The Docker backend runs `prisma migrate deploy` on startup automatically.

### Manual Setup

**Prerequisites:** Node.js 18+, PostgreSQL 14+, Redis 6+

```bash
# Backend
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev

# Frontend (separate terminal)
cd ..
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_URL` in the root `.env` if the API runs at a non-default address.

---

## Scripts

```bash
# Root
npm run dev       # Start frontend dev server
npm run build     # Production build
npm run lint      # Lint
npm run test      # Frontend tests
npm run check     # Type check

# Backend
cd backend
npm run dev       # Start backend dev server
npm run build     # Compile TypeScript
npm test          # Backend tests
```

---

## Testing

```bash
npm test                # Frontend
cd backend && npm test  # Backend
```

Frontend tests cover hooks, API clients, auth store behavior, modal logic, and calculation logic. Backend tests cover auth, JWT handling, Redis integration, encryption, cookie security, audit integrity, input sanitisation, upload hardening, and PII redaction.

---

## Documentation

- `docs/api.md` — API reference
- `docs/database.md` — Schema and data model
- `production/security.md` — Security hardening notes
- `production/review.md` — Pre-deploy review
- `production/checklist.md` — Production readiness checklist

---

## License

MIT

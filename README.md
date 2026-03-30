# Loan App

A full-stack loan management and client management platform with partner onboarding platform, not just feature delivery. The repository combines a public lead-capture site, an internal admin console, a partner dashboard with a client management system.

The system is designed around a simple business model:

- Website visitors can submit loan enquiries.
- Partners can onboard, manage their leads, submit leads, upload documents, and track commissions.
- Admin users can review partners, manage leads, moderate documents, assign banks, and inspect audit activity.

## Stack

### Frontend

- React 19
- Vite 7
- TypeScript 5
- Tailwind CSS v4
- React Router 7
- Zustand for client state
- Framer Motion for transitions and page animation
- Axios for API access
- Vitest + React Testing Library for frontend tests

### Backend

- Node.js + Express 5
- TypeScript
- Prisma ORM 7
- PostgreSQL 16
- Redis 7
- JWT access and refresh token auth
- bcryptjs for password hashing
- express-validator for request validation
- Helmet, CORS, cookie-parser, compression
- Vitest for backend and security-focused tests

### Storage and Infrastructure

- Docker and Docker Compose for local orchestration
- Nginx for static frontend delivery and API proxying
- Cloudflare R2 via the AWS S3 SDK for document object storage
- PostgreSQL as the system of record
- Redis for rate limiting, token-adjacent flows, and resilience-friendly caching patterns

## System Design

At a high level, this is a split frontend/backend system with role-specific user journeys and separate persistence layers for relational data, ephemeral state, and binary documents.

```text
Browser
  -> React app (public site + admin + partner dashboards)
  -> REST API (/api)
  -> Express middleware stack
  -> Route handlers
  -> Services / business logic
  -> Prisma ORM
  -> PostgreSQL

Supporting services:
  -> Redis for rate limiting and transient auth/OTP flows
  -> Cloudflare R2 for uploaded documents
  -> Nginx for frontend hosting and reverse proxying
```

### Core flows

1. Public website flow
	Website users submit loan enquiries through the public frontend. The API stores a lead in PostgreSQL and associates it with a system partner flow for downstream handling.

2. Partner flow
	Partners register, wait for approval, log in, submit leads, track their pipeline, and participate in document collection and commission tracking.

3. Admin flow
	Admin users manage partners, leads, banks, document verification, required-document templates, user access, and audit logs.

4. Document flow
	Files are stored in Cloudflare R2 while document metadata, review state, ownership, and workflow status remain in PostgreSQL.

## Architecture

### Frontend architecture

The frontend is a single React application with multiple role-specific surfaces:

- Public marketing and lead generation pages under `src/pages`
- Admin dashboard modules under `src/admin`
- Partner dashboard modules under `src/partner`
- Shared API clients under `src/api`
- Shared hooks, stores, and reusable UI under `src/hooks`, `src/stores`, and `src/components`

Notable frontend patterns already in the codebase:

- Lazy-loaded routes to reduce initial bundle cost
- Explicit route preloading helpers for better navigation responsiveness
- Role-based route protection for admin and partner areas
- A shared error boundary and session-expiry handling
- Custom hooks for pagination, local storage, OTP, media queries, fetch flows, and form management

### Backend architecture

The backend follows a layered Express structure:

- `backend/src/routes`: route definitions and endpoint composition
- `backend/src/controllers`: request/response handling
- `backend/src/services`: domain logic and external integrations
- `backend/src/middleware`: auth, rate limiting, validation, upload hardening
- `backend/src/config`: Prisma, Redis, R2, and runtime configuration
- `backend/src/utils`: JWT helpers, audit helpers, encryption, token handling

This keeps the API boundary separate from business logic and reduces the amount of persistence logic leaking into controllers.

### Data architecture

The data model is relational-first and centered on workflow state:

- `users` stores admins and partners, including onboarding and security-related fields
- `leads` stores loan applications and assignment state
- `lead_documents` stores document metadata and review state
- `lead_timeline` tracks lead lifecycle history
- `audit_logs` records security and operational events
- `active_sessions` tracks device/session activity
- `password_history` supports password reuse controls
- `otp_challenges` provides a DB-backed fallback for OTP verification flows
- `lender_doc_requirements` models lender and loan-specific document rules
- `banks` and `bank_commission_rates` model lender products and payout logic

This schema is one of the clearest design choices in the repo: the project moved from MongoDB-style thinking to PostgreSQL and Prisma to get stronger relational integrity, typed queries, and better support for workflow-heavy admin operations.

## Security and Best Practices

The repository already includes several production-aware practices that are worth calling out.

- Security headers are enabled with Helmet, including CSP and HSTS.
- CORS is allowlisted and configured for credentialed requests.
- Refresh tokens live in httpOnly cookies; access tokens are short-lived JWTs.
- JWT configuration is validated on startup so the server fails fast on bad auth settings.
- API-wide and endpoint-specific rate limiting is in place, backed by Redis when available.
- Redis access is wrapped in a shared singleton with controlled reconnect and cooldown behavior.
- Sensitive fields such as Aadhaar, PAN, account details, tokens, and some OTP-related values are encrypted at rest through a Prisma extension.
- Document uploads are separated into object storage plus relational metadata, which is cleaner operationally and safer than storing blobs directly in the database.
- The server includes graceful shutdown handling for HTTP, Prisma, Redis, and R2 resources.
- Request body sizes are constrained and `x-powered-by` is disabled.
- Tests include security-oriented coverage such as encryption, audit integrity, cookie security, upload validation, spoofing, and PII redaction.

There is also evidence of pragmatic resilience decisions:

- Redis-backed features fall back carefully where supported instead of making the whole app unusable on transient Redis failure.
- Rate limit stores are wired to tolerate store outages with `passOnStoreError` so the API can degrade rather than fail closed during development or infrastructure interruptions.
- Prisma and R2 are initialized through shared configuration modules rather than recreated ad hoc across the codebase.

## Design Decisions

### PostgreSQL + Prisma over MongoDB

The project explicitly moved to PostgreSQL and Prisma. That is the right tradeoff for a workflow-driven product with leads, documents, timelines, partner approvals, banks, commissions, and audit events that all need coherent relationships and queryable status transitions.

### Split storage model

Structured records live in PostgreSQL, transient infrastructure concerns live in Redis, and binary documents live in Cloudflare R2. This keeps each storage layer doing the job it is best suited for.

### JWT access token + refresh cookie pattern

Short-lived access tokens reduce exposure if a token leaks. Refresh tokens in httpOnly cookies reduce XSS exposure compared with storing long-lived tokens in localStorage.

### Layered backend modules

Routes, controllers, services, config, and utilities are separated rather than collapsed into a single Express layer. That makes the codebase easier to test and evolve.

### Workflow state captured explicitly

The schema keeps both current state and event history. For example, leads track a current status while timeline tables preserve transitions. This is a better fit for admin-heavy systems than relying only on mutable status columns.

### Frontend code splitting

Admin and partner areas are lazy loaded, and route preload helpers are used to improve perceived performance without forcing everything into the initial bundle.

### Redis-backed rate limiting

Rate limiting is designed to work across instances when Redis is healthy, which is materially better than relying only on in-memory counters in a distributed deployment.

## Project Structure

```text
loan-app/
├── src/                      # React frontend
│   ├── admin/                # Admin dashboard pages and components
│   ├── partner/              # Partner dashboard pages and components
│   ├── api/                  # API client and service wrappers
│   ├── components/           # Shared UI components
│   ├── hooks/                # Reusable hooks
│   ├── stores/               # Zustand stores
│   ├── pages/                # Public website pages
│   └── tests/                # Frontend tests
├── backend/
│   ├── src/
│   │   ├── config/           # Prisma, Redis, R2, app configuration
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth, validation, uploads, rate limits
│   │   ├── routes/           # Express route registration
│   │   ├── services/         # Business logic and integrations
│   │   ├── utils/            # Tokens, encryption, helpers
│   │   └── tests/            # Backend tests
│   ├── prisma/               # Prisma schema and migrations
│   └── Dockerfile            # API image build
├── docs/                     # Additional design and API docs
├── production/               # Production notes, reviews, and hardening tasks
├── docker-compose.yml        # Full local stack
├── Dockerfile                # Frontend build and nginx image
└── nginx.conf                # Reverse proxy and static serving config
```

## Getting Started

### Docker

Recommended for a realistic local environment.

```bash
# Full stack: Postgres, Redis, API, frontend
docker compose up

# Infra only: run DB and Redis while running apps locally
docker compose up db redis

# Hot-reload development profile
docker compose --profile dev up db redis backend-dev frontend-dev

# Tear down
docker compose down
docker compose down -v
```

Frontend: `http://localhost`

API: `http://localhost:5000`

Set `DATABASE_URL_DOCKER` in the root `.env` when the backend container should connect to an existing host Postgres instance instead of the compose `db` service. The Docker backend commands run `prisma migrate deploy` before starting the API so auth routes do not come up against an unmigrated schema.

### Manual Setup

Prerequisites:

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

Backend:

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

Frontend:

```bash
cd ..
npm install
cp .env.example .env
npm run dev
```

If the API is not running at the default address, set `VITE_API_URL` in the root `.env`.

## Scripts

Repository root:

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run check
```

Backend:

```bash
cd backend
npm run dev
npm run build
npm test
```

## Testing

The test suite covers more than happy-path UI behavior.

- Frontend tests cover hooks, API clients, auth store behavior, modal behavior, and calculation logic.
- Backend tests cover auth, JWT handling, Redis integration, document service behavior, encryption, cookie security, audit integrity, input sanitisation, upload hardening, and PII redaction.

Run tests with:

```bash
npm test
cd backend && npm test
```

## Documentation

Additional project documentation is available in:

- `docs/api.md`
- `docs/database.md`
- `production/security.md`
- `production/review.md`
- `production/checklist.md`

## License

MIT

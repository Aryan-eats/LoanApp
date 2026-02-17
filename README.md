

A full-stack loan management and partner onboarding system. Built as a student project to learn production-grade web development — covering authentication, role-based access, database design, and containerised deployment.

The app lets an internal admin team manage loan leads end-to-end, while giving channel partners their own dashboard to submit and track leads.

## Tech Stack

**Frontend:** React 19, Vite, TailwindCSS v4, Zustand, React Router v7

**Backend:** Express 5, TypeScript, Prisma ORM (PostgreSQL), Redis

**Auth:** JWT access/refresh tokens, bcrypt, httpOnly cookies

**Testing:** Vitest, React Testing Library

**Infrastructure:** Docker, Docker Compose, Nginx

## Project Structure

```
loan-app/
├── src/                    # React frontend
│   ├── admin/              #   Admin dashboard
│   ├── partner/            #   Partner dashboard
│   ├── api/                #   API client and service layers
│   ├── components/         #   Shared UI components
│   ├── hooks/              #   Custom hooks
│   ├── stores/             #   Zustand stores
│   └── tests/              #   Frontend tests
├── backend/
│   ├── src/
│   │   ├── controllers/    #   Route handlers
│   │   ├── routes/         #   Express routes
│   │   ├── middleware/     #   Auth, rate-limit, validation
│   │   ├── services/       #   Business logic
│   │   ├── utils/          #   Helpers (encryption, tokens)
│   │   └── config/         #   Prisma, Redis config
│   ├── prisma/             #   Schema and migrations
│   └── src/tests/          #   Backend tests
├── docker-compose.yml
├── Dockerfile              #   Frontend (Nginx)
└── backend/Dockerfile      #   API
```

## Getting Started

### Docker (recommended)

```bash
# Full stack — PostgreSQL, Redis, API, Frontend
docker compose up

# Infrastructure only — run Node apps locally
docker compose up db redis

# Dev mode with hot reload
docker compose --profile dev up db redis backend-dev frontend-dev

# Tear down
docker compose down
docker compose down -v       # also deletes DB volumes
```

Frontend: `http://localhost` | API: `http://localhost:5000`

### Manual Setup

Prerequisites: Node.js 18+, PostgreSQL 14+, Redis 6+

**Backend**

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env` — database URL, JWT secrets, Redis URL, system partner ID.

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

**Frontend**

```bash
cd ..
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_URL` in root `.env` if your API is not on `http://localhost:5000/api`.

## Tests

```bash
npm test              # frontend
cd backend && npm test   # backend
```

## Design Decisions

- **bcrypt with 12 rounds** for password hashing. Adds ~300 ms to login but meets security requirements.
- **Zustand** over Redux — simpler API, less boilerplate, good enough for this scale.
- **IntersectionObserver** for infinite scroll instead of scroll event listeners. Better performance on low-end devices.
- **Refresh tokens in httpOnly cookies** rather than localStorage to reduce XSS surface.
- **Migrated from MongoDB to PostgreSQL** mid-project for relational integrity and stronger typing via Prisma.
- **Redis-backed rate limiting** so limits persist across restarts and scale across instances.

## Known Issues / TODO

- [ ] Wire up production SMS, email, and KYC gateways
- [ ] User and role credentials not fully functional in the frontend
- [ ] Add end-to-end tests
- [ ] Set up CI/CD pipeline

## License

MIT
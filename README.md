# Subul Platform

**Subul** is a multilingual online learning and career platform that combines structured courses, hands-on cloud labs, certifications, AI-assisted tutoring, and job-search tools. Learners get a unified dashboard; operators manage content, users, subscriptions, and business requests through an admin console.

---

## What this platform does

- **Learning:** Course catalog with progress tracking, modular content, quizzes, and voice-assisted lab/course assistants (Cartesia TTS).
- **Paths & goals:** Learner dashboard with goals, roadmap (personalized modules when generated), and certification readiness.
- **Labs:** Practical scenarios (e.g. AWS, Azure, GCP) scoped to the learner’s track and enrollments.
- **Career:** CV upload and enhancement, job matching / career assistant flows, LinkedIn tooling (e.g. Subul.in extension).
- **Monetization:** Regional pricing (TN / EU / US), Stripe and Flouci, promo codes, trials, subscription gates on dashboard APIs, and quote requests (“devis”) for enterprise-style plans.
- **Administration:** Courses, labs, certifications, users, payments, promo codes, quote requests, analytics, and more.

The product is built as a **modern web app** (not the legacy Flask layout described in older docs): **Next.js** (App Router, i18n), **NestJS API**, **PostgreSQL**, and **Python microservices/agents** orchestrated with **Docker Compose**.

---

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js, React, Tailwind CSS, shadcn-style UI, Framer Motion |
| API | NestJS, TypeORM, JWT, REST |
| Database | PostgreSQL (pgvector image in Docker) |
| Agents | Python services (e.g. CV booster, job search helpers) |
| Payments | Stripe, Flouci; geo-aware pricing |
| Ops | Docker Compose; Kubernetes manifests under `eks/` for optional deployment |

---

## Repository layout (high level)

```
subul-platform/
├── frontend/          # Next.js app ([locale] routes, dashboard, landing, checkout)
├── backend/api/       # NestJS API (modules: learner, courses, labs, payments, …)
├── backend/agents/    # Python agents and tooling
├── docker-compose.yml # Local full stack (postgres, api, frontend, agents as configured)
├── jobsearchsubul/    # Job pipeline stubs / scraper-related code
├── eks/               # Kubernetes deployment examples
├── CLAUDE.md          # Maintainer notes for AI assistants (current focus & status)
└── README.md          # This file
```

For frontend-specific conventions, see `frontend/CLAUDE.md` if present.

---

## Prerequisites

- **Docker** and **Docker Compose** (recommended for local full stack)
- **Node.js** (LTS) and **npm** — for running the frontend or API outside Docker
- **PostgreSQL** — provided by Compose by default

---

## Quick start (Docker)

From the repository root:

```bash
docker compose up -d --build
```

Typical ports (see `docker-compose.yml` and `.env`):

- **Frontend:** `http://localhost:3000`
- **API:** `http://localhost:3001`

Set `NEXT_PUBLIC_BACKEND_URL` / `BACKEND_URL` / `FRONTEND_URL` consistently for your environment. Production frontends often proxy `/api` to the backend via Next.js rewrites — see `frontend/next.config.ts`.

---

## Environment variables (overview)

- **Database:** `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DATABASE_URL`
- **Auth:** `JWT_SECRET`, `JWT_EXPIRES_IN`, `SESSION_SECRET`
- **URLs:** `FRONTEND_URL`, `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`
- **Payments:** Stripe and/or Flouci keys and price IDs (see `docker-compose.yml` and payment config in the API)
- **Geo:** Optional dev overrides for region detection

Never commit real secrets; use `.env` files ignored by Git.

---

## Development without Docker (outline)

1. Start PostgreSQL and create the database.
2. **API:** `cd backend/api`, install deps, run migrations, start Nest (`npm run start:dev` or project scripts).
3. **Frontend:** `cd frontend`, `npm install`, `npm run dev`.

Exact scripts are defined in each package’s `package.json`.

---

## Database migrations

When the API adds migrations, run them from `backend/api` (e.g. `npm run migration:run` — confirm the script name in that package).

---

## Documentation pointers

- **`CLAUDE.md`** — Project snapshot, recent changes, and verification checklist for maintainers.
- **`AGENTS_README.md`** — Building and running AI agents with Docker Compose (if present).
- **`TODO.md`** — Task list (if maintained).

---

## License

See `LICENSE` in the repository root.

---

## Contributing

Follow existing patterns in each area (Nest modules, Next App Router, TypeORM migrations). Keep secrets out of Git; prefer small, focused PRs with clear descriptions.

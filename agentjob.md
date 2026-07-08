# Agent Job Architecture — Subul Platform

Complete reference for AI agents, their internal API surfaces, NestJS proxy routes, and frontend hooks.

---

## Overview

Two Python microservices run in Docker alongside the NestJS API:

| Service | Docker container | Port | Purpose |
|---|---|---|---|
| CV Booster Agent | `agent-cv-booster` | `8005` | CV parsing, enrichment, DOCX generation, CosmosDB persistence |
| Job Search Agent | `agent-job-search` | `8005` (same container via routers) | Job scraping, ATS scoring, gap analysis, career chat |

NestJS (`backend/api`) acts as a **secure authenticated proxy** — every route requires JWT. The user's DB `id` is injected as `user_id` before forwarding.

---

## 1. CV Booster Agent

### Source files
```
backend/agents/CV_Booster_Agent/
  enhance_cv.py       ← main router (enhance_router)
  section_utils.py    ← CV section parsing helpers
  requirements.txt

backend/agents/JobSearch-SUBUL/
  save_cv.py          ← cv_workflow_router (extract/save/store-user/cv-status)
```

### Python endpoints (internal — called by NestJS proxy)

| Method | Path | File | Description |
|--------|------|------|-------------|
| `POST` | `/api/cv/extract` | `enhance_cv.py` | Parse raw CV file → structured JSON |
| `POST` | `/api/cv/boost` | `enhance_cv.py` | Full LLM enhancement: raw CV + platform data → enriched CV |
| `POST` | `/api/cv/apply-format` | `enhance_cv.py` | Generate `.docx` from parsed/boosted CV |
| `POST` | `/api/cv/extract-cv` | `save_cv.py` | Extract only (no save) |
| `POST` | `/api/cv/save-cv` | `save_cv.py` | Extract + save structured CV to CosmosDB |
| `POST` | `/api/cv/store-user` | `save_cv.py` | Register user in CosmosDB (idempotent) |
| `GET`  | `/api/cv/platform-data/{user_id}` | `save_cv.py` | Fetch learner progress (labs, certs, quiz) from platform DB |
| `GET`  | `/api/cv/cv-status/{user_id}` | `save_cv.py` | Check whether user has a saved CV in CosmosDB |

### NestJS proxy routes (`backend/api/src/agents/agents.controller.ts`)

All under `@Controller('api')`, JWT-guarded:

| NestJS Route | Proxies to | Notes |
|---|---|---|
| `POST /api/cv/extract` | Python `/api/cv/extract` | Multer file upload, injects `user_id` |
| `POST /api/cv/save` | Python `/api/cv/save-cv` | Multer, optional `quiz_data`, `labs_data`, `certs_data`, `extra_data` |
| `GET  /api/cv/platform-data/:userId` | Python `/api/cv/platform-data/:userId` | Admin/internal use |
| `GET  /api/cv/status` | Python `/api/cv/cv-status/:userId` | Returns `CvStatus` shape |
| `GET  /api/cv/document` | Python `/api/cv/cv-status/:userId` (extended) | Returns full `CvDocument` |
| `POST /api/cv/boost` | Python `/api/cv/boost` | Full enrichment pipeline |
| `POST /api/cv/apply-format` | Python `/api/cv/apply-format` | Returns `.docx` blob |
| `POST /api/cv/store-user` | Python `/api/cv/store-user` | Idempotent user registration |

### Frontend hooks (`frontend/hooks/api/useCvBooster.ts`)

All queries are **user-scoped** — query keys include `userId` to prevent cross-user cache leaks.

```typescript
cvKeys.status(uid)   → ['cv', uid, 'status']
cvKeys.document(uid) → ['cv', uid, 'document']
cvKeys.boost(uid)    → ['cv', uid, 'boost']
```

| Hook | Type | Description |
|------|------|-------------|
| `useCvStatus()` | `useQuery<CvStatus>` | Polls CV readiness: `hasCv`, `status`, `lastUploadedAt`, `fileName`, `cvPreview` |
| `useCvDocument()` | `useQuery<CvDocument>` | Full structured CV document (name, role, skills, bullets…) |
| `useCvExtract()` | `useMutation` | Extract a file without saving |
| `useCvSave()` | `useMutation` | Upload + save CV file (with optional quiz/labs/certs enrichment) |
| `useCvBoost()` | `useMutation` | Full boost pipeline (extract + LLM enhance) |
| `useCvApplyFormat()` | `useMutation` | Get `.docx` blob from parsed CV |
| `invalidateCvStatus(qc, uid?)` | helper | Invalidates status cache for a user |
| `clearUserCvCache(qc, uid)` | helper | Removes all CV cache entries for a user (call on logout) |

### Data flow
```
User uploads file
  → useCvSave (POST /api/cv/save)
  → NestJS injects userId → Python save_cv.py
  → CosmosDB stores structured doc keyed by user_id
  → invalidateCvStatus() → useCvStatus refetches
  → emploi/page.tsx shows CV summary card + EmploiDashboard
```

---

## 2. Job Search Agent

### Source files
```
backend/agents/JobSearch-SUBUL/
  main.py              ← FastAPI app, mounts all routers
  jobs_router.py       ← job matching, gap, roadmap
  chat_router.py       ← career chat + history
  scraping_pipeline.py ← SSE live scrape
  save_cv.py           ← CV workflow (shared with CV Booster)
  ats_scorer.py        ← ATS scoring engine
  ats_matcher.py       ← CV vs JD matcher
  xai_explainer.py     ← explainable AI score breakdowns
  scraper_*.py         ← per-site scrapers (LinkedIn, Indeed, WTTJ, TanitJobs…)
  database.py          ← PostgreSQL connection (scraped jobs)
  db_platform.py       ← Platform DB connection (learner progress)
```

### Python endpoints (internal)

| Method | Path | File | Description |
|--------|------|------|-------------|
| `GET`  | `/api/profile` | `main.py` | Get user career profile |
| `POST` | `/api/profile` | `main.py` | Update career profile |
| `GET`  | `/api/user/{user_id}/has_jobs` | `main.py` | Check if scraped jobs exist for user |
| `GET`  | `/api/matches/{user_id}` | `jobs_router.py` | Retrieve matched jobs |
| `POST` | `/api/matches` | `jobs_router.py` | Run fresh matching against saved CV |
| `POST` | `/api/gap` | `jobs_router.py` | Skill gap analysis vs target job |
| `POST` | `/api/roadmap` | `jobs_router.py` | Learning roadmap to close skill gap |
| `GET`  | `/api/market` | `main.py` | Market trends / salary data |
| `POST` | `/api/report` | `main.py` | Full career report generation |
| `POST` | `/api/ats-score` | `main.py` | ATS score for a specific job |
| `POST` | `/scan` | `scraping_pipeline.py` | SSE live scrape (streams `text/event-stream`) |
| `POST` | `/api/chat` | `chat_router.py` | Career assistant chat turn |
| `GET`  | `/api/chat/history` | `chat_router.py` | Retrieve full conversation history |

### NestJS proxy routes

| NestJS Route | Description |
|---|---|
| `GET  /api/job-search/profile` | Career profile fetch |
| `POST /api/job-search/profile` | Career profile update |
| `GET  /api/job-search/jobs` | Matched job list |
| `POST /api/job-search/scan` | SSE scan (streamed response) |
| `POST /api/job-search/analyze-cv` | Analyze CV against a job |
| `POST /api/job-search/gap` | Skill gap |
| `POST /api/job-search/roadmap` | Learning roadmap |
| `POST /api/job-search/ats-score` | ATS score for a job |
| `GET  /api/job-search/market` | Market data |
| `POST /api/job-search/report` | Career report |
| `POST /api/job-search/chat` | Chat turn (history appended from Postgres via `JobSearchChatService`) |
| `GET  /api/job-search/chat/history` | Full chat history from Postgres |
| `POST /api/job-search/chat/reset` | Clear chat history |

> **Chat persistence:** unlike pass-through routes, NestJS reads the full history from Postgres via `JobSearchChatService`, appends it to the payload, forwards to Python, then writes the new exchange back. This ensures continuity across sessions.

### Frontend hooks (`frontend/hooks/api/useJobSearch.ts`)

Query keys are **user-scoped** (include `userId`) to prevent cross-user cache leaks:

```typescript
jobSearchKeys.profile(uid) → ['job-search', uid, 'profile']
jobSearchKeys.jobs(uid)    → ['job-search', uid, 'jobs']
```

| Hook | Type | Description |
|------|------|-------------|
| `useJobSearchProfile()` | `useQuery` | Career profile (enabled only when userId known) |
| `useUpdateJobSearchProfile()` | `useMutation` | Save profile, invalidates scoped profile key |
| `useSearchJobs()` | `useMutation` | Search/filter jobs |
| `useAnalyzeCv()` | `useMutation` | Analyze CV for a specific job |

### Career Assistant dashboard
- **Route:** `app/[locale]/dashboard/learner/emploi/dashboard.tsx`
- Full single-file UI: tabs (Matches, Gap, Roadmap, Market, Report), SSE scan progress, ATS modal, Chat sidebar
- SSE scan uses **relative `fetch('/api/job-search/scan')`** (goes through Next.js rewrites → Nest → Python) for Docker-friendly routing

---

## 3. Emploi Entry Page (`emploi/page.tsx`)

Gate page at `/dashboard/learner/emploi`. Renders before the Career Assistant dashboard.

### States

| Condition | Renders |
|---|---|
| `contentAccess.isFree` | Premium paywall card with upgrade CTA |
| `cvLoading` | Spinner |
| `cvError \|\| status === 'error'` | Error banner + Retry + inline Upload |
| `status !== 'ready'` (no CV) | Inline drag-and-drop upload zone (calls `useCvSave` directly) |
| `status === 'ready'` (CV ready) | Compact CV summary banner + `<EmploiDashboard />` |

### Inline upload flow
```
User drops file onto zone
  → handleFile(file) → useCvSave.mutateAsync({ file })
  → POST /api/cv/save (with JWT, no redirect)
  → invalidateCvStatus(queryClient, uid)
  → refetchCv() → status becomes 'ready'
  → page transitions to CV summary + EmploiDashboard
```

### CV summary banner (when ready)
Shows: `fileName`, ready badge, `cvPreview.role`, `cvPreview.yearsExp`, `lastUploadedAt`  
Actions: **View CV** → `/dashboard/learner/cv/view` | **Replace** → `/upload-cv?user_id=…`

---

## 4. Security: Cross-User Cache Isolation

**Problem:** React Query used global keys (`['cv', 'status']`). User A logs in → data cached globally. User B logs in → gets served User A's CV data without a new fetch.

**Fix applied in this session:**

| File | Change |
|---|---|
| `hooks/api/useCvBooster.ts` | All `cvKeys` include `userId`: `['cv', uid, 'status']` etc. Hooks read `userId` via `useAuth()` |
| `hooks/api/useJobSearch.ts` | `jobSearchKeys.profile(uid)` / `jobs(uid)` include `userId`. `useJobSearchProfile` uses `useAuth()` |
| `contexts/AuthContext.tsx` | `logout()` calls `queryClient.clear()` — wipes entire cache on sign-out |

---

## 5. Docker & Ports

```yaml
# docker-compose.yml (relevant services)
agent-cv-booster:
  build: ./backend/agents/CV_Booster_Agent
  ports: ["8005:8005"]

agent-job-search:
  build: ./backend/agents/JobSearch-SUBUL
  ports: ["8006:8006"]   # adjust if different in your compose

api:
  environment:
    CV_AGENT_URL: http://agent-cv-booster:8005
    JOB_SEARCH_AGENT_URL: http://agent-job-search:8006
```

Check `docker-compose.yml` for exact port bindings — they may differ per environment.

---

## 6. Rebuild Commands

```bash
# Full rebuild
docker compose up -d --build api frontend agent-cv-booster agent-job-search

# Frontend only
docker compose up -d --build frontend

# View agent logs
docker compose logs -f agent-cv-booster
docker compose logs -f agent-job-search
```

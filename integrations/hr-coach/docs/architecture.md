# SUBUL RH Microservices Architecture

## Goal

The application is organized as a microservices deployment while keeping the
domain code shared during this migration step. This gives independent runtime
boundaries, clearer ownership, and a safer path toward future code extraction.

## Services

| Service | Code entrypoint | Responsibility | Public routes through gateway |
| --- | --- | --- | --- |
| `api-gateway` | Nginx | Single backend entrypoint and route dispatch | `http://localhost:8000` |
| `interview-service` | `services.interview.main:app` | Interview session lifecycle, CV ingestion, candidate messages, WebSocket interview flow | `/rh/sessions...`, `/ws/rh/...` |
| `calendar-service` | `services.calendar.main:app` | Interview planning, updates, cancellation, reminder loop | `/rh/interviews...` |
| `analytics-service` | `services.analytics.main:app` | HR dashboard and history aggregation | `/rh/dashboard...` |
| `media-service` | `services.media.main:app` | STT, live STT, TTS, vision, audio, and proctoring signals | `/rh/stt`, `/ws/rh/stt...`, `/rh/tts`, `/rh/vision/config`, selected `/rh/sessions/{id}/...` routes |
| `reporting-service` | `services.reporting.main:app` | PDF report generation and insights reports | `/rh/sessions/{id}/report.pdf`, `/rh/sessions/{id}/insights-report.pdf` |
| `frontend` | Next.js | Next.js application | `http://localhost:8080` |

## Runtime Flow

1. The browser calls the Next.js API routes.
2. Next.js forwards backend calls to `RH_API_BASE_URL`.
3. In Docker, `RH_API_BASE_URL` points to `http://api-gateway:8000`.
4. Nginx routes each path to the appropriate backend service.
5. Each backend service starts from its own Python module under
   `backend/services/*/main.py`.
6. Each backend service owns only the route handlers for its domain.
7. Each backend service is built from its own Dockerfile under
   `backend/services/*/Dockerfile`.
8. Lightweight services use service-specific Python dependency files instead
   of the full AI/media dependency set.

## Agent Orchestration

The interview agent is orchestrated by `interview-service` through
`LangGraphRHOrchestrator`. The frontend does not decide the interview phase; it
only sends candidate messages to `/rh/sessions/{session_id}/message`.

The default interview flow contains four scored interview questions followed by
one finalization turn:

| Turn | Phase | Purpose |
| --- | --- | --- |
| 1 | `INTRO` | Short opening question grounded in the candidate profile |
| 2 | `BEHAVIOR` | Behavioral question about a concrete past situation |
| 3 | `SOFT` | Collaboration, communication, or interpersonal signal |
| 4 | `MOTIVATION` | Motivation and fit with the target context |
| Final | `FINAL` | Final report generation and closing message |

The default question limit is `interview_max_questions = 4` on
`RHSessionState`. The LangGraph route only finalizes automatically after the
stored session has at least four question turns. Manual finalization remains
available through `/rh/sessions/{session_id}/finalize`.

Because services share session storage during this migration step, session
writes merge the richest available `turns`, visual observations, audio
observations, and proctoring events. This prevents media/reporting writes from
overwriting interview turns captured by `interview-service`.

To verify a session locally:

```powershell
Invoke-WebRequest -UseBasicParsing "http://localhost:8000/rh/sessions/<session_id>" |
  Select-Object -ExpandProperty Content
```

The persisted payload should show phases in this order for a natural completed
interview: `INTRO`, `BEHAVIOR`, `SOFT`, `MOTIVATION`, `FINAL`.

## Data Ownership

The current migration keeps shared storage under `backend/data` for local
Docker runs and supports PostgreSQL through `DATABASE_URL` for production. For
production microservices, prefer PostgreSQL plus Azure Blob Storage so service
containers can scale horizontally without relying on local filesystem state.

## Suggested Next Extraction

The current step creates deployable runtime boundaries, code-level service
entrypoints, service-specific Dockerfiles, and service-specific route exposure.
All backend services own their FastAPI implementations, and the production
deployment is the service-container split documented in
`docs/azure-microservices.md`. A future hardening step is to move duplicated
helper logic from service apps into shared library modules, for example:

- `backend/services/interview/routes.py`
- `backend/services/calendar/routes.py`
- `backend/services/media/routes.py`
- `backend/services/reporting/routes.py`
- `backend/services/analytics/routes.py`

This keeps common behavior reusable without merging service entrypoints back
into a monolith.

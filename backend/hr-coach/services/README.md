# Backend Services

This directory contains deployable FastAPI entrypoints for each backend
microservice.

Each production service owns its FastAPI application, route handlers,
Dockerfile, and runtime entrypoint.

## Entrypoints

| Service | Module | Profile | Implementation |
| --- | --- | --- | --- |
| Interview | `services.interview.main:app` | `interview` | Standalone service app |
| Calendar | `services.calendar.main:app` | `calendar` | Standalone service app |
| Analytics | `services.analytics.main:app` | `analytics` | Standalone service app |
| Media | `services.media.main:app` | `media` | Standalone service app |
| Reporting | `services.reporting.main:app` | `reporting` | Standalone service app |

Each production service also has its own Dockerfile in its service directory.
Services with smaller runtime needs also have their own dependency files:

- `services/calendar/requirements.txt`
- `services/analytics/requirements.txt`
- `services/reporting/requirements.txt`

## Next Code Extraction

All backend services are standalone FastAPI apps. Shared domain modules stay in
`core`, `orchestrator`, `voice`, `vision`, `reporting`, and `interview_ai`.

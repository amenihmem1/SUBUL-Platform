# Monitoring System — Implementation Plan

## Overview

Add a real-time service-health monitoring dashboard to the Subul admin panel.
All checks run server-side through NestJS; no secrets ever reach the browser.

---

## 1. Current Health Endpoint Status

| Agent | URL env var | Existing `/health`? | Path |
|---|---|---|---|
| Cloud Tutor | `CLOUD_TUTOR_AGENT_URL` | ❌ missing | add `GET /health` to `03_Agents/api_server.py` |
| Quiz | `QUIZ_AGENT_URL` | ✅ exists | `GET /api/quiz/health` |
| Roadmap | `ROADMAP_AGENT_URL` | ✅ exists | `GET /api/roadmap/health` |
| Coach | `COACH_AGENT_URL` | ✅ exists | `GET /api/coach/health` |
| CV Booster | `CV_BOOSTER_URL` | ❌ missing | add `GET /health` to `CV_Booster_Agent/enhance_cv.py` |
| Job Search | `JOB_SEARCH_AGENT_URL` | ❌ missing | add `GET /health` to `JobSearch-SUBUL/main.py` |

External services (no `/health` — lightweight HTTP probe):

| Service | How to probe | Env vars used |
|---|---|---|
| Azure OpenAI | HEAD `{AZURE_OPENAI_CHAT_ENDPOINT}/openai/models?api-version=2024-02-01` | `AZURE_OPENAI_CHAT_ENDPOINT` or `TUTOR_AZURE_OPENAI_ENDPOINT` |
| Azure Search | GET `{AZURE_SEARCH_ENDPOINT}/indexes?api-version=2023-11-01` | `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_API_KEY` |
| Azure Cosmos DB | HEAD `{TUTOR_COSMOS_ENDPOINT}` | `TUTOR_COSMOS_ENDPOINT` or `COSMOS_ENDPOINT` |
| Cartesia TTS | GET `https://api.cartesia.ai/voices` (just check reachability) | `CARTESIA_API_KEY` (key present = configured) |
| Deepgram STT | GET `https://api.deepgram.com/v1/listen` (HEAD probe) | `DEEPGRAM_API_KEY` |
| Stripe | GET `https://api.stripe.com/v1/account` with Bearer key | `STRIPE_SECRET_KEY` |
| SMTP / SES | TCP connect to `SMTP_HOST:SMTP_PORT` | `SMTP_HOST`, `SMTP_PORT` |

---

## 2. Files to Create / Modify

### 2a. Python agents — add `/health` (3 files changed)

| File | Change |
|---|---|
| `backend/agents/03_Agents/api_server.py` | Add `@app.get("/health")` route returning `{status, service, version}` |
| `backend/agents/CV_Booster_Agent/enhance_cv.py` | Add `@enhance_router.get("/health")` |
| `backend/agents/JobSearch-SUBUL/main.py` | Add `@app.get("/health")` route |

### 2b. NestJS backend — new `monitoring` module (5 new files)

```
backend/api/src/monitoring/
  monitoring.module.ts          ← imports HttpModule; declares controller + service
  monitoring.controller.ts      ← GET /api/monitoring/status  GET /api/monitoring/summary
  monitoring.service.ts         ← all probe logic, 5s timeout, in-memory TTL cache
  dto/monitoring-result.dto.ts  ← ServiceCheckResult, MonitoringStatus interfaces
```

Plus **1 file modified**:
- `backend/api/src/app.module.ts` — import `MonitoringModule`

### 2c. Frontend — new monitoring page (4 new files, 3 modified)

```
frontend/
  services/monitoring.ts                              ← getMonitoringStatus(), getSummary()
  hooks/api/useMonitoring.ts                          ← useMonitoringStatus() (poll 30s)
  app/[locale]/dashboard/admin/monitoring/page.tsx    ← full dashboard UI
```

**Modified files:**
- `frontend/lib/api/client.ts` — add `monitoring` to `API_PATHS`
- `frontend/components/layout/Sidebar.tsx` — add "Monitoring" nav item
- `.env.example` — document new optional monitoring-related env vars

---

## 3. Backend Architecture Detail

### `monitoring.service.ts` — key design

```typescript
interface ServiceCheckResult {
  name: string;           // "Cloud Tutor", "Azure OpenAI", etc.
  category: 'agent' | 'azure' | 'voice' | 'payment' | 'email';
  status: 'up' | 'down' | 'unconfigured';
  latencyMs: number | null;
  statusCode: number | null;
  error: string | null;   // safe public message only, no secrets
  checkedAt: string;      // ISO timestamp
  url: string;            // redacted: "https://api.stripe.com" not full auth URL
}

interface MonitoringStatus {
  services: ServiceCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    unconfigured: number;
    avgLatencyMs: number | null;
    checkedAt: string;
  };
}
```

**Cache**: results cached in-memory for **30 seconds** (`Map<string, {data, ts}>`).
GET `/api/monitoring/status?force=true` bypasses cache.

**Timeout**: every outbound HTTP probe uses `AbortController` with 5 000 ms timeout.
No probe ever throws; always returns `{ status: 'down', error: 'timeout' }`.

**Auth**: Both endpoints require `JwtAuthGuard`. Admin role enforced via
`@Roles('admin')` + `RolesGuard` (same pattern as admin content controller).

### `monitoring.controller.ts`

```
GET  /api/monitoring/status   → full ServiceCheckResult[]  (JwtAuthGuard + admin)
GET  /api/monitoring/summary  → counts only, no per-service detail (JwtAuthGuard + admin)
```

---

## 4. Frontend Dashboard Detail

**Route**: `/[locale]/dashboard/admin/monitoring`

**Layout (same `admin/layout.tsx` wrapper):**

```
┌──────────────────────────────────────────────────────────────┐
│  [Header] Service Monitoring          [Refresh] [Last check] │
├──────────────┬─────────────────────────────────────────────  │
│  Summary row │  Total | Healthy | Unhealthy | Avg latency   │
├──────────────┴─────────────────────────────────────────────  │
│  Section: AI Agents (6 cards)                                │
│    ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│    │ ● UP  42ms │  │ ● UP  31ms │  │ ✗ DOWN     │          │
│    │ Cloud Tutor│  │   Quiz     │  │  CV Booster│          │
│    │ 200  12:03 │  │ 200  12:03 │  │ ERR  12:03 │          │
│    └────────────┘  └────────────┘  └────────────┘          │
│                                                              │
│  Section: Azure Services (3 cards)                           │
│  Section: Voice / Payment / Email (4 cards)                  │
└──────────────────────────────────────────────────────────────┘
```

**Status colors**:
- `up` → green dot + green border
- `down` → red dot + red border
- `unconfigured` → gray dot + gray border (env var not set)

**Auto-refresh**: React Query `refetchInterval: 30_000`.
Manual "Refresh" button calls `queryClient.invalidateQueries`.

---

## 5. `.env.example` additions

```bash
# ── External service monitoring (optional — used only by /api/monitoring/status) ──
# Azure Search (already used by content-indexer):
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_API_KEY=your_search_key
# Cosmos DB endpoint (used by cloud-tutor agent):
TUTOR_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
# Stripe
STRIPE_SECRET_KEY=sk_live_...
```

---

## 6. Execution Order

1. **Add `/health` to 3 Python agents** (api_server.py, enhance_cv.py, main.py)
2. **Create NestJS monitoring module** (dto → service → controller → module)
3. **Register MonitoringModule in app.module.ts**
4. **Create frontend service + hook**
5. **Create frontend dashboard page**
6. **Wire Sidebar + API_PATHS**
7. **Update .env.example**
8. **Commit all**

---

## 7. What Will NOT Be Implemented (scope control)

- Historical persistence in DB (real-time only; code structured for easy extension)
- Alerting / notifications on status change
- Public status page (admin-only)
- Kubernetes liveness probes (separate concern)

---

## 8. Files Summary

| # | File | Action |
|---|---|---|
| 1 | `backend/agents/03_Agents/api_server.py` | Add `/health` route |
| 2 | `backend/agents/CV_Booster_Agent/enhance_cv.py` | Add `/health` route |
| 3 | `backend/agents/JobSearch-SUBUL/main.py` | Add `/health` route |
| 4 | `backend/api/src/monitoring/dto/monitoring-result.dto.ts` | **NEW** |
| 5 | `backend/api/src/monitoring/monitoring.service.ts` | **NEW** |
| 6 | `backend/api/src/monitoring/monitoring.controller.ts` | **NEW** |
| 7 | `backend/api/src/monitoring/monitoring.module.ts` | **NEW** |
| 8 | `backend/api/src/app.module.ts` | Add MonitoringModule |
| 9 | `frontend/services/monitoring.ts` | **NEW** |
| 10 | `frontend/hooks/api/useMonitoring.ts` | **NEW** |
| 11 | `frontend/app/[locale]/dashboard/admin/monitoring/page.tsx` | **NEW** |
| 12 | `frontend/lib/api/client.ts` | Add `monitoring` to API_PATHS |
| 13 | `frontend/components/layout/Sidebar.tsx` | Add nav item |
| 14 | `.env.example` | Document monitoring env vars |

**Total: 14 files (10 new, 4 modified)**

---

Ready to implement. Confirm to proceed.

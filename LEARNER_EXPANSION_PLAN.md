# Learner Management & Expansion System
## Deep Production Audit + Implementation Blueprint

**Date:** 2026-04-28 | **Status:** Audit Complete — Ready for Phase-by-Phase Implementation

---

## PART 1 — REAL ARCHITECTURE MAP (What Actually Exists)

### 1.1 Content Storage — The Actual Truth

The platform uses a **strict one-way hybrid model**:

```
JSON Source Files ──(seed/import)──► PostgreSQL Database ──(API)──► Frontend
       ↑                                      ↑
  Never written to                    Single source of truth
  after initial seed                  for ALL learner interactions
```

**Two distinct storage layers:**

| Layer | Files | Purpose | Mutability |
|-------|-------|---------|------------|
| **Source JSON** | `backend/api/certif_courses.json` | Master catalog (certs → courses → modules → lessons → course labs) | Read-only input |
| **Source TS** | `backend/api/src/labs/labs-seed.data.ts` (`HUB_LABS`) | Interactive hands-on lab catalog | Read-only input |
| **PostgreSQL** | All TypeORM entities | Live data, user progress, enrollment, certificates | Read + Write |

**Data flows ONE direction only:** JSON → DB via `npm run seed` / `CertifCoursesImportService`

---

### 1.2 Two Distinct "Lab" Concepts (CRITICAL — Often Confused)

This is the single most important architectural distinction to understand before building:

```
┌────────────────────────────────────────────────────────────────────┐
│  CONCEPT 1: Course Labs (course_labs table)                        │
│  ─────────────────────────────────────────────────────────────────  │
│  • Embedded within course modules in certif_courses.json           │
│  • Identified by: labId STRING (e.g. "lab-az900-1")                │
│  • Table: course_labs (FK → modules.id)                            │
│  • Purpose: Guided exercises inside a course lesson                │
│  • Progress: stored in UserCourseProgress.completedLabs (JSON arr) │
│  • NOT standalone — cannot exist without a course module           │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  CONCEPT 2: Interactive Labs (labs table)                          │
│  ─────────────────────────────────────────────────────────────────  │
│  • Standalone cloud environments (AWS Console, Azure Portal, etc.) │
│  • Identified by: slug STRING (e.g. "azure-az900", "aws-ec2")      │
│  • Table: labs (FK ← lab_progress.lab_id)                         │
│  • Purpose: Hands-on real cloud environment exercises              │
│  • Progress: separate lab_progress table (completedTasks, timeSpent)│
│  • Can exist independently of any course                           │
│  • Linked to courses IMPLICITLY via slug pattern matching          │
└────────────────────────────────────────────────────────────────────┘
```

**When we say "assign labs to learners" we mean: Interactive Labs (by slug).**

---

### 1.3 Course Architecture (Full Map)

```
certif_courses.json
└── certifications[]
    ├── id (externalId) e.g. "az-900"
    ├── exam_code e.g. "AZ-900"
    ├── domain e.g. "cloud" → normalized to track 'cloud'
    └── modules[]
        ├── id e.g. "az900-m1"
        ├── order (moduleOrder)
        ├── lessons[]
        │   ├── id e.g. "az900-m1-l1"
        │   ├── content (TEXT — full lesson body)
        │   ├── key_points (JSON array)
        │   └── analogy, comparison_table
        └── labs[]            ← COURSE LABS (not interactive)
            ├── id e.g. "lab-az900-1"
            ├── title, description, duration_min
            └── objectives, prerequisites
```

**After import into PostgreSQL:**
```
certifications (id=INT PK, externalId="az-900", domain="cloud")
    └─► courses (id=INT PK, courseId="AZ-900-AZURE-FUNDAMENTALS", track=null)
            └─► modules (id=INT PK, moduleOrder=1)
                    ├─► lessons (id=INT PK, lessonOrder=1, content=TEXT)
                    └─► course_labs (id=INT PK, labId="lab-az900-1")
```

**Key identifiers for content assignment:**
- Course → use `course.courseId` (VARCHAR like "AZ-900-AZURE-FUNDAMENTALS"), NOT `course.id` (INT)
- Lab (interactive) → use `lab.slug` (VARCHAR like "azure-az900")
- Certification → use `certification.id` (INT, stored as VARCHAR in assignments)

---

### 1.4 Certification Architecture

Certifications are **purely database-driven** after the JSON import:
- No code-defined restrictions on which cert requires what
- A certification is linked to courses via `courses.certification_id` FK
- "Enrollment" = creating a `UserCourseProgress` for the certification's first course
- "Completion" = that `UserCourseProgress.overallProgress >= 100`
- "Issuance" = auto-creates `IssuedCertificate` record with SHA256 verification code
- **No `certification_paths` table exists** — there is no ordered prerequisite chain today

**Certificate issuance flow:**
```
Complete course (overallProgress = 100)
  → GET /api/learner/certifications/status triggers check
    → CertificationsService.ensureIssuedCertificate()
      → Creates IssuedCertificate if not exists
        → verificationCode = SHA256("userId:certId:subul_certificate")
```

---

### 1.5 Interactive Labs Architecture

```
labs-seed.data.ts (HUB_LABS constant)
└── SeedLabRow[]
    ├── slug (UNIQUE key, e.g. "azure-az900", "aws-ec2-beginner-1")
    ├── title, description, provider, difficulty
    ├── tasks[] (array of task title strings)
    ├── steps[] | null (detailed step instructions)
    ├── metadata { prevSlug, nextSlug, providerLoginUrl, logo, tags, learningObjectives }
    └── status: 'published'

After seed → labs table:
├── id (INT PK)
├── slug (UNIQUE, e.g. "azure-az900")
├── provider ('aws'|'azure'|'gcp'|'nvidia')
├── difficulty ('beginner'|'intermediate'|'advanced')
├── track ('cloud'|'cyber'|'ai') ← inferred from slug via regex
├── tasks (JSONB array of strings)
├── steps (JSONB array of LabStep objects)
└── metadata (JSONB)
```

**Track assignment logic for labs:**
```
inferLabTrackFromInteractiveSlug(slug):
  /bedrock|sagemaker|openai|nlp|genai/i → 'ai'
  /defender|sentinel|security|sc-900|cyber|threat/i → 'cyber'
  default → 'cloud'
```

**Scoped catalog logic (what learner sees):**
```
GET /api/learner/labs (no fullCatalog)
  → Union of:
    A. labs WHERE track IN (effectiveTracks)
    B. labs WHERE slug ILIKE ANY(slugPatternsFromEnrolledCourses)
       e.g. enrolled in "AZ-900" → patterns ['azure-az900', 'az900-%']
```

---

### 1.6 Content Access Control — Full System Map

```
getContentAccessInfo(userId) → ContentAccessInfo
├── Calls: subscriptionsService.resolveAccessProfile(userId)
│   └── Returns: { entitlements: { maxCourses, maxLabs, maxCertifications }, ... }
│
├── If maxCourses=-1 AND maxLabs=-1 (unlimited = paid or institutional):
│   └── Returns: { isFree: false, accessibleCourseIds: [], accessibleLabSlugs: [], certificationsLocked }
│       NOTE: empty arrays = NO RESTRICTIONS (not "nothing accessible")
│
└── If limited (free/trial/standard):
    ├── Gets enrolled courses → picks first as accessible
    ├── Gets labs by track → picks first as accessible
    └── Returns: { isFree: true, accessibleCourseIds: [firstId], accessibleLabSlugs: [firstSlug], certificationsLocked: true }

Frontend: useContentAccess() (cache 30s)
  → Consumed by: courses/page.tsx, labs/page.tsx, certifications/page.tsx
  → isCourseLocked(id) = isFree && !accessibleCourseIds.includes(id)
  → isLabLocked(slug)  = isFree && !accessibleLabSlugs.includes(slug)
  → certsLocked = certificationsLocked (binary Premium gate)
```

**CRITICAL SECURITY GAP FOUND:**
```
GET /api/courses/{courseId}  ← NO subscription check!
  Free user who knows a course URL can access full lesson content
  This should be guarded — add to implementation plan
```

---

### 1.7 AI Tutor System — Complete Architecture Map

```
┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                            │
│                                                                      │
│  LabAssistant.tsx                 AIChatPanel (inline in course page)│
│  ├── STT: Deepgram WebSocket      ├── Same Deepgram WebSocket        │
│  ├── TTS: Cartesia WebSocket      ├── Same Cartesia WebSocket        │
│  ├── Chat: POST /api/cloud-tutor/chat (streaming NDJSON)            │
│  ├── [HARDCODED] DEEPGRAM_API_KEY ← SECURITY ISSUE                  │
│  ├── [HARDCODED] CARTESIA_API_KEY ← SECURITY ISSUE                  │
│  └── Session: 'lab_' + random(9)  └── Session: 'session_' + random(9)│
│                                                                      │
│  voice-assistant.ts (shared lib)                                     │
│  ├── CARTESIA_VOICES = { fr: '65b25c5d...', en: '6ccbfb76...' }    │
│  ├── VOICE_MAX = 60 (monthly limit, localStorage-tracked)           │
│  └── buildCartesiaTtsWebSocketUrl(apiKey)                            │
│                                                                      │
│  NO TUTOR ON:                                                        │
│  ├── certifications/page.tsx  ← MISSING                             │
│  └── labs/page.tsx (browse)   ← MISSING (only on lab detail pages) │
└──────────────────────────────────────────────────────────────────────┘
                ↓ POST /api/cloud-tutor/chat
┌──────────────────────────────────────────────────────────────────────┐
│  NESTJS BACKEND (agents.controller.ts)                               │
│                                                                      │
│  POST /api/cloud-tutor/chat                                          │
│  ├── JwtAuthGuard (requires JWT)                                     │
│  ├── enrichBody(body, userId) → injects user_id                      │
│  ├── consumeAgent(userId, AGENT_KEYS.CLOUD_TUTOR)                   │
│  └── Proxy streaming response from Python agent                      │
│                                                                      │
│  GET  /api/cloud-tutor/quota                                         │
│  POST /api/cloud-tutor/session/end                                   │
└──────────────────────────────────────────────────────────────────────┘
                ↓ http://agent-cloud-tutor:8000/api/chat
┌──────────────────────────────────────────────────────────────────────┐
│  PYTHON AGENT (cloud_tutor_agent.py, port 8000)                      │
│                                                                      │
│  POST /api/chat                                                      │
│  ├── Azure OpenAI GPT-4o (streaming text generation)                │
│  ├── Azure Cognitive Search (RAG — course content vectors)          │
│  ├── CosmosDB (session memory — last 10-20 messages)                │
│  ├── DuckDuckGo (optional live web search if volatile=True)         │
│  └── Returns: NDJSON stream { chunk, lang, status }                  │
│                                                                      │
│  Context injected by frontend (in message body):                    │
│  ├── Lab mode: "Lab AWS: {labTitle}\n\nTâches:\n1. ...\n2. ..."     │
│  └── Course mode: "Cours AZ-900, leçon active: {lessonTitle}"       │
└──────────────────────────────────────────────────────────────────────┘
```

**Voice I/O Pipeline:**
```
[User speaks]
     ↓
Deepgram STT WebSocket (browser-direct, hardcoded key)
     ↓ transcript text
sendMessage(text, isAudio=true)
     ↓
Cartesia TTS WebSocket (browser-direct, hardcoded key)
  ├── Receives streaming text chunks from LLM
  ├── Sends each chunk as TTS payload { transcript, context_id, continue: true }
  ├── Receives audio chunks { type: 'chunk', data: base64-PCM-f32le }
  └── Web Audio API plays PCM chunks via AudioContext
```

**What the tutor CAN and CANNOT do today:**

| Capability | Lab Pages | Course Pages | Cert Pages |
|-----------|-----------|--------------|------------|
| Chat with AI | ✅ LabAssistant | ✅ AIChatPanel | ❌ Missing |
| Voice input (STT) | ✅ Deepgram | ✅ Deepgram | ❌ Missing |
| Voice output (TTS) | ✅ Cartesia | ✅ Cartesia | ❌ Missing |
| Screenshot attach | ✅ | ❌ | ❌ |
| Read lesson aloud | ❌ | ⚠️ Partial (startNarration handle) | ❌ |
| Session memory | ✅ CosmosDB | ✅ CosmosDB | ❌ |
| Context-aware | ✅ (tasks injected) | ✅ (lesson title injected) | ❌ |
| Arabic voice | ❌ | ❌ | ❌ |
| Speed control | ❌ | ❌ | ❌ |
| Quiz me | ❌ | ❌ | ❌ |

---

### 1.8 Admin Capabilities (What Exists Today)

| Admin Can Do Today | Endpoint |
|---|---|
| Create/edit/delete users | `/api/admin/users/*` |
| Assign subscription plan to user | `POST /api/admin/user-subscriptions` |
| Manage courses (CRUD) | `/api/admin/courses/*` |
| Manage labs (via seed endpoint) | `POST /api/labs/seed/aws` |
| Manage certifications | `/api/admin/certifications/*` |
| View learner quiz results | `/api/admin/quiz-results/*` |
| View agent usage per user | `/api/admin/agent-usage` |

| Admin CANNOT Do Today | What's Missing |
|---|---|
| See a learner's full content profile | No `/api/admin/learners/:id` endpoint |
| Assign a specific course to a specific learner | No `/api/admin/learners/:id/assignments` |
| Assign a specific lab to a specific learner | No assignment endpoint |
| Assign a specific cert to a specific learner | No assignment endpoint |
| Bulk-assign content | No bulk endpoint |
| Browse learners by plan/track/progress | No learner-focused list endpoint |

---

### 1.9 Security Vulnerabilities Found

| # | Severity | Location | Issue | Fix |
|---|---|---|---|---|
| 1 | CRITICAL | `LabAssistant.tsx:20-21` | `DEEPGRAM_API_KEY` hardcoded | Move to `NEXT_PUBLIC_DEEPGRAM_API_KEY` |
| 2 | CRITICAL | `LabAssistant.tsx:20-21` | `CARTESIA_API_KEY` hardcoded | Move to `NEXT_PUBLIC_CARTESIA_API_KEY` |
| 3 | CRITICAL | `cours/[courseId]/page.tsx:48-49` | Same keys hardcoded | Same fix |
| 4 | CRITICAL | `enhance_cv.py:44-45` | Azure OpenAI key as fallback default | Remove default, require env var |
| 5 | CRITICAL | `enhance_cv.py:72-75` | CosmosDB key as fallback default | Remove default, require env var |
| 6 | MEDIUM | `voice-assistant.ts` | Voice credits tracked in localStorage | Move enforcement to backend |
| 7 | MEDIUM | `LabAssistant.tsx:93` | Session ID = 9-char random (low entropy) | Use `crypto.randomUUID()` |
| 8 | MEDIUM | `courses.controller.ts` | `GET /api/courses/:id` has no subscription check | Add SubscriptionGuard or course-level check |
| 9 | LOW | Chat streaming | No rate limiting on `/api/cloud-tutor/chat` | Add ThrottlerGuard |

---

## PART 2 — WHAT TO BUILD (Corrected Plan)

### 2.1 Database Changes

#### Table 1: `learner_content_assignments`
Admin-assigned content that overrides subscription restrictions.

```sql
CREATE TABLE learner_content_assignments (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       INTEGER      NOT NULL,         -- FK → users.id
  content_type  VARCHAR(20)  NOT NULL,         -- 'course' | 'lab' | 'certification'
  content_id    VARCHAR(100) NOT NULL,         -- courseId string | lab slug | cert id as string
  assigned_by   INTEGER      NOT NULL,         -- FK → users.id (the admin)
  note          TEXT         NULL,             -- admin reason
  expires_at    TIMESTAMPTZ  NULL,             -- optional expiry
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content_type, content_id),
  CHECK (content_type IN ('course', 'lab', 'certification'))
);
```

**content_id values by type:**
- `content_type='course'` → `course.courseId` e.g. `"AZ-900-AZURE-FUNDAMENTALS"`
- `content_type='lab'` → `lab.slug` e.g. `"azure-az900"`
- `content_type='certification'` → `certification.id` as string e.g. `"3"`

#### Table 2: `certification_paths`
Ordered sequence of courses + labs required for a certification.

```sql
CREATE TABLE certification_paths (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id  INTEGER     NOT NULL UNIQUE,   -- FK → certifications.id
  title             VARCHAR(255) NOT NULL,
  description       TEXT        NULL,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE certification_path_items (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id      UUID         NOT NULL REFERENCES certification_paths(id) ON DELETE CASCADE,
  item_type    VARCHAR(20)  NOT NULL CHECK (item_type IN ('course', 'lab')),
  item_id      VARCHAR(100) NOT NULL,   -- courseId or lab slug
  item_title   VARCHAR(255) NULL,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  is_required  BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (path_id, item_type, item_id)
);
```

---

### 2.2 How getContentAccessInfo() Must Change

Current logic (subscription-only):
```
Free → accessibleCourseIds: [first enrolled course]
Paid → accessibleCourseIds: [] (= unlimited)
```

New logic (subscription + admin assignments):
```
getContentAccessInfo(userId):
  1. subscriptionAccess = resolveAccessProfile(userId)           [unchanged]
  2. assignments = getAssignedContentIds(userId)                 [NEW]
     → filter out expired (expires_at < NOW())
     → return { courseIds: string[], labSlugs: string[], certIds: string[] }

  3. If unlimited subscription:
     return {
       isFree: false,
       accessibleCourseIds: [],       ← empty = unlimited
       accessibleLabSlugs: [],
       certificationsLocked: certificationsLocked && assignments.certIds.length === 0
     }

  4. If restricted subscription:
     return {
       isFree: true,
       accessibleCourseIds: [...subscriptionCourseIds, ...assignments.courseIds],
       accessibleLabSlugs:  [...subscriptionLabSlugs,  ...assignments.labSlugs],
       certificationsLocked: certificationsLocked && assignments.certIds.length === 0
     }
```

This means:
- Admin can **individually unlock** specific courses for free/trial users
- Admin can **individually unlock** certifications without upgrading their whole plan
- Assignments are **additive** — they extend (never restrict) what the subscription gives

---

## PART 3 — COMPLETE FILE PLAN

### 3.1 Backend: New Files

```
backend/api/src/migrations/
  1714200000000-CreateLearnerAssignmentSystem.ts   ← 3 new tables

backend/api/src/learner-assignments/
  entities/
    learner-content-assignment.entity.ts
    certification-path.entity.ts
    certification-path-item.entity.ts
  learner-assignments.service.ts
  learner-assignments.module.ts

backend/api/src/admin/
  admin-learners.controller.ts                      ← NEW learner management endpoints
```

### 3.2 Backend: Modified Files

```
backend/api/src/learner/learner.service.ts
  → Import LearnerAssignmentsService
  → Modify getContentAccessInfo() to merge admin assignments

backend/api/src/learner/learner.module.ts
  → Import LearnerAssignmentsModule

backend/api/src/admin/admin.module.ts
  → Add AdminLearnersController
  → Import LearnerAssignmentsModule

backend/api/src/app.module.ts
  → Import LearnerAssignmentsModule
```

### 3.3 Frontend: New Files

```
frontend/services/
  adminLearners.ts                                  ← API client for learner management

frontend/hooks/api/
  useAdminLearners.ts                               ← React Query hooks

frontend/app/[locale]/dashboard/admin/
  learners/
    page.tsx                                        ← Learner list + filters
    [id]/
      page.tsx                                      ← Learner content management

frontend/components/learner/
  UniversalTutor.tsx                                ← Shared tutor (course + lab + cert)
```

### 3.4 Frontend: Modified Files

```
frontend/components/layout/Sidebar.tsx
  → Add "Apprenants" nav item in admin section (after "Utilisateurs")

frontend/lib/voice-assistant.ts
  → Add Arabic voice ID
  → Remove hardcoded keys (use process.env)

frontend/components/learner/LabAssistant.tsx
  → Replace hardcoded keys with process.env.NEXT_PUBLIC_*

frontend/app/[locale]/dashboard/learner/cours/[courseId]/page.tsx
  → Replace hardcoded keys with process.env.NEXT_PUBLIC_*
  → (Optional Phase 3) Replace inline AIChatPanel with <UniversalTutor mode="course" />

frontend/app/[locale]/dashboard/learner/certifications/page.tsx
  → Add floating <UniversalTutor mode="certification" /> button

frontend/.env.example (or .env.local.example)
  → Add NEXT_PUBLIC_CARTESIA_API_KEY
  → Add NEXT_PUBLIC_DEEPGRAM_API_KEY

frontend/locales/en.json + fr.json + ar.json
  → Add navigation.learners key
  → Add learner management UI strings
```

---

## PART 4 — API CONTRACT

### Admin Learner Endpoints (New)

```
GET /api/admin/learners
    Query: ?page=1&limit=20&search=Ahmed&plan=premium&track=cloud&status=active
    Returns:
    {
      data: [{
        id: number,
        fullName: string,
        email: string,
        status: string,
        track: string | null,
        role: string,
        createdAt: string,
        subscription: {
          planSlug: string,         // 'free'|'standard'|'premium'
          status: string,           // 'trial_active'|'paid_active'|'expired'|...
          periodEnd: string | null
        },
        contentCounts: {
          assignedCourses: number,
          assignedLabs: number,
          assignedCertifications: number,
          enrolledCourses: number,  // from UserCourseProgress
          completedCourses: number
        }
      }],
      total: number,
      page: number,
      limit: number
    }

GET /api/admin/learners/:id
    Returns:
    {
      user: { id, fullName, email, status, track, role, createdAt },
      subscription: {
        planSlug, status, periodEnd, trialHoursUsed, trialTotalHours
      },
      assignments: {
        courses: [{ id: UUID, contentId: string, note: string|null, expiresAt: string|null, createdAt: string, courseTitle?: string }],
        labs:    [{ id: UUID, contentId: string, note: string|null, expiresAt: string|null, createdAt: string, labTitle?: string }],
        certs:   [{ id: UUID, contentId: string, note: string|null, expiresAt: string|null, createdAt: string, certTitle?: string }]
      },
      progress: {
        enrolledCourses: [{ courseId, title, progress, status }],
        labsStarted:     [{ slug, title, isCompleted, completedTasks }],
        issuedCerts:     [{ certificationId, title, issuedAt, verificationCode }]
      }
    }

POST /api/admin/learners/:id/assignments
    Body: { contentType: 'course'|'lab'|'certification', contentId: string, note?: string, expiresAt?: string }
    Validation:
      contentType='course'        → verify courses WHERE courseId=contentId exists
      contentType='lab'           → verify labs WHERE slug=contentId AND status='published' exists
      contentType='certification' → verify certifications WHERE id=parseInt(contentId) exists
    Returns: LearnerContentAssignment

DELETE /api/admin/learners/:id/assignments/:assignmentId
    Returns: { success: true }

POST /api/admin/learners/bulk-assign
    Body: { userIds: number[], contentType, contentId, note? }
    Uses INSERT ... ON CONFLICT DO NOTHING for idempotency
    Returns: { assigned: number, skipped: number, errors: string[] }
```

---

## PART 5 — ADMIN FRONTEND DESIGN

### Page 1: `/dashboard/admin/learners` — Learner List

```
┌─────────────────────────────────────────────────────────────┐
│  Gestion des Apprenants              [Assignation groupée]   │
├─────────────────────────────────────────────────────────────┤
│  [🔍 Rechercher par nom, email…]                             │
│  Plan: [Tous ▾]  Track: [Tous ▾]  Statut: [Tous ▾]         │
├─────────────────────────────────────────────────────────────┤
│  Avatar  Nom          Email           Plan      Track  ···   │
│  ●  A    Ahmed B.     ahmed@...       Premium   Cloud  [→]  │
│  ●  S    Sara M.      sara@...        Free      AI     [→]  │
│  ●  K    Karim T.     karim@...       Standard  Cyber  [→]  │
├─────────────────────────────────────────────────────────────┤
│  ← 1  2  3  →                                  50 résultats │
└─────────────────────────────────────────────────────────────┘
```

### Page 2: `/dashboard/admin/learners/[id]` — Learner Detail

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Retour     Ahmed Ben Ali     [Premium] [Cloud]   [Plan ▾]    │
├──────────────────────┬───────────────────────────────────────────┤
│  PROFIL              │  CONTENU ASSIGNÉ                           │
│  ────────────────    │  ─────────────────────────────────────────│
│  Email               │  [Cours] [Labs] [Certifications]           │
│  ahmed@subul.io      │                                            │
│                      │  Cours disponibles dans le catalogue:       │
│  Statut: Actif       │  [🔍 Rechercher un cours…]  [+ Assigner]   │
│  Track: Cloud        │                                            │
│  Plan: Premium       │  ┌────────────────────────────────────┐   │
│  Depuis: Jan 2026    │  │ ✓ AZ-900 Fundamentals   Assigné [×]│   │
│  ───────────────     │  │   Expire: Aucune                   │   │
│  PROGRESSION         │  │   Note: "Priorité certif. Azure"   │   │
│                      │  ├────────────────────────────────────┤   │
│  Cours: 3 inscrits   │  │ ✓ AWS SAA-C03            Inscrit   │   │
│  Labs:  2 commencés  │  │   (via inscription, pas assignation)│   │
│  Certs: 1 obtenu     │  └────────────────────────────────────┘   │
│                      │                                            │
│  [Voir progression]  │  ℹ️ L'assignation déverrouille le contenu  │
│  [Modifier plan]     │    indépendamment du plan d'abonnement.    │
└──────────────────────┴───────────────────────────────────────────┘
```

---

## PART 6 — UNIVERSAL TUTOR COMPONENT DESIGN

### Why Refactor (Not Rebuild)

**Current state:**
- `LabAssistant.tsx` (580 lines) — complete working tutor for labs
- `AIChatPanel` inside course page (inline, ~200 lines) — duplicate implementation
- Same Cartesia + Deepgram + streaming logic duplicated in both

**Strategy:** Extract shared logic into `UniversalTutor.tsx` that:
1. Accepts a `mode` prop ('lab' | 'course' | 'certification')
2. Accepts `context` string (injected into LLM prompt)
3. Accepts optional `listenContent` (text to read aloud in Listen Mode)
4. All API keys from env vars

### UniversalTutor Props Interface

```typescript
interface UniversalTutorProps {
  // Required
  mode: 'lab' | 'course' | 'certification'
  contentTitle: string

  // Context for AI
  contextItems?: string[]      // tasks (lab) | lesson titles (course) | topics (cert)
  listenContent?: string       // Full text to read aloud (Listen Mode)

  // Visual theming
  platform?: 'aws' | 'azure' | 'gcp' | 'nvidia' | 'default'

  // Layout
  isOpen: boolean
  onToggle: () => void
  className?: string
}
```

### New Features vs Current LabAssistant

| Feature | LabAssistant Now | UniversalTutor New |
|---------|-----------------|-------------------|
| Chat + Voice I/O | ✅ | ✅ (preserved) |
| Screenshot | ✅ | ✅ (preserved) |
| Listen Mode | ❌ | ✅ Reads `listenContent` aloud |
| Arabic voice | ❌ | ✅ `ar` voice ID in CARTESIA_VOICES |
| Speed control | ❌ | ✅ 0.75x / 1x / 1.25x / 1.5x |
| Session tokens | Weak random | `crypto.randomUUID()` |
| API keys | Hardcoded | `process.env.NEXT_PUBLIC_*` |
| Course mode | ❌ | ✅ mode='course' |
| Cert mode | ❌ | ✅ mode='certification' |
| Quick pills | Lab-specific | Mode-specific per context |

### Integration Points

**Lab pages** (replace LabAssistant):
```tsx
<UniversalTutor
  mode="lab"
  contentTitle={lab.title}
  contextItems={lab.tasks}
  platform={lab.provider as any}
  isOpen={tutorOpen}
  onToggle={() => setTutorOpen(v => !v)}
/>
```

**Course pages** (replace inline AIChatPanel):
```tsx
<UniversalTutor
  mode="course"
  contentTitle={currentLesson.title}
  contextItems={[currentLesson.title, ...currentLesson.bullets]}
  listenContent={currentLesson.content}
  isOpen={chatOpen}
  onToggle={() => setChatOpen(v => !v)}
/>
```

**Certification pages** (new):
```tsx
<UniversalTutor
  mode="certification"
  contentTitle={certification.title}
  contextItems={certification.courses?.map(c => c.title)}
  isOpen={tutorOpen}
  onToggle={() => setTutorOpen(v => !v)}
/>
// Rendered as floating button in bottom-right corner
```

---

## PART 7 — EXECUTION ROADMAP (Ordered by Impact + Safety)

### Phase 0 — Security Fix (30 min) ⚡ DO FIRST
```
0a. Add to frontend/.env.example:
      NEXT_PUBLIC_CARTESIA_API_KEY=
      NEXT_PUBLIC_DEEPGRAM_API_KEY=

0b. Replace hardcoded keys in:
      frontend/components/learner/LabAssistant.tsx (lines 20-21)
      frontend/app/[locale]/dashboard/learner/cours/[courseId]/page.tsx (lines 48-49)
    With:
      const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY ?? ''
      const CARTESIA_API_KEY = process.env.NEXT_PUBLIC_CARTESIA_API_KEY ?? ''

0c. Add NEXT_PUBLIC_CARTESIA_API_KEY and NEXT_PUBLIC_DEEPGRAM_API_KEY
    to docker-compose.yml frontend service environment section
```

### Phase 1 — Backend Foundation (2–3 hours)
```
1a. Write migration: 1714200000000-CreateLearnerAssignmentSystem.ts
    → learner_content_assignments table
    → certification_paths table
    → certification_path_items table

1b. Write entities:
    → learner-content-assignment.entity.ts
    → certification-path.entity.ts (Phase 4 only if needed)
    → certification-path-item.entity.ts (Phase 4 only if needed)

1c. Write LearnerAssignmentsService:
    → assignContent(adminId, userId, type, contentId, note?, expiresAt?)
    → removeAssignment(assignmentId, adminId) — verify admin owns the action
    → getAssignedContentIds(userId): { courseIds[], labSlugs[], certIds[] }
      → Filter expired assignments (expires_at < NOW())
    → getLearnerAssignments(userId) — enriched with titles
    → getLearnerFullProfile(userId) — for admin detail page
    → bulkAssign(adminId, userIds[], type, contentId)
      → INSERT ... ON CONFLICT DO NOTHING (idempotent)

1d. Write LearnerAssignmentsModule (exports LearnerAssignmentsService)

1e. Write admin-learners.controller.ts
    → GET  /api/admin/learners (paginated, with subscription info)
    → GET  /api/admin/learners/:id (full profile + assignments + progress)
    → POST /api/admin/learners/:id/assignments (validate contentId exists in DB)
    → DELETE /api/admin/learners/:id/assignments/:assignmentId
    → POST /api/admin/learners/bulk-assign

1f. Update LearnerService.getContentAccessInfo()
    → Inject LearnerAssignmentsService
    → Merge assignments into content access response

1g. Wire modules:
    → LearnerAssignmentsModule imported in AdminModule, LearnerModule, AppModule
    → AdminLearnersController in AdminModule
```

### Phase 2 — Admin Frontend (3–4 hours)
```
2a. Write frontend/services/adminLearners.ts
    → getLearners(params), getLearnerProfile(id)
    → assignContent(userId, type, contentId, note?, expiresAt?)
    → removeAssignment(userId, assignmentId)
    → bulkAssign(userIds, type, contentId)

2b. Write frontend/hooks/api/useAdminLearners.ts
    → useAdminLearners(filters) — paginated list
    → useAdminLearnerProfile(id) — single learner
    → useAssignContent() — mutation
    → useRemoveAssignment() — mutation
    → useBulkAssign() — mutation

2c. Write /dashboard/admin/learners/page.tsx
    → DataTable with search, plan/track/status filters
    → Learner rows: avatar, name, email, plan badge, track, actions
    → [Manage] button → navigate to /learners/:id

2d. Write /dashboard/admin/learners/[id]/page.tsx
    → Left panel: user profile + subscription + progress stats
    → Right panel: tabs (Cours | Labs | Certifications)
    → Per tab: existing assignments list + catalog search + assign button
    → Assign dialog: search catalog, pick item, add note, pick expiry
    → Remove: confirm dialog then DELETE

2e. Update Sidebar.tsx
    → Add GraduationCap icon + "Apprenants" link to admin section
    → Place after "Utilisateurs" (users)

2f. Update locales
    → en.json: navigation.learners = "Learners"
    → fr.json: navigation.learners = "Apprenants"
    → ar.json: navigation.learners = "المتعلمون"
```

### Phase 3 — Universal AI Tutor (2 hours)
```
3a. Update lib/voice-assistant.ts
    → Add Arabic voice ID to CARTESIA_VOICES
    → Export speed multiplier helpers

3b. Write UniversalTutor.tsx
    → Mode-aware context injection (lab/course/cert)
    → Listen Mode: reads listenContent via Cartesia (no user prompt needed)
    → Speed control: 0.75x / 1x / 1.25x / 1.5x (pitch-preserve via AudioContext)
    → Platform theming (preserved from LabAssistant)
    → API keys from process.env.NEXT_PUBLIC_*
    → Session ID via crypto.randomUUID()
    → Mode-specific quick pills

3c. Add UniversalTutor to certifications/page.tsx
    → Floating button bottom-right (mode="certification")
    → Only visible when !certsLocked (or show upgrade hint)

3d. Swap LabAssistant for UniversalTutor on lab detail pages
    → Functionally identical — just pulls from shared component
    → Validate no regressions

3e. (Optional) Swap AIChatPanel in course page for UniversalTutor
    → Requires extracting the forwardRef/imperative narration handle
    → Lower priority — defer if course page is working well
```

### Phase 4 — Certification Paths UI (1.5 hours, optional)
```
4a. Add certification path management to admin certification edit page
    → "Parcours de préparation" section
    → Add/remove/reorder courses and labs
    → Uses PUT /api/admin/certifications/:id → (extend endpoint or new sub-route)

4b. Show certification path on learner certifications page
    → "Pour obtenir cette certification, vous aurez besoin de:"
    → Progress checklist: completed courses ✓ | remaining courses ○ | labs ○
```

---

## PART 8 — SCALABILITY NOTES

| Area | Concern | Solution |
|------|---------|---------|
| `getContentAccessInfo()` called on every learner route | N+1 if not cached | Cache per-user in Redis, invalidate on assignment/subscription change |
| Bulk assign to 1000+ users | Transaction timeout | Use PostgreSQL `INSERT ... ON CONFLICT DO NOTHING` batch + process in chunks of 100 |
| Admin learner search | Slow full-table scan | Add GIN index on `users.fullname` + `users.email` via `pg_trgm` |
| Assignment expiry checks | Real-time vs. batch | Check at query time (WHERE expires_at IS NULL OR expires_at > NOW()) — no cron needed |
| Certification path progress | Expensive join query | Materialized view or pre-computed progress snapshot on completion events |

---

## PART 9 — IMPLEMENTATION READINESS CHECKLIST

Before writing Phase 1 code, verify:

- [ ] `backend/api/certif_courses.json` format matches `CertifCoursesPayload` type
- [ ] `courses` table has `course_id` (VARCHAR) column (NOT just `id` INT)
- [ ] `labs` table has `slug` (VARCHAR UNIQUE) column
- [ ] `certifications` table `id` is INT (to cast from string in assignments)
- [ ] `AdminModule` imports list (add new controller without conflicts)
- [ ] `LearnerModule` imports list (add new service without circular deps)
- [ ] Frontend `.env.local` has `NEXT_PUBLIC_CARTESIA_API_KEY` and `NEXT_PUBLIC_DEEPGRAM_API_KEY` set

---

## READY

Tell me which phase to execute:

| Command | Action |
|---------|--------|
| **"Phase 0"** | Fix hardcoded API keys immediately (30 min) |
| **"Phase 1"** | Full backend: migration + entities + service + admin controller + module wiring |
| **"Phase 2"** | Full admin frontend: service + hook + learner list page + learner detail page + sidebar |
| **"Phase 3"** | UniversalTutor component + certifications page integration |
| **"Phase 4"** | Certification paths admin UI |
| **"All"** | Execute 0 → 1 → 2 → 3 in sequence |

Or specify a specific step number.

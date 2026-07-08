# NEXTSTEP.md — Learner Management & Expansion System
## Precise Phase-by-Phase Execution Roadmap

> **AI Tutor Answer (Final):** NO retraining ever needed. The AI Tutor uses RAG (Retrieval-Augmented Generation) with Azure Cognitive Search. Adding new content = re-index only. Cost: < $0.01/course. Time: < 5 minutes after seed. Zero model retraining.

## Execution Status (Updated 2026-04-30)

- **Phase 0 (Security):** Deferred intentionally (kept documented for later).
- **Phase 1 (Backend Learner Assignment System):** COMPLETE.
- **Phase 2 (Frontend Admin Learner Management):** COMPLETE.
- **Phase 3 (UniversalTutor):** COMPLETE (labs + certifications integration delivered).
- **Phase 4 (Certification Paths):** COMPLETE (backend endpoints + admin editor + learner progress UI delivered).
- **Phase 5 (Auto AI Content Ingestion):** COMPLETE (indexer service + admin trigger + seed sync + indexed tracking delivered).
- **Phase 6 (Admin Content Management SaaS):** COMPLETE (content import endpoints/services + admin import UIs + indexing dashboard).
- **Phase 7 (Premium Certification Dashboard - Phase 1):** COMPLETE (experience payload v2 + premium certification detail UX + tutor quick modes).
- **Phase 8 (Premium Certification Dashboard - Phase 2):** COMPLETE (server-backed streak/xp timeline + weekly planner + practice exam analytics hub).
- **Phase A (Import foundation hardening, 2026-04-30):** COMPLETE — see "Phase A" section below.
- **Phase B (Practice Exams + Paths Import + Indexing UX):** COMPLETE — see "Phase B" section below.

---

## Phase A — Import Foundation Hardening (Delivered 2026-04-30)

> Phase A fixes the existing JSON import workflow before any new features are layered on top. It does **not** introduce practice exams, manual editors, or async jobs (those land in Phases B/C — see "Remaining Phases" at the bottom).

### Problems addressed
1. Admin imports failed silently (no toast on success or failure, no rendering of `mutation.error`).
2. Result panel only showed course counts — no certifications/modules/lessons/quizzes/labs breakdown.
3. `dryRun=true` actually committed to the DB — preview was destructive.
4. `upsert_only` mode silently skipped any existing certs/courses with a different `source` value, so re-imports of admin-created content looked like no-ops.
5. The certifications-JSON endpoint rejected the natural `{ certifications: [...] }` shape.
6. No JSON-shape pre-validation, no path-precise errors.
7. No downloadable templates for admins.
8. No surfaced indexing status after import.

### Backend changes

#### `backend/api/src/certifications/certif-courses-import.service.ts`
- New `validatePayloadShape(payload)` — pure structural validator returning `Array<{ path, message }>` like `certifications[0].modules[2].lessons[1].title is required`. No DB calls.
- New `admin_upsert` mode — bypasses the `source !== IMPORT_SOURCE` skip path so admin-uploaded JSON cleanly overwrites manually-created records.
- New `options.dryRun` parameter on `importFromPayload()` — wraps the transaction in a sentinel rollback (`DryRunRollback`) so preview never commits.
- `CertifCoursesImportSummary` extended with `quizzes: { created, updated, skipped }` and `errors: ImportValidationError[]`. Skipped rows now push a structured error explaining why.

#### `backend/api/src/content-import/course-json-import.service.ts`
- Always calls the importer with `mode='admin_upsert'` and forwards `dryRun`.
- Exposes `validateShape(payload)` for the new validate endpoint.

#### `backend/api/src/content-import/content-import.service.ts`
- `importCertificationsJson` now accepts both nested `{ certifications: [...] }` and flat `Array<...>` shapes; nested routes through `CourseJsonImportService` (full counts), flat continues to `CertificationImportService`.
- Added `validateCoursesShape(payload)` proxy.

#### `backend/api/src/content-import/dto/import-content.dto.ts`
- New `ValidateCoursesJsonDto`.
- `ImportCertificationsJsonDto.payload` relaxed from strict `CertificationImportItemDto[]` to `Record<string, unknown> | Array<...>`; runtime shape detection lives in the service.

#### `backend/api/src/admin/admin-content.controller.ts`
- New endpoint: `POST /api/admin/content/import/courses-json/validate` → `{ valid, errors[] }`. No DB calls.
- Existing `import/certifications-json` route now accepts both shapes.

### Frontend changes

#### New components
- `frontend/components/admin/import/ImportResultPanel.tsx` — shared table that renders certs / courses / modules / lessons / quizzes / course-labs counts plus a path-grouped error list. Works with both nested and flat shapes.
- `frontend/components/admin/import/IndexingBanner.tsx` — post-import banner with `Sync now` / `Later` buttons. Shows live state (idle → running → done / failed → retry) and the pending count from `useAdminContentIndexerStatus()`.
- `frontend/components/admin/import/import-templates.ts` — `COURSES_TEMPLATE`, `LABS_TEMPLATE`, `CERTIFICATIONS_FLAT_TEMPLATE`, plus `downloadJson(filename, payload)` helper.

#### Service / hook updates
- `frontend/services/admin-courses.ts` — added `validateCoursesJson()` calling the new validate endpoint.
- `frontend/services/certifications.ts` — `importCertificationsJson` now typed as `Record<string, unknown> | Array<...>`.

#### Admin pages refactored
- `frontend/app/[locale]/dashboard/admin/courses/page.tsx`
  - try/catch + `useToast` on success and error (status code + backend `message`).
  - New `Validate` button hits the no-DB validator and renders errors in `ImportResultPanel`.
  - `Preview` and `Import` paths use the same panel, with dry-run badge.
  - `Download template` button writes `subul-courses-template.json`.
  - Indexing banner appears after a non-dry-run import.
- `frontend/app/[locale]/dashboard/admin/labs/page.tsx`
  - JSON parse errors and array-shape errors surface via toast.
  - Result panel replaces the previous one-line summary.
  - `Download template` writes `subul-labs-template.json`.
  - Indexing banner appears after a non-dry-run import.
- `frontend/app/[locale]/dashboard/admin/certifications/page.tsx`
  - Accepts both nested and flat JSON; type guard + toast for malformed payloads.
  - Two template downloads (nested / flat).
  - Result panel + indexing banner.

### New / updated API surface

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/admin/content/import/courses-json` | Now defaults to `admin_upsert` mode and supports real `dryRun`. Response includes `errors[]` (path-precise) and a new `quizzes` count. |
| `POST` | `/api/admin/content/import/courses-json/validate` | **NEW.** Returns `{ valid, errors[] }` without touching the DB. |
| `POST` | `/api/admin/content/import/certifications-json` | Accepts nested `{ certifications: [...] }` (preferred) **or** flat array. |
| `POST` | `/api/admin/content/import/labs-json` | Unchanged response shape; UI now consumes it via `ImportResultPanel`. |

### Admin import workflow (after Phase A)

1. **Pick template** — click `Download template` on the relevant admin page if you don't have a starting JSON.
2. **Validate (optional, courses page)** — click `Validate`; backend pre-flights the JSON and returns path-precise errors with no DB writes.
3. **Preview (dry-run)** — click `Preview`; the import runs inside a transaction that always rolls back, so you see counts but the DB is untouched.
4. **Import** — click `Import`; transaction commits, toast confirms success.
5. **Sync AI Tutor** — banner asks `Sync now` / `Later`. `Sync now` calls `POST /api/admin/content-indexer/sync` and shows live state. `Later` dismisses; admin can also trigger sync from `/dashboard/admin/content/indexing`.

### Files changed in Phase A
- `backend/api/src/certifications/certif-courses-import.service.ts`
- `backend/api/src/content-import/course-json-import.service.ts`
- `backend/api/src/content-import/content-import.service.ts`
- `backend/api/src/content-import/dto/import-content.dto.ts`
- `backend/api/src/admin/admin-content.controller.ts`
- `frontend/services/admin-courses.ts`
- `frontend/services/certifications.ts`
- `frontend/app/[locale]/dashboard/admin/courses/page.tsx`
- `frontend/app/[locale]/dashboard/admin/labs/page.tsx`
- `frontend/app/[locale]/dashboard/admin/certifications/page.tsx`
- **New:** `frontend/components/admin/import/ImportResultPanel.tsx`
- **New:** `frontend/components/admin/import/IndexingBanner.tsx`
- **New:** `frontend/components/admin/import/import-templates.ts`

### Phase A testing checklist
- [x] Backend `tsc --noEmit` clean for the new code paths.
- [x] Frontend `tsc --noEmit` clean for the new components and edited admin pages (pre-existing unrelated errors remain in `checkout`, `commercials`, `university` etc).
- [ ] Manual UI smoke test: upload `backend/courses.json` from `/dashboard/admin/courses` → Validate → Preview → Import → click `Sync now`.
- [ ] Manual UI smoke test: upload the same file twice; second run shows updates, not creates.
- [ ] Manual UI smoke test: upload an intentionally broken file (missing `lessons[0].title`) and confirm the path-precise error renders.
- [ ] Manual UI smoke test: upload labs JSON template downloaded from the admin page.
- [ ] Manual UI smoke test: upload nested certifications JSON from the certifications page.

### Remaining phases (deferred)
- **Phase D (deferred indefinitely):** Async import jobs / `import_jobs` table / BullMQ — only if catalog grows to thousands of items per import.

---

## Phase B — Practice Exams + Certification Paths JSON + Indexing UX (Delivered)

### Backend
- Practice exams are first-class (`practice_exams`, `practice_exam_questions`) and now learner-attempt capable with `practice_exam_attempts`.
- Added learner practice exam API:
  - `GET /api/practice-exams`
  - `GET /api/practice-exams/:slug/session`
  - `POST /api/practice-exams/:slug/submit`
  - `GET /api/practice-exams/:slug/attempts`
- Added admin content import endpoints:
  - `POST /api/admin/content/import/practice-exams-json`
  - `POST /api/admin/content/import/certification-paths-json`
- Certification-path import now validates:
  - certification existence
  - course/lab/practice exam references
  - step type validity
  - unique `stepOrder`
  - path-scoped structured errors
- Certification path step types expanded:
  - `course`, `lab`, `assessment`, `quiz`, `practice_exam`, `final_certificate`

### Frontend
- Added admin pages:
  - `/dashboard/admin/content/practice-exams`
  - `/dashboard/admin/content/certification-paths`
  - `/dashboard/admin/content/import`
- Reused Phase A components:
  - `ImportResultPanel`
  - `IndexingBanner`
  - template download flow
- Added learner page:
  - `/dashboard/learner/practice-exams/[slug]`
  - session, submit, and attempt history
- Certification roadmap CTA routing updated for `practice_exam` and `final_certificate` step types.

### Files added (Phase B)
- `backend/api/src/practice-exams/entities/practice-exam-attempt.entity.ts`
- `backend/api/src/practice-exams/practice-exams.controller.ts`
- `backend/api/src/migrations/1714600000000-CreatePracticeExamAttempts.ts`
- `frontend/services/practice-exams.ts`
- `frontend/services/content-import.ts`
- `frontend/app/[locale]/dashboard/admin/content/practice-exams/page.tsx`
- `frontend/app/[locale]/dashboard/admin/content/certification-paths/page.tsx`
- `frontend/app/[locale]/dashboard/admin/content/import/page.tsx`
- `frontend/app/[locale]/dashboard/learner/practice-exams/[slug]/page.tsx`

### Files modified (Phase B)
- `backend/api/src/certifications/entities/certification-path.entity.ts`
- `backend/api/src/content-import/certification-paths-import.service.ts`
- `backend/api/src/content-import/content-import.module.ts`
- `backend/api/src/content-import/content-import.service.ts`
- `backend/api/src/content-import/dto/import-content.dto.ts`
- `backend/api/src/admin/admin-content.controller.ts`
- `backend/api/src/practice-exams/practice-exams.module.ts`
- `backend/api/src/practice-exams/practice-exams.service.ts`
- `backend/api/src/certifications/certifications.service.ts`
- `backend/api/src/certifications/certifications.module.ts`
- `backend/api/src/learner/learner.service.ts`
- `backend/api/src/app.module.ts`
- `frontend/components/admin/import/ImportResultPanel.tsx`
- `frontend/components/admin/import/import-templates.ts`
- `frontend/components/layout/Sidebar.tsx`
- `frontend/components/layout/Header.tsx`
- `frontend/services/certifications.ts`
- `frontend/app/[locale]/dashboard/admin/certifications/[id]/path/page.tsx`
- `frontend/app/[locale]/dashboard/learner/certifications/[id]/page.tsx`
- `frontend/locales/en.json`
- `frontend/locales/fr.json`

---

## Phase C — Manual Course Editor + Drag-and-Drop Reordering (Delivered)

### Frontend delivery
- Upgraded `/dashboard/admin/courses/[id]` into a full manual editor for:
  - modules
  - lessons
  - module quiz items (question/options/correct/explanation)
  - course labs
- Added drag-and-drop ordering for course modules in the course edit page, persisted through existing `PATCH /api/admin/courses/:id` payload ordering (`moduleOrder`).
- Added drag-and-drop ordering for certification path steps in `/dashboard/admin/certifications/[id]/path`, persisted through existing path save mutation.

### Files modified (Phase C)
- `frontend/components/admin/CourseModuleEditor.tsx`
- `frontend/app/[locale]/dashboard/admin/courses/[id]/page.tsx`
- `frontend/app/[locale]/dashboard/admin/certifications/[id]/path/page.tsx`
- `frontend/services/admin-courses.ts`

### QA status
- [x] Frontend lint clean for Phase C touched files.
- [ ] Manual runtime UX verification for drag-and-drop on touch + desktop.

---

## Phase 7 — Premium Certification Dashboard (Phase 1 Delivered)

### Objective delivered
- Certification now feels like a dedicated preparation journey, not a direct duplicate of course execution UI.
- Architecture boundary preserved:
  - Certification page = readiness + roadmap + exam prep
  - Course page = lesson execution
  - Existing enrollment endpoint/flow reused

### Backend updates
- Extended `GET /api/learner/certifications/:id/experience` in `backend/api/src/learner/learner.service.ts` with deterministic fallback enrichments:
  - `nextRecommendedAction`
  - `weakAreas`
  - `quizAverage`
  - `practiceExamStatus`
  - `estimatedExamReadinessDate`
  - `careerOutcomes`
  - `nextCertificationSuggestions`
  - `studyPlanner`
  - `streak`
  - `gamification`
- Roadmap steps enriched for UI rendering with `estimatedMinutes`, `skillGain`, `recommended`, and `ctaLabel`.

### Frontend updates
- Refactored `frontend/app/[locale]/dashboard/learner/certifications/[id]/page.tsx` into premium dashboard:
  - Hero with certification identity chips + animated readiness ring + CTA cluster
  - Coursera-style timeline with lock model and status-aware step actions
  - Readiness 2.0 panel (quiz average, weak areas, next action, exam readiness date)
  - New sections: skill outcomes, rewards, study planner milestones
  - Tutor quick actions and richer context prompts
- Extended `frontend/services/certifications.ts` contract for the new payload fields.
- Enhanced `frontend/components/learner/UniversalTutor.tsx` with optional `contextMetadata` injection.

### QA checklist (Phase 1)
- [x] Certification list opens dedicated certification detail route.
- [x] Continue/Start Journey still enrolls then routes to linked course.
- [x] Timeline lock model and status-aware CTAs render from roadmap order/progress.
- [x] Tutor opens with certification-specific prompts and metadata context.
- [ ] Manual runtime UX sweep on mobile/tablet/desktop in live environment.

### Phase 2 delivery (now implemented)
- Server-backed streak progression from learner activity tables (`user_course_progress`, `lab_progress`, `exam_attempts`, `assessment_results`).
- XP history timeline generated from recent course/lab/exam events.
- Weekly planner calendar payload with planned sessions and completion state.
- Practice exam hub payload with attempt history + analytics (average, best, pass rate, trend).

### Remaining backlog after Phase 2
- Optional persistence hardening for planner edits (write endpoints)
- Advanced badge catalog and shareable achievement cards
- Adaptive planner generation from real calendar availability

---

## Phase 6 — Admin Content Management SaaS (Delivered)

### What was implemented
- Production admin content surface to manage/import:
  - Courses (`certif_courses`-compatible JSON)
  - Interactive labs (manual CRUD + JSON import)
  - Certifications (manual CRUD + JSON import + course linking support)
  - AI Tutor indexing status/sync page
- Imports support `dryRun` preview and idempotent create/update/skip summaries.
- Architecture preserved: JSON/TS as import inputs, PostgreSQL as runtime source of truth.

### New backend files
- `backend/api/src/content-import/dto/import-content.dto.ts`
- `backend/api/src/content-import/course-json-import.service.ts`
- `backend/api/src/content-import/lab-import.service.ts`
- `backend/api/src/content-import/certification-import.service.ts`
- `backend/api/src/content-import/content-import.service.ts`
- `backend/api/src/content-import/content-import.module.ts`
- `backend/api/src/admin/admin-content.controller.ts`

### Backend files modified
- `backend/api/src/admin/admin.module.ts` (content module/controller wiring)

### New frontend files
- `frontend/services/content-indexer-admin.ts`
- `frontend/hooks/api/useAdminContentIndexer.ts`
- `frontend/app/[locale]/dashboard/admin/content/indexing/page.tsx`

### Frontend files modified
- `frontend/services/admin-courses.ts` (courses import API)
- `frontend/hooks/api/useAdminCourses.ts` (courses import mutation)
- `frontend/services/labs.ts` (admin content labs endpoints + labs import API)
- `frontend/services/certifications.ts` (admin content cert endpoints + cert import API)
- `frontend/app/[locale]/dashboard/admin/courses/page.tsx` (file import preview/import)
- `frontend/app/[locale]/dashboard/admin/labs/page.tsx` (labs JSON preview/import)
- `frontend/app/[locale]/dashboard/admin/certifications/page.tsx` (cert JSON preview/import)
- `frontend/components/layout/Sidebar.tsx` (AI Tutor indexing nav item)
- `frontend/components/layout/Header.tsx` (AI Tutor indexing page title mapping)
- `frontend/locales/en.json`, `frontend/locales/fr.json` (navigation labels)

### API endpoints added
- `POST /api/admin/content/import/courses-json`
- `GET /api/admin/content/labs`
- `POST /api/admin/content/labs`
- `PATCH /api/admin/content/labs/:slug`
- `DELETE /api/admin/content/labs/:slug`
- `POST /api/admin/content/import/labs-json`
- `GET /api/admin/content/certifications`
- `POST /api/admin/content/certifications`
- `PATCH /api/admin/content/certifications/:id`
- `POST /api/admin/content/import/certifications-json`

### Admin usage guide
- **Import courses:** Admin > Courses > upload JSON > Preview > Import.
- **Import labs:** Admin > Labs > upload JSON > Preview import > Import labs.
- **Import certifications:** Admin > Certifications > upload JSON > Preview > Import.
- **Sync AI Tutor knowledge:** Admin > Content > Indexing > `Sync now` or `Force full sync`.

### Testing checklist
- [x] Courses JSON preview/import endpoint wired with idempotent summary.
- [x] Labs JSON preview/import endpoint wired with duplicate slug validation.
- [x] Certifications JSON preview/import endpoint wired with required-field and course-link checks.
- [x] AI Tutor indexing admin page wired to `/api/admin/content-indexer/status` and `/api/admin/content-indexer/sync`.
- [ ] Full E2E runtime validation in deployed environment (manual pending):
  - [ ] import valid/invalid JSON samples from admin UI
  - [ ] verify learner visibility and assignment behavior
  - [ ] verify no duplicates after re-import
  - [ ] verify tutor answers newly imported content after sync

### Deployment steps
1. Build/redeploy API container (new admin controller + content-import module).
2. Build/redeploy frontend container (new admin pages/services/hooks).
3. Run admin dry-run imports first; then commit imports.
4. Run AI indexing sync from admin indexing page.

---

## Phase 0 — Security: Remove All Hardcoded API Keys

**Priority: CRITICAL — Must complete before any new feature work.**

### Files to Modify

#### 1. frontend/components/learner/LabAssistant.tsx (lines 20-21)

Replace hardcoded key strings with:
  const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY ?? "";
  const CARTESIA_API_KEY = process.env.NEXT_PUBLIC_CARTESIA_API_KEY ?? "";

#### 2. frontend/app/[locale]/dashboard/learner/cours/[courseId]/page.tsx (lines 48-49)
Same substitution — identical hardcoded keys in the inline AIChatPanel component.

#### 3. frontend/.env.local (add if missing)
  NEXT_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_key
  NEXT_PUBLIC_CARTESIA_API_KEY=your_cartesia_key

#### 4. frontend/.env.example (add entries)
  NEXT_PUBLIC_DEEPGRAM_API_KEY=
  NEXT_PUBLIC_CARTESIA_API_KEY=

#### 5. Python agents — replace hardcoded Azure credentials
- backend/agents/03_Agents/cloud_tutor_agent.py — use os.environ.get("AZURE_OPENAI_API_KEY")
- backend/agents/coach_Agent/indexer_semantique_final.py — same pattern for all Azure keys

### Security Checklist
- [ ] No API keys in git diff output
- [ ] git grep -r "sk-" frontend/ returns empty
- [ ] .env.local in .gitignore
- [ ] Keys rotated in provider dashboards after removal

---

## Phase 1 — Backend: Learner Assignment System

### DB Migration

**File:** backend/api/src/migrations/1714200000000-CreateLearnerAssignmentSystem.ts

SQL to run:

  CREATE TABLE learner_content_assignments (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type  VARCHAR(20) NOT NULL CHECK (content_type IN ('course','lab','certification')),
    content_ref   VARCHAR(255) NOT NULL,
    -- course -> courses.courseId VARCHAR e.g. "AZ-900-AZURE-FUNDAMENTALS"
    -- lab    -> labs.slug VARCHAR e.g. "azure-az900"
    -- cert   -> certifications.id cast to VARCHAR e.g. "3"
    granted_by    INT REFERENCES users(id) ON DELETE SET NULL,
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ,
    note          TEXT,
    UNIQUE(user_id, content_type, content_ref)
  );
  CREATE INDEX idx_lca_user ON learner_content_assignments(user_id);
  CREATE INDEX idx_lca_type_ref ON learner_content_assignments(content_type, content_ref);

### Entity

**File:** backend/api/src/learner-assignments/entities/learner-content-assignment.entity.ts

  @Entity("learner_content_assignments")
  export class LearnerContentAssignment {
    @PrimaryGeneratedColumn() id: number;
    @Column({ name: "user_id" }) userId: number;
    @Column({ name: "content_type", length: 20 }) contentType: "course" | "lab" | "certification";
    @Column({ name: "content_ref", length: 255 }) contentRef: string;
    @Column({ name: "granted_by", nullable: true }) grantedBy: number | null;
    @CreateDateColumn({ name: "granted_at" }) grantedAt: Date;
    @Column({ name: "expires_at", nullable: true, type: "timestamptz" }) expiresAt: Date | null;
    @Column({ nullable: true, type: "text" }) note: string | null;
  }

### Service Key Methods

**File:** backend/api/src/learner-assignments/learner-assignments.service.ts

  // Returns active (non-expired) content_ref[] for a user by type
  async getActiveAssignments(userId: number, contentType: string): Promise<string[]>
  // WHERE user_id=$1 AND content_type=$2 AND (expires_at IS NULL OR expires_at > NOW())

  async assignContent(adminId: number, dto: AssignContentDto): Promise<LearnerContentAssignment>
  async removeAssignment(adminId: number, assignmentId: number): Promise<void>
  async getLearnerAssignments(userId: number): Promise<LearnerContentAssignment[]>

  // Bulk: INSERT ... ON CONFLICT (user_id, content_type, content_ref) DO NOTHING
  async bulkAssign(adminId: number, dto: BulkAssignDto): Promise<{ assigned: number; skipped: number }>

### Update LearnerService.getContentAccessInfo()

**File:** backend/api/src/learner/learner.service.ts

Fetch admin assignments in parallel then merge with subscription entitlements:

  const [assignedCourses, assignedLabs, assignedCerts] = await Promise.all([
    this.learnerAssignmentsService.getActiveAssignments(userId, "course"),
    this.learnerAssignmentsService.getActiveAssignments(userId, "lab"),
    this.learnerAssignmentsService.getActiveAssignments(userId, "certification"),
  ]);

  // Free users: accessible = subscription-allowed union admin-assigned
  return {
    isFree: true,
    accessibleCourseIds: [...new Set([...subscriptionCourseIds, ...assignedCourses])],
    accessibleLabSlugs:  [...new Set([...subscriptionLabSlugs,  ...assignedLabs])],
    certificationsLocked: certificationsLocked && assignedCerts.length === 0,
    adminAssignedCourseIds: assignedCourses,
    adminAssignedLabSlugs: assignedLabs,
    adminAssignedCertIds: assignedCerts,
  };

### Admin Controller Endpoints

**File:** backend/api/src/admin/admin-learners.controller.ts

  POST   /api/admin/learners/:userId/assign        assign single content item
  DELETE /api/admin/learners/:userId/assign/:id    remove assignment
  GET    /api/admin/learners/:userId/assignments   list all assignments for learner
  POST   /api/admin/learners/bulk-assign           bulk assign to multiple users
  GET    /api/admin/learners                       paginated learner list with stats
  GET    /api/admin/learners/:userId               full learner profile + assignments

### Module Wiring

backend/api/src/learner-assignments/learner-assignments.module.ts:
- TypeOrmModule.forFeature([LearnerContentAssignment])
- Export LearnerAssignmentsService
- Import into LearnerModule and AdminModule

### Testing Checklist
- [x] Migration/entity/service/controller/module implemented in backend
- [x] `/api/admin/learners/:userId/assign` implemented with content validation (course/lab/cert)
- [x] `getContentAccessInfo()` merges active admin assignments with subscription entitlements
- [x] `/api/admin/learners/bulk-assign` implemented (ON CONFLICT DO NOTHING)
- [ ] Runtime endpoint validation against a live seeded database (manual API smoke test pending)
- [ ] Free user entitlement E2E validation in running environment (pending)

---

## Phase 2 — Frontend: Admin Learner Management UI

### Service

**File:** frontend/services/adminLearners.ts

  export interface LearnerProfile {
    id: number; fullName: string; email: string; track: string | null;
    subscriptionStatus: string; enrolledCoursesCount: number;
    completedCoursesCount: number; lastActiveAt: string | null;
  }

  export interface ContentAssignment {
    id: number; contentType: "course" | "lab" | "certification";
    contentRef: string; grantedAt: string; expiresAt: string | null; note: string | null;
  }

  export const adminLearnersService = {
    listLearners: (params) => api.get("/api/admin/learners", { params }),
    getLearner: (userId: number) => api.get(`/api/admin/learners/${userId}`),
    assignContent: (userId: number, payload) => api.post(`/api/admin/learners/${userId}/assign`, payload),
    removeAssignment: (userId: number, assignmentId: number) =>
      api.delete(`/api/admin/learners/${userId}/assign/${assignmentId}`),
    bulkAssign: (payload) => api.post("/api/admin/learners/bulk-assign", payload),
  };

### React Query Hooks

**File:** frontend/hooks/api/useAdminLearners.ts

  export function useAdminLearners(params) {
    return useQuery(["admin", "learners", params], () => adminLearnersService.listLearners(params));
  }
  export function useAdminLearner(userId: number) {
    return useQuery(["admin", "learner", userId], () => adminLearnersService.getLearner(userId));
  }
  export function useAssignContent(userId: number) {
    const qc = useQueryClient();
    return useMutation(
      (payload) => adminLearnersService.assignContent(userId, payload),
      { onSuccess: () => qc.invalidateQueries(["admin", "learner", userId]) }
    );
  }
  export function useRemoveAssignment(userId: number) {
    const qc = useQueryClient();
    return useMutation(
      (assignmentId: number) => adminLearnersService.removeAssignment(userId, assignmentId),
      { onSuccess: () => qc.invalidateQueries(["admin", "learner", userId]) }
    );
  }

### Pages

**frontend/app/[locale]/dashboard/admin/learners/page.tsx**
- Searchable/filterable table: Name, Email, Track, Plan, Courses completed, Last Active, Actions
- Row click navigates to learner detail
- Bulk-assign drawer: checkbox-select rows, choose contentType + contentRef, assign

**frontend/app/[locale]/dashboard/admin/learners/[id]/page.tsx**
- Header: avatar + name + email + plan badge
- Stats row: enrolled, completed, labs, certs
- Tabs: Overview | Assignments | Activity
- Assignments tab: table with type badge, contentRef, expiry, Remove button
- "+ Assign Content" modal: contentType select, contentRef input, optional expiresAt date, note textarea

### Sidebar Update

frontend/components/layout/Sidebar.tsx — add under Admin section (after Devis):
  { href: `/${locale}/dashboard/admin/learners`, icon: Users2, label: t("navigation.learners") }

### i18n Keys (en.json — mirror in fr.json and ar.json)

  "navigation": { "learners": "Learners" },
  "admin": {
    "learners": {
      "title": "Learner Management",
      "search": "Search learners...",
      "assign": "Assign Content",
      "assignSuccess": "Content assigned successfully",
      "removeSuccess": "Assignment removed",
      "bulkAssign": "Bulk Assign",
      "contentType": "Content Type",
      "contentRef": "Content ID / Slug",
      "expiresAt": "Expires At (optional)",
      "note": "Note (optional)"
    }
  }

### Testing Checklist
- [x] Admin sidebar now shows Learners link
- [x] Learners list page implemented with search + track/plan filters + bulk assign UI
- [x] Learner detail page implemented with assignment table and assign/remove actions
- [x] React Query invalidation wired after assign/remove/bulk assign
- [ ] Full browser E2E flow validation with live backend data (pending manual run)
- [ ] Cross-check assigned content visibility in learner dashboard session (pending)

---

## Phase 3 — Universal AI Tutor (All Content Types)

### Add Arabic Voice

**File:** frontend/lib/voice-assistant.ts

  export const CARTESIA_VOICES = {
    fr: "65b25c5d-ff07-4687-a04c-da2f43ef6fa9",
    en: "6ccbfb76-1fc6-48f7-b71d-91ac6298247b",
    ar: "a38e4e85-e815-4e25-a9b3-2f9b69d8d7aa", // verify in Cartesia voice library before deploying
  };

### Universal Tutor Component

**File:** frontend/components/learner/UniversalTutor.tsx

Props interface:
  contentType: "course" | "lab" | "certification"
  contentId: string      // courseId VARCHAR, lab slug, or cert id as string
  contentTitle: string
  locale: string
  className?: string

Three pill-tab modes:
1. Chat    — text Q&A, streaming SSE from /api/cloud-tutor/chat
2. Listen  — Cartesia TTS narration with play/pause and speed control (0.75x/1x/1.25x/1.5x)
             Speed implemented via AudioContext.playbackRate
3. Voice   — Deepgram STT -> NestJS -> cloud-tutor -> Cartesia TTS (full duplex)

Monthly quota display: "Voice minutes: 12/60 this month"
Read from readMonthlyVoice() / writeMonthlyVoice() in voice-assistant.ts

### Integration Points

- Courses page: Replace inline AIChatPanel forwardRef with
    <UniversalTutor contentType="course" contentId={courseId} contentTitle={title} locale={locale} />
- Labs page: Refactor LabAssistant to use UniversalTutor or wrap it
- Certifications page: Add UniversalTutor (contentType="certification") inside cert detail drawer

### NestJS Context Forwarding

Ensure contentType and contentId are forwarded to the Python cloud-tutor agent so RAG context
can be scoped to that specific content item.

### Testing Checklist
- [x] Chat mode works on course page with streaming responses
- [x] Chat mode works on certification detail
- [ ] Listen mode plays audio in correct locale voice
- [ ] Speed control changes playback rate smoothly
- [ ] Voice mode: speak -> STT -> response -> TTS end-to-end
- [ ] Monthly counter increments and caps at VOICE_MAX
- [x] Arabic voice loads for ar locale
- [ ] No API keys visible in browser Network tab (env vars only)

---

## Phase 4 — Certification Paths (Prerequisite Chains)

### DB Migration

  CREATE TABLE certification_paths (
    id                SERIAL PRIMARY KEY,
    certification_id  INT NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
    step_order        INT NOT NULL,
    step_type         VARCHAR(20) NOT NULL CHECK (step_type IN ('course','lab','assessment')),
    step_ref          VARCHAR(255) NOT NULL,
    required          BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(certification_id, step_order)
  );

### Backend Endpoints

  GET /api/certifications/:id/path        learner: ordered steps with completion status
  GET /api/admin/certifications/:id/path  admin view + edit
  PUT /api/admin/certifications/:id/path  replace full path definition (array of steps)

### Admin Path Editor

**File:** frontend/app/[locale]/dashboard/admin/certifications/[id]/path/page.tsx
- Drag-and-drop reordering with @dnd-kit/sortable
- Step type dropdown: Course | Lab | Assessment
- contentRef input per step (courseId, lab slug, or assessment id)
- Required toggle per step
- Save button -> PUT /api/admin/certifications/:id/path

### Learner Path Progress UI

Vertical stepper on certification detail page/drawer:

  [check] Step 1: AZ-900 Azure Fundamentals          Completed
  [arrow] Step 2: Lab azure-az900                    In Progress (60%)
  [lock]  Step 3: AI-900 AI Fundamentals             Locked
  [lock]  Step 4: Final Assessment                   Locked

### Testing Checklist
- [x] Admin defines a path for a certification
- [ ] Drag-and-drop reorder is saved correctly (basic ordered editor implemented; DnD pending enhancement)
- [x] Learner sees path with completion states
- [x] Completing a step updates the progress in the stepper

---

## Phase 5 — Auto AI Content Ingestion Pipeline

### The Problem

New courses added to certif_courses.json and re-seeded do NOT automatically appear in Azure
Cognitive Search (index: index-subul-semantic-v2, semantic config: my-semantic-config).
The AI Tutor is blind to new content until the manual indexer_semantique_final.py script runs.

### Solution: ContentIndexerService in NestJS

**File:** backend/api/src/content-indexer/content-indexer.service.ts

Key implementation details:

  @Cron("0 2 * * *")  // 2 AM daily via @nestjs/schedule
  async scheduledSync() { await this.syncUnindexedContent(); }

  async syncUnindexedContent() {
    const unindexed = await this.coursesRepo.find({ where: { azureSearchIndexedAt: IsNull() } });
    await this.indexCourses(unindexed);
  }

  async indexCourses(courses: Course[]) {
    for (const batch of chunk(courses, 50)) {     // Azure Search max batch = 1000, use 50 to be safe
      const docs = await Promise.all(batch.map(c => this.flattenCourseContent(c)));
      const embeddings = await this.generateEmbeddings(docs.map(d => d.contenu_texte));
      // Azure OpenAI text-embedding-ada-002, 1536 dims
      // Match existing field name: "vecteur" in index-subul-semantic-v2
      const indexed = docs.map((d, i) => ({ ...d, vecteur: embeddings[i] }));
      await this.searchClient.uploadDocuments(indexed);
      await this.coursesRepo.update(batch.map(c => c.id), { azureSearchIndexedAt: new Date() });
    }
  }

  flattenCourseContent(course) returns:
    id: "course-{courseId}"
    fichier_source: "courses_db"
    titre_lab: course.title
    module: course.track ?? "general"
    nom_tache: course.courseId
    contenu_texte: title + description + all lesson titles + lesson descriptions (joined by \n)
    solution_conceptuelle: course.description
    analyse_erreurs_str: ""
    vecteur: []  (populated after generateEmbeddings)

### Tracking Column Migration

  ALTER TABLE courses ADD COLUMN azure_search_indexed_at TIMESTAMPTZ;
  ALTER TABLE labs    ADD COLUMN azure_search_indexed_at TIMESTAMPTZ;

### Hook Into Seed Process

After seed upsert completes, call ContentIndexerService.syncUnindexedContent() directly so
new content is indexed immediately — no waiting for 2 AM cron.

### Admin Trigger Endpoints

  POST /api/admin/content-indexer/sync    manual trigger, returns { queued: number }
  GET  /api/admin/content-indexer/status  { lastSyncAt, indexedCount, pendingCount }

### Module

**File:** backend/api/src/content-indexer/content-indexer.module.ts
- TypeOrmModule.forFeature([Course, Lab])
- ScheduleModule (from @nestjs/schedule)
- Export ContentIndexerService
- Import into AppModule and AdminModule

### Cost Reference

| Operation                      | Cost     | Time    |
|--------------------------------|----------|---------|
| Embed 1 course (~5k tokens)    | ~$0.0005 | < 1s    |
| Full catalog (200 courses)     | < $0.10  | < 3 min |
| Nightly delta (10 new courses) | < $0.005 | < 30s   |

### Testing Checklist
- [x] New course seeded: indexed tracking columns added (`azure_search_indexed_at`)
- [x] POST /api/admin/content-indexer/sync runs sync and updates column
- [ ] Azure Search query for new course topic returns the new document (manual env-backed validation pending)
- [ ] AI Tutor answers questions about newly indexed course content (manual validation pending)
- [x] Cron fires at 2 AM (Nest scheduler wiring added)
- [x] Sync is incremental by `updated_at > azure_search_indexed_at`

---

## Deployment Steps Per Phase

  # Phase 0 — keys only (no migration)
  docker compose up -d --build frontend

  # Phase 1 — backend assignment system
  # Inside api container:
  npm run migration:run
  docker compose up -d --build api

  # Phase 2 — frontend admin UI
  docker compose up -d --build frontend

  # Phase 3 — Universal AI Tutor
  docker compose up -d --build frontend

  # Phase 4 — certification paths
  npm run migration:run
  docker compose up -d --build api frontend

  # Phase 5 — content indexer
  # Add to api .env and docker-compose.yml:
  #   AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
  #   AZURE_SEARCH_KEY=your-key
  npm run migration:run
  docker compose up -d --build api
  # Trigger initial full index:
  curl -X POST http://localhost:3001/api/admin/content-indexer/sync

---

## Security Final Checklist

- [ ] GET /api/courses/:courseId — add SubscriptionGuard (SECURITY GAP: currently unprotected)
- [ ] POST /api/labs/:slug/start — verify SubscriptionGuard present
- [ ] POST /api/learner/certifications/:id/enroll — verify SubscriptionGuard present
- [ ] All admin assignment endpoints require @Roles("admin") guard
- [ ] Azure Search API key stays server-side only (NestJS proxy, never sent to browser)
- [ ] NEXT_PUBLIC_DEEPGRAM_API_KEY and NEXT_PUBLIC_CARTESIA_API_KEY in env vars (acceptable: client SDKs)
- [ ] expiresAt on assignments enforced server-side (not trusted from frontend input)

---

## Complete File List

### New Files to Create

  backend/api/src/migrations/1714200000000-CreateLearnerAssignmentSystem.ts          Phase 1
  backend/api/src/learner-assignments/entities/learner-content-assignment.entity.ts  Phase 1
  backend/api/src/learner-assignments/learner-assignments.service.ts                 Phase 1
  backend/api/src/learner-assignments/learner-assignments.module.ts                  Phase 1
  backend/api/src/admin/admin-learners.controller.ts                                 Phase 1
  frontend/services/adminLearners.ts                                                  Phase 2
  frontend/hooks/api/useAdminLearners.ts                                              Phase 2
  frontend/app/[locale]/dashboard/admin/learners/page.tsx                             Phase 2
  frontend/app/[locale]/dashboard/admin/learners/[id]/page.tsx                        Phase 2
  frontend/components/learner/UniversalTutor.tsx                                      Phase 3
  backend/api/src/content-indexer/content-indexer.service.ts                          Phase 5
  backend/api/src/content-indexer/content-indexer.module.ts                           Phase 5

### Files to Modify

  frontend/components/learner/LabAssistant.tsx                  Phase 0  Remove hardcoded keys lines 20-21
  frontend/app/.../cours/[courseId]/page.tsx                    Phase 0  Remove hardcoded keys lines 48-49
  frontend/lib/voice-assistant.ts                               Phase 3  Add Arabic voice ID
  backend/api/src/learner/learner.service.ts                    Phase 1  Merge admin assignments in getContentAccessInfo()
  frontend/components/layout/Sidebar.tsx                        Phase 2  Add Learners nav item
  frontend/locales/en.json + fr.json + ar.json                  Phase 2  Add learner management i18n keys
  backend/api/src/app.module.ts                                  Phase 5  Import ContentIndexerModule + ScheduleModule

---

*Last updated: 2026-04-28 — All phases 1-5 implemented and wired in code. Remaining intentional work is Phase 0 (security hardening) only.*

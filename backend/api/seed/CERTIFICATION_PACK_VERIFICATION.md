# Certification academy pack — verification and runbook

## 1) Import workflow (manual by default)

Boot defaults are now safe:

- `RUN_SEED_ON_BOOT=false`
- `SEED_PROFILE=none`
- `SEED_LEGACY_CATALOG=false`
- `AUTO_SEED_CERTIFICATION_PACK=false`
- `CONTENT_PACK_IMPORT_ON_START=false`

So the API no longer reseeds legacy/demo catalog automatically.

### Local (from backend/api)

```bash
npm run import:certification-pack
```

If you changed TypeScript source and have not built yet:

```bash
npm run import:certification-pack:build
```

### Docker (explicit command)

```bash
docker compose run --rm api npm run import:certification-pack
```

### Optional boot-time import (opt-in)

Set one of:

- `CONTENT_PACK_IMPORT_ON_START=true` (preferred)
- `AUTO_SEED_CERTIFICATION_PACK=true` (legacy alias)

Then start API.

## 2) Runtime logs

After import/start, tail logs:

```bash
docker compose logs -f api
```

Look for lines prefixed with `[CertPack]` and `[api-entrypoint]`.

Expected phases:

1. courses-certifications import
2. interactive-labs import
3. practice-exams import
4. certification-paths import
5. indexer sync

## SQL sanity checks (PostgreSQL)

Replace schema/database name if needed. Run inside `psql` or your SQL client.

```sql
-- Row counts
SELECT 'certifications' AS entity, COUNT(*)::int AS n FROM certifications
UNION ALL SELECT 'courses', COUNT(*)::int FROM courses
UNION ALL SELECT 'modules', COUNT(*)::int FROM modules
UNION ALL SELECT 'lessons', COUNT(*)::int FROM lessons
UNION ALL SELECT 'course_labs', COUNT(*)::int FROM course_labs
UNION ALL SELECT 'labs_interactive', COUNT(*)::int FROM labs
UNION ALL SELECT 'practice_exams', COUNT(*)::int FROM practice_exams
UNION ALL SELECT 'practice_exam_questions', COUNT(*)::int FROM practice_exam_questions
UNION ALL SELECT 'certification_paths', COUNT(*)::int FROM certification_paths;

-- Indexed for AI Tutor (Azure Search stamp)
SELECT COUNT(*)::int AS indexed_courses FROM courses WHERE azure_search_indexed_at IS NOT NULL;
SELECT COUNT(*)::int AS indexed_labs FROM labs WHERE azure_search_indexed_at IS NOT NULL;
SELECT COUNT(*)::int AS indexed_certifications FROM certifications WHERE azure_search_indexed_at IS NOT NULL;

-- Per-certification journey size (courses/labs/path steps)
SELECT
  c.id,
  c.external_id,
  c.title,
  COUNT(DISTINCT co.id)::int AS linked_courses,
  COUNT(DISTINCT cp.id)::int AS path_steps
FROM certifications c
LEFT JOIN courses co ON co.certification_id = c.id
LEFT JOIN certification_paths cp ON cp.certification_id = c.id
GROUP BY c.id, c.external_id, c.title
ORDER BY c.title;

-- Ensure every path course step resolves to a real courseId
SELECT
  cp.certification_id,
  cp.step_order,
  cp.step_ref
FROM certification_paths cp
LEFT JOIN courses co ON co.course_id = cp.step_ref
WHERE cp.step_type = 'course'
  AND co.id IS NULL
ORDER BY cp.certification_id, cp.step_order;

-- Ensure every path lab step resolves to an interactive lab slug
SELECT
  cp.certification_id,
  cp.step_order,
  cp.step_ref
FROM certification_paths cp
LEFT JOIN labs l ON l.slug = cp.step_ref
WHERE cp.step_type = 'lab'
  AND l.id IS NULL
ORDER BY cp.certification_id, cp.step_order;

-- Course content depth (modules/lessons) by courseId
SELECT
  co.course_id,
  co.title,
  COUNT(DISTINCT m.id)::int AS modules,
  COUNT(DISTINCT le.id)::int AS lessons
FROM courses co
LEFT JOIN modules m ON m.course_id = co.id
LEFT JOIN lessons le ON le.module_id = m.id
GROUP BY co.id, co.course_id, co.title
ORDER BY co.course_id;
```

Expected after a full academy import (see pack README for exact scale): ~20 certifications, ~100 courses, etc.

## 3) Environment flags

| Variable | Purpose |
|----------|---------|
| `RUN_SEED_ON_BOOT` | `true`: run `seed:run` at API boot. Default is `false`. |
| `SEED_PROFILE` | Baseline/demo/none profile used by `seed:run`. Recommended default `none`. |
| `SEED_LEGACY_CATALOG` | `true`: legacy `certif_courses.json` catalog import during `seed:run`. Default `false`. |
| `CONTENT_PACK_IMPORT_ON_START` | `true`: import academy pack on API boot. Default `false`. |
| `AUTO_SEED_CERTIFICATION_PACK` | Legacy boot flag alias. Keep `false` unless intentionally used. |
| `FORCE_CERT_PACK_IMPORT` | CLI override used by `npm run import:certification-pack`. |
| `CERTIFICATION_PACK_DIR` | Relative to API `cwd` in Docker: `seed/subul-certification-pack`. |
| `REQUIRE_CONTENT_INDEXING` | `true`: fail pack script if Azure Search upload fails. `false`: log and continue. |

## 4) Idempotency and learner safety

Re-running import is upsert-based: stable keys are `courses.courseId`, `labs.slug`, `practice_exams.slug`, certification `externalId`, and paths keyed by certification.

Learner activity tables are not reset by import:

- `user_course_progress`
- `lab_progress`
- `practice_exam_attempts`
- `issued_certificates`

## 5) Frontend verification checklist

1. Open learner certifications list and go to a certification detail.
2. Verify path counters match payload (courses/labs/practice exams).
3. Verify full roadmap sections render (Courses, Labs, Practice Exams, Final Certificate).
4. Click each course step:
   - Course page opens by `courseId` string.
   - Modules and lessons render (not empty state).
5. Click each lab and practice exam step:
   - Routes open correct slug pages.
6. Confirm lock/completion states remain intact.

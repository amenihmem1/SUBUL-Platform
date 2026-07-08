# Certification Sync Rollout Checklist

## Release 1: Stability + Sync

- Verify each certification has at least one linked course (`courses.certification_id`).
- Verify learner completion writes persist by checking `user_course_progress.completed_lessons` and `overall_progress`.
- Validate learner diagnostics endpoint: `GET /api/learner/certifications/diagnostics`.
- Confirm earned/in-progress tabs match backend `GET /api/learner/certifications/status`.
- Confirm realtime notifications are received via Socket.IO namespace `/notifications`.

## Release 2: Certificate Product

- Verify issued certificate record is created after first completion for a certification.
- Validate issued endpoints:
  - `GET /api/learner/certifications/issued`
  - `GET /api/learner/certifications/issued/:id`
  - `GET /api/learner/certifications/verify/:code`
- Confirm learner page actions:
  - Download includes verification code
  - Details opens linked course
  - Verify calls backend and returns success

## Regression Test Targets

- Multi-course certification status picks completed course over in-progress course.
- Enrollment fails with clear error when a certification has no linked course.
- Local lesson/lab optimistic completion rolls back when API mutation fails.
- Dashboard progression uses computed `totalStudyTime` instead of constant placeholder.

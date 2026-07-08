# Subul Platform — Feature Roadmap & Enhancement Proposals

> Last updated: 2026-04-06
> Current stack: Next.js + NestJS + Python agents + Docker Compose
> Goal: Transform Subul from a learning platform into a full career acceleration platform.

---

## Priority Tiers

| Tier | Label | Meaning |
|------|-------|---------|
| P0 | Critical | High retention impact, low/medium effort |
| P1 | Important | Strong business value, medium effort |
| P2 | Nice to Have | Differentiators, higher effort |
| P3 | Future | Long-term vision |

---

## P0 — Quick Wins (Ship within 2 weeks)

### 1. Learning Streaks & XP System
- Daily streak counter with flame icon on dashboard
- XP earned per: lesson watched, quiz passed, lab completed, cert earned
- Level system: Beginner → Intermediate → Advanced → Expert
- Streak freeze (1/month for paid users)
- **Files to touch:** `learner dashboard widgets`, new `streaks` backend entity

### 2. Course Completion Certificate PDF
- Auto-generate branded PDF when learner passes certification
- Include: learner name, course name, date, unique certificate ID (UUID)
- Shareable public URL: `/certificate/{uuid}`
- **Files to touch:** `certifications.service.ts`, new PDF generation service (pdf-lib or puppeteer)

### 3. "Continue Where You Left Off" Widget
- Deepen the existing `ActiveCoursesSection` widget
- Show exact lesson + timestamp + % complete
- One-click resume button
- **Files to touch:** `ActiveCoursesSection.tsx`, `courses.service.ts`

### 4. Dark Mode
- Toggle in header + saved to user preferences (DB column or localStorage)
- Respect OS-level `prefers-color-scheme` by default
- **Files to touch:** `globals.css`, `Header.tsx`, `users` entity (add `theme` column)

### 5. Trial Expiry Email Nudge
- 24h before trial ends → send reminder email
- On expiry → send "your trial ended, upgrade now" email with promo
- **Files to touch:** `subscriptions.service.ts`, new `mail` module or extend existing

---

## P1 — Core Product Enhancements (Ship within 1 month)

### 6. Job Match Score (CV vs Job Description)
- Learner pastes a job description → system compares with their CV skills
- Show % match score + list of missing skills
- Suggest courses on the platform that close the skill gap
- **Files to touch:** `agent-cv-booster` (Python), new `job-match` endpoint, emploi page

### 7. Spaced Repetition Quiz System
- After completing a lesson, schedule a review quiz in: 1 day, 3 days, 7 days, 14 days
- Based on SM-2 algorithm (open source, simple to implement)
- Dashboard widget: "You have 3 reviews due today"
- **Files to touch:** new `reviews` backend module, `LearnerDashboardContainer.tsx`

### 8. In-App Notification Center
- Bell icon in header with unread count badge
- Notification types:
  - New course available in your track
  - Streak at risk (not studied today)
  - Trial expiring
  - Certificate earned
  - New lab published
- Mark as read / clear all
- **Files to touch:** new `notifications` backend module, `Header.tsx`, new `NotificationCenter.tsx`

### 9. Per-Lesson Notes & Bookmarks
- Markdown note editor per lesson (auto-saved)
- Bookmark any lesson with a tag
- Notes list page under learner profile
- Export all notes as PDF
- **Files to touch:** new `notes` backend entity/module, course lesson page

### 10. Analytics Dashboard (Admin)
- New admin section: `/dashboard/admin/analytics`
- Key metrics:
  - Conversion: trial started → paid (funnel chart)
  - Monthly Active Users (MAU) + Daily Active Users (DAU)
  - Top 5 most-viewed courses
  - Churn rate (subscriptions canceled per month)
  - Revenue by month (MRR chart)
  - Avg session duration per learner
- **Files to touch:** new admin analytics page, new `analytics.service.ts` with aggregation queries

### 11. Discussion Threads (Q&A per Lesson)
- Each lesson has a Q&A section (like Udemy)
- Learners post questions, others (or instructors) answer
- Upvote answers, mark as resolved
- **Files to touch:** new `discussions` backend module, course lesson page component

---

## P2 — Differentiation Features (Ship within 2–3 months)

### 12. Interactive Coding Sandbox
- In-browser code editor (Monaco Editor) for dev-track courses
- Execute code via open-source judge (Piston API or judge0)
- Support: Python, JavaScript, SQL, Bash
- **Files to touch:** new `CodeSandbox.tsx` component, proxy route to code execution API

### 13. AI Mock Interview Prep
- Learner selects a job title (e.g., "Junior DevOps Engineer")
- AI generates 10 behavioral + technical questions
- Learner answers via text or voice
- AI grades the answer and gives feedback
- **Files to touch:** new Python agent `interview-prep`, new frontend interview page

### 14. Public Learner Profile Page
- Shareable URL: `/profile/{username}`
- Shows: completed courses, earned certs, current streak, skills
- LinkedIn share button
- "Hire me" flag (opt-in, visible to recruiters)
- **Files to touch:** new public profile route, `users` entity (add public fields + username)

### 15. Leaderboard
- Weekly + monthly XP leaderboard
- Filter by: global / by track / by cohort
- Opt-in privacy setting
- Top 3 get a badge on their profile
- **Files to touch:** new `leaderboard` backend endpoint, new `LeaderboardWidget.tsx`

### 16. Peer Study Groups
- Learners create or join a group (max 8) around a course or track
- Shared progress view, group chat (WebSocket)
- Group challenges: "Complete module 3 by Friday"
- **Files to touch:** new `groups` backend module, new frontend group pages, WebSocket gateway

### 17. Affiliate / Referral System
- Each learner gets a unique referral link
- Referred user gets 10% discount on first paid plan
- Referrer gets 1 month free or account credit when referred user subscribes
- Admin view of referral stats
- **Files to touch:** new `referrals` backend module, checkout flow, admin panel

---

## P3 — Long-Term Vision (3–6 months)

### 18. Instructor Role & Course Builder
- New role: `instructor`
- WYSIWYG course builder with: video upload, lesson ordering, quiz builder
- Draft / review / publish workflow
- Revenue share model (instructor gets % of enrollments)
- **Files to touch:** full new `instructor` dashboard section, video upload pipeline, review admin flow

### 19. Mobile App (React Native)
- Wrap existing auth + courses + labs into a mobile app
- Offline video download for labs
- Push notifications for streaks and reviews
- **Stack:** React Native + Expo, reuse existing API

### 20. B2B / Corporate Training Portal
- Organizations buy seat licenses
- Admin assigns courses to employees
- Manager dashboard: team completion rates, quiz scores
- White-label option (custom domain + branding)
- **Files to touch:** new `organizations` backend module, new B2B pricing tier, tenant-aware access control

### 21. AI-Powered Learning Path Generator
- Learner inputs a goal: "I want to become a Cloud Engineer in 3 months"
- AI generates a custom roadmap: courses + labs + certifications in order
- Auto-enrolls learner in the path
- Weekly progress check-in email
- **Files to touch:** new `learning-paths` module, new Python agent, roadmap page enhancement

### 22. Mentor Marketplace
- Verified mentors list their availability + hourly rate
- Learner books a 1:1 session (calendar + video call)
- Platform takes a % cut
- Review system after each session
- **Files to touch:** new `mentors` backend module, calendar integration (Calendly API or custom), payment split logic

---

## Technical Debt & Infrastructure

These should run in parallel with feature work:

| Item | Why |
|------|-----|
| End-to-end test suite (Playwright) | Prevent regressions as the platform grows |
| API rate limiting per user/IP | Protect against abuse on public endpoints |
| Redis caching layer | Speed up repeated DB queries (geo, leaderboard, analytics) |
| S3/Cloudflare R2 for media | Replace any local file storage for CVs, videos, certificates |
| Sentry error tracking | Real-time frontend + backend error monitoring |
| OpenAPI / Swagger docs | Auto-generated API docs for all NestJS controllers |
| DB query audit | Find and fix N+1 queries in learner/courses/labs services |
| GDPR compliance | Data export + account deletion flows for EU users |

---

## Recommended Immediate Order

```
Week 1:  Dark mode + Streaks/XP + Certificate PDF
Week 2:  Notification center + Trial expiry emails
Week 3:  Job match score + Analytics dashboard (admin)
Week 4:  Spaced repetition quizzes + Per-lesson notes
Month 2: Leaderboard + Discussion threads + Public profile
Month 3: Coding sandbox + Mock interview AI + Referral system
```

---

## Notes

- Features marked with `agent` require a new Python service in `backend/agents/`
- All new backend modules follow the existing NestJS pattern: `entity → service → controller → module → app.module.ts`
- All new frontend pages go under `frontend/app/[locale]/dashboard/{role}/`
- i18n keys must be added to `en.json`, `fr.json`, and `ar.json` for every new UI string

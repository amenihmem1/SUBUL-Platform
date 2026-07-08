# Subul Platform — Full Product Roadmap
> Last updated: 2026-05-30
> Goal: Transform Subul into a world-class EdTech platform on par with Coursera and Udemy,
> with a unique edge in AI tutoring, cloud certifications, and career acceleration.

---

## Priority Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 | Critical — ship immediately |
| 🟠 | High impact, low effort |
| 🟡 | Medium impact, medium effort |
| 🟢 | Differentiator / competitive feature |
| 🔵 | Long-term vision |

---

## PART 1 — Current Backlog (Already Identified)

### 🔴 Security — Phase 0

| # | Item | File | Fix |
|---|------|------|-----|
| 1 | Deepgram key hardcoded | `LabAssistant.tsx` lines 20-21 | Move to `NEXT_PUBLIC_DEEPGRAM_API_KEY` |
| 2 | Cartesia key hardcoded | `LabAssistant.tsx` lines 20-21 | Move to `NEXT_PUBLIC_CARTESIA_API_KEY` |
| 3 | Same keys in course page | `cours/[courseId]/page.tsx` lines 48-49 | Same fix |
| 4 | Azure OpenAI key as Python default | `enhance_cv.py` lines 44-45 | Use `os.environ.get()`, no default |
| 5 | No subscription guard | `GET /api/courses/:courseId` | Add `SubscriptionGuard` |

**Effort:** 30 minutes. **Impact:** Eliminates active credential leak.

---

### 🟠 Quick Wins — No Backend Required

#### 1. Global Search — Command Palette (⌘K)
- Modal triggered by `Cmd+K` / `Ctrl+K`
- Searches course titles, lab titles, cert names, lesson titles
- Results grouped by type, keyboard navigable (↑↓ Enter Esc)
- Filter client-side from React Query cache — no new API needed
- Recent searches in `localStorage`
- **Files:** new `components/ui/CommandPalette.tsx`, `hooks/useCommandPalette.ts`; modify `locale-layout-client.tsx`

#### 2. Mobile Bottom Navigation Bar
- Fixed 5-tab bar: Home · Courses · Labs · Certs · Profile
- Visible only `lg:hidden`, active tab highlighted
- Badge on notification tab
- `usePathname()` for active state detection
- **Files:** new `components/layout/MobileBottomNav.tsx`; modify layout wrapper

#### 3. Notifications Inbox Panel
- `NotificationsContext` + WebSocket already fully wired
- Slide-over panel from bell icon with full notification history
- "Mark all as read" button + per-notification action CTAs
- `getUserNotifications()` service already exists
- **Files:** new `components/learner/NotificationsPanel.tsx`; modify `Header.tsx`

---

### 🟠 Quick Wins — Light Backend

#### 4. Admin Analytics Dashboard
Data already in DB — just needs aggregation queries + charts.

**Metrics to expose:**
- Trial → paid conversion funnel (weekly)
- Monthly Active Users (MAU) + Daily Active Users (DAU)
- Top 10 most-viewed courses and labs
- Revenue by month (MRR chart)
- Churn rate (cancellations per month)
- Subscription plan distribution (free / standard / premium)
- Average session duration per learner
- AI Tutor usage (queries per day)

**Files:** new `app/[locale]/dashboard/admin/analytics/page.tsx`, new `analytics.service.ts`

#### 5. Renewal / Dunning Lifecycle
- Pre-expiry reminder emails at 7 days, 3 days, 1 day before expiry
- Payment retry schedule for failed Stripe charges (day 1, 3, 7)
- Grace window banner in dashboard ("Your plan expired — retry payment")
- **Files:** extend `subscriptions.service.ts`, `webhooks.controller.ts`, `mail.service.ts`

#### 6. Verifiable Public Certificates
- Public verification page: `/certificate/:verificationCode`
- LinkedIn share button with pre-filled post text
- OG meta tags for social preview of the certificate
- Certificate already has `verificationCode` (SHA256) — just needs a public route
- **Files:** new `app/[locale]/certificate/[code]/page.tsx`, new public endpoint

---

### 🟡 Medium Effort

#### 7. Learner Analytics — Study Heatmap + Performance Trends
- GitHub-style heatmap: days studied in last 12 weeks (from `user_course_progress` timestamps)
- Quiz performance trend line chart per domain (cloud / cyber / AI)
- Time breakdown donut: courses vs labs vs exams
- Weak areas panel: auto-detected from quiz scores
- Replaces current basic `/progression` page
- **Files:** new chart components in `components/learner/analytics/`, extend `/progression` page

#### 8. Onboarding Tour (5-step spotlight)
- Triggered after first assessment completion, `localStorage` flag persists completion
- Steps: recommended courses → labs → AI tutor → progress stats → certifications
- Custom lightweight implementation: `getBoundingClientRect()` + overlay + spotlight cutout
- No heavy library needed
- **Files:** new `components/learner/OnboardingTour.tsx`, `hooks/useOnboardingTour.ts`

#### 9. Per-Lesson Notes & Bookmarks
- Markdown editor auto-saved per lesson (Ctrl+S shortcut)
- Bookmark any lesson with a color tag
- Notes list page under learner profile
- Export all notes as PDF
- **Backend:** new `lesson_notes` table (`userId`, `lessonId`, `content`, `createdAt`), CRUD endpoints
- **Files:** new `LessonNotes.tsx` component, notes page, notes service

#### 10. Prorated Upgrades (Standard → Premium)
- Compute remaining days value on current Standard plan
- Apply as credit automatically at Premium checkout
- Show transparent breakdown: "You pay X – Y credit = Z"
- **Files:** extend `payments.service.ts`, `checkout/page.tsx`

#### 11. Gamification — XP + Badges + Streaks
- XP earned per lesson, quiz, lab, cert (configurable per action)
- Level system: Beginner → Cloud Explorer → Engineer → Expert → Master
- Daily streak with freeze mechanic (1 freeze/week for premium)
- Badge unlocks: first lesson, 7-day streak, first cert, 10 labs completed, etc.
- Unlock animation (confetti + badge modal)
- **Backend:** new `user_gamification` table, award endpoints
- **Files:** new `GamificationContext`, `XPBadge`, `StreakWidget`, `BadgeGallery`, `AchievementModal`

#### 12. Public Learner Profile Page
- Shareable `/profile/:username`
- Shows: earned certs, completed courses, streak, skills radar chart
- LinkedIn share button
- "Hire me" flag (opt-in, visible to employer role)
- **Backend:** add `username` + `isPublic` to `users` table, new public profile endpoint
- **Files:** new `app/[locale]/profile/[username]/page.tsx`

---

### 🟢 Differentiators

#### 13. Spaced Repetition Quiz System (SM-2)
- After each lesson, schedule quiz reviews: 1 day → 3 days → 7 days → 14 days
- SM-2 algorithm adjusts interval based on answer quality
- Dashboard widget: "3 reviews due today"
- **Backend:** new `quiz_reviews` table with `dueAt`, SM-2 state fields
- **Files:** new `reviews` module, `ReviewsDueWidget`

#### 14. Study Calendar
- Monthly/weekly calendar view (certification detail or dashboard)
- `exp.weeklyPlanner` data already returned by the API — just needs rendering
- Scheduled study sessions shown as colored blocks
- Upcoming exam dates highlighted
- **Files:** new `StudyCalendar.tsx`, `StudyCalendarDay.tsx`

#### 15. Rate Limiting on AI Tutor
- `/api/cloud-tutor/chat` has zero throttle — one user can exhaust Azure OpenAI budget
- Add NestJS `ThrottlerGuard`: 20 requests/minute per user
- Server-side voice credit tracking (currently `localStorage` only — easy to spoof)

---

## PART 2 — Coursera / Udemy Parity Features

> These features are what make the top platforms retain learners and command premium pricing.
> None of these exist in Subul today.

---

### 🟠 Video Lectures

**Current state:** Lessons are text + markdown only. No video content.

**What to build:**
- Video player component with speed control (0.5x → 2x), quality selector, fullscreen
- Auto-generated transcript shown below video (via Deepgram batch transcription)
- Closed captions / subtitles overlay on video (use existing i18n locale)
- Downloadable lecture slides (PDF) per module
- Chapter markers on video timeline
- "Watch later" bookmark on any video
- Resume video from last position (store `video_progress` per user per video)

**Backend:** new `video_assets` table (`lessonId`, `storageUrl`, `duration`, `transcriptUrl`); integrate with S3 / Cloudflare R2 for storage
**Frontend:** new `VideoPlayer.tsx` component with HLS.js or Video.js

---

### 🟠 Course Ratings & Reviews

**Current state:** No ratings or reviews exist.

**What to build:**
- 5-star rating + written review after course completion
- Rating summary on course catalog card (average + count)
- Review moderation in admin panel
- "Most helpful" upvote on reviews
- Instructor (admin) response to reviews
- Verified purchase badge on reviews

**Backend:** new `course_reviews` table (`userId`, `courseId`, `rating`, `body`, `helpfulCount`, `moderationStatus`)
**Frontend:** `ReviewCard.tsx`, `RatingInput.tsx`, rating section on course detail page

---

### 🟠 Lesson Q&A / Discussion Threads

**Current state:** Only the AI Tutor for questions — no peer-to-peer.

**What to build:**
- Q&A tab below each lesson content
- Learners post questions, others answer (2-level threading)
- Upvote answers, mark as "resolved" by poster
- Admin/instructor can pin best answer
- Notification when your question gets answered
- Markdown + code block support in answers
- Search within a course's questions

**Backend:** new `lesson_discussions` table (`lessonId`, `userId`, `content`, `parentId`, `upvotes`, `isPinned`, `isResolved`)
**Frontend:** `LessonDiscussion.tsx`, `DiscussionThread.tsx`, `hooks/api/useDiscussion.ts`

---

### 🟡 Course Completion Certificate (Non-Certification)

**Current state:** Only full certification certificates exist. No "course completion" certificate.

**What to build:**
- Auto-generate a "Course Completion" PDF when a learner finishes 100% of lessons
- Different design from the certification certificate (simpler, course-branded)
- Shareable public URL + LinkedIn sharing
- Download button in learner dashboard
- Separate from the premium certification (no subscription gate)

**Files:** extend `CertificationsService.ensureIssuedCertificate()` to also handle course-only completions

---

### 🟡 Course Preview (Free First Lesson / Trailer)

**Current state:** Locked courses show no preview — learners can't evaluate quality before subscribing.

**What to build:**
- First lesson of every course is accessible without subscription (preview mode)
- "Lesson preview" banner on locked content: "You're in preview mode — subscribe to continue"
- Optional: 2-minute video trailer per course shown on catalog card hover
- This is one of the biggest conversion drivers on Udemy

**Backend:** add `isPreview: boolean` flag to `lessons` table; update subscription guard to allow preview lessons
**Frontend:** preview badge on lesson sidebar, upgrade CTA after preview lesson ends

---

### 🟡 Recommended / Related Courses

**Current state:** No recommendation engine exists.

**What to build:**
- "Students who completed this course also took..." section on course detail
- "Because you're enrolled in X, you might like Y" on dashboard
- "Complete your certification path" widget linking related courses in the same cert
- Algorithm: collaborative filtering on `user_course_progress` enrollment patterns (simple version: most co-enrolled courses)
- Can also use the AI Roadmap agent for personalized recommendations

**Backend:** new `GET /api/learner/recommendations` endpoint with enrollment-based scoring
**Frontend:** `RecommendedCourses.tsx` widget on dashboard and course detail page

---

### 🟡 Downloadable Resources per Lesson

**Current state:** No downloadable materials attached to lessons.

**What to build:**
- File attachments per lesson (PDF cheat sheets, slides, code files, diagrams)
- "Resources" tab on the course sidebar showing all downloadable files for the course
- Admin can upload resources when editing a lesson (admin course editor already exists)
- Files stored on S3 / Cloudflare R2

**Backend:** new `lesson_resources` table (`lessonId`, `filename`, `fileUrl`, `fileType`, `fileSize`), upload endpoint
**Frontend:** `ResourceList.tsx` component, download button per file

---

### 🟡 Wishlist / Save for Later

**Current state:** No way to save a course or lab for later.

**What to build:**
- Heart icon on every course, lab, and certification card
- "My Wishlist" page under learner dashboard
- Wishlist used for email reminders: "You saved X — it's now on sale" (future)
- Also useful for admin to see which locked content drives the most wishlist saves → conversion signal

**Backend:** new `user_wishlist` table (`userId`, `contentType`, `contentId`)
**Frontend:** `WishlistButton.tsx` component, wishlist page

---

### 🟡 Course Announcements

**Current state:** No way for admin/instructor to communicate with enrolled learners.

**What to build:**
- Admin posts an announcement to all learners enrolled in a course
- Announcement appears as a notification + in a course "Announcements" tab
- Email notification option
- Useful for: "New module added to AZ-900", "Exam objectives updated", "New lab available"

**Backend:** new `course_announcements` table, new endpoint, notification trigger
**Frontend:** Announcements tab on course page, admin form in course editor

---

### 🟡 Learning Reminders / Goal Streaks

**Current state:** No push/email reminder system for learner engagement.

**What to build:**
- Learner sets a weekly study goal (e.g., "3 hours per week")
- Daily reminder email: "You haven't studied today — keep your streak alive!"
- Weekly progress email: "You studied 2h this week — 1h away from your goal"
- Smart timing: send at learner's preferred time (stored in profile)
- Opt-in/opt-out in profile settings

**Backend:** new `learning_goals` table, scheduled email job (cron), goal tracking from session data
**Frontend:** goal-setting widget on dashboard, reminder settings in profile

---

### 🟢 AI-Powered Course Recommendations (Roadmap Agent)

**Current state:** `agent-roadmap:8002` exists but is not surfaced on the learner dashboard.

**What to build:**
- "Generate my learning path" button on the dashboard
- Learner inputs goal: "I want to become a Cloud Architect in 6 months"
- AI generates a custom path: ordered courses + labs + certifications with estimated dates
- Auto-enrolls learner in recommended courses (with consent)
- Weekly progress check-in email vs. generated path

**Integration:** wire `POST /api/roadmap` agent into learner dashboard
**Frontend:** `RoadmapGeneratorModal.tsx`, interactive timeline display

---

### 🟢 Peer Study Groups

**Current state:** No social/collaborative features.

**What to build:**
- Learners create or join a study group (max 8) around a course or certification
- Shared progress view: "3/8 members completed Module 2"
- Group chat (WebSocket, already used for notifications)
- Group challenges: "Complete the AZ-900 lab by Friday"
- Admin can create cohort groups for institutional clients

**Backend:** new `study_groups` + `group_members` + `group_messages` tables, WebSocket gateway
**Frontend:** group pages under `/dashboard/learner/groups/`

---

### 🟢 AI Mock Interview Prep

**Current state:** CV booster exists but no interview preparation tool.

**What to build:**
- Learner selects a certification + job title (e.g., "Azure Solutions Architect")
- AI generates 10 behavioral + 10 technical questions based on cert domain
- Learner answers via text or voice (reuse existing Deepgram STT + Cartesia TTS)
- AI grades answers with rubric feedback and suggested improvements
- Saves session history ("Your last practice: 7/10 — weak on networking questions")

**Backend:** new Python agent `agent-interview-prep:8007`, new NestJS proxy endpoint
**Frontend:** new page `/dashboard/learner/interview-prep`

---

### 🔵 Long-Term Vision

#### Instructor Role & Course Builder
- New role: `instructor` (separate from `admin`)
- WYSIWYG course builder: lesson editor, video upload, quiz builder, module ordering
- Draft → Review → Published workflow with admin approval
- Revenue share: instructor earns % of enrollments from their courses
- Instructor analytics dashboard: views, completion rate, ratings, earnings
- **Effort:** Large (3–4 months) — full new product surface

#### Mobile App (React Native + Expo)
- Wrap auth + courses + labs into a native mobile app
- Offline video download for locked-in environments
- Push notifications for streaks, reviews, announcements
- Reuse existing NestJS API entirely
- **Effort:** Large (2–3 months)

#### Mentor Marketplace
- Verified mentors list their availability + hourly rate
- Learner books a 1:1 session (calendar + video call integration)
- Platform takes a % cut
- Review system after sessions
- **Effort:** Very large (requires calendar + payment split + video call)

#### Multi-Tenant / White-Label
- Organizations get a custom subdomain (`company.subul.uk`)
- Custom branding (logo, colors, domain)
- Tenant-aware content and user isolation
- Manager dashboard: team completion rates, quiz scores, cert progress
- **Effort:** Architecture change — multi-tenancy requires significant backend refactoring

---

## PART 3 — Infrastructure (Run in Parallel with Features)

| Item | Priority | Why |
|------|----------|-----|
| Redis caching for `getContentAccessInfo()` | 🟠 | Called on every learner route — will cause DB load at scale |
| Rate limiting on `/api/cloud-tutor/chat` | 🔴 | No throttle today — one user can burn Azure quota for everyone |
| Arabic voice ID for AI Tutor | 🟠 | `CARTESIA_VOICES.ar` is a TODO — just needs a voice ID |
| Playwright E2E test suite | 🟡 | Prevent regressions as platform grows |
| S3 / Cloudflare R2 for media | 🟡 | Required for video + resource downloads |
| Sentry error tracking | 🟡 | No real-time error visibility today |
| GDPR compliance (data export + deletion) | 🟡 | Legal requirement for EU learners |
| OpenAPI / Swagger docs | 🟢 | Auto-generated from NestJS decorators — already partially wired |
| PWA manifest + service worker | 🟢 | "Install app" prompt on mobile, last thing to ship |

---

## Recommended Execution Order

### Sprint 1 (Week 1–2) — Foundation
1. 🔴 Phase 0: Remove hardcoded API keys
2. 🔴 Add `SubscriptionGuard` to `GET /api/courses/:courseId`
3. 🟠 Admin analytics dashboard
4. 🟠 Verifiable public certificates (public route + LinkedIn share)

### Sprint 2 (Week 3–4) — Learner Experience
5. 🟠 Course preview (first lesson free)
6. 🟠 Mobile bottom navigation
7. 🟠 Global search (⌘K)
8. 🟠 Notifications inbox panel

### Sprint 3 (Month 2) — Social + Engagement
9. 🟡 Course ratings & reviews
10. 🟡 Lesson Q&A / discussion threads
11. 🟡 Per-lesson notes & bookmarks
12. 🟡 Gamification (XP + badges + streaks)

### Sprint 4 (Month 2–3) — Retention + Revenue
13. 🟡 Renewal / dunning lifecycle
14. 🟡 Prorated upgrades
15. 🟡 Spaced repetition quizzes (SM-2)
16. 🟡 Learning reminders / goal tracking

### Sprint 5 (Month 3–4) — Platform Depth
17. 🟡 Downloadable resources per lesson
18. 🟡 Course completion certificate (non-certification)
19. 🟡 Recommended courses engine
20. 🟢 AI mock interview prep

### Sprint 6 (Month 4–6) — Video + Social
21. 🟠 Video lectures + player
22. 🟢 Peer study groups
23. 🟢 Public learner profile + LinkedIn share
24. 🔵 Instructor role + course builder (planning)

---

## KPI Targets (6-Month Horizon)

| Metric | Current | Target |
|--------|---------|--------|
| Trial → paid conversion | baseline | +25% |
| Standard → Premium upgrade | baseline | +20% |
| Day-7 learner retention | baseline | +30% |
| Monthly AI Tutor sessions | baseline | +50% |
| Certificate shares (LinkedIn) | ~0 | 200+/month |
| Failed payment recovery | ~0% | 30%+ |
| Mobile session share | baseline | +40% |

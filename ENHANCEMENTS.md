# Subul Platform — Enhancement Roadmap

> Audit date: 2026-05-15  
> Based on full frontend codebase exploration.  
> Each item lists current state, what's missing, and implementation notes.

---

## Priority Matrix

| # | Feature | Effort | Impact | Status |
|---|---------|--------|--------|--------|
| 1 | Global Search (⌘K) | Low | High | ⬜ TODO |
| 2 | Notifications Inbox | Low | Medium | ⬜ TODO |
| 3 | Mobile Bottom Navigation | Low | High | ⬜ TODO |
| 4 | Gamification (XP + Badges + Streaks) | Medium | High | ⬜ TODO |
| 5 | Onboarding Tour | Medium | High | ⬜ TODO |
| 6 | Study Calendar | Medium | Medium | ⬜ TODO |
| 7 | Lesson Q&A / Discussion | High | Medium | ⬜ TODO |
| 8 | Learner Analytics Dashboard | Medium | Medium | ⬜ TODO |
| 9 | PWA / Offline Support | High | Medium | ⬜ TODO |
| 10 | Accessibility Hardening | Medium | Low* | ⬜ TODO |

*Critical for institutional/enterprise clients.

---

## 1. Global Search — Command Palette (⌘K)

**Current state:** MISSING — Content discovery is catalog browsing only. No way to search across courses, labs, and certifications at once.

**What to build:**
- `components/ui/CommandPalette.tsx` — modal triggered by `Cmd+K` / `Ctrl+K`
- Searches: course titles, lab titles, certification names, lesson titles
- Results grouped by type (Cours / Labs / Certifications / Leçons)
- Keyboard navigable (↑↓ arrows, Enter to navigate, Esc to close)
- Recent searches stored in `localStorage`

**Implementation notes:**
- Reuse existing hooks: `useLearnerCatalogCourses`, `useLearnerLabs`, `useLearnerCertifications`
- Filter client-side (data already loaded) — no new API needed
- Wire global `keydown` listener in root layout
- Consider `cmdk` library or build lightweight custom version

**Files to create:**
- `components/ui/CommandPalette.tsx`
- `hooks/useCommandPalette.ts`

**Files to modify:**
- `app/[locale]/locale-layout-client.tsx` — add global keydown listener + mount palette

---

## 2. Notifications Inbox

**Current state:** PARTIAL — WebSocket + `NotificationsContext` fully wired. Bell icon shows unread dot. Notifications appear as toasts only and then disappear forever.

**What to build:**
- Slide-over panel opening from the bell icon
- Full notification history list (read + unread)
- "Mark all as read" button
- Per-notification action buttons (e.g. "Voir le cours" for course-assigned notifications)
- Empty state illustration

**Implementation notes:**
- `NotificationsContext` already provides `notifications[]` and `markNotificationAsRead()`
- `services/notifications.ts` has `getUserNotifications()` — just needs to be called on panel open
- No new backend work needed
- Use `AnimatePresence` slide-in from right (same pattern as mobile chat panel)

**Files to create:**
- `components/learner/NotificationsPanel.tsx`

**Files to modify:**
- `components/layout/Header.tsx` — replace toast-only with panel toggle
- `contexts/NotificationsContext.tsx` — add `isOpen` / `togglePanel` state

---

## 3. Mobile Bottom Navigation Bar

**Current state:** PARTIAL — Full responsive layout exists. Sidebar collapses on mobile but leaves learners with no navigation after collapse.

**What to build:**
- Fixed bottom bar visible only on `sm` and below (hidden `lg:hidden`)
- 5 tabs: Accueil · Cours · Labs · Certifs · Profil
- Active tab highlighted with themed color
- Badge count on notifications tab
- Smooth tab transition animations

**Implementation notes:**
- No new API/data needed
- Add `pb-16` padding to main content on mobile so bottom nav doesn't overlap content
- Use `usePathname()` to determine active tab
- Match existing brand colors (violet-600 active, slate-400 inactive)

**Files to create:**
- `components/layout/MobileBottomNav.tsx`

**Files to modify:**
- `app/[locale]/locale-layout-client.tsx` — mount `<MobileBottomNav />` inside layout
- Global layout wrapper — add conditional bottom padding on mobile

---

## 4. Gamification — XP, Badges, Streaks

**Current state:** MISSING — `xp_reward` fields exist in roadmap data but no reward system is implemented anywhere.

**What to build:**

### 4a. XP Counter
- XP total displayed in header (next to avatar)
- XP gain animation (+50 XP pop-up) when lesson/lab completed
- XP stored in `user_gamification` table (new backend table needed)

### 4b. Streak Tracker
- Days-studied-in-a-row counter
- Streak flame icon in header / dashboard
- "You're on a 5-day streak!" notification
- Streak freeze mechanic (1 freeze per week for premium users)

### 4c. Badges / Achievements
- Unlock conditions: first lesson, first lab, 7-day streak, first certification, etc.
- Badge gallery on learner profile page
- Unlock animation (confetti + badge modal)

### 4d. Leaderboard (optional phase 2)
- Weekly XP ranking among platform learners
- Opt-in only (privacy)

**Implementation notes:**
- Backend: new `user_gamification` table (`userId`, `xp`, `streak`, `lastActiveDate`, `badges[]`)
- New endpoint: `GET /api/learner/gamification` + `POST /api/learner/gamification/award`
- Frontend: `useGamification()` hook + `GamificationProvider` context
- XP award triggered inside `useCompleteLesson` and `useUpdateLabProgress` mutations

**Files to create:**
- `components/learner/XPBadge.tsx`
- `components/learner/StreakWidget.tsx`
- `components/learner/BadgeGallery.tsx`
- `components/learner/AchievementUnlockModal.tsx`
- `hooks/api/useGamification.ts`
- `contexts/GamificationContext.tsx`

---

## 5. Onboarding Tour

**Current state:** PARTIAL — Entry assessment gates new learners. After completing assessment, users land on dashboard with no guidance on what to do next.

**What to build:**
- 5-step tooltip tour triggered after first assessment completion
- Steps:
  1. "Voici vos cours recommandés" → highlights ActiveCoursesSection
  2. "Commencez votre premier lab" → highlights labs card
  3. "Votre Assistant IA est disponible partout" → highlights AI tutor button
  4. "Suivez votre progression ici" → highlights progress stats
  5. "Votre parcours de certification" → highlights certifications
- "Passer le tour" skip button on every step
- Tour state stored in `localStorage` (`subul_tour_completed`)
- Re-triggerable from profile settings ("Revoir la visite guidée")

**Implementation notes:**
- Build lightweight custom tooltip tour (no heavy library needed)
- Use `useEffect` + `getBoundingClientRect()` to position tooltips
- Overlay backdrop with spotlight cutout on target element
- Trigger: `useLearnerDashboard` result + `localStorage` flag

**Files to create:**
- `components/learner/OnboardingTour.tsx`
- `hooks/useOnboardingTour.ts`

**Files to modify:**
- `app/[locale]/dashboard/learner/page.tsx` — mount tour after assessment completion

---

## 6. Study Calendar

**Current state:** MISSING — `exp.weeklyPlanner` data already returned by `GET /api/learner/certifications/:id/experience` but never rendered as a calendar. Goals exist but no date-based scheduling UI.

**What to build:**
- Monthly/weekly calendar view on the dashboard or certification detail page
- Scheduled study sessions shown as colored blocks
- Upcoming deadlines and exam dates highlighted
- Click a day → "Add study session" quick action
- Sync with `studyPlanner.milestones` data already in the API

**Implementation notes:**
- Use `date-fns` (already likely in deps) for date calculations
- No heavy calendar library needed — build a simple month grid
- Data sources already available: `exp.weeklyPlanner`, `exp.studyPlanner.milestones`
- New endpoint needed: `POST /api/learner/study-sessions` for adding sessions

**Files to create:**
- `components/learner/StudyCalendar.tsx`
- `components/learner/StudyCalendarDay.tsx`

**Files to modify:**
- `app/[locale]/dashboard/learner/certifications/[id]/page.tsx` — embed calendar section

---

## 7. Lesson Q&A / Discussion Threads

**Current state:** MISSING — No social or peer features exist anywhere. AI tutor handles all questions but can't learn from peer answers.

**What to build:**
- Q&A tab on each course lesson (below the lesson content)
- Learners can post questions, upvote, and answer
- Instructor/admin can pin answers
- Simple threaded replies (2 levels max)
- Notification when someone answers your question

**Implementation notes:**
- New backend tables: `lesson_discussions` (`id`, `lessonId`, `userId`, `content`, `parentId`, `upvotes`, `isPinned`)
- New endpoints: `GET/POST /api/lessons/:id/discussions`
- Frontend: `useDiscussion(lessonId)` hook
- Markdown support for code snippets in answers
- Moderation: admin can delete/hide posts

**Files to create:**
- `components/learner/LessonDiscussion.tsx`
- `components/learner/DiscussionThread.tsx`
- `hooks/api/useDiscussion.ts`

**Files to modify:**
- `app/[locale]/dashboard/learner/cours/[courseId]/page.tsx` — add discussion section below lesson content

---

## 8. Learner Analytics Dashboard

**Current state:** PARTIAL — Basic progression page exists (`/dashboard/learner/progression`) with course completion list and stat cards. No deep insights.

**What to build:**

### 8a. Study Heatmap
- GitHub-style contribution calendar showing days studied
- Color intensity = study time that day
- Last 12 weeks visible

### 8b. Performance Trend Chart
- Line chart: quiz scores over time
- Shows improvement (or decline) per domain (Cloud / Cyber / AI)

### 8c. Time Breakdown
- Donut chart: time split across courses vs labs vs certifications
- "Most productive day of the week" insight

### 8d. Weak Areas Panel
- Auto-detected from quiz scores
- "You score 45% on Azure Networking — here's a targeted resource"

**Implementation notes:**
- Study heatmap: derive from `user_course_progress` activity timestamps (new `study_sessions` table recommended)
- Performance trend: from existing quiz/assessment results
- Charts: use `recharts` or `visx` (check existing deps first)
- Most data already available — mainly needs visualization layer

**Files to create:**
- `components/learner/StudyHeatmap.tsx`
- `components/learner/PerformanceTrendChart.tsx`
- `components/learner/TimeBreakdownChart.tsx`
- `components/learner/WeakAreasPanel.tsx`

**Files to modify:**
- `app/[locale]/dashboard/learner/progression/page.tsx` — replace current basic page with new analytics sections

---

## 9. PWA / Offline Support

**Current state:** MISSING — No `manifest.json`, no service worker, no offline caching. Pure web app only.

**What to build:**
- `public/manifest.json` — app name, icons, theme color, display mode
- Service worker via `next-pwa` or custom `sw.js`
- Cache strategy: lesson content (stale-while-revalidate), static assets (cache-first)
- "Install app" prompt on mobile
- Offline fallback page: shows last cached lesson with notice

**Implementation notes:**
- Add `next-pwa` package to `package.json`
- Configure in `next.config.ts`
- Cache API responses for: `GET /api/courses/:id`, `GET /api/learner/dashboard`
- Do NOT cache: auth endpoints, progress mutation endpoints
- Offline page: `app/offline/page.tsx`

**Files to create:**
- `public/manifest.json`
- `app/offline/page.tsx`

**Files to modify:**
- `next.config.ts` — add `next-pwa` config
- `app/[locale]/layout.tsx` — add manifest link + theme-color meta

---

## 10. Accessibility Hardening

**Current state:** PARTIAL — `ExamsWidget` has thorough ARIA. Most other learner widgets are bare. No skip links. No keyboard nav documentation.

**What to fix:**

### 10a. Skip-to-Content Link
- `<a href="#main-content">` visually hidden, shown on focus
- Required by WCAG 2.1 AA

### 10b. ARIA Roles on Learner Widgets
- `ActiveCoursesSection` — add `role="region"` + `aria-label`
- `GoalsOverviewSection` — ring SVG needs `role="img"` + `aria-label` with percentage
- `CourseSidebar` — lesson list needs `role="tree"` or `role="list"` + `aria-current="page"` on active lesson
- All modal dialogs — need `role="dialog"` + `aria-modal="true"` + focus trap

### 10c. Keyboard Navigation
- Course sidebar: arrow keys navigate between lessons
- Command palette: full keyboard nav already planned (item 1)
- All custom dropdowns: Escape closes, Tab moves focus out

### 10d. Color Contrast Audit
- Check all `text-slate-400` on white backgrounds (common WCAG fail)
- Ensure all interactive elements have `:focus-visible` ring

**Files to modify:**
- `components/learner/CourseSidebar.tsx`
- `components/learner/widgets/ActiveCoursesSection.tsx`
- `components/learner/widgets/GoalsOverviewSection.tsx`
- `app/[locale]/locale-layout-client.tsx` — skip link
- All modal components

---

## Notes

- **Phase 0 (Security):** Hardcoded Deepgram/Cartesia API keys still present in `cours/[courseId]/page.tsx` and `LabAssistant.tsx`. Should be moved to `.env` before any production deployment. See `CLAUDE.md` security section.
- Items 1–3 have no backend dependencies and can ship independently.
- Items 4 and 7 require new backend tables and endpoints.
- Item 9 (PWA) should be last — it wraps around everything else.

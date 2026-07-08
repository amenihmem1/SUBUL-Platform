# SUBUL Growth Recommendations and Product Roadmap

## Objective
Increase paid conversions, revenue expansion, and retention by improving funnel clarity, trust signals, monetization mechanics, and high-value product outcomes.

---

## Current Strengths

- Strong monetization base: pricing, checkout, trial, promo codes, quote requests, and entitlement checks.
- Rich core product value: courses, labs, certifications, CV booster, job assistant, referrals.
- Existing upgrade surfaces and institutional sales path already present in product architecture.

---

## Top Priority Problems to Solve

1. Pricing trust risk: public marketing prices can diverge from checkout/backend prices.
2. Funnel friction: onboarding and checkout have UX dead spots and inconsistent messaging.
3. Missing recurring lifecycle: limited dunning/retry/renewal behavior reduces long-term MRR.
4. Upgrade economics gap: no proration/credit logic for mid-cycle upgrades.
5. Outcome proof gap: certifications and career-value proof can be made more credible.

---

## North-Star Metrics

- Trial to paid conversion rate
- Checkout completion rate
- Paid upgrade rate (Standard to Premium)
- Month-2 paid retention
- Expansion revenue (upgrades/add-ons)
- Enterprise quote close rate

---

## 90-Day Execution Plan

## Days 1-30 (Conversion and Trust Foundation)

- Unify public pricing from backend-authoritative endpoints.
- Instrument analytics for full funnel (landing to paid).
- Remove checkout dead fields and align CTA copy.
- Improve landing trust blocks near primary CTA.
- Preserve plan/cycle context through all auth/payment redirects.

Expected KPI lift:
- +10-20% checkout start rate
- +5-12% checkout completion

## Days 31-60 (Revenue and Churn Controls)

- Implement renewal reminders and payment retry/dunning flow.
- Add proration credit for Standard to Premium upgrades.
- Add entitlement-triggered upsell prompts in locked moments.
- Add activation nudges during first 24h trial.

Expected KPI lift:
- -10-20% involuntary churn
- +8-15% upgrade conversion

## Days 61-90 (Retention and B2B Scale)

- Build verifiable certificate artifacts (PDF + verification URL + share).
- Add career outcomes widget (job matches, ATS score progress, cert milestones).
- Add quote lead scoring + SLA alerts + CRM sync.
- Introduce add-ons and in-product referral placements.

Expected KPI lift:
- +8-18% Month-2 retention
- +15-30% enterprise quote-to-close velocity

---

## Prioritized Backlog

## P0 (Ship First)

### P0.1 Pricing Source of Truth Unification
Goal:
Ensure no mismatch between landing and checkout prices.

Implementation:
- Replace static public pricing authority with backend response mapping for all paid plans and cycles.
- Keep static config only as display fallback if API unavailable, but never show conflicting values.

Primary files:
- `frontend/components/landing/PricingSection.tsx`
- `frontend/lib/config/public-pricing.ts`
- `frontend/app/[locale]/checkout/page.tsx`
- `backend/api/src/payments/payments.service.ts`

Acceptance criteria:
- Landing and checkout always display same amount/currency per region/cycle.
- Monitoring alert if pricing payload differs from expected config snapshot.

---

### P0.2 Funnel Analytics Instrumentation
Goal:
Measure exact conversion drop-off points.

Events to add:
- `landing_pricing_cta_click`
- `signup_started`
- `signup_completed`
- `checkout_viewed`
- `payment_initiated`
- `payment_failed`
- `payment_succeeded`
- `quote_submitted`

Primary files:
- `frontend/components/landing/PricingSection.tsx`
- `frontend/app/[locale]/auth/register/page.tsx`
- `frontend/app/[locale]/auth/login/page.tsx`
- `frontend/app/[locale]/checkout/page.tsx`
- `frontend/app/[locale]/payment/success/page.tsx`
- `frontend/app/[locale]/payment/cancel/page.tsx`

Acceptance criteria:
- Event dashboard by locale, plan, cycle, and payment provider.
- Weekly funnel report generated.

---

### P0.3 Checkout Friction Removal
Goal:
Eliminate trust-breaking and non-functional inputs.

Implementation:
- Remove or fully wire any inert form fields.
- Tighten copy and field hierarchy.
- Keep only high-intent required inputs.

Primary files:
- `frontend/app/[locale]/checkout/page.tsx`

Acceptance criteria:
- No dead inputs.
- Mobile checkout completion improves.

---

### P0.4 Intent Preservation Across Failure Paths
Goal:
Never lose selected plan/cycle after auth/payment interruption.

Implementation:
- Ensure cancel/fail/retry pages restore exact `plan`, `cycle`, and `mode`.
- Remove any hardcoded fallback to Standard monthly.

Primary files:
- `frontend/app/[locale]/payment/success/page.tsx`
- `frontend/app/[locale]/payment/cancel/page.tsx`
- `frontend/app/[locale]/payment/return/page.tsx`
- `frontend/lib/plan-intent.ts`

Acceptance criteria:
- Failed payment retry returns user to same purchase intent.

---

## P1 (Revenue Expansion and Churn Reduction)

### P1.1 Renewal and Dunning Lifecycle
Goal:
Reduce involuntary churn and increase recoveries.

Implementation:
- Pre-expiry reminders (7/3/1 days).
- Payment retry schedule for failed charges.
- Grace window messaging and one-click retry.

Primary files:
- `backend/api/src/subscriptions/subscriptions.service.ts`
- `backend/api/src/payments/webhooks.controller.ts`
- `backend/api/src/mail/mail.service.ts`
- `frontend/components/subscription/SubscriptionStatusBanner.tsx`

Acceptance criteria:
- Recovery rate metric for failed renewals.
- Reduced churn from payment failure.

---

### P1.2 Prorated Upgrades
Goal:
Increase Standard to Premium upgrades by reducing fairness objections.

Implementation:
- Compute remaining time value on current plan.
- Apply upgrade credit automatically at checkout.

Primary files:
- `backend/api/src/payments/payments.service.ts`
- `frontend/app/[locale]/checkout/page.tsx`

Acceptance criteria:
- Upgrade checkout displays transparent credit.
- Upgrade conversion rate uplift measured.

---

### P1.3 Entitlement-Based Upsell Triggers
Goal:
Show upgrade prompts at the exact moment of value friction.

Implementation:
- Trigger contextual CTA when user hits lock points in certifications, jobs, labs.
- Use outcome-based messaging, not only feature lists.

Primary files:
- `frontend/app/[locale]/dashboard/learner/certifications/page.tsx`
- `frontend/app/[locale]/dashboard/learner/emploi/page.tsx`
- `frontend/app/[locale]/dashboard/learner/labs/page.tsx`
- `frontend/components/subscription/SubscriptionGate.tsx`

Acceptance criteria:
- CTR and conversion tracking per trigger type.

---

### P1.4 Trial Activation Journeys
Goal:
Increase chance that free users hit first meaningful success quickly.

Implementation:
- Guided in-app milestones for first 24h.
- Suggest next best action based on completed task.

Primary files:
- `frontend/components/subscription/TrialStatusCard.tsx`
- `frontend/components/learner/widgets/LearnerDashboardContainer.tsx`

Acceptance criteria:
- More trial users complete at least one high-value action.

---

## P2 (Retention and B2B Scale)

### P2.1 Verifiable Certificates
Goal:
Make certification value externally credible and shareable.

Implementation:
- Signed PDF certificate generation.
- Public verification URL with certificate ID.
- LinkedIn sharing CTA.

Primary files:
- `frontend/app/[locale]/dashboard/learner/certifications/page.tsx`
- `frontend/components/learner/widgets/CertificatesSection.tsx`
- `backend/api` certification modules (create verification endpoint and artifact generation service)

Acceptance criteria:
- Each certificate has unique verification page.

---

### P2.2 Career Outcomes Widget
Goal:
Show ROI progression to improve retention and upsell intent.

Implementation:
- Track and display ATS score improvements, job match quality, cert progress.

Primary files:
- `frontend/components/learner/widgets/LearnerDashboardContainer.tsx`
- `frontend/app/[locale]/dashboard/learner/emploi/page.tsx`
- `backend/api/src/learner-emploi/learner-emploi.service.ts`

Acceptance criteria:
- Outcome panel visible and data-backed.

---

### P2.3 Enterprise Quote Optimization
Goal:
Increase quote conversion speed and quality.

Implementation:
- Lead scoring model (domain, seats, urgency).
- SLA timers and escalation rules.
- CRM sync for quote lifecycle.

Primary files:
- `backend/api/src/quote-requests/*`
- `frontend/app/[locale]/dashboard/admin/devis/page.tsx`
- `frontend/components/landing/QuoteRequestModal.tsx`

Acceptance criteria:
- Time-to-first-response and close rate dashboards.

---

### P2.4 Add-On Packaging
Goal:
Increase ARPU through modular premium upsells.

Examples:
- Certification Fast-Track pack
- Coaching sessions
- Team analytics add-on

Primary files:
- `backend/api/src/payments/*`
- `frontend/app/[locale]/checkout/page.tsx`
- pricing config modules

Acceptance criteria:
- Add-on attach rate and expansion revenue tracked.

---

## Product Experience Recommendations

- Keep pricing language outcome-driven:
  - Standard: competence growth + job readiness
  - Premium: certification outcomes + career acceleration
  - Enterprise/University: deployment and governance at scale
- Keep institutional offers visible but secondary to core conversion path.
- Place trust evidence close to CTA:
  - partner certifications
  - secure payment assurance
  - support response expectations

---

## Technical Quality Recommendations

- Consolidate duplicate/variant file paths and ensure canonical imports only.
- Add conversion smoke tests for:
  - signup -> verify -> checkout
  - checkout payment success/failure recovery
  - quote request submission
- Add automated checks to detect pricing mismatches between landing and checkout payloads.

---

## KPI Targets (Suggested)

- Trial to paid: +20% within 90 days
- Checkout completion: +12%
- Standard to Premium upgrade rate: +15%
- Failed payment recovery: +25%
- Month-2 paid retention: +10%
- Quote close rate: +20%

---

## Recommended Working Model

- Weekly growth standup:
  - review funnel dashboard and churn events
  - ship one conversion experiment per week
  - keep experiment log with result and decision
- Monthly monetization review:
  - plan performance by region
  - promo effectiveness and margin impact
  - upgrade and churn cohort behavior

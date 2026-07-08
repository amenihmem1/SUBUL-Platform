# Commercial & Promo Code System — Complete Guide

## Overview

The Commercial system allows businesses to recruit "commercials" (sales affiliates) who promote the platform using unique promo codes. Each commercial earns points/commission from purchases made with their code.

**1 point = 0.01 EUR** (1 cent of commission earned).

---

## Table of Contents

1. [Complete Workflow Diagram](#complete-workflow-diagram)
2. [How to Create a Commercial Account](#1-how-to-create-a-commercial-account)
3. [How to Create Promo Codes](#2-how-to-create-promo-codes)
4. [How Commercials Track Their Performance](#3-how-commercials-track-their-performance)
5. [How Admin Tracks Everything](#4-how-admin-tracks-everything)
6. [Points System](#5-points-system)
7. [Payout Flow](#6-payout-flow)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Frontend Navigation Map](#frontend-navigation-map)

---

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        1. ADMIN CREATES COMMERCIAL                   │
│  Admin → /dashboard/admin/commercials → "New Commercial"            │
│  - Sets email, password, full name                                   │
│  - Sets commission type (percentage or fixed)                        │
│  - Sets commission value (e.g., 10% or 5 EUR)                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        2. ADMIN CREATES PROMO CODES                 │
│  Admin → /dashboard/admin/promo-codes → "Create"                    │
│  - Sets code value (e.g., "AHMED2025")                               │
│  - Sets discount type & value (e.g., 15% off)                       │
│  - Assigns to commercial via dropdown                                │
│  - Sets optional: max uses, per-user limit, start/end dates         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   3. COMMERCIAL SHARES PROMO CODE                   │
│  Commercial logs in → /dashboard/commercial                         │
│  - Sees their unique promo code(s)                                   │
│  - Copies code or shares via WhatsApp/Email                          │
│  - Gives code to potential customers                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   4. CUSTOMER USES PROMO CODE AT CHECKOUT           │
│  User selects subscription plan → enters promo code                 │
│  - System validates code (active, not expired, applicable to plan)  │
│  - Discount applied to checkout amount                               │
│  - Payment processed with discount                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   5. AUTOMATIC RECORDING + POINTS EARNING           │
│  Payment success → system records:                                   │
│  - PromoCodeRedemption entry (who, when, how much discount)          │
│  - Commission calculation (based on commercial's commission type)   │
│  - PointsLedger entry: +{commissionAmountCents} points earned       │
│  - Commercial's pointsBalance updated                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   6. COMMERCIAL TRACKS PERFORMANCE                  │
│  Commercial dashboard:                                               │
│  - /dashboard/commercial → Overview (balance, referrals, top codes)  │
│  - /dashboard/commercial/codes → All promo codes with stats         │
│  - /dashboard/commercial/referrals → Users who used their codes     │
│  - /dashboard/commercial/points → Points wallet with ledger         │
│  - /dashboard/commercial/commission → Payout history                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   7. ADMIN PROCESSES PAYOUT                         │
│  Admin → /dashboard/admin/commercials → Select commercial → Payouts │
│  - Creates payout record (amount, currency, notes)                   │
│  - Points deducted from commercial's wallet                          │
│  - Marks payout as "pending" → later "paid"                         │
│  Commercial sees payout in their commission page                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. How to Create a Commercial Account

### Via Admin Dashboard

1. Go to **`/dashboard/admin/commercials`**
2. Click **"New Commercial"** button
3. Fill in the form:

| Field | Description | Example |
|-------|-------------|---------|
| **Email** | Commercial's login email | `ahmed@partner.com` |
| **Password** | Initial password (min 8 chars) | `SecurePass123` |
| **Full Name** | Display name | `Ahmed Ben Ali` |
| **Commission Type** | How they earn | `Percentage` or `Fixed` |
| **Commission Value** | Amount based on type | `10` (for 10%) or `5` (for 5 EUR per sale) |
| **Preferred Currency** | Currency for payouts | `EUR`, `USD`, or `TND` |
| **Notes** | Internal notes (optional) | `Top performer in Tunisia region` |

4. Click **"Create"** → Commercial account is created with `role: 'commercial'`

### What Happens Behind the Scenes

- A new `User` is created with `role = 'commercial'` and `status = 'active'`
- A `CommercialProfile` is linked to the user with commission settings
- The commercial can immediately log in at `/dashboard/commercial`

### Via API

```bash
POST /api/admin/commercials
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "ahmed@partner.com",
  "password": "SecurePass123",
  "fullName": "Ahmed Ben Ali",
  "commissionType": "percentage",
  "commissionValue": 10,
  "preferredCurrency": "EUR",
  "notes": "Regional partner"
}
```

---

## 2. How to Create Promo Codes

### Via Admin Dashboard

1. Go to **`/dashboard/admin/promo-codes`**
2. Click **"Create Promo Code"**
3. Fill in the form:

| Field | Description | Example |
|-------|-------------|---------|
| **Code** | The promo code value (auto-uppercased) | `AHMED2025` |
| **Discount Type** | How much discount | `Percentage` or `Fixed` |
| **Discount Value** | Amount | `15` (for 15% off) |
| **Applicable Plans** | Which plans this code works on | `pro-monthly`, `pro-yearly` |
| **Max Uses** | Total times code can be used (optional) | `100` |
| **Per-User Limit** | Max uses per individual user (optional) | `1` |
| **Start Date** | When code becomes active (optional) | `2025-01-01` |
| **End Date** | When code expires (optional) | `2025-12-31` |
| **Currency Scope** | Which currency this code applies to | `EUR` |
| **Assign to Commercial** | ⭐ Link to a commercial | Select from dropdown |
| **Active** | Toggle on/off | `✓ Active` |

4. Click **"Create"** → Promo code is ready to use

### Key Rules

- Codes are **case-insensitive** (stored uppercase, validated case-insensitive)
- A code **must be assigned to a commercial** for commission/points to be earned
- If a commercial is **deactivated**, their codes still exist but commission won't be calculated
- **Anti-fraud**: Each payment transaction can only use one code once (duplicate redemptions blocked)

### Via API

```bash
POST /api/admin/promo-codes
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "code": "AHMED2025",
  "discountType": "percentage",
  "discountValue": 15,
  "applicablePlans": ["pro-monthly", "pro-yearly"],
  "maxUses": 100,
  "perUserLimit": 1,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "currencyScope": "EUR",
  "commercialId": "<commercial_profile_uuid>",
  "active": true
}
```

---

## 3. How Commercials Track Their Performance

When a commercial logs in, they access **`/dashboard/commercial`** with these pages:

### 📊 Dashboard (Overview Page)
**URL:** `/dashboard/commercial`

Shows:
- **Available Balance** — Total commission available for payout (in EUR cents)
- **Total Earned** — All-time commission earned
- **Total Paid Out** — Amount already withdrawn
- **Stat Cards:**
  - Total Referrals (users who used their code)
  - Successful Conversions
  - Conversion Rate
- **Code Share Widget** — Copy their promo code, share via WhatsApp/Email
- **Recent Referrals Table** — Last 5 users who used their code

### 🎫 Promo Codes
**URL:** `/dashboard/commercial/codes`

Lists all promo codes assigned to them:
- Code value (displayed in monospace font)
- Discount percentage or fixed amount
- Usage count / max uses (with progress bar)
- Revenue generated by this code
- Commission earned from this code
- Status badge (Active/Inactive)

### 👥 Referrals
**URL:** `/dashboard/commercial/referrals`

Table of all users who redeemed their promo codes:
- Promo code used
- User email (masked for privacy, e.g., `ah***@gm***.com`)
- Discount applied
- Final amount paid
- Commission earned
- Payment status (paid/pending)
- Earning status (validated/pending/cancelled)
- Date of purchase
- **Filterable** by earning status

### 💰 Points Wallet
**URL:** `/dashboard/commercial/points`

**This is the new points system.** Shows:
- **Balance Hero** — Large gradient card showing available points (e.g., `+2,450 pts`)
  - 1 point = 0.01 EUR
- **Stats Grid:**
  - Total Earned (from redemptions)
  - Total Spent (on payouts)
  - Adjusted (admin corrections)
  - Current Balance
- **Points Ledger** — Full transaction history:
  - Type icon (Earn 📈 / Spent 📉 / Adjusted 🔄 / Refunded ↗)
  - Points change (+/-)
  - Balance after transaction
  - Source description
  - EUR equivalent
  - Date
- **Filter tabs:** All / Earned / Spent / Adjusted / Refunded
- **Pagination** for large histories
- **Info banner** explaining how points work

### 💳 Commission (Payouts)
**URL:** `/dashboard/commercial/commission`

Shows:
- **Balance Breakdown** — Stacked bar chart of earned vs paid out
- **Stats Grid:**
  - Available for withdrawal
  - Total earned
  - Total paid out
  - Pending amount
- **Payout History Table:**
  - Amount
  - Currency
  - Status (pending/paid/cancelled)
  - Points deducted
  - Paid date
  - Notes
- Message: "Payouts are processed manually by the admin team."

---

## 4. How Admin Tracks Everything

### 📋 Commercials List
**URL:** `/dashboard/admin/commercials`

Shows:
- **Overview Cards:**
  - Total Commercials
  - Active Commercials
  - Total Referrals (across all commercials)
  - Total Revenue Generated
  - Total Commission Owed
  - Total Commission Paid
- **Top Performers Sidebar** — Top 5 commercials ranked by commission earned
- **Commercials Table:**
  - Full Name
  - Email
  - Commission (type + value)
  - Status badge (active/inactive)
  - Referrals count
  - Revenue generated
  - Commission earned
  - **Actions:** View detail, Deactivate

### 🔍 Commercial Detail Page (Tabs)
**URL:** `/dashboard/admin/commercials/:id`

#### Overview Tab
- Commercial info (name, email, status)
- Commission settings (editable inline)
- **Stat Cards:**
  - Total Referrals
  - Revenue Generated
  - Total Commission
  - Available Payout
- Commercial details table (name, email, commission, member since, notes)

#### Codes Tab
- Table of all promo codes assigned to this commercial:
  - Code, Discount, Uses, Revenue, Commission, Status

#### Referrals Tab
- Table of all users who used this commercial's codes:
  - Code, User, Discount, Revenue, Commission, Paid?, Status, Date

#### Payouts Tab
- **Create Payout Form:**
  - Amount (in cents, e.g., 5000 = 50.00 EUR)
  - Currency selector (EUR/USD/TND)
  - Notes (optional)
  - "Create Payout" button
- **Payout History Table:**
  - Amount, Currency, Status, Paid At, Notes
  - "Mark Paid" action button for pending payouts

### 🎫 Promo Codes Management
**URL:** `/dashboard/admin/promo-codes`

- Table of ALL promo codes across ALL commercials
- Filter by status: All / Active / Expired
- Columns: Code, Discount, Uses, Commercial, Status, Actions
- Actions: Edit, Delete, Enable/Disable toggle

---

## 5. Points System

### What Are Points?

Points are a **virtual wallet** for commercials. They represent commission earned from promo code redemptions.

**Core rule: 1 point = 0.01 EUR (1 cent)**

### How Points Are Earned

```
Customer buys "Pro Monthly" plan for 100.00 EUR
  → Enters promo code "AHMED2025" (15% discount = 15.00 EUR off)
  → Pays 85.00 EUR
  → Commercial has 10% commission rate
  → Commission = 85.00 × 10% = 8.50 EUR = 850 cents
  → Commercial earns +850 points
```

**Automatic process:**
1. Payment succeeds → `PaymentsService` calls `PromoCodesService.recordRedemption()`
2. Commission is calculated based on commercial's settings
3. `PromoCodesService` calls `PointsService.earnPoints(commercialId, commissionCents)`
4. A `PointsLedger` entry is created:
   - `pointsChange: +850`
   - `balanceAfter: previousBalance + 850`
   - `type: 'earn'`
   - `source: 'redemption'`
   - `sourceId: <redemption_uuid>`
5. Commercial's `pointsBalance` is updated in the database

### How Points Are Spent

When an admin creates a payout:
1. Admin enters amount (e.g., 50.00 EUR = 5000 cents)
2. `CommercialService.createPayout()` calls `PointsService.spendPoints(commercialId, 5000)`
3. If commercial has enough points:
   - `PointsLedger` entry created:
     - `pointsChange: -5000`
     - `balanceAfter: previousBalance - 5000`
     - `type: 'spend'`
     - `source: 'payout'`
   - Commercial's `pointsBalance` decremented
4. If insufficient points, payout is still created but points deduction is skipped (warning logged)

### Admin Point Adjustments

Admins can manually adjust a commercial's points balance:

```bash
POST /api/admin/commercials/:id/points/adjust
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "pointsChange": -200,
  "description": "Refund for cancelled order #12345"
}
```

This creates a ledger entry with `type: 'adjust'` and `source: 'admin_adjust'`.

### Points Ledger Entry Types

| Type | Direction | Source | Description |
|------|-----------|--------|-------------|
| `earn` | + Points | `redemption` | Commission from a promo code use |
| `spend` | - Points | `payout` | Points deducted when payout is made |
| `adjust` | +/- Points | `admin_adjust` | Manual admin correction |
| `refund` | - Points | `refund` | Commission reversed for cancelled order |
| `expire` | - Points | N/A | Future: points expiration (not yet implemented) |

---

## 6. Payout Flow

### Step-by-Step

1. **Commercial earns points** automatically from redemptions (see Points System above)

2. **Admin reviews** the commercial's available balance:
   - Via detail page → Payouts tab
   - Or via `/api/admin/commercials/:id/points/stats`

3. **Admin creates payout:**
   ```bash
   POST /api/admin/commercials/:id/payouts
   {
     "amountCents": 5000,
     "currency": "EUR",
     "notes": "Monthly payout - March 2025"
   }
   ```

4. **System processes:**
   - Validates amount ≤ available balance
   - Deducts points from commercial's wallet
   - Creates `CommissionPayout` record with `status: 'pending'`
   - Records `pointsDeducted` on the payout

5. **Admin marks payout as paid** (after sending money):
   ```bash
   PATCH /api/admin/commercials/:id/payouts/:payoutId/mark-paid
   ```
   - Status changes to `'paid'`
   - `paidAt` timestamp is set

6. **Commercial sees** the payout in their `/dashboard/commercial/commission` page

### Payout Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Created, points deducted, money not yet sent |
| `paid` | Money sent to commercial |
| `cancelled` | Payout voided (points NOT refunded — separate adjustment needed) |

---

## API Endpoints Reference

### Commercial (Self-Service)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/commercial/me` | commercial/admin | Get my profile + balance |
| GET | `/api/commercial/stats` | commercial/admin | Get my stats (referrals, conversions, revenue) |
| GET | `/api/commercial/codes` | commercial/admin | Get my promo codes with stats |
| GET | `/api/commercial/referrals?page=1&limit=20&status=` | commercial/admin | Get my referrals (paginated, filterable) |
| GET | `/api/commercial/payouts` | commercial/admin | Get my payout history |
| GET | `/api/commercial/points/balance` | commercial/admin | Get current points balance |
| GET | `/api/commercial/points/stats` | commercial/admin | Get points statistics |
| GET | `/api/commercial/points/ledger?page=1&limit=20&type=` | commercial/admin | Get points transaction history |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/commercials/overview` | admin | Get all-commercials overview |
| GET | `/api/admin/commercials?page=1&limit=20` | admin | List all commercials (paginated) |
| GET | `/api/admin/commercials/:id` | admin | Get single commercial detail |
| GET | `/api/admin/commercials/:id/stats` | admin | Get commercial stats |
| GET | `/api/admin/commercials/:id/codes` | admin | Get commercial's promo codes |
| GET | `/api/admin/commercials/:id/referrals?page=1&limit=20` | admin | Get commercial's referrals |
| GET | `/api/admin/commercials/:id/payouts` | admin | Get commercial's payouts |
| POST | `/api/admin/commercials` | admin | Create new commercial |
| PATCH | `/api/admin/commercials/:id` | admin | Update commercial settings |
| DELETE | `/api/admin/commercials/:id` | admin | Deactivate commercial |
| POST | `/api/admin/commercials/:id/payouts` | admin | Create payout for commercial |
| PATCH | `/api/admin/commercials/:id/payouts/:payoutId/mark-paid` | admin | Mark payout as paid |
| PATCH | `/api/admin/commercials/:id/payouts/:payoutId/cancel` | admin | Cancel a payout |
| GET | `/api/admin/commercials/points/balances` | admin | All commercials' point balances |
| GET | `/api/admin/commercials/:id/points/ledger` | admin | Per-commercial points ledger |
| GET | `/api/admin/commercials/:id/points/stats` | admin | Per-commercial points stats |
| POST | `/api/admin/commercials/:id/points/adjust` | admin | Manually adjust points |

### Promo Codes (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/promo-codes?page=1&limit=20` | admin | List all promo codes |
| GET | `/api/admin/promo-codes/:id` | admin | Get single promo code |
| POST | `/api/admin/promo-codes` | admin | Create new promo code |
| PATCH | `/api/admin/promo-codes/:id` | admin | Update promo code |
| DELETE | `/api/admin/promo-codes/:id` | admin | Delete promo code |

### Promo Codes (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/promo-codes/validate` | user (optional) | Validate a promo code at checkout |
| POST | `/api/promo-codes/validate/guest` | none | Validate a promo code for guest checkout |

---

## Frontend Navigation Map

### Admin Navigation
```
Dashboard
├── Commercials ...................... /dashboard/admin/commercials
│   ├── List (overview + table) ...... /dashboard/admin/commercials
│   ├── Create New ................... /dashboard/admin/commercials/new
│   └── Detail (tabs) ................ /dashboard/admin/commercials/:id
│       ├── Overview
│       ├── Codes
│       ├── Referrals
│       └── Payouts
└── Promo Codes ...................... /dashboard/admin/promo-codes
    ├── List ......................... /dashboard/admin/promo-codes
    ├── Create ....................... /dashboard/admin/promo-codes/create
    └── Edit ......................... /dashboard/admin/promo-codes/:id/edit
```

### Commercial Navigation
```
Dashboard
├── Overview ......................... /dashboard/commercial
├── Promo Codes ...................... /dashboard/commercial/codes
├── Referrals ........................ /dashboard/commercial/referrals
├── Commission ....................... /dashboard/commercial/commission
└── Points Wallet .................... /dashboard/commercial/points
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (commercials have `role = 'commercial'`) |
| `commercial_profiles` | Commission settings, `points_balance`, currency preference |
| `promo_codes` | Promo code definitions with `commercial_id` foreign key |
| `promo_code_redemptions` | Each usage of a promo code, tracks discount + commission |
| `commission_payouts` | Payout records (amount, status, `points_deducted`) |
| `commercial_points_ledger` | Append-only points transaction log |

### Key Relationships

```
users (role='commercial')
  └── 1:1 ── commercial_profiles
                ├── 1:N ── promo_codes
                │             └── 1:N ── promo_code_redemptions
                ├── 1:N ── commission_payouts
                └── 1:N ── commercial_points_ledger
```

---

## Security & Anti-Fraud

1. **Single-use per transaction:** Each `payment_transaction_id` can only be redeemed once
2. **Usage limits:** Max total uses + per-user limits enforced at redemption time
3. **Pessimistic locking:** Promo code `usedCount` is updated with `SELECT FOR UPDATE` to prevent race conditions
4. **Email masking:** Commercials see masked emails (`ah***@gm***.com`) for privacy
5. **Earn timing:** Points are earned in a separate transaction from redemption — failure to award points doesn't block the sale
6. **Balance validation:** Payout creation checks available balance before proceeding
7. **Append-only ledger:** Points can never be silently removed — all changes are recorded in the ledger with type/source/description

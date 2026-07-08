# GitHub Secrets for Subul Platform

This document lists GitHub Actions secrets used for deployment and CI. **Do not commit real credentials** to the repository.

## How to Use

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the **secret name** (exactly as listed below) and the corresponding **value**
5. Click **Add secret**

## Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SMTP_HOST` | Amazon SES SMTP endpoint | `email-smtp.eu-central-1.amazonaws.com` |
| `SMTP_PORT` | SMTP port (587 STARTTLS or 465 TLS wrapper) | `587` |
| `SMTP_SECURE` | `false` for 587 (STARTTLS), `true` for 465 | `false` |
| `SMTP_USER` | SES SMTP username (IAM-derived) | `AKIA...` |
| `SMTP_PASS` | SES SMTP password | *(from SES SMTP credentials in IAM)* |
| `MAIL_FROM` | Verified sender address in SES | `subul@yourdomain.com` |
| `MAIL_FROM_NAME` | Display name in inbox | `Subul Platform` |
| `FRONTEND_URL` | Base URL for email links (no trailing slash) | `https://app.example.com` |
| `BACKEND_URL` | Production API base URL | `https://app.example.com` |
| `NEXT_PUBLIC_API_URL` | API URL for browser (often same as `BACKEND_URL`) | `https://app.example.com` |
| `JWT_SECRET` | JWT signing secret (min 16 chars, random) | *(strong random)* |
| `SESSION_SECRET` | Session cookie signing secret | *(strong random)* |
| `DB_HOST` | Database hostname | *(your host)* |
| `DB_PORT` | Database port | `5432` |
| `DB_USERNAME` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | *(secret)* |
| `DB_NAME` | Database name | `shared_db` |

## Notes

- `BACKEND_URL` is passed to the frontend build as `NEXT_PUBLIC_BACKEND_URL` where applicable. Use your production host, not `localhost`.
- **Transactional email** uses Amazon SES SMTP from `MailService` (nodemailer), not Microsoft Graph.
- For local development, copy `backend/api/.env.example` to `.env` and set `SMTP_USER` / `SMTP_PASS` from SES.

## Example `.env` (local only — do not commit)

```
SMTP_HOST=email-smtp.eu-central-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIA...
SMTP_PASS=...
MAIL_FROM=subul@yourdomain.com
MAIL_FROM_NAME=Subul Platform
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
JWT_SECRET=dev-only-change-in-production-min-16-chars
SESSION_SECRET=subul-dev-session-secret-change-in-production
DB_HOST=localhost
DB_PORT=5434
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=shared_db
NODE_ENV=development
```

Replace placeholder values with your own. Rotate any secret that was ever committed or pasted into a ticket.

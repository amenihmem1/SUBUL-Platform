# Email Deliverability Configuration Guide

> **2026 update:** The API sends transactional mail through **Amazon SES SMTP** (`MailService` + nodemailer). Use SES’s documented SPF/DKIM setup for your sending domain (and include `include:amazonses.com` in SPF if SES sends for that domain). The sections below that reference **Microsoft Graph / Outlook** are kept as background for domains that still use M365 for other mail.

This guide covers the DNS records and configuration needed to ensure verification emails from Subul Platform land in the **inbox**, not spam/junk.

## Why Emails Go to Spam

Without proper DNS configuration, inbox providers cannot verify that the email truly came from your domain, so they mark it as suspicious. For SES, enable Easy DKIM (or BYO DKIM) and align SPF with the addresses SES uses to send for your domain.

---

## 1. SPF (Sender Policy Framework)

**Purpose:** Declares which mail servers are authorized to send email on behalf of your domain.

### DNS Record to Add

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| TXT | `@` (or your domain) | `v=spf1 include:spf.protection.outlook.com -all` | 3600 |

### What This Does
- `include:spf.protection.outlook.com` — Authorizes Microsoft 365 mail servers to send email for your domain
- `-all` — **Hard fail**: reject any email claiming to be from your domain that doesn't pass SPF

### If You Use Multiple Email Providers

If you also send emails through other services (e.g., SendGrid, AWS SES), add them:

```
v=spf1 include:spf.protection.outlook.com include:sendgrid.net ~all
```

Use `~all` (soft fail) during testing, then switch to `-all` (hard fail) once confirmed working.

### Verify Your SPF

```bash
nslookup -type=txt yourdomain.com
# or
dig yourdomain.com TXT
```

Expected output should include your SPF record.

---

## 2. DKIM (DomainKeys Identified Mail)

**Purpose:** Cryptographically signs outgoing emails so recipients can verify they weren't tampered with.

### Setup via Microsoft 365 Admin Center

1. Go to **Microsoft 365 Defender Portal**: https://security.microsoft.com
2. Navigate to **Email & collaboration → Policies & rules → Threat policies → DKIM**
3. Select your domain and click **Sign messages for this domain with DKIM signatures**
4. Microsoft will generate two CNAME records

### DNS Records to Add (Microsoft 365 DKIM)

Microsoft provides two CNAME records. They look like this:

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| CNAME | `selector1._domainkey` | `selector1-yourdomain-com._domainkey.yourdomain.onmicrosoft.com` | 3600 |
| CNAME | `selector2._domainkey` | `selector2-yourdomain-com._domainkey.yourdomain.onmicrosoft.com` | 3600 |

Replace `yourdomain` with your actual domain name.

### Verify DKIM

Send a test email to a Gmail account, then view the email headers. Look for:
```
DKIM-Signature: v=1; a=rsa-sha256; d=yourdomain.com; ...
```

Or use an online DKIM checker.

---

## 3. DMARC (Domain-based Message Authentication, Reporting & Conformance)

**Purpose:** Tells receiving servers what to do when an email fails SPF or DKIM, and provides reports about email authentication.

### DNS Record to Add

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| TXT | `_dmarc` | See below | 3600 |

### Start with Monitoring Mode (Recommended)

```
v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com; ruf=mailto:dmarc-forensics@yourdomain.com; pct=100
```

- `p=none` — Monitor only, don't reject failing emails
- `rua` — Where to send aggregate reports
- `ruf` — Where to send forensic/failure reports
- `pct=100` — Apply to 100% of emails

### After 2-4 Weeks of Monitoring

Once you confirm all legitimate emails pass SPF/DKIM, move to enforcement:

**Quarantine mode:**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com; pct=100
```

**Reject mode (best for production):**
```
v=DMARC1; p=reject; rua=mailto:dmarc-reports@yourdomain.com; pct=100
```

### Verify DMARC

```bash
nslookup -type=txt _dmarc.yourdomain.com
```

---

## 4. Microsoft 365 Sender Configuration

### 4.1 Use a Dedicated Transactional Sender

**Do NOT** use a shared mailbox or personal mailbox for transactional emails. Instead:

1. Create a dedicated mailbox in Microsoft 365: `noreply@yourdomain.com` or `auth@yourdomain.com`
2. Set `AZURE_SENDER_EMAIL` to this address
3. Set `SMTP_FROM_NAME` to `"Subul"` (short, recognizable brand name)

### 4.2 Configure a Custom Domain in Microsoft 365

If your Microsoft 365 tenant uses `yourdomain.onmicrosoft.com`, you **must** add and verify your custom domain:

1. Go to **Microsoft 365 Admin Center** → **Settings** → **Domains**
2. Add your domain (e.g., `subul.com`)
3. Add the verification TXT record Microsoft provides
4. Update DNS records (MX, SPF, DKIM) as instructed

### 4.3 Set the Reply-To Address

The code already sets `replyTo` to the sender email. Ensure this is a **monitored** address or a valid no-reply address.

---

## 5. Domain Alignment

**Critical:** The domain in the `From:` address must match the domain in your SPF and DKIM records.

| Component | Must Match |
|-----------|-----------|
| From: address domain | `yourdomain.com` |
| SPF record domain | `yourdomain.com` |
| DKIM signing domain | `yourdomain.com` |
| DMARC policy domain | `_dmarc.yourdomain.com` |

If `AZURE_SENDER_EMAIL` is `noreply@subul.com`, then all DNS records above must be configured for `subul.com`.

---

## 6. Production Checklist

### DNS Records Summary

| Record Type | Host | Value Example | Required? |
|-------------|------|--------------|-----------|
| SPF (TXT) | `@` | `v=spf1 include:spf.protection.outlook.com -all` | **Yes** |
| DKIM CNAME 1 | `selector1._domainkey` | `selector1-...onmicrosoft.com` | **Yes** |
| DKIM CNAME 2 | `selector2._domainkey` | `selector2-...onmicrosoft.com` | **Yes** |
| DMARC (TXT) | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@...` | **Yes** |
| MX | `@` | `yourdomain-com.mail.protection.outlook.com` | If receiving mail |

### Microsoft 365 Checklist

- [ ] Custom domain verified in Microsoft 365 admin center
- [ ] DKIM signing enabled for the domain (via security.microsoft.com)
- [ ] `AZURE_SENDER_EMAIL` uses your custom domain (not onmicrosoft.com)
- [ ] `SMTP_FROM_NAME` is a short, recognizable name (e.g., "Subul")
- [ ] Application has `Mail.Send` permission in Azure AD

### Application Checklist

- [ ] SPF record published and validated
- [ ] DKIM CNAME records published and validated
- [ ] DMARC record published (start with `p=none`, move to `p=quarantine`)
- [ ] Email subject lines are clean (no emoji, no ALL CAPS)
- [ ] Email has HTML + plain-text fallback
- [ ] Unsubscribe or contact info in footer
- [ ] No spam-trigger words in subject ("FREE", "ACT NOW", "URGENT", etc.)

---

## 7. Testing Your Setup

### Online Tools

1. **MX Toolbox**: https://mxtoolbox.com/
   - Check SPF: `spf:yourdomain.com`
   - Check DKIM: `dkim:selector._domainkey.yourdomain.com`
   - Check DMARC: `dmarc:yourdomain.com`

2. **Mail-Tester**: https://www.mail-tester.com/
   - Send a test email to the provided address
   - Get a spam score and detailed analysis

3. **Google Admin Toolbox CheckMyEmail**: https://toolbox.googleapps.com/apps/checkmx/
   - Verifies SPF, DKIM, DMARC for Gmail delivery

### Manual Test

1. Send a verification email from your app
2. Check the received email headers:
   - Gmail: Click **Show original** (three dots menu)
   - Look for:
     ```
     SPF: PASS
     DKIM: PASS
     DMARC: PASS
     ```
3. Check that it landed in the **Primary** tab (not Promotions or Spam)

---

## 8. Common Issues & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| Emails go to Spam | No SPF record | Add SPF TXT record |
| Emails go to Spam | No DKIM | Enable DKIM in M365, add CNAME records |
| Emails go to Spam | No DMARC | Add DMARC TXT record |
| SPF FAIL | Sender domain ≠ DNS domain | Ensure `AZURE_SENDER_EMAIL` uses your custom domain |
| DKIM FAIL | DKIM not enabled in M365 | Enable via security.microsoft.com |
| DMARC FAIL | SPF or DKIM failing | Fix underlying SPF/DKIM issue |
| Low deliverability | New domain warming up | Send gradually over 2-4 weeks |
| Low deliverability | Spam-like content | Remove emoji from subject, avoid ALL CAPS |

---

## 9. Long-Term Recommendations

### 9.1 Consider a Dedicated Transactional Email Service

Microsoft Graph API is fine for low-volume transactional email, but for production scale, consider:

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **SendGrid** | 100 emails/day | Reliable delivery, analytics |
| **AWS SES** | 62,000/month (from EC2) | Cost-effective at scale |
| **Postmark** | 100 emails/month (test) | Best-in-class deliverability |
| **Resend** | 3,000 emails/month | Developer-friendly API |

These services provide:
- Built-in SPF/DKIM/DMARC (you just add DNS records)
- Delivery analytics and bounce handling
- Automatic retry and queue management
- Dedicated IP addresses (paid plans)

### 9.2 Use a Subdomain for Transactional Email

Instead of sending from `noreply@subul.com`, use:

```
From: noreply@mail.subul.com
```

Then configure SPF/DKIM/DMARC specifically for `mail.subul.com`. This isolates your transactional email reputation from your main domain.

### 9.3 Warm Up New Domains

If your domain is new, gradually increase email volume over 2-4 weeks:
- Week 1: 50 emails/day
- Week 2: 200 emails/day
- Week 3: 500 emails/day
- Week 4+: Normal volume

This builds a positive sender reputation with Gmail, Yahoo, and Outlook.

---

## 10. Environment Variables Reference

Ensure these are set correctly in production:

```env
# Microsoft Graph API email sending
AZURE_TENANT_ID_MAIL=your-azure-tenant-id
AZURE_CLIENT_ID_MAIL=your-app-client-id
AZURE_CLIENT_SECRET_MAIL=your-app-client-secret
AZURE_SENDER_EMAIL=noreply@yourdomain.com     # Must use your custom domain
SMTP_FROM_NAME=Subul                           # Short, recognizable name
EMAIL_VERIFICATION_LOCALE=en                   # Default locale for emails

# Frontend URL (used in verification links)
FRONTEND_URL=https://app.yourdomain.com        # Production URL, no trailing slash
BACKEND_URL=https://api.yourdomain.com         # Production API URL
```

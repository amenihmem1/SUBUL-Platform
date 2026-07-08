#!/usr/bin/env python3
"""
Simple SMTP test for Microsoft 365 (Office 365) outbound mail.

Usage:
    python scripts/test-smtp.py

What it does:
    1. Connects to smtp.office365.com:587 with STARTTLS
    2. Authenticates as subul@smartovate.com
    3. Sends a plain-text test email to alamissaoui.dev@gmail.com
    4. Prints every SMTP response so we can see exactly what M365 says

If you see:
    - "535 5.7.139 Authentication unsuccessful" → SMTP AUTH is disabled
      on the mailbox. Fix in M365 admin: Users → subul → Mail → Manage
      email apps → enable "Authenticated SMTP".
    - "250 2.0.0 OK" + "Queued mail for delivery" → SMTP itself works.
      Then if the recipient still doesn't receive it, the failure is
      Gmail-side filtering (URL reputation / DKIM).
"""

import smtplib
import ssl
from email.message import EmailMessage
from datetime import datetime

SMTP_HOST = "smtp.office365.com"
SMTP_PORT = 587
SMTP_USER = "subul@smartovate.com"
SMTP_PASS = "Vamoscarajo123@"

FROM_ADDR = "subul@smartovate.com"
FROM_NAME = "Subul Platform"
TO_ADDR   = "alamissaoui.dev@gmail.com"


def main() -> int:
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    msg = EmailMessage()
    msg["Subject"] = f"SMTP test from Subul - {timestamp}"
    msg["From"]    = f"{FROM_NAME} <{FROM_ADDR}>"
    msg["To"]      = TO_ADDR
    msg.set_content(
        "Hello,\n\n"
        "This is a plain-text SMTP test sent directly via smtp.office365.com\n"
        "from the Subul Platform mail account.\n\n"
        f"Timestamp: {timestamp}\n\n"
        "If you received this, SMTP delivery from smartovate.com to Gmail\n"
        "is working end-to-end. The issue with the verification/reset\n"
        "emails is then in the application-side content or the Graph API\n"
        "path, not in the underlying mail authentication.\n\n"
        "-- Subul Platform diagnostic\n"
    )

    print(f"[1/4] Connecting to {SMTP_HOST}:{SMTP_PORT} ...")
    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            smtp.set_debuglevel(1)  # print full SMTP conversation

            print("[2/4] EHLO + STARTTLS ...")
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()

            print(f"[3/4] AUTH LOGIN as {SMTP_USER} ...")
            smtp.login(SMTP_USER, SMTP_PASS)

            print(f"[4/4] Sending test message to {TO_ADDR} ...")
            smtp.send_message(msg)

        print()
        print("✅ SUCCESS — message accepted by smtp.office365.com")
        print(f"   Now check {TO_ADDR} (inbox AND spam folder).")
        return 0

    except smtplib.SMTPAuthenticationError as e:
        print()
        print(f"❌ AUTH FAILED — {e.smtp_code} {e.smtp_error.decode(errors='replace')}")
        print("   Most likely: SMTP AUTH is disabled on this mailbox.")
        print("   Fix in M365 admin → Users → subul → Mail → Manage email apps")
        print("   → enable 'Authenticated SMTP'. Wait 1 hour, retry.")
        return 1

    except smtplib.SMTPException as e:
        print()
        print(f"❌ SMTP ERROR — {type(e).__name__}: {e}")
        return 2

    except Exception as e:
        print()
        print(f"❌ UNEXPECTED ERROR — {type(e).__name__}: {e}")
        return 3


if __name__ == "__main__":
    raise SystemExit(main())


Deep Integration Guide for Flouci Payments
Executive summary
Flouci’s official docs describe a REST API that primarily follows a hosted checkout / redirect model: your backend creates a payment session, your frontend redirects the user to a Flouci payment page, and you finalize the order using redirect outcomes (success_link / fail_link) and/or a server-to-server webhook notification. 

Authentication for the core merchant API is based on two credentials (public + private) sent together in the Authorization header as Bearer <PUBLIC_KEY>:<PRIVATE_KEY>, and Flouci requires HTTPS (TLS 1.2+) for API calls. 

The official docs also describe several “advanced” or “partner” capabilities—some explicitly marked as on-demand / restricted—including refunds, pre-authorization (two-step capture), payment orchestration (split destinations), payment bindings (saved payment method workflows for recurring/one-click payments), QR code payment APIs (no redirects), POS integrations, native wallet partner APIs, and real-time settlement callbacks into your system. 

Several items you requested are not specified in the official docs (as of the pages reviewed on 2026-03-31): OAuth support for the merchant API, official SDKs/libraries, formal webhook signature scheme + retry policy, explicit rate-limit numbers, and published pricing / fee schedules (fees exist, but amounts/rates are not documented publicly in these pages). Wherever that happens, this report labels the gap as unspecified and provides pragmatic implementation guidance that does not assume undocumented behavior. 

Official docs map and deep-link index
These are the highest-value official pages used to build this guide (citations are clickable “links” to the exact pages):

Introduction / supported payment channels 
Merchant onboarding (create account) / KYB timeline 
How to build requests + authentication format + TLS requirement 
Payment steps (redirect model + webhook concept) 
Generate payment (POST /api/v2/generate_payment) 
Verify payment (GET /api/v2/verify_payment/{payment_id}) + rate-limit warning 
Refund payment (POST /api/v2/refund_payment) + “exclusive feature” note 
Test environment (TEST APP keys, test cards, 20-minute verification retention) 
Go live (base URL unchanged; keys change) 
Dashboard: Accept Online (where to copy public/private tokens; security guidance) 
Advanced: Pre-authorization (initiate, confirm capture, cancel) 
Advanced: Payment orchestration (destination splitting) 
Advanced: Payment binding (overview + create binding + pay with binding + list bindings) 
Partner: QR code payments (special API key, “no redirect”) 
Partner: POS payment integrations 
Partner: Native wallet payments (OTP link, session token + refresh token) 
Partner: eKYC/eKYB (on-demand; contact support) 
Debugging/support contacts 
For convenience, here are the same official URLs in one place:

text
Copy
https://docs.flouci.com/introduction
https://docs.flouci.com/getting-started/create-an-account
https://docs.flouci.com/getting-started/requests
https://docs.flouci.com/getting-started/payment-step

https://docs.flouci.com/api-reference/generate-transaction
https://docs.flouci.com/api-reference/verify-transaction
https://docs.flouci.com/api-reference/refund-payment

https://docs.flouci.com/essentials/testing
https://docs.flouci.com/essentials/production
https://docs.flouci.com/essentials/debug-support

https://docs.flouci.com/api-reference/payment-orchestration
https://docs.flouci.com/api-reference/advanced-payment-flow/initiate-pre-authorization
https://docs.flouci.com/api-reference/advanced-payment-flow/confirm-payment
https://docs.flouci.com/api-reference/advanced-payment-flow/cancel-payment

https://docs.flouci.com/api-reference/advanced-payment-flow/payment-binding
https://docs.flouci.com/api-reference/advanced-payment-flow/create-binding
https://docs.flouci.com/api-reference/advanced-payment-flow/confirm-binding
https://docs.flouci.com/api-reference/advanced-payment-flow/get-bindings

https://docs.flouci.com/api-reference/qr-code-payments
https://docs.flouci.com/api-reference/pos-payment-integration
https://docs.flouci.com/api-reference/partner-payment
https://docs.flouci.com/api-reference/eKYC-eKYB

https://docs.flouci.com/dashboard/accept-online
https://docs.flouci.com/dashboard/transactions
https://docs.flouci.com/dashboard/settlements
https://docs.flouci.com/dashboard/invoices
https://docs.flouci.com/plugins/plugins
Integration model and environment lifecycle
Core payment model used by the merchant API
The official “Payment Steps” page is explicit: Flouci’s web payment solution is based on a redirection mechanism. Your app creates a payment request, then redirects the user to a Flouci payment page; after completion, Flouci redirects the user back to your success_link or fail_link. 

A webhook field is optional and is positioned as the reliability mechanism: it “enables the Flouci system to notify the partner server-to-server when a transaction is complete,” helping in cases of network issues. 

This is the “standard” hosted checkout approach: it keeps sensitive payment entry on the payment provider’s page, not yours (more on PCI implications below). 

Supported payment methods
Flouci’s docs describe acceptance across multiple rails, including Flouci wallets, other digital wallets authorized under Tunisian regulation, bank cards, post office cards, and checks. 

In addition:

The Generate Payment endpoint includes an accept_card flag controlling whether card payments are accepted. 
POS integrations list payment_method options including NFC, CARD, WALLET, and CHECK. 
The “Payment Steps” page references “bank card/e-dinar” among payment methods that may be activated for a merchant. 
Sandbox/testing and production go-live
Test environment:
Each developer account automatically has a test application called “TEST APP,” and you use its PUBLIC_KEY/PRIVATE_KEY for integration testing. 

The test environment provides test card data and notes:

There are no dedicated wallet-payment tests in sandbox (wallet payments should work in production). 
In sandbox, verify_payment keeps transaction status information for 20 minutes, and transactions are API-visible only (not in dashboard). 
Go-live:
The official guidance says the base URL stays the same between “sandbox” and “production” (https://developers.flouci.com), and you switch by replacing keys with your production public/private tokens. 

Activation depends on KYB approval and includes published timelines (initial review, wallet acceptance, card acceptance). 

Where you get keys:
In the business dashboard’s “Accept Online” area, each “application (store)” has its own credentials and the UI explicitly distinguishes:

Public Token — “safe to expose,” for frontend API calls
Private Token — backend only; “never expose your private token” 
Practical implication: even though the dashboard describes a “frontend safe” public token, all endpoints shown for payments/refunds use both public and private together. So, for the payment APIs covered in this report, the safe default is: treat all Flouci calls as backend-to-backend, and only pass returned links/IDs to the browser. 

Authentication and authorization model
Merchant API auth (standard payments, refunds, preauth, orchestration)
The “How to Build Requests” page defines the auth format:

Every request must include Authorization header:
Bearer <PUBLIC_KEY>:<PRIVATE_KEY>
All requests must be over HTTPS, TLS 1.2+. 
This is API-key style auth (public/private key pair). It is not described as OAuth.

OAuth: unspecified. There is no OAuth authorization code flow, client credentials flow, scopes, or token exchange documented for the core merchant API pages reviewed. 

Other auth schemes in the official docs
Flouci’s docs include additional schemes for specific “partner” or “advanced” modules:

QR Code Payments

Requires “a special API key generated by Flouci upon request.”
Uses Authorization: Api-Key YOUR_API_KEY. 
The docs use @IP placeholders for the base URL for these endpoints: base URL unspecified (you likely receive a domain/IP with the key). 
Native Wallet Payments (partner APIs)

“Initiate Account Linking” uses Authorization: Bearer <APP_PUBLIC>:<APP_SECRET> against a developers.flouci.com partner path. 
“Authenticate Session” returns a short-lived token and refresh_token with an expires_in of 300 seconds. 
“Refresh Session” uses Authorization: Bearer YOUR_REFRESH_TOKEN and returns a fresh token, also expires_in 300. 
Several endpoints again use @IP placeholders: base URL unspecified for those paths. 
Real-time Settlement (callbacks into your system)
This module flips the direction: Flouci calls endpoints that you host (e.g., GET /flouci/check/{agentId}, POST /flouci/confirm), authenticated by a JWT token you provide in the Authorization header (Bearer {JWT_TOKEN}), and these tokens must be renewed periodically. 

API endpoints and request/response schemas
Baseline hosted-checkout endpoints
Below are the “core” endpoints for a typical integration (all are documented with examples).

Purpose	Method + URL	Auth	Request schema (fields)	Response schema (fields)
Create payment session (get redirect link)	POST https://developers.flouci.com/api/v2/generate_payment 
Bearer <PUBLIC_KEY>:<PRIVATE_KEY> 
amount (string, required, millimes); success_link (required); fail_link (required); webhook (optional); developer_tracking_id (optional); accept_card (boolean; default false); session_timeout_secs (default 1200); client_id (optional display/customer reference); image_url (optional) 
result.success (true); result.payment_id; result.link; result.developer_tracking_id; plus name, code, version 
Check transaction status (server-side confirmation)	GET https://developers.flouci.com/api/v2/verify_payment/{payment_id} 
Docs show Bearer <APP_PUBLIC>:<APP_SECRET> in example header 
 (use your issued keys; naming varies across pages)	Path param: payment_id	Top-level success; result.type; result.amount; result.status (SUCCESS, PENDING, EXPIRED, FAILURE); result.details object; result.developer_tracking_id; plus status_code, code, version 
Refund a completed payment	POST https://developers.flouci.com/api/v2/refund_payment 
Bearer <PUBLIC_KEY>:<PRIVATE_KEY> 
Body: payment_id (required) 
result.refund_id; result.payment_id; result.amount; result.status; result.refunded_at; top-level status 

Currency field: the “Payment Steps” narrative mentions specifying “amount, currency, and other transaction details,” but the Generate Payment API schema shown does not document a currency parameter. Currency handling is unspecified in the endpoint schema; based on field definitions, the unit is “millimes,” implying Tunisian dinar subdivision usage. 

Advanced merchant flows
Pre-authorization (two-step capture)
Initiate preauth by creating a payment with pre_authorization: true, then later either capture (confirm) or cancel. 

Initiate: POST https://developers.flouci.com/api/v2/generate_payment with pre_authorization: true 
Capture: POST https://developers.flouci.com/api/v2/confirm_payment with payment_id and optional partial amount (≤ original). Remaining funds are released if partial capture. 
Cancel: POST https://developers.flouci.com/api/v2/cancel_payment with payment_id 
Payment orchestration (multi-destination split)
Uses the same generate_payment endpoint but supplies a destination array of {amount, destination} items (sum must not exceed total amount). 

Saved payment methods and recurring charges
Flouci “Payment Binding” is explicitly described as supporting “recurring transactions and saved payment method workflows,” including “recurring payments,” “one-click checkout,” and “in-app purchases.” This is also marked as “exclusive to a select number of partners on demand.” 

The binding model in the docs is:

Create a binding by making an initial checkout using a unique client_id (via generate_payment). 
Subsequent payments use binding_id, client_id, and a cvc, charging the saved method directly, “no checkout redirect needed (except for 3DS).” 
Verify via standard verify_payment. 
Relevant endpoints/pages:

List bindings: GET https://developers.flouci.com/api/v2/bindings/list?client_id=<UNIQUE_INTERNAL_ID> returning an array of bindings with binding_id, card_last_four, card_brand, status, created_at. 
Create binding uses generate_payment with required client_id. 
“Pay with Binding” documents the body schema, but does not specify the HTTP method/URL on the page. Endpoint URL is unspecified in the official docs page as rendered. 
Subscriptions API: unspecified. There is no documented concept of “plans,” “subscriptions,” “invoices,” “proration,” etc. The practical pattern is: you manage subscriptions in your app, store binding_id, and schedule charges yourself. 

Partner APIs and specialized integrations
QR code payments (no redirects)

These endpoints require a special API key (on request) and allow wallet-based QR payments without redirecting/embedding pages. 
Documented endpoints include generating a custom QR code, verifying the associated transaction, and fetching transaction history; they use Authorization: Api-Key ... and @IP placeholders. 
POS payment integration
Provides init_pos_transaction and get_pos_transaction_status, authenticated with Bearer <APP_PUBLIC>:<APP_SECRET>. 

Native wallet partner API
Supports account linking (OTP) and wallet transactions, plus session token and refresh token issuance. 

eKYC/eKYB
High-level description only; explicitly “available to partners on demand” and instructs contacting support for details. Endpoint list is unspecified in this public page. 

Webhooks, events, and security posture
What Flouci documents about webhooks
Flouci’s official docs:

Treat webhook as an optional field on payment creation (and also appears in multiple partner endpoints). 
Position webhooks as a reliability mechanism (server-to-server notification when transaction completes). 
Recommend using verify_payment after receiving a success/failure webhook to confirm the transaction status. 
What is missing (and how to build safely anyway)
The official docs do not specify:

Webhook HTTP method and payload schema (e.g., whether it includes payment_id, status, signatures) — unspecified. 
Webhook signature verification format (HMAC headers, timestamps, replay protection) — unspecified. 
Webhook retry policy (how many retries, backoff schedule, timeout expectations) — unspecified. 
Practical, defensible approach (does not assume undocumented features):

Treat any webhook call as a hint/notification, not as proof of payment.
Make your webhook handler extract a payment_id (from body/query/headers—log whatever you receive) and then call verify_payment(payment_id) server-to-server to confirm truth. This matches Flouci’s guidance and neutralizes spoofed callbacks if anyone can hit your endpoint. 
Implement idempotency on your side keyed by payment_id and/or developer_tracking_id to handle duplicates. (Duplicates are common in webhook systems even when official retry policy is not documented.)
Design for rate-limits: Flouci warns that repeated pings can cause rate limiting and potential IP bans, so avoid polling loops and implement backoff. 
Webhook security best practices (general, not Flouci-specific):

If/when Flouci provides signatures, verify them using a shared secret, and add replay protection (timestamp/nonce) to prevent replay attacks; this is common webhook hardening practice. 
Ensure your webhook endpoint is HTTPS-only, validate payload sizes, and log safely (avoid storing sensitive data). 
Because signature support is unspecified, your most reliable security control remains: verify the payment status via verify_payment using your private credentials. 

Mermaid sequence diagram for the standard hosted-checkout flow
Merchant Webhook Endpoint
Flouci Payment Page
Flouci API (developers.flouci.com)
Merchant Backend
Merchant Frontend
User (Browser/App)
Merchant Webhook Endpoint
Flouci Payment Page
Flouci API (developers.flouci.com)
Merchant Backend
Merchant Frontend
User (Browser/App)
Create order (amount, customer, tracking_id)
1
POST /api/v2/generate_payment (Authorization: Bearer PUB:PRIV)
2
payment_id + redirect link
3
Return link (and store payment_id, tracking_id)
4
Redirect user to Flouci link
5
Complete payment (wallet/card/etc.)
6
Redirect to success_link or fail_link
7
(Optional) Webhook notification (payload unspecified)
8
Enqueue verification (payment_id)
9
GET /api/v2/verify_payment/{payment_id}
10
status=SUCCESS|PENDING|FAILURE|EXPIRED
11
Update order state + deliver product/receipt
12


Show code
Mermaid flowchart for a robust webhook handler (payload-agnostic)
mermaid
Copy
flowchart TD
  A[Receive webhook HTTP request] --> B[Extract candidate payment_id / tracking_id]
  B --> C{Found payment_id?}
  C -- No --> C1[Log raw request + return 200/204 to stop retries] --> Z[Done]
  C -- Yes --> D[Verify via GET /verify_payment/{payment_id}]
  D --> E{verify success==true?}
  E -- No --> E1[Backoff + retry verify later (queue)] --> Z
  E -- Yes --> F{status}
  F -- SUCCESS --> G[Idempotent update: mark order paid] --> H[Trigger fulfillment + receipt] --> Z
  F -- PENDING --> I[Schedule re-check before session expiry] --> Z
  F -- FAILURE --> J[Mark failed; notify user; allow retry] --> Z
  F -- EXPIRED --> K[Mark expired; prompt new payment] --> Z
Implementation playbook
SDKs and libraries (official vs practical reality)
Official SDKs: unspecified. The Flouci docs pages reviewed provide cURL examples and REST schemas, but do not publish official SDK packages for JavaScript/Node/Python/Java/iOS/Android. 

Official plugins (e-commerce CMS): Flouci advertises plugins for WordPress (WooCommerce), PrestaShop, Magento, and Shopify. 

WordPress / WooCommerce
PrestaShop
Magento
Shopify
Below is a practical “SDK coverage” table for developers building custom integrations.

Platform	Official SDK in docs	Recommended HTTP client	Where Flouci secret lives	Notes
Web JS (browser)	Unspecified 
fetch	Backend only (private token must not be exposed) 
Browser should receive only link and redirect.
Node.js	Unspecified 
fetch / axios	Server env vars	Best for webhook endpoint + payment initiation service.
Python	Unspecified 
requests / httpx	Server env vars	Good for cron subscription billing + reconciliation jobs.
Java	Unspecified 
OkHttp / Java 11 HttpClient	Server env vars / vault	Prefer server-side for secrets and stable networking.
iOS	Unspecified 
URLSession	Backend only	Mobile app typically calls merchant backend, not Flouci directly.
Android	Unspecified 
OkHttp	Backend only	Same: app → backend → Flouci.

Sample code: a minimal client wrapper pattern
Key requirements enforced by docs:

HTTPS/TLS 1.2+ 
Authorization: Bearer <PUBLIC_KEY>:<PRIVATE_KEY> on API calls 
Amounts are in millimes 
Use verify_payment to confirm outcomes and avoid excessive polling to prevent rate limiting/IP bans. 
Node.js (Express) — create payment + verify + refund + webhook endpoint
js
Copy
import express from "express";

const app = express();
app.use(express.json());

const FLOUCI_BASE_URL = "https://developers.flouci.com";
const FLOUCI_PUBLIC = process.env.FLOUCI_PUBLIC_TOKEN;  // public token/key
const FLOUCI_PRIVATE = process.env.FLOUCI_PRIVATE_TOKEN; // private token/key

function flouciAuthHeader() {
  // Official docs: Bearer <PUBLIC_KEY>:<PRIVATE_KEY>
  return `Bearer ${FLOUCI_PUBLIC}:${FLOUCI_PRIVATE}`;
}

async function flouciRequest(path, { method = "GET", body } = {}) {
  const res = await fetch(`${FLOUCI_BASE_URL}${path}`, {
    method,
    headers: {
      "Authorization": flouciAuthHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Non-2xx might still return JSON; handle both safely.
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(`Flouci HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function tndToMillimes(tndAmount) {
  // Docs specify millimes; Tunisian dinar is typically 1 TND = 1000 millimes.
  return Math.round(Number(tndAmount) * 1000);
}

// Create a payment session (server-side)
app.post("/api/payments/flouci/create", async (req, res) => {
  const { amountTnd, orderId, customerRef } = req.body;

  const payload = {
    amount: String(tndToMillimes(amountTnd)),
    developer_tracking_id: String(orderId),   // your internal reference
    accept_card: true,                        // allow card if enabled for merchant
    success_link: `https://your-site.example/success?orderId=${encodeURIComponent(orderId)}`,
    fail_link: `https://your-site.example/fail?orderId=${encodeURIComponent(orderId)}`,
    webhook: `https://your-api.example/webhooks/flouci`, // payload unspecified
    client_id: customerRef ? String(customerRef) : undefined,
    // session_timeout_secs: 1200, // optional override
  };

  try {
    const data = await flouciRequest("/api/v2/generate_payment", { method: "POST", body: payload });
    // data.result.link is the URL to redirect the user to
    res.json({
      paymentId: data?.result?.payment_id,
      redirectUrl: data?.result?.link,
    });
  } catch (e) {
    res.status(502).json({ error: "flouci_create_failed", detail: e.data ?? String(e) });
  }
});

// Verify a payment (server-side)
app.get("/api/payments/flouci/:paymentId/verify", async (req, res) => {
  const { paymentId } = req.params;
  try {
    const data = await flouciRequest(`/api/v2/verify_payment/${encodeURIComponent(paymentId)}`);
    // Docs: check that top-level "success" is true before parsing payload
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "flouci_verify_failed", detail: e.data ?? String(e) });
  }
});

// Refund a completed payment
app.post("/api/payments/flouci/refund", async (req, res) => {
  const { paymentId } = req.body;
  try {
    const data = await flouciRequest("/api/v2/refund_payment", {
      method: "POST",
      body: { payment_id: paymentId },
    });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "flouci_refund_failed", detail: e.data ?? String(e) });
  }
});

// Webhook endpoint (payload/signature unspecified in docs)
// Strategy: accept quickly, then verify via /verify_payment using payment_id if present.
app.post("/webhooks/flouci", async (req, res) => {
  // 1) Log minimally (avoid sensitive data).
  // 2) Extract payment_id if possible (could be in req.body.payment_id, etc.)
  const paymentId = req.body?.payment_id || req.body?.paymentId || req.query?.payment_id;

  // Acknowledge quickly to reduce retry pressure.
  res.status(200).json({ ok: true });

  if (!paymentId) return;

  // Verify asynchronously (queue in production; here we just fire-and-forget).
  try {
    const verification = await flouciRequest(`/api/v2/verify_payment/${encodeURIComponent(paymentId)}`);
    const status = verification?.result?.status;
    if (verification?.success === true && status === "SUCCESS") {
      // Idempotent: mark order paid, fulfill, etc.
      // Use verification.result.developer_tracking_id to map to orderId.
    }
  } catch (e) {
    // Backoff + retry via queue/cron; avoid rapid repeated pings.
  }
});

app.listen(3000, () => console.log("Server on :3000"));
Python — create payment + verify + refund (requests)
python
Copy
import os
import requests

BASE = "https://developers.flouci.com"
PUB = os.environ["FLOUCI_PUBLIC_TOKEN"]
PRIV = os.environ["FLOUCI_PRIVATE_TOKEN"]

def auth_header() -> str:
    return f"Bearer {PUB}:{PRIV}"

def flouci_post(path: str, payload: dict) -> dict:
    r = requests.post(
        f"{BASE}{path}",
        json=payload,
        headers={"Authorization": auth_header(), "Content-Type": "application/json"},
        timeout=20,
    )
    r.raise_for_status()
    return r.json()

def flouci_get(path: str) -> dict:
    r = requests.get(
        f"{BASE}{path}",
        headers={"Authorization": auth_header()},
        timeout=20,
    )
    r.raise_for_status()
    return r.json()

def tnd_to_millimes(tnd: float) -> int:
    return round(tnd * 1000)

def generate_payment(amount_tnd: float, tracking_id: str, success_link: str, fail_link: str, webhook: str | None = None) -> dict:
    payload = {
        "amount": str(tnd_to_millimes(amount_tnd)),
        "developer_tracking_id": tracking_id,
        "accept_card": True,
        "success_link": success_link,
        "fail_link": fail_link,
    }
    if webhook:
        payload["webhook"] = webhook
    return flouci_post("/api/v2/generate_payment", payload)

def verify_payment(payment_id: str) -> dict:
    return flouci_get(f"/api/v2/verify_payment/{payment_id}")

def refund_payment(payment_id: str) -> dict:
    return flouci_post("/api/v2/refund_payment", {"payment_id": payment_id})
Java (OkHttp) — verify payment
java
Copy
import okhttp3.*;

public class FlouciClient {
  private final OkHttpClient http = new OkHttpClient();
  private final String baseUrl = "https://developers.flouci.com";
  private final String auth;

  public FlouciClient(String publicToken, String privateToken) {
    this.auth = "Bearer " + publicToken + ":" + privateToken;
  }

  public String verifyPayment(String paymentId) throws Exception {
    Request req = new Request.Builder()
      .url(baseUrl + "/api/v2/verify_payment/" + paymentId)
      .get()
      .addHeader("Authorization", auth)
      .build();

    try (Response res = http.newCall(req).execute()) {
      if (!res.isSuccessful()) throw new RuntimeException("HTTP " + res.code());
      return res.body().string();
    }
  }
}
Subscription management using Payment Binding (practical pattern)
Because a first-class “subscription API” is unspecified, you typically implement subscriptions like this:

On first checkout, you run a Create Binding flow (initial payment) using your internal client_id for the customer. 
After the payment completes, you obtain binding_id (the docs indicate you can get it “from the verify API after the payment is done”). 
You store binding_id + customer client_id in your DB.
Each billing cycle, you attempt a “Pay with Binding” charge. Body fields required: amount, binding_id, client_id, and cvc; redirects may occur for 3DS. 
Critical caveat: since the “Pay with Binding” page does not show the endpoint URL/method, that is unspecified; you’ll need to obtain the exact endpoint details from Flouci support or your partner enablement documentation. 

Error handling, rate limits, and operational discipline
Verify endpoint parsing: Flouci explicitly advises ensuring the top-level success field is true before parsing, and to confirm payment you must see status == "SUCCESS". 

Status states to model in your DB: SUCCESS, PENDING, EXPIRED, FAILURE. 

Rate limiting: numeric limits are unspecified, but Flouci warns against “multiple successive calls (pings)” and mentions rate limiting and possible IP bans. Build a conservative strategy:

Call verify_payment only when needed: after redirect, after webhook, or on a slow backoff schedule while pending. 
Use a queue and exponential backoff for retries.
Common integration errors to guard against (grounded in documented fields):

Amount unit mismatch (millimes vs dinar). 
Missing required redirect links (success_link, fail_link). 
Forgetting to enable/allow cards (accept_card) when expecting card checkout. 
Calling APIs from the browser with secrets (explicitly discouraged by Flouci dashboard guidance). 
Testing/sandbox guide and test data
The official test environment page provides specific card test cases: 

Card rail	Test case	Number	Exp	CVV
Visa	Successful payment	4509 2111 1111 1119	12/26	748
Mastercard	Successful payment	5440 2127 1111 1110	12/26	665
Mastercard	Failed payment	5471 2511 1111 1116	11/23	858

Also:

Wallet tests are not available in sandbox; wallet payments should work when you switch to production. 
Sandbox verification retention is 20 minutes, and transactions are not visible in dashboard until production. 
PCI compliance, tokenization, and 3DS considerations
What’s in Flouci docs:

The standard flow is hosted redirect checkout. 
Payment Binding notes “no redirects except for 3DS.” 
There is no explicit statement about PCI DSS certification level, attestation, or tokenization design in the reviewed docs pages — unspecified. 
Practical compliance implications (general guidance):

Redirecting customers to a third-party hosted payment page is commonly used to reduce a merchant’s exposure to card data, but PCI obligations still exist for the merchant site because it can influence the payment flow. 
Avoid storing any card data unless necessary; PCI guidance strongly discourages card data storage. 
EMV 3-D Secure (3DS) is the industry protocol for cardholder authentication in card-not-present purchases. 
EMVCo
If your integration uses Payment Binding and collects CVC in your UI, reassess PCI scope with your compliance advisor; the Flouci docs do not define how CVC is collected or whether a hosted element is used — unspecified. 

Step-by-step integration checklist
This checklist is designed to match the official flow and the real operational gaps.

Complete onboarding and enable acceptance rails

Create your merchant account and complete the onboarding checklist; KYB approval gates production. 
Confirm which payment methods are enabled (wallet, card, etc.). 
Create app credentials and secure them

In the business dashboard under Accept Online, create/select an “application” and copy Public Token + Private Token. 
Store private token in a secret manager; never ship it to the browser/mobile app. 
Implement backend “payment initiation”

Build a server endpoint /create-payment that calls POST /api/v2/generate_payment. 
Ensure amount is in millimes and always set success_link and fail_link. 
Persist (order_id, payment_id, developer_tracking_id, status=PENDING).
Implement redirect UX

Frontend calls your backend; backend returns link; frontend redirects user. 
On return to success/fail URLs, show a “processing” screen while backend confirms status with verify_payment. 
Implement webhook endpoint (recommended)

Set webhook on payment creation to your HTTPS endpoint. 
Treat webhook as notification only; call verify_payment to confirm. 
Idempotency: ignore duplicates for already-finalized orders.
Finalize orders using verify_payment

Mark SUCCESS as paid; handle FAILURE/EXPIRED; backoff retries for PENDING. 
Avoid rapid polling; implement throttling/backoff. 
Add refunds (if you need them and have access)

Implement POST /api/v2/refund_payment for refundable successful payments; note it’s described as an “exclusive feature.” 
Test sandbox end-to-end

Use TEST APP keys in sandbox. 
Run the card test numbers; verify that verify_payment status flows work within the 20-minute window. 
Go live

Keep https://developers.flouci.com base URL; swap credentials to production keys; run a small real payment and verify. 
Deployment and production checklist
Secrets & access
Private token in a vault; rotate when staff changes; least-privilege access. 
Network
HTTPS everywhere; webhook endpoint publicly reachable; strict timeouts and retries. 
Data model
Persist payment_id, developer_tracking_id, status, amount, timestamps; enforce idempotency. 
Observability
Log request IDs and payment IDs; avoid logging sensitive payloads; monitor webhook latency and verify error rates.
Backoff strategy
Centralize verification calls; exponential backoff; cap retries to avoid rate limiting/IP bans. 
Reconciliation
Build a daily job to re-verify “pending” payments before/after settlement windows. (Settlement flows are dashboard-based; fees are deducted from available balance.) 
Support path
For integration issues or missing partner API details, the docs provide dev-support contact. 
Troubleshooting and FAQs
My payment shows “success” redirect but order is not paid — what do I trust?
Trust verify_payment. The docs explicitly recommend confirming the payment status (and warn about parsing only when success is true). 

I’m getting rate-limited / my server is blocked.
The verify endpoint warns against “multiple successive calls (pings)” and mentions rate limiting and potential IP bans. Implement backoff and avoid tight polling loops. 

Wallet payments can’t be tested in sandbox. Is that expected?
Yes. The test environment page says there are no dedicated wallet tests in sandbox, but wallet payments will work automatically in production. 

Where do I find production keys? Does the base URL change?
Production keys live in the dashboard (Accept Online > API). The docs state the base URL stays the same; only keys change. 

How do I implement webhook signature verification?
Unspecified in Flouci docs. If Flouci provides no signature headers, rely on server-side verify_payment confirmation as your integrity check; if they later provide signatures, implement HMAC verification and replay protection (general best practice). 

OWASP
Do official docs provide pricing / fees?
The docs show that settlements deduct transaction fees and settlement request fees and invoices reflect transaction volume, but the fee schedule/rates are not published in these pages — unspecified. 

Fees are visible operationally via settlements/invoices in the dashboard. 
Is Flouci PCI DSS compliant?
Unspecified in the reviewed official docs pages. PCI DSS describes requirements for environments that store/process/transmit payment account data; redirect models can reduce exposure but don’t eliminate merchant responsibilities. 

PCI Security Standards Council
Need missing partner API details (QR base URL, Pay with Binding endpoint, eKYC endpoints)?
Those are on-demand and/or represented with placeholders in the docs; contact Flouci dev support per the official support page. 
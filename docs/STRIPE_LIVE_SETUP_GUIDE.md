# GalaxRX — Connect Real Stripe & Test Real Transactions

**Step-by-step guide for a non-technical person.**  
Includes risks, fraud prevention, and scalability.

---

## Before you start

- You already use **Stripe in test mode** (test keys in `.env`). This guide switches you to **live mode** so real money can be charged.
- **Do not** put live keys in chat, email, or public repos. Only in `.env` on your machine or in your host’s secret settings (e.g. Vercel).

---

## Part 1 — Get your Stripe account ready for live payments

### Step 1.1 — Log in to Stripe

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com) and sign in.
2. In the top-left you’ll see **“Test mode”** or **“Live mode”**. For now stay in **Test mode** until we switch at the end.

### Step 1.2 — Complete Stripe account activation (required for live)

Stripe will ask you to complete your business profile before you can accept real payments.

1. In the dashboard, open **Settings** (gear icon) → **Account details** (or follow any “Complete your account” prompt).
2. Fill in:
   - Business type, name, address
   - Representative (owner/director) details
   - Bank account for payouts
   - Identity verification (ID if requested)
3. Complete every required step until Stripe shows that your account is **activated** for live payments.  
   If something is missing, the dashboard will tell you.

**Why this matters:** Without activation, you cannot use live API keys to charge real cards.

---

## Part 2 — Get your live API keys

### Step 2.1 — Switch to Live mode in the dashboard

1. In the Stripe dashboard, turn **off** “Test mode” (toggle in the top-left).
2. You are now in **Live mode**. All keys and data here are for **real money**.

### Step 2.2 — Copy your live keys

1. Go to **Developers** → **API keys**.
2. You’ll see:
   - **Publishable key** — starts with `pk_live_...`  
     → This is your **live** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
   - **Secret key** — click “Reveal” to see it; starts with `sk_live_...`  
     → This is your **live** `STRIPE_SECRET_KEY`.
3. **Do not** share the secret key or put it in code that gets committed to Git.  
   Store it only in:
   - Your local `.env` file (and add `.env` to `.gitignore` if it isn’t already), or
   - Your hosting provider’s “Environment variables” / “Secrets” (e.g. Vercel).

**Important:**  
- **Test keys** = `pk_test_...` and `sk_test_...` → no real money.  
- **Live keys** = `pk_live_...` and `sk_live_...` → real charges.  
Use live keys only when you intend to accept real payments.

---

## Part 3 — Set up the live webhook (so your app knows when a payment succeeds)

Your app uses a **webhook** so Stripe can tell your server “this payment succeeded” and you can create orders and send emails. For live payments you must create a **live** webhook endpoint.

### Step 3.1 — Your webhook URL

Your app exposes a single webhook URL. When you deploy (e.g. to Vercel), it will look like:

- **Production:** `https://your-domain.com/api/stripe/webhook`  
  Replace `your-domain.com` with your real domain (e.g. `galaxrx.com.au`).

For **local testing with real payments** you cannot use `localhost` directly (Stripe can’t reach your PC). You have two options:

- **Option A — Deploy first:** Deploy the app to production (or a staging URL), then use that URL for the webhook (e.g. `https://staging.galaxrx.com.au/api/stripe/webhook`).
- **Option B — Tunnel:** Use a tunnel (e.g. [Stripe CLI](https://stripe.com/docs/stripe-cli) or ngrok) so Stripe can reach your local server. Prefer Option A for a non-technical flow.

So for this guide we assume you use your **deployed** URL.

### Step 3.2 — Create the webhook in Stripe (Live mode)

1. Stay in **Live mode** in the Stripe dashboard.
2. Go to **Developers** → **Webhooks**.
3. Click **Add endpoint**.
4. **Endpoint URL:**  
   `https://your-domain.com/api/stripe/webhook`  
   (use your real production or staging URL).
5. **Events to send:**  
   Click “Select events” and at least include:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.dispute.created`
   - `charge.dispute.updated`
   - `charge.dispute.closed`  
   **Do not** add `account.updated` here — that event for connected accounts is sent to the **Connect** webhook (Step 3.2b), not this one.
6. Click **Add endpoint**.
7. After it’s created, open the endpoint and click **Reveal** under “Signing secret”.  
   It starts with `whsec_...`.  
   → This is your **live** `STRIPE_WEBHOOK_SECRET`.

Copy this value and store it the same way as your secret key (e.g. in `.env` or host secrets). **Never** commit it to Git.

### Step 3.2b — Create the **Connect** webhook (required for GalaxRX)

GalaxRX uses **Stripe Connect** with destination charges. Events about **connected accounts** (sellers), such as when their Stripe account is updated (e.g. charges or payouts enabled/disabled), are delivered to a **separate** webhook — the **Connect** webhook — not to the platform webhook above. Your app keeps `Pharmacy.stripeChargesEnabled` and `Pharmacy.stripePayoutsEnabled` in sync using `account.updated` from this Connect webhook.

1. Stay in **Live mode**.
2. In the Stripe dashboard go to **Connect** → **Settings** → **Webhooks** (or **Developers** → **Webhooks** and ensure you are adding a **Connect** endpoint).
3. Click **Add endpoint**.
4. **Endpoint URL:**  
   `https://your-domain.com/api/stripe/connect-webhook`  
   (This must be a **different** URL from the platform webhook. Your app exposes this route and verifies requests using a **different** signing secret.)
5. **Events to send:**  
   Include at least:
   - `account.updated`
6. Click **Add endpoint**.
7. After it’s created, open the endpoint and **Reveal** the “Signing secret”.  
   It starts with `whsec_...` but is **not** the same as the platform secret.  
   → This is your **live** `STRIPE_CONNECT_WEBHOOK_SECRET`.

**Important:** Never use the platform webhook secret for the Connect endpoint or vice versa. Each endpoint has its own signing secret; mixing them will cause verification to fail.

### Step 3.3 — Why the webhook secret matters

Your app uses `STRIPE_WEBHOOK_SECRET` to verify that incoming webhook requests really come from Stripe. If someone else calls your webhook URL, the signature check fails and the request is rejected. So:

- **Test mode** → use the signing secret from the **test** webhook endpoint.
- **Live mode** → use the signing secret from the **live** webhook endpoint.  
Never mix test and live webhook secrets.

---

## Part 4 — Update your app configuration

### Step 4.1 — Where to set variables

- **Local:** In the project folder, in the `.env` file (same folder as `package.json`).  
  Do not commit `.env`; it should be in `.gitignore`.
- **Production (e.g. Vercel):** In the hosting dashboard: Project → Settings → Environment variables. Add each name and value there for the **Production** environment.

### Step 4.2 — Variables to set for LIVE

| Variable | What to put | Where you got it |
|----------|-------------|------------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Step 2.2 (API keys, Live) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Step 2.2 (API keys, Live) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Step 3.2 (Platform webhook, Live endpoint) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | `whsec_...` | Step 3.2b (Connect webhook, Live endpoint) |
| `STRIPE_USE_DIRECT_CHARGES` | `false` | Keep as in `.env.example` (destination charges only) |

- For **local** testing with real payments, put these in `.env` and restart your dev server.
- For **production**, set all of the above in your host’s environment. **Both** webhook secrets are required when using Connect; the platform and Connect endpoints use different secrets.

After changing env vars, **restart** the app (e.g. stop and run `npm run dev` again, or redeploy).

---

## Pre-launch requirements (do these before accepting live payments)

- **Connect webhook:** The app exposes the Connect webhook at `/api/stripe/connect-webhook`. You must create the Connect endpoint in Stripe (Step 3.2b) and set `STRIPE_CONNECT_WEBHOOK_SECRET`. Without this, `Pharmacy.stripeChargesEnabled` and `stripePayoutsEnabled` will not stay in sync when a connected account is updated.
- **Wanted-offer idempotency:** The wanted-offer flow now uses a **server-derived** idempotency key (same pattern as the listing flow: derived from buyer, offer id, and quantity with a time bucket). Ensure this is deployed before you go live so retries and double-clicks reuse one PaymentIntent instead of creating duplicates.

---

## Part 5 — Test with a small real transaction

### Step 5.1 — Use a real card and a small amount

1. Ensure the app is running with **live** keys and **both** live webhook secrets (platform and Connect), and that both webhook URLs in Stripe match your deployed routes.
2. In the app, go through a real purchase flow (listing or wanted offer) and use **your own real card**.
3. Use a **small amount** (e.g. the minimum order or a low-price listing) so that any mistake costs very little.
4. Complete payment and check:
   - Stripe Dashboard → **Payments** (Live) → you see the payment.
   - Your app: order appears (e.g. in “Orders” or dashboard); buyer/seller emails sent if configured.
5. If you need to refund, use Stripe Dashboard → Payments → that payment → Refund, or use your app’s admin refund if you have one.

### Step 5.2 — If the order doesn’t appear in your app

- **Webhook not received:** In Stripe Dashboard → Developers → Webhooks → your live endpoint → check “Recent deliveries”. If there are failures, click one and read the error (e.g. wrong URL, timeout, 500 from your server).
- **Wrong webhook secret:** If you copied the **test** webhook secret but are using **live** keys, signature verification will fail. Fix: use the **live** endpoint’s signing secret for `STRIPE_WEBHOOK_SECRET` when in live mode.
- **Wrong URL:** Ensure the endpoint URL in Stripe exactly matches your deployed URL (e.g. `https://your-domain.com/api/stripe/webhook`), with no typo or extra path.

---

## Part 6 — Risks and how to reduce them

### 6.1 — Key and secret exposure

- **Risk:** If someone gets your `sk_live_...` or `whsec_...`, they could create charges or fake webhooks.
- **What to do:**
  - Never commit `.env` or paste keys in chat/email.
  - Use environment variables only (local `.env`, host secrets).
  - If a key might have been exposed: Stripe Dashboard → Developers → API keys → Roll key (or create new key and delete the old one), then update your app with the new value. For webhook secret, create a new endpoint if needed and update `STRIPE_WEBHOOK_SECRET`.

### 6.2 — Chargebacks and disputes

- **Risk:** A customer disputes a charge; you may lose the money and pay a fee.
- **What to do:**
  - Deliver what you promise and keep proof (tracking, emails).
  - Use Stripe’s dispute evidence (upload proof of delivery, terms, communication).
  - Your app already handles dispute events in the webhook (`charge.dispute.created`, etc.); ensure you act on them (e.g. update order status, notify admin).

### 6.3 — Refunds and reconciliation

- **Risk:** Refunding the wrong amount or double-refunding.
- **What to do:**
  - Your app has an admin refund route that uses `Order.totalChargedCents` and respects full/partial refund. Use it or Stripe Dashboard, not both for the same payment, to avoid confusion.
  - Periodically compare Stripe payouts and your orders (your audit doc mentions reconciliation); keep that process as you go live.

### 6.4 — Liability as platform (destination charges)

- Your app uses **destination charges**: the platform (GalaxRX) is the merchant of record; funds are transferred to sellers. So chargebacks and refunds are **platform** liability. Ensure your terms and seller agreements reflect that and that you have a process for disputes and refunds.

---

## Part 7 — Fraud prevention (Stripe and your app)

### 7.1 — Stripe Radar (recommended)

- Stripe Radar helps block fraudulent payments (e.g. stolen cards).
- In Dashboard → **Radar** (or **Payments** → **Radar**) you can see rules and block lists. For many accounts it’s on by default.
- Keep **Block** rules that Stripe suggests (e.g. high-risk score) unless you have a reason to relax them; you can add custom rules as you learn.

### 7.2 — 3D Secure (3DS)

- 3DS asks the cardholder to authenticate (e.g. bank app or SMS). It reduces chargebacks and is often required in some regions.
- Your integration uses Stripe’s Payment Intents; Stripe can trigger 3DS when the bank or rules require it. Ensure your front end does not disable 3DS (e.g. keep `payment_method_options.card.request_three_d_secure: 'automatic'` or default behavior). No need to change anything if you’re using Stripe’s recommended flow.

### 7.3 — Good practices on your side

- **Pharmacy/seller verification:** Your app already restricts who can sell; keep that and any approval process.
- **Order and listing consistency:** Your audit doc describes idempotency and single-attempt checks; that avoids duplicate orders from double webhooks or retries. Don’t disable those checks.
- **Monitoring:** Watch Stripe Dashboard for unusual spikes, many failures, or disputes, and fix issues (e.g. webhook URL, bugs) quickly.

---

## Part 8 — Scalability and operations

### 8.1 — Webhooks

- Stripe retries failed webhooks. Your webhook handler should:
  - Return **200** after successfully processing an event (your code does this).
  - Process the same event **idempotently** (e.g. “order for this PaymentIntent already exists” → skip or no-op). Your audit describes this; keep it.
- If your server is slow or down, Stripe will retry; once the server is healthy, events will be processed. So scalability is mainly about your server and database performance, not “losing” events if you return 200 only after real success.

### 8.2 — High volume

- Stripe handles high payment volume; the limit is usually your app and database.
- Both the listing and wanted-offer flows must use **server-derived** idempotency keys for creating Payment Intents (see Pre-launch requirements). That way retries and double submissions reuse the same attempt instead of creating duplicates.
- Use connection pooling for the database in production (e.g. Supabase pooled URL with port 6543 as in your `.env.example`).

### 8.3 — Going back to test mode

- To stop accepting real money on this app:
  - Replace live keys and both live webhook secrets in `.env` (or host env) with **test** values again.
  - Restart or redeploy.
- You can keep the same code; only the env values switch between test and live.

---

## Quick checklist (summary)

- [ ] **Pre-launch:** Wanted-offer flow uses server-derived idempotency key; Connect webhook route is deployed and `STRIPE_CONNECT_WEBHOOK_SECRET` is set.
- [ ] Stripe account fully activated for live payments.
- [ ] Live API keys copied: `pk_live_...` and `sk_live_...`.
- [ ] **Platform** live webhook created: URL `https://your-domain.com/api/stripe/webhook`, signing secret → `STRIPE_WEBHOOK_SECRET`.
- [ ] **Connect** live webhook created: URL `https://your-domain.com/api/stripe/connect-webhook`, signing secret → `STRIPE_CONNECT_WEBHOOK_SECRET`.
- [ ] `.env` (or host env) updated: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` (all **live**), `STRIPE_USE_DIRECT_CHARGES=false`.
- [ ] App restarted / redeployed.
- [ ] One small real payment tested; order appears in app and in Stripe.
- [ ] Radar and 3DS left enabled; no keys committed to Git.

If you follow this order and keep test/live keys and webhook secrets clearly separated, you can safely connect the real Stripe API and test real transactions while controlling risk, fraud, and scalability.

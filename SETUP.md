# Stackwise — Auth & Subscriptions Setup (Vercel + Supabase + Stripe)

## Architecture Overview

```
Root (Vercel project)
├── api/
│   ├── create-checkout-session.js   — Stripe checkout (serverless)
│   ├── stripe-webhook.js            — Stripe webhook handler (serverless)
│   └── subscription-status.js       — Server-side subscription check (serverless)
├── website/                         — Static frontend (served as root)
│   ├── index.html                   — Landing page
│   ├── auth.html                    — Auth page (login/signup/forgot/reset)
│   ├── auth-callback.html           — OAuth & email verification callback
│   ├── app.html                     — Dashboard (protected, requires session)
│   ├── billing.html                 — Billing/subscription management
│   ├── try.html                     — Demo page (works without login)
│   ├── config.js                    — Client-side keys (Supabase + Stripe publishable)
│   ├── auth.js                      — Auth page state machine
│   ├── app.js                       — Dashboard logic, session guard, paywall
│   ├── billing.js                   — Billing page logic
│   ├── try-auth.js                  — Try page auth state (header UI, paywall)
│   └── ...
├── supabase/
│   └── migrations/
│       ├── 001_init.sql             — DB tables + RLS policies + triggers
│       └── 002_subscription_plan_column.sql — Add plan column
├── package.json
├── vercel.json
└── SETUP.md                         — This file
```

## Security Model

| Secret | Location | Notes |
|--------|----------|-------|
| `SUPABASE_URL` | Vercel ENV + `config.js` | Public URL, safe for client |
| `SUPABASE_ANON_KEY` | `config.js` only | Publishable key, safe for client |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel ENV **only** | **NEVER** expose on client |
| `STRIPE_PUBLISHABLE_KEY` | `config.js` only | `pk_test_...` / `pk_live_...` |
| `STRIPE_SECRET_KEY` | Vercel ENV **only** | **NEVER** expose on client |
| `STRIPE_WEBHOOK_SECRET` | Vercel ENV **only** | `whsec_...` |
| `SITE_URL` | Vercel ENV | Your frontend URL |

---

## Step-by-step Setup

### 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) → create or select your project
2. Go to **Settings → API** and copy:
   - **Project URL** → this is your `SUPABASE_URL`
   - **anon / public key** → this is your `SUPABASE_ANON_KEY`
   - **service_role key** → this is your `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
3. Update `website/config.js` with the URL and anon key

### 2. Database Setup

Run both SQL migrations in order in your Supabase SQL Editor:

1. Go to **SQL Editor** in Supabase Dashboard
2. Paste and run `supabase/migrations/001_init.sql`
3. Paste and run `supabase/migrations/002_subscription_plan_column.sql`

This creates:
- **`profiles`** — auto-populated on signup via trigger
- **`subscriptions`** — managed by Stripe webhooks (write via service_role only)
- **`projects`** — saved reports (future feature)
- **`uploads`** — upload history (future feature)

All tables have RLS enabled. Users can only SELECT their own subscription. Only `service_role` (used by serverless functions) can INSERT/UPDATE subscriptions.

### 3. Supabase Auth Configuration

1. Go to **Authentication → URL Configuration**:
   - **Site URL**: `https://your-domain.vercel.app` (or `http://localhost:3000` for dev)
   - **Redirect URLs** (add all):
     ```
     https://your-domain.vercel.app/auth-callback.html
     https://your-domain.vercel.app/app.html
     https://your-domain.vercel.app/auth.html
     http://localhost:3000/auth-callback.html
     http://localhost:3000/app.html
     http://localhost:3000/auth.html
     ```

2. **Email Provider** (should be enabled by default):
   - Authentication → Providers → Email → Enabled ✓
   - Optionally disable "Confirm email" for faster testing

3. **(Optional) Google OAuth**:
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
   - In Supabase: **Authentication → Providers → Google** → Enable, paste Client ID & Secret

### 4. Stripe Setup

#### 4a. Create Products & Prices

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Create three products:

   | Product | Price | Billing |
   |---------|-------|---------|
   | Starter | $19/month | Recurring, monthly |
   | Growth  | $59/month | Recurring, monthly |
   | Pro     | $99/month | Recurring, monthly |

3. After creating each price, copy the **Price ID** (`price_xxx...`)

#### 4b. Update `config.js`

```js
var STRIPE_PRICES = {
  starter_monthly: 'price_YOUR_STARTER_ID',
  growth_monthly:  'price_YOUR_GROWTH_ID',
  pro_monthly:     'price_YOUR_PRO_ID',
};
```

Also set your Stripe publishable key:
```js
var STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY_HERE';
```

#### 4c. Create Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-domain.vercel.app/api/stripe-webhook`
4. **Select events** to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (`whsec_...`) — this is your `STRIPE_WEBHOOK_SECRET`

### 5. Vercel Deployment

#### 5a. Install dependencies

```bash
cd StockWise
npm install
```

#### 5b. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (first time — will prompt for project setup)
vercel

# For production
vercel --prod
```

#### 5c. Set Environment Variables

In [Vercel Dashboard → Project → Settings → Environment Variables](https://vercel.com/dashboard), add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` (service_role key) | Production, Preview, Development |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Production, Preview, Development |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production, Preview, Development |
| `SITE_URL` | `https://your-domain.vercel.app` | Production |
| `SITE_URL` | `http://localhost:3000` | Development |

Or via CLI:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add SITE_URL
```

After adding env vars, redeploy:
```bash
vercel --prod
```

### 6. Local Development

```bash
# Install dependencies
npm install

# Run with Vercel dev (serves website/ + api/)
npx vercel dev

# Or just serve the frontend (API won't work):
cd website && python -m http.server 3000
```

For local Stripe webhook testing, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
# Copy the webhook signing secret from the output and set it
```

---

## Auth Flow

```
Landing (index.html)
  ├── "Log in" → auth.html?tab=login
  ├── "Start free" → auth.html?tab=signup
  └── "Dashboard" (if logged in) → app.html

Auth (auth.html)
  ├── Login → Supabase signInWithPassword → try.html
  ├── Signup → Supabase signUp → "Check your email" panel
  ├── Forgot → resetPasswordForEmail → "Check your email"
  ├── Reset → updateUser({ password }) → try.html
  └── Google → signInWithOAuth → auth-callback.html → try.html

App/Dashboard (app.html) — PROTECTED
  ├── Checks session → if none, redirect to auth.html
  ├── Checks subscription (server-side /api/subscription-status)
  ├── Active sub → full access
  ├── Free → paywall, demo only
  ├── "Upgrade" → billing.html
  └── "Manage billing" → billing.html

Billing (billing.html) — PROTECTED
  ├── Shows current plan, status, renewal date
  ├── "Choose plan" → POST /api/create-checkout-session → Stripe Checkout
  ├── Stripe Checkout → success → billing.html?success=1
  └── Stripe Checkout → cancel → billing.html?canceled=1

Stripe Webhook (POST /api/stripe-webhook)
  └── Receives events from Stripe
  └── Updates subscriptions table (status, plan, period_end, etc.)
  └── Works even if user closes browser tab
```

## Subscription Statuses

| Status | Meaning | Access |
|--------|---------|--------|
| `free` | No subscription | Demo only |
| `active` | Paid and current | Full access |
| `trialing` | Free trial active | Full access |
| `past_due` | Payment failed | Limited (shows warning) |
| `canceled` | Subscription canceled | Demo only |
| `unpaid` | Invoice unpaid | Demo only |

---

## Key Implementation Details

1. **No secrets on client** — Stripe Secret Key and Service Role Key are only in Vercel serverless functions
2. **Server-side subscription check** — `/api/subscription-status` validates the JWT and returns subscription data from the DB (not from the client)
3. **Webhook reliability** — If user closes browser after payment, the webhook still fires and updates the DB
4. **RLS protection** — Users can only read their own subscription row; writes go through service_role in serverless functions
5. **Fallback** — If the API is temporarily unavailable, the client falls back to direct Supabase RLS-protected query
6. **No empty error messages** — Error banners only appear when there's an actual error message to show

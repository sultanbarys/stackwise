// ============================================
// STACKWISE — Create Stripe Checkout Session
// Vercel Serverless Function (Node.js)
// POST /api/create-checkout-session
// Body: { priceId: "price_xxx" }
// Auth: Bearer <supabase_access_token>
// ============================================

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = process.env.SITE_URL || 'http://localhost:8080';

// Plan label mapping from priceId patterns
function getPlanFromPriceId(priceId) {
  if (!priceId) return 'unknown';
  if (priceId.indexOf('starter') !== -1) return 'starter';
  if (priceId.indexOf('growth') !== -1) return 'growth';
  if (priceId.indexOf('pro') !== -1) return 'pro';
  return 'custom';
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ---- Validate auth ----
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }

    // ---- Parse body ----
    const { priceId } = req.body || {};
    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    // ---- Find or create Stripe customer ----
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Upsert subscription record with customer ID
      await supabase.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: 'free',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    // ---- Check if user already has an active subscription ----
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingSub && (existingSub.status === 'active' || existingSub.status === 'trialing')) {
      return res.status(400).json({ error: 'You already have an active subscription. Go to your dashboard to manage it.' });
    }

    // ---- Create Stripe Checkout Session ----
    const plan = getPlanFromPriceId(priceId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/billing.html?success=1`,
      cancel_url: `${SITE_URL}/billing.html?canceled=1`,
      metadata: {
        supabase_user_id: user.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: plan,
        },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout session error:', err);
    return res.status(500).json({ error: 'Could not create checkout session. Please try again later.' });
  }
};

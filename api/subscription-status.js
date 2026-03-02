// ============================================
// STACKWISE — Subscription Status (Server-side)
// Vercel Serverless Function (Node.js)
// GET /api/subscription-status
// Auth: Bearer <supabase_access_token>
//
// Returns subscription status from DB (not trusting front-end).
// Used as an extra validation layer.
// ============================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // ---- Fetch subscription from DB ----
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('status, plan, price_id, current_period_end, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      console.error('Subscription query error:', subError);
      return res.status(500).json({ error: 'Could not fetch subscription status' });
    }

    if (!sub) {
      return res.status(200).json({
        status: 'free',
        plan: null,
        current_period_end: null,
        has_customer: false,
      });
    }

    return res.status(200).json({
      status: sub.status || 'free',
      plan: sub.plan || null,
      price_id: sub.price_id || null,
      current_period_end: sub.current_period_end || null,
      has_customer: !!sub.stripe_customer_id,
    });
  } catch (err) {
    console.error('Subscription status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

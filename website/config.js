/* ============================================
   STACKWISE — GLOBAL CONFIGURATION
   Single source of truth for Supabase + Stripe keys.
   Include this script BEFORE any other app scripts.
   ============================================ */
(function () {
  'use strict';

  // ---- Supabase (Publishable / Anon key — safe for client) ----
  var SUPABASE_URL      = 'https://fnrzfkckaloswvnzsngb.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_DGUdYY8Uz09mBYFPiVFOsA_GJUTdt2v';

  // ---- Stripe (Publishable key — safe for client) ----
  var STRIPE_PUBLISHABLE_KEY = 'pk_test_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY';

  // ---- Stripe Price IDs ----
  var STRIPE_PRICES = {
    starter_monthly:  'price_1T6Zm4FM1Qyd5AVihFGz7T9n',
    starter_yearly:   'price_REPLACE_starter_yearly',
    growth_monthly:   'price_1T6a0CFM1Qyd5AViKIj8CMDa',
    growth_yearly:    'price_REPLACE_growth_yearly',
    pro_monthly:      'price_1T6a0RFM1Qyd5AVimrwLxIQ3',
    pro_yearly:       'price_REPLACE_pro_yearly'
  };

  // ---- API base URL (Vercel serverless functions) ----
  var API_BASE = window.location.origin + '/api';

  // ---- Redirect URLs ----
  var URLS = {
    siteBase:      window.location.origin,
    authCallback:  window.location.origin + '/auth-callback.html',
    app:           window.location.origin + '/app.html',
    auth:          window.location.origin + '/auth.html',
    try:           window.location.origin + '/try.html',
    billing:       window.location.origin + '/billing.html',
    landing:       window.location.origin + '/index.html'
  };

  // ---- Create Supabase client (once) ----
  if (!window.__supabaseClientCreated) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.__supabaseClientCreated = true;
  }

  // Expose config globally
  window.STACKWISE = {
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    STRIPE_PUBLISHABLE_KEY: STRIPE_PUBLISHABLE_KEY,
    STRIPE_PRICES: STRIPE_PRICES,
    API_BASE: API_BASE,
    URLS: URLS
  };

})();

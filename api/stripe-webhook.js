// ============================================
// STACKWISE — Stripe Webhook Handler
// Vercel Serverless Function (Node.js)
// POST /api/stripe-webhook
//
// Events handled:
//   checkout.session.completed
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.paid
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

// Vercel needs raw body for Stripe signature verification
// We disable the built-in body parser via config export below
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ---- Resolve user_id from subscription metadata or customer mapping ----
async function resolveUserId(subscription, customerId) {
  // 1. Try subscription metadata
  const userId = subscription?.metadata?.supabase_user_id;
  if (userId) return userId;

  // 2. Try customer metadata
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted && customer.metadata?.supabase_user_id) {
        return customer.metadata.supabase_user_id;
      }
    } catch (e) {
      console.error('Failed to retrieve customer:', e.message);
    }
  }

  // 3. Try lookup from our DB by stripe_customer_id
  if (customerId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  return null;
}

// ---- Map Stripe status to our allowed statuses ----
function mapStatus(stripeStatus) {
  const allowed = ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired'];
  return allowed.includes(stripeStatus) ? stripeStatus : 'free';
}

// ---- Plan label from price ID ----
function getPlanFromPriceId(priceId) {
  if (!priceId) return null;
  if (priceId.indexOf('starter') !== -1) return 'starter';
  if (priceId.indexOf('growth') !== -1) return 'growth';
  if (priceId.indexOf('pro') !== -1) return 'pro';
  return 'custom';
}

// ---- Upsert subscription data ----
async function upsertSubscription(userId, subscriptionObj, customerId) {
  const priceId = subscriptionObj.items?.data?.[0]?.price?.id || null;

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    status: mapStatus(subscriptionObj.status),
    plan: subscriptionObj.metadata?.plan || getPlanFromPriceId(priceId),
    price_id: priceId,
    current_period_end: new Date(subscriptionObj.current_period_end * 1000).toISOString(),
    stripe_customer_id: customerId || (subscriptionObj.customer),
    stripe_subscription_id: subscriptionObj.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook configuration error' });
  }

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      // ============================================
      // CHECKOUT COMPLETED
      // ============================================
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;

        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const userId = session.metadata?.supabase_user_id;

        if (!subscriptionId) break;

        // Retrieve full subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Resolve user
        let resolvedUserId = userId;
        if (!resolvedUserId) {
          resolvedUserId = await resolveUserId(subscription, customerId);
        }

        if (resolvedUserId) {
          // Carry over plan from session metadata
          if (session.metadata?.plan && !subscription.metadata?.plan) {
            subscription.metadata = { ...subscription.metadata, plan: session.metadata.plan };
          }
          await upsertSubscription(resolvedUserId, subscription, customerId);
        } else {
          console.error('checkout.session.completed: Could not resolve user_id for customer', customerId);
        }
        break;
      }

      // ============================================
      // SUBSCRIPTION CREATED
      // ============================================
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const resolvedUserId = await resolveUserId(subscription, customerId);

        if (resolvedUserId) {
          await upsertSubscription(resolvedUserId, subscription, customerId);
        } else {
          console.error('customer.subscription.created: Could not resolve user_id for customer', customerId);
        }
        break;
      }

      // ============================================
      // SUBSCRIPTION UPDATED
      // ============================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const resolvedUserId = await resolveUserId(subscription, customerId);

        if (resolvedUserId) {
          await upsertSubscription(resolvedUserId, subscription, customerId);
        } else {
          console.error('customer.subscription.updated: Could not resolve user_id for customer', customerId);
        }
        break;
      }

      // ============================================
      // SUBSCRIPTION DELETED (canceled)
      // ============================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const resolvedUserId = await resolveUserId(subscription, customerId);

        if (resolvedUserId) {
          await supabase.from('subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('user_id', resolvedUserId);
        } else {
          console.error('customer.subscription.deleted: Could not resolve user_id for customer', customerId);
        }
        break;
      }

      // ============================================
      // INVOICE PAID (renewal)
      // ============================================
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;

        if (!subscriptionId) break;

        // Retrieve updated subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const resolvedUserId = await resolveUserId(subscription, customerId);

        if (resolvedUserId) {
          await upsertSubscription(resolvedUserId, subscription, customerId);
        }
        break;
      }

      default:
        // Unhandled event — log and acknowledge
        console.log('Unhandled event type:', event.type);
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// IMPORTANT: Disable Vercel's built-in body parser so we can read raw body for Stripe signature
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

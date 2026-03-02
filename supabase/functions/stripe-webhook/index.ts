// ============================================
// STACKWISE — Stripe Webhook Handler
// Supabase Edge Function (Deno)
// POST /stripe-webhook
// Handles: checkout.session.completed,
//   customer.subscription.updated,
//   customer.subscription.deleted
// ============================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13?target=deno'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    switch (event.type) {
      // ---- Checkout completed ----
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const subscriptionId = session.subscription as string
        const customerId = session.customer as string
        const userId = session.subscription_data?.metadata?.supabase_user_id
          || session.metadata?.supabase_user_id

        if (!userId) {
          // Try to find user by customer ID
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()

          if (existingSub) {
            await updateSubscription(supabase, existingSub.user_id, subscriptionId, customerId)
          }
        } else {
          await updateSubscription(supabase, userId, subscriptionId, customerId)
        }
        break
      }

      // ---- Subscription updated ----
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (sub) {
          await supabase.from('subscriptions').update({
            status: subscription.status,
            price_id: subscription.items.data[0]?.price?.id || null,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          }).eq('user_id', sub.user_id)
        }
        break
      }

      // ---- Subscription deleted ----
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (sub) {
          await supabase.from('subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('user_id', sub.user_id)
        }
        break
      }

      default:
        // Unhandled event type
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// ---- Helper: update subscription record ----
async function updateSubscription(
  supabase: any,
  userId: string,
  subscriptionId: string,
  customerId: string
) {
  // Fetch subscription details from Stripe
  const stripe2 = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
  const subscription = await stripe2.subscriptions.retrieve(subscriptionId)

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    status: subscription.status,
    price_id: subscription.items.data[0]?.price?.id || null,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

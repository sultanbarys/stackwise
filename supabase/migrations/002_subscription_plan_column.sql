-- ============================================
-- STACKWISE — MIGRATION 002
-- Add 'plan' column to subscriptions
-- Add 'invoice.paid' handling support
-- ============================================

-- Add plan column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'plan'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN plan TEXT;
  END IF;
END
$$;

-- Ensure the status check constraint includes all Stripe statuses
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('free', 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired'));

-- Index on stripe_subscription_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON public.subscriptions(stripe_subscription_id);

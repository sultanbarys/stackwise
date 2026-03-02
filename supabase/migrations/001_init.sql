-- ============================================
-- STACKWISE — SUPABASE MIGRATION
-- Tables: profiles, subscriptions, projects, uploads
-- RLS policies for all tables
-- ============================================

-- ============================================
-- 1. PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 2. SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status                 TEXT DEFAULT 'free' CHECK (status IN ('free', 'active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  price_id               TEXT,
  current_period_end     TIMESTAMPTZ,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role can INSERT/UPDATE/DELETE subscriptions (webhook does this)
-- No user-facing write policies


-- ============================================
-- 3. PROJECTS (optional — for saved reports)
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'Untitled',
  data       JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own projects" ON public.projects;
CREATE POLICY "Users can CRUD own projects"
  ON public.projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 4. UPLOADS (optional — upload history)
-- ============================================
CREATE TABLE IF NOT EXISTS public.uploads (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename   TEXT,
  row_count  INTEGER,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own uploads" ON public.uploads;
CREATE POLICY "Users can CRUD own uploads"
  ON public.uploads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_projects_user
  ON public.projects(user_id);

CREATE INDEX IF NOT EXISTS idx_uploads_user
  ON public.uploads(user_id);

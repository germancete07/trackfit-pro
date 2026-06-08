-- Migration v14: Fix infinite recursion in profiles RLS (definitive)
-- The previous policies queried `profiles` from inside `profiles`' own policy,
-- which Postgres re-evaluates against the same policy → infinite recursion.
-- Fix: use SECURITY DEFINER helper functions that bypass RLS.

-- ── Helper: current user's trainer_id (bypasses RLS) ──────────────────
CREATE OR REPLACE FUNCTION public.my_trainer_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT trainer_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ── Helper: current user's role (bypasses RLS) ────────────────────────
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ── profiles_select (no self-reference) ───────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    auth.uid() = id                       -- own profile
    OR trainer_id = auth.uid()            -- trainer sees their students
    OR id = public.my_trainer_id()        -- student sees their trainer
  );

-- ── profiles_update (no self-reference) ───────────────────────────────
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    auth.uid() = id                       -- own profile
    OR (trainer_id = auth.uid() AND public.my_role() = 'trainer')  -- trainer updates students
  );

-- ── profiles_insert (no self-reference) ───────────────────────────────
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

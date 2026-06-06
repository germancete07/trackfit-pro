-- ============================================================
-- TrackFit Pro – Migration v5
-- Feature: Routine Categories (Folders)
-- ============================================================

-- Folders for organizing routines
CREATE TABLE IF NOT EXISTS public.routine_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#6366f1',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.routine_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainer manages own categories"
  ON public.routine_categories FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Add category reference to routines (session_templates)
ALTER TABLE public.session_templates
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.routine_categories(id) ON DELETE SET NULL;

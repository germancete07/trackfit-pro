-- migration_v17.sql: Multi-day routines support
-- Adds routine_days table; links template_exercises + sessions to specific days.
-- Run in Supabase SQL editor or via supabase db push.

-- ── 1. routine_days table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.routine_days (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid        NOT NULL REFERENCES public.session_templates(id) ON DELETE CASCADE,
  day_number  integer     NOT NULL DEFAULT 1,
  name        text        NOT NULL DEFAULT '',
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, day_number)
);

ALTER TABLE public.routine_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainer manages own routine days"
  ON public.routine_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.session_templates st
      WHERE st.id = template_id AND st.trainer_id = auth.uid()
    )
  );

-- ── 2. Link template_exercises to a specific day ─────────────────────────────

ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS routine_day_id uuid
    REFERENCES public.routine_days(id) ON DELETE CASCADE;

-- ── 3. Seed "Día 1" for every existing template ──────────────────────────────

INSERT INTO public.routine_days (template_id, day_number, name, sort_order)
SELECT id, 1, 'Día 1', 0
FROM   public.session_templates
ON CONFLICT (template_id, day_number) DO NOTHING;

-- ── 4. Link all existing exercises to their template's Día 1 ─────────────────

UPDATE public.template_exercises te
SET    routine_day_id = rd.id
FROM   public.routine_days rd
WHERE  rd.template_id = te.template_id
  AND  rd.day_number  = 1
  AND  te.routine_day_id IS NULL;

-- ── 5. Add denormalised day columns to sessions ──────────────────────────────

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS routine_day_id     uuid    REFERENCES public.routine_days(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS routine_day_number integer,
  ADD COLUMN IF NOT EXISTS routine_day_name   text;

-- ── 6. Backfill existing sessions → Día 1 ────────────────────────────────────

UPDATE public.sessions s
SET
  routine_day_id     = rd.id,
  routine_day_number = 1,
  routine_day_name   = 'Día 1'
FROM  public.routine_assignments ra
JOIN  public.routine_days rd
  ON  rd.template_id = ra.template_id AND rd.day_number = 1
WHERE s.assignment_id      = ra.id
  AND s.routine_day_id     IS NULL;

-- ── 7. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_routine_days_template_id
  ON public.routine_days (template_id);

CREATE INDEX IF NOT EXISTS idx_template_exercises_routine_day_id
  ON public.template_exercises (routine_day_id);

CREATE INDEX IF NOT EXISTS idx_sessions_routine_day
  ON public.sessions (assignment_id, routine_day_number);

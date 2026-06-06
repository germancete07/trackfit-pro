-- migration_v6: routine assignments with smart calendar

-- Preferred training days on student profiles (0=Sun,1=Mon,...,6=Sat)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_training_days integer[] NOT NULL DEFAULT '{}';

-- Routine assignments table
CREATE TABLE IF NOT EXISTS public.routine_assignments (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id    uuid        NOT NULL REFERENCES public.session_templates(id) ON DELETE RESTRICT,
  start_date     date        NOT NULL,
  training_days  integer[]   NOT NULL DEFAULT '{}',
  total_weeks    integer     NOT NULL DEFAULT 8,
  deload_every_weeks integer,
  status         text        NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ra_status_check CHECK (status IN ('active', 'completed', 'cancelled'))
);

ALTER TABLE public.routine_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainer manages own assignments" ON public.routine_assignments
  FOR ALL USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Student reads own assignments" ON public.routine_assignments
  FOR SELECT USING (auth.uid() = student_id);

-- Extend sessions with assignment tracking fields
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.routine_assignments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cycle_day     integer,
  ADD COLUMN IF NOT EXISTS is_deload     boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sessions_assignment_id ON public.sessions(assignment_id);

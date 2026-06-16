-- migration_v29: fix encoding trigger + RLS exercise_library + trainer-log columns

-- ── 1. Fix encoding in notify_trainer_on_log trigger ──────────────────────────
-- 'registro' → 'registró' (with tilde)
CREATE OR REPLACE FUNCTION public.notify_trainer_on_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_trainer_id  uuid;
  v_student_name text;
  v_session_name text;
BEGIN
  SELECT p.trainer_id, p.full_name INTO v_trainer_id, v_student_name
    FROM public.profiles p WHERE p.id = NEW.student_id;

  SELECT s.name INTO v_session_name
    FROM public.sessions s WHERE s.id = NEW.session_id;

  -- Skip notification when trainer logged the session on behalf of student
  IF NEW.logged_by_trainer = true THEN
    RETURN NEW;
  END IF;

  IF v_trainer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, message, reference_id)
    VALUES (v_trainer_id, 'session_logged',
            v_student_name || ' registró actividad en "' || v_session_name || '"',
            NEW.session_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Fix exercise_library RLS ────────────────────────────────────────────────
-- Old policy only allowed trainers to see their OWN exercises.
-- Global exercises (trainer_id IS NULL, is_global = true) were invisible to everyone.

DROP POLICY IF EXISTS "Trainer manages own library" ON public.exercise_library;
DROP POLICY IF EXISTS "library_trainer_all" ON public.exercise_library;

-- All authenticated users can read global exercises
CREATE POLICY "exercise_library_read_global"
  ON public.exercise_library FOR SELECT
  USING (is_global = true AND auth.uid() IS NOT NULL);

-- Trainers can do everything with their own exercises
CREATE POLICY "exercise_library_trainer_all"
  ON public.exercise_library FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- ── 3. Add logged_by_trainer column to exercise_logs ─────────────────────────
ALTER TABLE public.exercise_logs
  ADD COLUMN IF NOT EXISTS logged_by_trainer boolean NOT NULL DEFAULT false;

-- ── 4. Add logged_by_trainer column to sessions ───────────────────────────────
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS logged_by_trainer boolean NOT NULL DEFAULT false;

-- ── 5. RLS: allow trainer to insert/update logs for their students ─────────────
CREATE POLICY "Trainer manages logs for their students"
  ON public.exercise_logs FOR ALL
  USING (
    logged_by_trainer = true AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = student_id AND p.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    logged_by_trainer = true AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = student_id AND p.trainer_id = auth.uid()
    )
  );

-- Migration v20: add 'cancelled' status + fix duplicates + unique constraint

-- Step 1: Extend the status check constraint to include 'cancelled'
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('pending', 'active', 'completed', 'cancelled'));

-- Step 2: Cancel duplicate pending sessions.
-- For each student+date with multiple pending sessions, keep the one
-- from the most recently created assignment; cancel the rest.
UPDATE sessions s
SET status = 'cancelled'
WHERE s.status = 'pending'
  AND s.id NOT IN (
    SELECT DISTINCT ON (sub.student_id, sub.scheduled_date) sub.id
    FROM sessions sub
    LEFT JOIN routine_assignments ra ON ra.id = sub.assignment_id
    WHERE sub.status = 'pending'
    ORDER BY sub.student_id, sub.scheduled_date, ra.created_at DESC NULLS LAST
  );

-- Step 3: Add partial unique index — one non-cancelled session per student per date.
CREATE UNIQUE INDEX IF NOT EXISTS sessions_student_date_active_uniq
  ON public.sessions (student_id, scheduled_date)
  WHERE status != 'cancelled';

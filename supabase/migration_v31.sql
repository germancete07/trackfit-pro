-- migration_v31: Prevent duplicate sessions per assignment
-- Note: sessions_student_date_active_uniq (migration_v20) already prevents two
-- active sessions for the same student+date (WHERE status != 'cancelled').
-- This complementary index ensures no two non-cancelled sessions for the same
-- assignment land on the same date, catching duplicates at the source.

CREATE UNIQUE INDEX IF NOT EXISTS sessions_assignment_date_uniq
ON public.sessions (assignment_id, scheduled_date)
WHERE assignment_id IS NOT NULL
  AND status != 'cancelled';

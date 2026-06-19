-- cleanup_orphaned_sessions.sql
-- Run this once in Supabase SQL Editor to cancel pending/active sessions
-- that belong to already-cancelled assignments (created before this fix).

-- Step 1: Preview how many orphaned sessions exist
SELECT
  ra.student_id,
  COUNT(*) AS orphaned_sessions
FROM sessions s
JOIN routine_assignments ra ON ra.id = s.assignment_id
WHERE s.status IN ('pending', 'active')
  AND s.scheduled_date >= CURRENT_DATE
  AND ra.status = 'cancelled'
GROUP BY ra.student_id;

-- Step 2: Cancel them
UPDATE sessions
SET status = 'cancelled'
WHERE status IN ('pending', 'active')
  AND scheduled_date >= CURRENT_DATE
  AND assignment_id IN (
    SELECT id FROM routine_assignments WHERE status = 'cancelled'
  );

-- Step 3: Verify — should return 0 rows
SELECT COUNT(*) AS remaining_orphans
FROM sessions
WHERE status IN ('pending', 'active')
  AND scheduled_date >= CURRENT_DATE
  AND assignment_id IN (
    SELECT id FROM routine_assignments WHERE status = 'cancelled'
  );

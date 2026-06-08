-- Migration v15: Unique partial index on routine_assignments
--
-- Guarantees at the database level that a student can have at most ONE active
-- assignment at any time, regardless of concurrent server requests.
--
-- Why a partial index (WHERE status = 'active'):
--   - Allows a student to have multiple historical (cancelled/completed) assignments
--   - Only the current active one is constrained to be unique
--   - Zero overhead on reads — Postgres only enforces the constraint on writes
--   - Index size is tiny: only active rows (typically 1 per student) are indexed
--
-- Without this index, two simultaneous force-assign requests could both pass
-- the "check existing" step before either has completed the cancel+insert,
-- resulting in two active assignments for the same student.

-- Safety: cancel any duplicate active assignments before creating the index
-- (keeps the one with the most recent start_date)
WITH duplicates AS (
  SELECT
    id,
    student_id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id
      ORDER BY created_at DESC
    ) AS rn
  FROM routine_assignments
  WHERE status = 'active'
)
UPDATE routine_assignments
SET status = 'cancelled'
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Create the unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_assignment_per_student
  ON routine_assignments (student_id)
  WHERE (status = 'active');

-- Comment for documentation
COMMENT ON INDEX uq_one_active_assignment_per_student IS
  'Ensures a student can have at most one active routine assignment at any time. '
  'Enforces data integrity at the DB level independently of application logic.';

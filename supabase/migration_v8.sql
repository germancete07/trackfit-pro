-- Migration v8: PRs, Deload, Reschedule, 1RM infrastructure

-- Feature 3: Track when a session was rescheduled from its original date
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS original_date date;

-- Feature 1: Muscle group on exercises for PR grouping
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS muscle_group text;

-- Index to speed up PR queries (exercises by session + name)
CREATE INDEX IF NOT EXISTS idx_exercises_session_name ON exercises(session_id, name);

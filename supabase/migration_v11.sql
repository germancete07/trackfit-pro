-- ============================================================
-- Migration v11: Multi-tenant SaaS — Plans, Limits, RLS, Admin
-- ============================================================

-- 1. Add plan columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro', 'elite')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Existing trainers: give 30-day trial + elite plan so their data is not affected
UPDATE profiles
SET
  plan = 'elite',
  trial_ends_at = now() + INTERVAL '30 days'
WHERE role = 'trainer'
  AND plan IS NULL OR plan = 'starter';

-- 3. Mark the super admin
UPDATE profiles
SET is_admin = TRUE
WHERE email = 'gerkann@gmail.com';

-- ============================================================
-- 4. Row Level Security
-- ============================================================

-- Enable RLS on all key tables (idempotent)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_days ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    auth.uid() = id                          -- own profile
    OR trainer_id = auth.uid()              -- trainer sees their students
    OR EXISTS (                              -- student sees their trainer
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.trainer_id = profiles.id
    )
    OR (SELECT is_admin FROM profiles WHERE id = auth.uid())  -- admin sees all
  );

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    auth.uid() = id                          -- own profile
    OR (trainer_id = auth.uid()             -- trainer updates their students
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'trainer')
    OR (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    OR (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- ── sessions ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "sessions_trainer_all" ON sessions;
CREATE POLICY "sessions_trainer_all" ON sessions
  FOR ALL USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS "sessions_student_select" ON sessions;
CREATE POLICY "sessions_student_select" ON sessions
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "sessions_student_update" ON sessions;
CREATE POLICY "sessions_student_update" ON sessions
  FOR UPDATE USING (student_id = auth.uid());

-- ── exercises ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "exercises_trainer_all" ON exercises;
CREATE POLICY "exercises_trainer_all" ON exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = exercises.session_id
        AND s.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "exercises_student_select" ON exercises;
CREATE POLICY "exercises_student_select" ON exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = exercises.session_id
        AND s.student_id = auth.uid()
    )
  );

-- ── exercise_logs ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "exercise_logs_student_all" ON exercise_logs;
CREATE POLICY "exercise_logs_student_all" ON exercise_logs
  FOR ALL USING (student_id = auth.uid());

DROP POLICY IF EXISTS "exercise_logs_trainer_select" ON exercise_logs;
CREATE POLICY "exercise_logs_trainer_select" ON exercise_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = exercise_logs.session_id
        AND s.trainer_id = auth.uid()
    )
  );

-- ── session_templates ────────────────────────────────────────────────

DROP POLICY IF EXISTS "templates_trainer_all" ON session_templates;
CREATE POLICY "templates_trainer_all" ON session_templates
  FOR ALL USING (trainer_id = auth.uid());

-- ── template_exercises ───────────────────────────────────────────────

DROP POLICY IF EXISTS "template_exercises_trainer_all" ON template_exercises;
CREATE POLICY "template_exercises_trainer_all" ON template_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM session_templates t
      WHERE t.id = template_exercises.template_id
        AND t.trainer_id = auth.uid()
    )
  );

-- ── routine_assignments ──────────────────────────────────────────────

DROP POLICY IF EXISTS "assignments_trainer_all" ON routine_assignments;
CREATE POLICY "assignments_trainer_all" ON routine_assignments
  FOR ALL USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS "assignments_student_select" ON routine_assignments;
CREATE POLICY "assignments_student_select" ON routine_assignments
  FOR SELECT USING (student_id = auth.uid());

-- ── routine_categories ───────────────────────────────────────────────

DROP POLICY IF EXISTS "categories_trainer_all" ON routine_categories;
CREATE POLICY "categories_trainer_all" ON routine_categories
  FOR ALL USING (trainer_id = auth.uid());

-- ── messages ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "messages_participants" ON messages;
CREATE POLICY "messages_participants" ON messages
  FOR ALL USING (
    trainer_id = auth.uid() OR student_id = auth.uid()
  );

-- ── notifications ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_trainer_insert" ON notifications;
CREATE POLICY "notifications_trainer_insert" ON notifications
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'trainer'
    OR user_id = auth.uid()
  );

-- ── video_corrections ────────────────────────────────────────────────

DROP POLICY IF EXISTS "corrections_trainer_all" ON video_corrections;
CREATE POLICY "corrections_trainer_all" ON video_corrections
  FOR ALL USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS "corrections_student" ON video_corrections;
CREATE POLICY "corrections_student" ON video_corrections
  FOR ALL USING (student_id = auth.uid());

-- ── exercise_library ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "library_trainer_all" ON exercise_library;
CREATE POLICY "library_trainer_all" ON exercise_library
  FOR ALL USING (trainer_id = auth.uid());

-- ── training_days ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "training_days_all" ON training_days;
CREATE POLICY "training_days_all" ON training_days
  FOR ALL USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = training_days.student_id
        AND p.trainer_id = auth.uid()
    )
  );

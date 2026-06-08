-- Migration v13: Fix recursive RLS on profiles
-- The is_admin subquery in profiles_select caused infinite recursion.
-- Admin access is handled at application level via service_role key (bypasses RLS),
-- so the admin clause is not needed in the policy.

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
  );

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    auth.uid() = id                          -- own profile
    OR (trainer_id = auth.uid()             -- trainer updates their students
        AND (SELECT role FROM profiles p2 WHERE p2.id = auth.uid()) = 'trainer')
  );

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

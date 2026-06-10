-- migration_v18.sql: Refresh PostgREST schema cache + verify routine_days RLS
-- This ensures PostgREST picks up the routine_day_id FK added in migration_v17.
-- Run in Supabase SQL editor.

-- 1. Notify PostgREST to reload its schema cache
--    (picks up the routine_day_id FK on template_exercises → routine_days)
NOTIFY pgrst, 'reload schema';

-- 2. Ensure the routine_days RLS policy also allows SELECT to trainers
--    (re-creates cleanly in case the v17 policy had issues)
DROP POLICY IF EXISTS "Trainer manages own routine days" ON public.routine_days;

CREATE POLICY "routine_days_trainer_all"
  ON public.routine_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.session_templates st
      WHERE st.id = public.routine_days.template_id
        AND st.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_templates st
      WHERE st.id = public.routine_days.template_id
        AND st.trainer_id = auth.uid()
    )
  );

-- 3. Verify the data looks correct (optional — returns counts per template)
-- SELECT st.name, count(rd.id) as num_days
-- FROM session_templates st
-- LEFT JOIN routine_days rd ON rd.template_id = st.id
-- GROUP BY st.id, st.name
-- ORDER BY num_days DESC;

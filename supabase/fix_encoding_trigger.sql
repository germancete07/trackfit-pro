-- fix_encoding_trigger.sql
-- Fixes 'registró' encoding AND adds 30-second dedup guard to prevent duplicate notifications.

CREATE OR REPLACE FUNCTION public.notify_trainer_on_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  v_trainer_id  uuid;
  v_student_name text;
  v_session_name text;
  v_exists      boolean;
BEGIN
  SELECT p.trainer_id, p.full_name INTO v_trainer_id, v_student_name
    FROM public.profiles p WHERE p.id = NEW.student_id;

  SELECT s.name INTO v_session_name
    FROM public.sessions s WHERE s.id = NEW.session_id;

  -- Skip when trainer logged on behalf of student
  IF NEW.logged_by_trainer = true THEN
    RETURN NEW;
  END IF;

  IF v_trainer_id IS NOT NULL THEN
    -- Dedup: skip if identical notification already exists in last 30 seconds
    SELECT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_trainer_id
        AND type = 'session_logged'
        AND reference_id = NEW.session_id::text
        AND created_at > NOW() - INTERVAL '30 seconds'
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO public.notifications (user_id, type, message, reference_id)
      VALUES (
        v_trainer_id,
        'session_logged',
        v_student_name || E' registró actividad en "' || v_session_name || '"',
        NEW.session_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$func$;

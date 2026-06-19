-- fix_encoding_trigger.sql
-- Fixes the notify_trainer_on_log function which had 'registró' stored as
-- 'registrÃ³' due to Latin-1/UTF-8 mismatch when the SQL was submitted via browser.
-- Uses E'ó' unicode escape to guarantee correct encoding regardless of connection charset.

CREATE OR REPLACE FUNCTION public.notify_trainer_on_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
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
    VALUES (
      v_trainer_id,
      'session_logged',
      v_student_name || E' registró actividad en "' || v_session_name || '"',
      NEW.session_id
    );
  END IF;
  RETURN NEW;
END;
$func$;

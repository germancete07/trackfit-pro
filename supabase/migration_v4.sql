-- ============================================================
-- TrackFit Pro – Migration v4
-- Features: Session Templates, Direct Chat, Advanced Settings
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Space name for trainers ───────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS space_name text;

-- ── 2. Session Templates ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_exercises (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid NOT NULL REFERENCES public.session_templates(id) ON DELETE CASCADE,
  name            text NOT NULL,
  sets            integer NOT NULL DEFAULT 3,
  reps            text NOT NULL DEFAULT '8-12',
  rest_seconds    integer,
  youtube_url     text,
  technical_note  text,
  sort_order      integer NOT NULL DEFAULT 0
);

ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainer manages own templates"
  ON public.session_templates FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainer manages own template exercises"
  ON public.template_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.session_templates t
      WHERE t.id = template_exercises.template_id AND t.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_templates t
      WHERE t.id = template_exercises.template_id AND t.trainer_id = auth.uid()
    )
  );

-- ── 3. Messages (Chat) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_convo_idx ON public.messages(trainer_id, student_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- Enable realtime (run this manually in Supabase dashboard > Table Editor > Realtime)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

CREATE POLICY "Chat participants can read messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = trainer_id OR auth.uid() = student_id);

CREATE POLICY "Chat participants can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    (auth.uid() = trainer_id OR auth.uid() = student_id)
  );

CREATE POLICY "Recipient can mark messages read"
  ON public.messages FOR UPDATE
  USING (auth.uid() = trainer_id OR auth.uid() = student_id)
  WITH CHECK (auth.uid() = trainer_id OR auth.uid() = student_id);

-- ── 4. Push notification trigger for new messages ────────────
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_name  text;
BEGIN
  IF NEW.sender_id = NEW.trainer_id THEN
    v_recipient_id := NEW.student_id;
  ELSE
    v_recipient_id := NEW.trainer_id;
  END IF;

  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, message, reference_id)
  VALUES (
    v_recipient_id,
    'message_received',
    'Mensaje de ' || COALESCE(v_sender_name, 'tu contacto'),
    NEW.student_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_message();

-- ── MANUAL STEP after running this SQL ───────────────────────
-- In Supabase Dashboard > Database > Replication:
--   Enable replication for the "messages" table
-- This is required for Supabase Realtime to work on the messages table.

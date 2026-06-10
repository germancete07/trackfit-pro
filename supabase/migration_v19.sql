-- Migration v19: add training_type to session_templates
ALTER TABLE public.session_templates
  ADD COLUMN IF NOT EXISTS training_type text;

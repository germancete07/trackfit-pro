-- migration_v30: completed_at + is_manual en sessions

-- Timestamp cuando se marcó como completada (para mostrar hora en el calendario)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Flag para sesiones manuales creadas por el entrenador (no asociadas a una rutina asignada)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false;

-- Permitir que sessions.assignment_id sea NULL para sesiones manuales
-- (ya debería ser nullable según el schema original, pero lo confirmamos)
ALTER TABLE public.sessions
  ALTER COLUMN assignment_id DROP NOT NULL;

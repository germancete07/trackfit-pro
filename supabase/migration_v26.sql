-- ============================================================
-- migration_v26.sql — Encoding UTF-8 DEFINITIVO
-- Corrige doble-encodeo Latin-1/UTF-8 en todas las tablas de texto.
--
-- CÓMO EJECUTAR: pegar todo en Supabase → SQL Editor → Run
--
-- DIAGNÓSTICO PREVIO (ejecutar primero para ver el estado):
-- SELECT id, name FROM routine_days WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%⊢%' LIMIT 20;
-- SELECT id, message FROM notifications WHERE message LIKE '%Ã%' OR message LIKE '%â%' LIMIT 20;
-- SELECT id, name FROM session_templates WHERE name LIKE '%Ã%' LIMIT 20;
-- SELECT id, name FROM exercises WHERE name LIKE '%Ã%' LIMIT 20;
--
-- VERIFICACIÓN FINAL (ejecutar después — deben devolver 0 filas):
-- SELECT id, name FROM routine_days WHERE name LIKE '%Ã%' OR name LIKE '%⊢%';
-- SELECT id, message FROM notifications WHERE message LIKE '%Ã%';
-- ============================================================

-- ── FUNCIÓN AUXILIAR ────────────────────────────────────────────────────────
-- Reemplaza todos los patrones de doble-encodeo Latin-1 → UTF-8
CREATE OR REPLACE FUNCTION fix_latin1_encoding(t TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
    t,
    'DÃ­a',  'Día'),
    'Ã­',    'í'),
    'Ã³',    'ó'),
    'Ã¡',    'á'),
    'Ã©',    'é'),
    'Ã±',    'ñ'),
    'Ã»',    'ú'),
    'Ã¼',    'ü'),
    'Ã',     'À'),
    'â€™',   ''''),
    'â€œ',   '"'),
    'â€',    '"'),
    'Â¡',    '¡'),
    'Â¿',    '¿'),
    'Ãº',    'ú'),
    'Ã¢',    'â'),
    'Ã ',    'à'),
    'Ã¨',    'è'),
    'Ã¬',    'ì'),
    'Ã²',    'ò')
$$;

-- ── 1. routine_days.name ────────────────────────────────────────────────────

UPDATE public.routine_days
SET name = fix_latin1_encoding(name)
WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';

-- Fix específico para "D⊢a N" y variantes (carácter corrupto distinto de 'Ã')
UPDATE public.routine_days
SET name = 'Día ' || day_number::text
WHERE name ~ '^D[^í]' AND day_number IS NOT NULL;

-- ── 2. session_templates.name ───────────────────────────────────────────────

UPDATE public.session_templates
SET name = fix_latin1_encoding(name)
WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';

-- ── 3. sessions.name ────────────────────────────────────────────────────────

UPDATE public.sessions
SET name = fix_latin1_encoding(name)
WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';

-- ── 4. sessions.routine_day_name ────────────────────────────────────────────

UPDATE public.sessions
SET routine_day_name = fix_latin1_encoding(routine_day_name)
WHERE routine_day_name IS NOT NULL
  AND (routine_day_name LIKE '%Ã%' OR routine_day_name LIKE '%â%' OR routine_day_name LIKE '%Â%');

-- Fix específico "D⊢a N" en routine_day_name
UPDATE public.sessions
SET routine_day_name = 'Día ' || routine_day_number::text
WHERE routine_day_name IS NOT NULL
  AND routine_day_number IS NOT NULL
  AND routine_day_name ~ '^D[^í]';

-- ── 5. notifications.message ────────────────────────────────────────────────

UPDATE public.notifications
SET message = fix_latin1_encoding(message)
WHERE message LIKE '%Ã%' OR message LIKE '%â%' OR message LIKE '%Â%';

-- ── 6. exercises.name (sesiones del alumno) ─────────────────────────────────

UPDATE public.exercises
SET name = fix_latin1_encoding(name)
WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';

-- ── 7. exercise_library / library_exercises ──────────────────────────────────
-- (intentar ambos nombres de tabla por si el schema varía)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_library' AND table_schema = 'public') THEN
    UPDATE public.exercise_library
    SET name_es = fix_latin1_encoding(name_es)
    WHERE name_es LIKE '%Ã%' OR name_es LIKE '%â%' OR name_es LIKE '%Â%';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'library_exercises' AND table_schema = 'public') THEN
    UPDATE public.library_exercises
    SET name = fix_latin1_encoding(name)
    WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';
  END IF;
END $$;

-- ── 8. template_exercises.name ──────────────────────────────────────────────

UPDATE public.template_exercises
SET name = fix_latin1_encoding(name)
WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';

-- ── LIMPIAR FUNCIÓN AUXILIAR ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS fix_latin1_encoding(TEXT);

-- ── RESULTADO: ejecutar para verificar que quedó limpio ─────────────────────
-- SELECT 'routine_days' AS tabla, count(*) AS corruptos FROM routine_days WHERE name LIKE '%Ã%' OR name LIKE '%⊢%'
-- UNION ALL
-- SELECT 'sessions.name', count(*) FROM sessions WHERE name LIKE '%Ã%'
-- UNION ALL
-- SELECT 'sessions.routine_day_name', count(*) FROM sessions WHERE routine_day_name LIKE '%Ã%' OR routine_day_name LIKE '%⊢%'
-- UNION ALL
-- SELECT 'notifications', count(*) FROM notifications WHERE message LIKE '%Ã%'
-- UNION ALL
-- SELECT 'exercises', count(*) FROM exercises WHERE name LIKE '%Ã%';

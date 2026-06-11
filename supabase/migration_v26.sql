-- ============================================================
-- migration_v26.sql — Encoding UTF-8 DEFINITIVO
-- ============================================================

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
    'Ãº',    'ú'),
    'â€™',   ''''),
    'â€œ',   '"'),
    'â€',    '"'),
    'Â¡',    '¡'),
    'Â¿',    '¿'),
    'Ã ',    'à'),
    'Ã¨',    'è'),
    'Ã¬',    'ì'),
    'Ã²',    'ò'),
    'registrÃ³', 'registró'),
    'completÃ³',  'completó')
$$;

UPDATE public.routine_days
SET name = fix_latin1_encoding(name)
WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';

UPDATE public.routine_days
SET name = 'Día ' || day_number::text
WHERE name ~ '^D[^í]' AND day_number IS NOT NULL;

UPDATE public.session_templates
SET name = fix_latin1_encoding(name)
WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';

UPDATE public.sessions
SET name = fix_latin1_encoding(name)
WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';

UPDATE public.sessions
SET routine_day_name = fix_latin1_encoding(routine_day_name)
WHERE routine_day_name IS NOT NULL
  AND (routine_day_name LIKE '%Ã%' OR routine_day_name LIKE '%â%' OR routine_day_name LIKE '%Â%');

UPDATE public.sessions
SET routine_day_name = 'Día ' || routine_day_number::text
WHERE routine_day_name IS NOT NULL
  AND routine_day_number IS NOT NULL
  AND routine_day_name ~ '^D[^í]';

UPDATE public.notifications
SET message = fix_latin1_encoding(message)
WHERE message LIKE '%Ã%' OR message LIKE '%â%' OR message LIKE '%Â%';

UPDATE public.exercises
SET name = fix_latin1_encoding(name)
WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';

UPDATE public.template_exercises
SET name = fix_latin1_encoding(name)
WHERE name LIKE '%Ã%' OR name LIKE '%â%' OR name LIKE '%Â%';

DROP FUNCTION IF EXISTS fix_latin1_encoding(TEXT);

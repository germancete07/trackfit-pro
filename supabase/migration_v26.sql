-- ============================================================
-- migration_v26.sql — Encoding UTF-8 definitivo
-- Corrige caracteres españoles corruptos (doble-encodeo Latin-1)
-- Patrones: Ã³→ó  Ã¡→á  Ã©→é  Ã±→ñ  Ã­→í  Ã»→ú  Ã¼→ü
-- y el patrón específico "D⊢a N" / "D[^i]a N" → "Día N"
-- ============================================================

-- Helper: función para reemplazar todos los patrones en un texto
-- Se aplica a: routine_days.name, sessions.name, sessions.routine_day_name,
--              session_templates.name, exercises.name

-- ── 1. routine_days.name ────────────────────────────────────────────────────

UPDATE public.routine_days
SET name = replace(replace(replace(replace(replace(replace(replace(
  name,
  'Ã³', 'ó'),
  'Ã¡', 'á'),
  'Ã©', 'é'),
  'Ã±', 'ñ'),
  'Ã­', 'í'),
  'Ã»', 'ú'),
  'Ã¼', 'ü')
WHERE name ~ 'Ã[³¡©±­»¼]';

-- Fix "D⊢a N" → "Día N" (corrupt í encoded as ⊢ or other non-i char)
UPDATE public.routine_days
SET name = CONCAT('Día ', day_number)
WHERE (name ~ '^D[^i]' OR name ~ '^D[^ií]') AND name ~ '[0-9]+';

-- ── 2. session_templates.name ───────────────────────────────────────────────

UPDATE public.session_templates
SET name = replace(replace(replace(replace(replace(replace(replace(
  name,
  'Ã³', 'ó'),
  'Ã¡', 'á'),
  'Ã©', 'é'),
  'Ã±', 'ñ'),
  'Ã­', 'í'),
  'Ã»', 'ú'),
  'Ã¼', 'ü')
WHERE name ~ 'Ã[³¡©±­»¼]';

-- ── 3. sessions.name ────────────────────────────────────────────────────────

UPDATE public.sessions
SET name = replace(replace(replace(replace(replace(replace(replace(
  name,
  'Ã³', 'ó'),
  'Ã¡', 'á'),
  'Ã©', 'é'),
  'Ã±', 'ñ'),
  'Ã­', 'í'),
  'Ã»', 'ú'),
  'Ã¼', 'ü')
WHERE name ~ 'Ã[³¡©±­»¼]';

UPDATE public.sessions
SET name = REGEXP_REPLACE(name, '^D[^ií]a ', 'Día ', 'i')
WHERE name ~ '^D[^ií]a ' AND name ~ '[0-9]';

-- ── 4. sessions.routine_day_name ────────────────────────────────────────────

UPDATE public.sessions
SET routine_day_name = replace(replace(replace(replace(replace(replace(replace(
  routine_day_name,
  'Ã³', 'ó'),
  'Ã¡', 'á'),
  'Ã©', 'é'),
  'Ã±', 'ñ'),
  'Ã­', 'í'),
  'Ã»', 'ú'),
  'Ã¼', 'ü')
WHERE routine_day_name IS NOT NULL AND routine_day_name ~ 'Ã[³¡©±­»¼]';

UPDATE public.sessions
SET routine_day_name = CONCAT('Día ', routine_day_number)
WHERE routine_day_name IS NOT NULL
  AND routine_day_number IS NOT NULL
  AND (routine_day_name ~ '^D[^ií]' OR routine_day_name ~ '^D[^ií]a');

-- ── 5. exercises.name ───────────────────────────────────────────────────────

UPDATE public.exercises
SET name = replace(replace(replace(replace(replace(replace(replace(
  name,
  'Ã³', 'ó'),
  'Ã¡', 'á'),
  'Ã©', 'é'),
  'Ã±', 'ñ'),
  'Ã­', 'í'),
  'Ã»', 'ú'),
  'Ã¼', 'ü')
WHERE name ~ 'Ã[³¡©±­»¼]';

-- ── 6. library_exercises.name ───────────────────────────────────────────────

UPDATE public.library_exercises
SET name = replace(replace(replace(replace(replace(replace(replace(
  name,
  'Ã³', 'ó'),
  'Ã¡', 'á'),
  'Ã©', 'é'),
  'Ã±', 'ñ'),
  'Ã­', 'í'),
  'Ã»', 'ú'),
  'Ã¼', 'ü')
WHERE name ~ 'Ã[³¡©±­»¼]';

-- ── Verificación ─────────────────────────────────────────────────────────────
-- Después de correr, estas queries deben devolver 0 filas:
-- SELECT id, name FROM public.routine_days WHERE name ~ 'Ã[³¡©±­»¼]' OR name ~ '^D[^ií]';
-- SELECT id, name FROM public.sessions WHERE name ~ 'Ã[³¡©±­»¼]';
-- SELECT id, routine_day_name FROM public.sessions WHERE routine_day_name ~ '^D[^ií]';

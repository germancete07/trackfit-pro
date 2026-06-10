-- Fix UTF-8 encoding corruption in day names across all tables
-- Pattern: "Día N" stored with corrupted 'í' character

-- 1. Fix routine_days.name (primary source of day names)
UPDATE public.routine_days
SET name = CONCAT('Día ', day_number)
WHERE name ~ '^D[^i]' AND name ~ '[0-9]+$';

-- 2. Fix sessions.routine_day_name (copied from routine_days at assignment time)
UPDATE public.sessions
SET routine_day_name = CONCAT('Día ', routine_day_number)
WHERE routine_day_name IS NOT NULL
  AND routine_day_number IS NOT NULL
  AND routine_day_name ~ '^D[^i]';

-- 3. Fix sessions.name when it was set from a corrupted template name
--    (only when name matches the "Día N: ..." pattern with bad encoding)
UPDATE public.sessions
SET name = REGEXP_REPLACE(name, '^D[^i](a |[^a]a )', 'Día ', 'i')
WHERE name ~ '^D[^i]';

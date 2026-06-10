-- Fix corrupted day names (encoding issue: "Día" stored with wrong charset)
-- Replaces any day name matching "D<non-i char>a <number>" with the correct "Día <number>"
UPDATE public.routine_days
SET name = CONCAT('Día ', day_number)
WHERE name ~ '^D[^i]a [0-9]+$'
   OR name ~ '^D[^i][^a]a [0-9]+$';

-- Also fix names that start with correct "Día" but may have been double-encoded
-- Safe no-op if already correct
UPDATE public.routine_days
SET name = REGEXP_REPLACE(name, '^Día ([0-9]+)$', 'Día \1')
WHERE name ~ '^Día [0-9]+$' AND name NOT LIKE 'D%a %';

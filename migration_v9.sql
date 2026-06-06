-- Migration v9: superset groups
-- Adds superset_group column to both template_exercises and exercises tables.
-- Exercises sharing the same superset_group value (e.g. "A", "B") form a superset (2) or circuit (3+).

ALTER TABLE template_exercises ADD COLUMN IF NOT EXISTS superset_group TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS superset_group TEXT;

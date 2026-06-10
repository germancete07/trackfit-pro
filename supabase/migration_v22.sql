-- migration_v22: dedup global exercises + add unique constraint

-- 1. Remove duplicates (keep lowest id per name + trainer_id combination)
DELETE FROM exercise_library
WHERE id NOT IN (
  SELECT MIN(id)
  FROM exercise_library
  GROUP BY name, trainer_id
);

-- 2. Unique constraint so this never happens again
ALTER TABLE exercise_library
  ADD CONSTRAINT exercise_library_name_trainer_unique
  UNIQUE (name, trainer_id);

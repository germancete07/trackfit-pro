-- Migration v16: additional student profile fields
--
-- Students can now complete their full physical profile.
-- These fields are editable by the student and visible (read-only) to the trainer
-- in the student detail page "Info" tab.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sex            text,
  ADD COLUMN IF NOT EXISTS weight_kg      numeric(5,1),
  ADD COLUMN IF NOT EXISTS height_cm      numeric(5,1),
  ADD COLUMN IF NOT EXISTS experience_level text;

-- sex: one of three enum values (nullable = not filled yet)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_sex_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_sex_check
    CHECK (sex IS NULL OR sex IN ('male', 'female', 'prefer_not_to_say'));

-- experience_level: beginner / intermediate / advanced (nullable = not filled yet)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_experience_level_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_experience_level_check
    CHECK (experience_level IS NULL OR experience_level IN ('beginner', 'intermediate', 'advanced'));

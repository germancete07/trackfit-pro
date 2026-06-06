-- Migration v10: Dark mode + Onboarding

-- Add theme preference to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system'
  CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Add onboarding completed flag
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

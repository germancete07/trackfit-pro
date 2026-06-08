-- Migration v12: MercadoPago subscription fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_plan_key TEXT;

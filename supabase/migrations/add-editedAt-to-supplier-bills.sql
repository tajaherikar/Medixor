-- Run in Supabase SQL Editor (safe to re-run)
ALTER TABLE supplier_bills ADD COLUMN IF NOT EXISTS "editedAt" timestamptz;

-- Doctor Target Calculation System - Database Migration
-- This migration adds the new target calculation fields to the doctors table

-- ✨ NEW FIELDS:
-- - allocatedAmount: Monthly credit/budget given to doctor (₹)
-- - targetPercentage: Target growth percentage (e.g., 20 for 20%)
-- - targetAmount: Derived field = allocatedAmount × (1 + targetPercentage/100)

-- Run this SQL in Supabase to add the new columns
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS allocated_amount BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_percentage INTEGER DEFAULT 0;

-- Update existing records to prevent NULL values
UPDATE doctors 
SET allocated_amount = COALESCE(allocated_amount, 0),
    target_percentage = COALESCE(target_percentage, 0)
WHERE allocated_amount IS NULL OR target_percentage IS NULL;

-- Add NOT NULL constraint
ALTER TABLE doctors
ALTER COLUMN allocated_amount SET NOT NULL,
ALTER COLUMN target_percentage SET NOT NULL;

-- The target_amount column should already exist, but we'll ensure it's updated
-- by the application logic when doctors are created or updated

-- Create an index for efficient queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_doctors_allocated_amount ON doctors(allocated_amount);
CREATE INDEX IF NOT EXISTS idx_doctors_target_percentage ON doctors(target_percentage);

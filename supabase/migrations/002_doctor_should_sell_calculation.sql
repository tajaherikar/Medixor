-- Doctor Should Sell Calculation - Database Migration
-- Updates the formula to: Doctor Should Sell = Amount Paid ÷ (Percentage ÷ 100)
-- 
-- Formula Explanation:
-- - Percentage represents the doctor's share of total sales
-- - Example: ₹30,000 at 40% → 30,000 ÷ 0.40 = ₹75,000
-- 
-- Replaces the old formula: Amount × (Percentage ÷ 9)

-- Add new column to store the calculated Doctor Should Sell value
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS "doctorShouldSell" NUMERIC DEFAULT 0;

-- Rename old columns for clarity (optional, if they exist)
-- allocatedAmount instead of allocated_amount
ALTER TABLE doctors
RENAME COLUMN IF EXISTS allocated_amount TO "allocatedAmount";

ALTER TABLE doctors
RENAME COLUMN IF EXISTS target_percentage TO "targetPercentage";

-- Function to calculate Doctor Should Sell
-- Prevents division by zero and handles edge cases
CREATE OR REPLACE FUNCTION calculate_doctor_should_sell(
  allocated_amount NUMERIC,
  target_percentage NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  -- Return 0 if either value is 0 or negative
  IF allocated_amount <= 0 OR target_percentage <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Formula: allocated_amount / (target_percentage / 100)
  -- Simplified: allocated_amount * (100 / target_percentage)
  RETURN allocated_amount / (target_percentage / 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing doctor records with the new calculated value
UPDATE doctors
SET "doctorShouldSell" = calculate_doctor_should_sell("allocatedAmount", "targetPercentage")
WHERE "allocatedAmount" > 0 AND "targetPercentage" > 0;

-- Add NOT NULL constraints
ALTER TABLE doctors
ALTER COLUMN "allocatedAmount" SET NOT NULL,
ALTER COLUMN "targetPercentage" SET NOT NULL,
ALTER COLUMN "doctorShouldSell" SET NOT NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_doctors_allocatedAmount ON doctors("allocatedAmount");
CREATE INDEX IF NOT EXISTS idx_doctors_targetPercentage ON doctors("targetPercentage");
CREATE INDEX IF NOT EXISTS idx_doctors_doctorShouldSell ON doctors("doctorShouldSell");

-- Add comment to document the formula
COMMENT ON COLUMN doctors."doctorShouldSell" IS 
'Calculated field: allocatedAmount ÷ (targetPercentage ÷ 100). 
Represents the total sales target for the doctor based on their allocation and target percentage.
Example: ₹30,000 at 40% = ₹75,000';

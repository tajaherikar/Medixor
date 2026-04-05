# Doctor Target Calculation System

## Overview

This feature implements a target calculation system for doctors, labs, and consultants in your medical wholesale business. It calculates the monthly sales target each doctor should achieve based on:

- **Amount You Pay (₹)**: Initial amount/credit you allocate to the doctor
- **Target Percentage (%)**: Growth multiplier on that amount

## How It Works

### Formula
```
Target Sales Amount = Amount You Pay × (1 + Growth % / 100)
```

### Examples
If you pay ₹30,000 to a doctor with 30% growth:
```
Target Sales = 30,000 × (1 + 30/100)
             = 30,000 × 1.30
             = ₹39,000
```

If you increase to 40% growth (same amount):
```
Target Sales = 30,000 × (1 + 40/100)
             = 30,000 × 1.40
             = ₹42,000 ✓ (increased!)
```

If you increase amount to ₹40,000 (same 30% growth):
```
Target Sales = 40,000 × (1 + 30/100)
             = 40,000 × 1.30
             = ₹52,000 ✓ (increased!)
```

Both variables work together:
- Increase amount → target increases
- Increase percentage → target increases  
- Increase both → target increases more

## Features

### 1. **Amount You Pay Input**
- First field: "Amount You Pay (₹)"
- This is the initial amount/credit you're giving to the doctor
- Typical values: 20,000 to 100,000+ depending on the doctor
- Increase this to increase the sales target

### 2. **Growth Target Percentage Input**
- Second field: "Growth Target (%)"
- The growth multiplier on the amount you pay
- Typical values: 10% - 50% (can be up to 500%)
- Example: If you pay ₹30,000 at 30%, doctor should sell ₹39,000

### 3. **Real-time Calculation Display**
- Shows the breakdown as you type:
  - Amount you're paying
  - Growth target percentage
  - Calculated sales target doctor should achieve
  - Growth margin (the target amount above what you paid)

### 4. **Doctor Target Card Component**
- Non-compact view: Shows full breakdown with visual hierarchy
- Compact view: Used in form previews
- Displays: Amount × (1 + Growth %) = Target Sales

## Implementation Details

### Files Added/Modified

#### New Files:
1. **`src/lib/doctor-target.ts`**
   - `calculateDoctorTarget()` - Core calculation function
   - `getDoctorTargetBreakdown()` - Detailed breakdown
   - `formatDoctorTargetExplanation()` - Human-readable format

2. **`src/components/ui/doctor-target-card.tsx`**
   - Displays the calculation breakdown
   - Two modes: compact and full

3. **`supabase/migrations/001_doctor_target_calculation.sql`**
   - Database schema migration

#### Modified Files:
1. **`src/lib/types.ts`**
   - Updated `Doctor` interface with new fields:
     - `allocatedAmount: number`
     - `targetPercentage: number`

2. **`src/components/doctors-list/doctors-list.tsx`**
   - Updated form schema to use new fields
   - Added real-time calculation preview
   - Integrated DoctorTargetCard component

3. **`src/app/api/[tenant]/doctors/route.ts`**
   - POST handler now accepts and calculates new fields

4. **`src/app/api/[tenant]/doctors/[id]/route.ts`**
   - PATCH handler recalculates target when updating

## Database Migration

Run this SQL in your Supabase console to add the required columns:

```sql
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS allocated_amount BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_percentage INTEGER DEFAULT 0;
```

The migration file is located at: `supabase/migrations/001_doctor_target_calculation.sql`

## Usage in UI

### Adding a New Doctor:
1. Click "Add Reference" button
2. Select type (Doctor/Lab/Consultant)
3. Enter name and phone
4. **Enter Amount You Pay** (e.g., 30000)
5. **Enter Growth Target %** (e.g., 30)
6. See the calculated target sales amount (39000 in this example)
7. Save

### Editing Existing Doctor (to Increase Target):
1. Click edit (pencil) icon
2. Modify amount you're paying and/or growth target percentage
3. See updated target sales calculation
4. Save changes

### Viewing Doctor Targets:
- Table shows "Monthly Target" for each doctor
- Displays the calculated `targetAmount` value
- Shows as "—" if target is 0

### Viewing Doctor Targets:
- Table shows "Monthly Target" for each doctor
- Displays the calculated `targetAmount` value
- Shows as "—" if target is 0

### Viewing Doctor Targets:
- Table shows "Monthly Target" for each doctor
- Displays the calculated `targetAmount` value
- Shows as "—" if target is 0

## Business Logic

### How Both Variables Work Together:

The formula uses **multiplication**, so BOTH amount and percentage increase targets:

**Same Amount, Increase %:**
- ₹30,000 at 20% → ₹36,000
- ₹30,000 at 30% → ₹39,000 ✓ (increased)
- ₹30,000 at 40% → ₹42,000 ✓ (increased more)

**Same %, Increase Amount:**
- ₹20,000 at 30% → ₹26,000
- ₹30,000 at 30% → ₹39,000 ✓ (increased)
- ₹40,000 at 30% → ₹52,000 ✓ (increased more)

### Managing Doctor Targets:

**To increase a doctor's sales target**, you can:
1. **Increase the amount** (e.g., ₹30,000 → ₹40,000) with same %
2. **Increase the percentage** (e.g., 30% → 40%) with same amount
3. **Increase both** for maximum target growth

**Doctor-wise Strategy:**
- **New Doctor**: Lower amount (₹20,000) + modest % (20%)
- **Regular Doctor**: Medium amount (₹30,000) + standard % (25-30%)
- **High Performer**: Higher amount (₹40,000+) + better % (35-40%)

## API Integration

### Creating a Doctor
```typescript
POST /api/{tenant}/doctors

{
  name: "Dr. Rahul Sharma",
  type: "doctor",
  phone: "+91 98765 43210",
  allocatedAmount: 30000,
  targetPercentage: 30
}

// Response includes calculated targetAmount (39000)
```

### Updating a Doctor (Increase Target)
```typescript
PATCH /api/{tenant}/doctors/{doctorId}

// Option 1: Increase amount (same %)
{
  allocatedAmount: 40000,  // 30,000 → 40,000
  targetPercentage: 30
}
// Result: targetAmount increases to 52000

// Option 2: Increase percentage (same amount)
{
  allocatedAmount: 30000,
  targetPercentage: 40  // 30% → 40%
}
// Result: targetAmount increases to 42000

// Option 3: Increase both
{
  allocatedAmount: 40000,
  targetPercentage: 40
}
// Result: targetAmount increases to 56000 (most growth!)
```

## Validation Rules

- **Amount You Pay**: Must be 0 or greater
- **Target Ratio %**: Must be between 1-500%
- **Doctor Name**: Required, minimum 1 character

## Key Points to Remember

1. **Both variables increase targets** - Amount AND percentage both matter
2. **Formula: Amount × (1 + Growth %)** - Multiplication, not division
3. **Flexible management** - Adjust either variable to increase targets
4. **Examples with different amounts and percentages:**
   - ₹20,000 at 20% → ₹24,000
   - ₹30,000 at 30% → ₹39,000
   - ₹40,000 at 40% → ₹56,000
   - ₹50,000 at 50% → ₹75,000

## Future Enhancements

Potential additions to this system:

1. **Actual vs Target Tracking**
   - Display actual sales vs target amount
   - Show progress percentage

2. **Performance Metrics**
   - Calculate average order value
   - Track month-over-month growth

3. **Reporting Dashboard**
   - Compare all doctors' performance
   - Target achievement analytics

4. **Automatic Adjustments**
   - Suggest target adjustments based on performance
   - Historical target trending

5. **Notifications**
   - Alert when doctor reaches 75%, 90%, 100% of target
   - Underperformance warnings

## Troubleshooting

### Calculation not updating?
- Ensure you've run the database migration
- Check that `allocatedAmount` and `targetPercentage` are being sent to the API
- Verify the calculation function is imported correctly

### Old data showing ₹0 target?
- Edit the doctor record and re-save
- The calculation will be applied
- Or manually run the migration SQL to backfill data

### Database column errors?
- Make sure to run the migration SQL in Supabase
- Check that column names use snake_case: `allocated_amount`, `target_percentage`

---

**Last Updated**: April 4, 2026
**Feature Version**: 1.4 (Multiplication Formula - Both Variables Work Together)

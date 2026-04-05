/**
 * Doctor Target Calculation Module
 * Calculates sales target for doctors based on:
 * - Amount You Pay (₹): Amount paid to doctor
 * - Target Percentage (%): Doctor's share of total sales as a percentage
 * 
 * Formula: Doctor Should Sell = Amount ÷ (Percentage ÷ 100)
 * 
 * Logic:
 * - Percentage represents the doctor's share of total sales
 * - Calculate total sales required from the doctor's allocation
 * - If doctor gets ₹30,000 and that's 40% of sales, total sales = 30,000 ÷ 0.40 = ₹75,000
 * 
 * Examples:
 * ₹30,000 at 30% = 30,000 ÷ (30 ÷ 100) = 30,000 ÷ 0.30 = ₹100,000
 * ₹30,000 at 40% = 30,000 ÷ (40 ÷ 100) = 30,000 ÷ 0.40 = ₹75,000
 * ₹40,000 at 30% = 40,000 ÷ (30 ÷ 100) = 40,000 ÷ 0.30 = ₹133,333
 * ₹40,000 at 40% = 40,000 ÷ (40 ÷ 100) = 40,000 ÷ 0.40 = ₹100,000
 */

export interface DoctorTargetBreakdown {
  allocatedAmount: number;
  targetPercentage: number;
  targetSalesAmount: number;
}

/**
 * Calculate doctor's monthly sales target
 * @param allocatedAmount Amount paid/given to doctor (₹)
 * @param targetPercentage Target percentage (e.g., 30 for 30%)
 * @returns Calculated target sales amount (rounded to nearest 1000)
 */
export function calculateDoctorTarget(
  allocatedAmount: number,
  targetPercentage: number
): number {
  // Validate inputs
  if (!allocatedAmount || !targetPercentage || allocatedAmount < 0 || targetPercentage <= 0) {
    return 0;
  }
  
  // Formula: Amount ÷ (Percentage ÷ 100)
  const result = allocatedAmount / (targetPercentage / 100);
  
  return result;
}

/**
 * Get breakdown of doctor target calculation
 * @param allocatedAmount Amount paid/given to doctor (₹)
 * @param targetPercentage Target percentage (%)
 * @returns Detailed breakdown with all components
 */
export function getDoctorTargetBreakdown(
  allocatedAmount: number,
  targetPercentage: number
): DoctorTargetBreakdown {
  const targetSalesAmount = calculateDoctorTarget(allocatedAmount, targetPercentage);

  return {
    allocatedAmount,
    targetPercentage,
    targetSalesAmount,
  };
}

/**
 * Format target calculation as human-readable string
 * @param allocatedAmount Amount paid/given to doctor (₹)
 * @param targetPercentage Target percentage (%)
 * @returns Formatted explanation
 */
export function formatDoctorTargetExplanation(
  allocatedAmount: number,
  targetPercentage: number
): string {
  const breakdown = getDoctorTargetBreakdown(allocatedAmount, targetPercentage);
  
  return `
Amount You're Paying to Doctor: ₹${allocatedAmount.toLocaleString("en-IN")}
Target Percentage: ${targetPercentage}%
─────────────────────────────────
Doctor Should Sell (Target): ₹${breakdown.targetSalesAmount.toLocaleString("en-IN")}
  `.trim();
}

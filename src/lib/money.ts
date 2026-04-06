/**
 * money.ts
 * ────────────────────────────────────────────────────────────
 * Centralized money/currency handling with consistent rounding.
 * Prevents floating-point arithmetic errors in financial calculations.
 * 
 * Problem we're solving:
 * 100 / 1.18 = 84.7457627... (not exact)
 * 84.7457627 * 1.18 = 99.9999999999 (rounding error accumulates)
 * 
 * Solution: Always round to 2 decimal places consistently
 */

const DECIMAL_PLACES = 2;
const ROUNDING_FACTOR = Math.pow(10, DECIMAL_PLACES);

/**
 * Round a money value to consistent decimal places (default: 2)
 * Uses standard banker's rounding (round half to even)
 * 
 * @param amount - The amount to round
 * @returns Rounded amount to 2 decimal places
 * 
 * @example
 * roundMoney(84.7457627) // 84.75
 * roundMoney(99.9999999) // 100.00
 * roundMoney(100.4999) // 100.50
 */
export function roundMoney(amount: number): number {
  return Math.round(amount * ROUNDING_FACTOR) / ROUNDING_FACTOR;
}

/**
 * Add multiple money values with proper rounding
 * Prevents rounding errors from accumulating across additions
 * 
 * @param amounts - Array of amounts to add
 * @returns Sum rounded to 2 decimal places
 * 
 * @example
 * addMoney(10.11, 20.22, 30.33) // 60.66
 * addMoney(0.1, 0.2, 0.3) // 0.60 (not 0.6000000000000001)
 */
export function addMoney(...amounts: number[]): number {
  const sum = amounts.reduce((acc, curr) => acc + curr, 0);
  return roundMoney(sum);
}

/**
 * Subtract one amount from another with proper rounding
 * 
 * @param minuend - The amount to subtract from
 * @param subtrahend - The amount to subtract
 * @returns Difference rounded to 2 decimal places
 * 
 * @example
 * subtractMoney(100.00, 30.50) // 69.50
 */
export function subtractMoney(minuend: number, subtrahend: number): number {
  return roundMoney(minuend - subtrahend);
}

/**
 * Multiply a money value by a factor with proper rounding
 * Used for quantity × price, percentage calculations, etc.
 * 
 * @param amount - The base amount
 * @param factor - The multiplier (e.g., 1.18 for GST, 2 for doubling)
 * @returns Product rounded to 2 decimal places
 * 
 * @example
 * multiplyMoney(100, 1.18) // 118.00
 * multiplyMoney(50, 0.5) // 25.00
 */
export function multiplyMoney(amount: number, factor: number): number {
  return roundMoney(amount * factor);
}

/**
 * Divide one money value by another with proper rounding
 * Used for GST-inclusive calculations: lineTotal / 1.18 = taxable
 * 
 * @param dividend - The amount to divide
 * @param divisor - The amount to divide by
 * @returns Quotient rounded to 2 decimal places
 * 
 * @example
 * divideMoney(118.00, 1.18) // 100.00
 * divideMoney(100, 3) // 33.33
 */
export function divideMoney(dividend: number, divisor: number): number {
  if (divisor === 0) {
    throw new Error("Cannot divide by zero");
  }
  return roundMoney(dividend / divisor);
}

/**
 * Calculate a percentage of an amount with proper rounding
 * 
 * @param amount - The base amount
 * @param percentage - The percentage (0-100)
 * @returns Percentage amount rounded to 2 decimal places
 * 
 * @example
 * percentageOf(1000, 18) // 180.00 (18% of 1000)
 * percentageOf(150, 5) // 7.50 (5% of 150)
 */
export function percentageOf(amount: number, percentage: number): number {
  return roundMoney(amount * (percentage / 100));
}

/**
 * Calculate what percentage one value is of another
 * 
 * @param part - The partial amount
 * @param whole - The total amount
 * @returns Percentage (0-100) rounded to 2 decimal places
 * 
 * @example
 * percentageRatio(180, 1000) // 18.00
 * percentageRatio(25, 100) // 25.00
 */
export function percentageRatio(part: number, whole: number): number {
  if (whole === 0) {
    return 0;
  }
  return roundMoney((part / whole) * 100);
}

/**
 * Validate that a calculated total matches expected value
 * Used for financial reconciliation and checksum validation
 * 
 * @param calculated - Calculated total
 * @param expected - Expected total
 * @param tolerance - Acceptable difference (default: 0.01 for ₹0.01)
 * @returns True if values match within tolerance
 * 
 * @example
 * validateMoneyTotal(100.00, 100.01) // true (within ₹0.01)
 * validateMoneyTotal(100.00, 101.00) // false (exceeds tolerance)
 */
export function validateMoneyTotal(calculated: number, expected: number, tolerance: number = 0.01): boolean {
  const difference = Math.abs(calculated - expected);
  return difference <= tolerance;
}

/**
 * Format a money value as a string with currency symbol
 * 
 * @param amount - The amount to format
 * @param currencySymbol - Symbol to display (default: ₹)
 * @param includeDecimals - Whether to show .00 for whole numbers
 * @returns Formatted string
 * 
 * @example
 * formatMoney(1234.50) // "₹1,234.50"
 * formatMoney(1000) // "₹1,000"
 * formatMoney(1000, "$") // "$1,000"
 */
export function formatMoney(amount: number, currencySymbol: string = "₹", includeDecimals: boolean = true): string {
  const rounded = roundMoney(amount);
  const parts = rounded.toFixed(2).split(".");
  const [wholePart, decimalPart] = parts;
  
  // Format whole part with commas
  const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  if (!includeDecimals && decimalPart === "00") {
    return `${currencySymbol}${formattedWhole}`;
  }
  
  return `${currencySymbol}${formattedWhole}.${decimalPart}`;
}

/**
 * Parse a formatted money string back to number
 * Removes currency symbols and commas
 * 
 * @param formatted - Formatted money string (e.g., "₹1,234.50")
 * @returns Parsed number rounded to 2 decimals
 * 
 * @example
 * parseMoney("₹1,234.50") // 1234.50
 * parseMoney("$1,000") // 1000
 */
export function parseMoney(formatted: string): number {
  // Remove currency symbols and commas
  const cleaned = formatted.replace(/[₹$€£\s,]/g, "");
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    throw new Error(`Cannot parse money value: ${formatted}`);
  }
  
  return roundMoney(parsed);
}

/**
 * Constants for common calculations
 */
export const MONEY_CONSTANTS = {
  DECIMAL_PLACES,
  ROUNDING_FACTOR,
  // Common GST rates in India
  GST_RATES: {
    GST_0: 0,
    GST_5: 5,
    GST_12: 12,
    GST_18: 18,
    GST_28: 28,
  } as const,
} as const;

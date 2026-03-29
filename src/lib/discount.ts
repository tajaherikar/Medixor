import { DiscountType } from "@/lib/types";

// ─── Discount Calculation ─────────────────────────────────────────────────────

/**
 * Calculates the discount amount given a base amount, type, and value.
 */
export function calcDiscountAmount(
  baseAmount: number,
  type: DiscountType,
  value: number
): number {
  if (value <= 0) return 0;
  if (type === "percentage") return (baseAmount * value) / 100;
  return Math.min(value, baseAmount); // flat discount cannot exceed base
}

/**
 * Calculates line item total after item-level discount.
 */
export function calcLineTotal(
  mrp: number,
  qty: number,
  discountType?: DiscountType,
  discountValue?: number
): number {
  const gross = mrp * qty;
  if (!discountType || !discountValue) return gross;
  return gross - calcDiscountAmount(gross, discountType, discountValue);
}

/**
 * Calculates invoice grand total after customer-level discount.
 */
export function calcGrandTotal(
  subtotal: number,
  customerDiscountType?: DiscountType,
  customerDiscountValue?: number
): { customerDiscountAmount: number; grandTotal: number } {
  const customerDiscountAmount =
    customerDiscountType && customerDiscountValue
      ? calcDiscountAmount(subtotal, customerDiscountType, customerDiscountValue)
      : 0;
  return {
    customerDiscountAmount,
    grandTotal: subtotal - customerDiscountAmount,
  };
}

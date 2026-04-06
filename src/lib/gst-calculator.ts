/**
 * gst-calculator.ts
 * ─────────────────
 * Centralized GST and tax calculations for invoices and bills.
 * Single source of truth to prevent bugs and duplication.
 */

import { DiscountType, GstRate } from "@/lib/types";
import { calcLineTotal } from "@/lib/discount";

export interface GstCalculation {
  taxable: number;
  cgst: number;
  sgst: number;
  gstAmount: number;
}

export interface LineCalculation extends GstCalculation {
  quantity: number;
  lineTotal: number;
  lineTotalWithGst: number;
}

export interface InvoiceCalculation {
  lines: LineCalculation[];
  subtotal: number;
  totalGst: number;
  customerDiscountAmount: number;
  grandTotal: number;
}

/**
 * Calculate GST for any amount (lineTotal already has discount applied)
 * Handles both GST-inclusive and GST-exclusive pricing
 */
export function calculateGst(
  lineTotal: number,
  gstRate: GstRate,
  isInclusive: boolean
): GstCalculation {
  if (isInclusive) {
    // GST already included in the price
    // Formula: lineTotal = taxable × (1 + gstRate/100)
    // So: taxable = lineTotal / (1 + gstRate/100)
    const divisor = 100 + gstRate;
    const gstAmt = lineTotal * (gstRate / divisor);
    return {
      taxable: lineTotal - gstAmt,
      cgst: gstAmt / 2,
      sgst: gstAmt / 2,
      gstAmount: gstAmt,
    };
  }

  // GST to be added on top
  // Formula: lineTotal = taxable (before GST)
  const taxable = lineTotal;
  const gstAmt = taxable * (gstRate / 100);
  return {
    taxable,
    cgst: gstAmt / 2,
    sgst: gstAmt / 2,
    gstAmount: gstAmt,
  };
}

/**
 * Calculate single line item with all GST fields
 * Replaces duplicate calculation logic in invoice-builder, supplier-bill-form
 */
export function calculateLineItem(
  mrp: number,
  quantity: number,
  discountType: DiscountType | undefined,
  discountValue: number | undefined,
  gstRate: GstRate,
  isInclusive: boolean | undefined
): LineCalculation {
  const lineTotal = calcLineTotal(mrp, quantity, discountType, discountValue);
  const gst = calculateGst(lineTotal, gstRate, isInclusive ?? false);

  return {
    quantity,
    lineTotal,
    lineTotalWithGst: gst.taxable + gst.gstAmount,
    ...gst,
  };
}

/**
 * Calculate entire invoice with all line items
 * Single source of truth for invoice calculations
 */
export function calculateInvoice(
  lineItems: Array<{
    mrp: number;
    quantity: number;
    discountType?: DiscountType;
    discountValue?: number;
    gstRate: GstRate;
    gstInclusive?: boolean;
  }>,
  customerDiscountType?: DiscountType,
  customerDiscountValue?: number
): InvoiceCalculation {
  const lines = lineItems.map((l) =>
    calculateLineItem(
      l.mrp,
      l.quantity,
      l.discountType,
      l.discountValue,
      l.gstRate,
      l.gstInclusive
    )
  );

  const subtotal = lines.reduce((s, l) => s + l.taxable, 0);
  const totalGst = lines.reduce((s, l) => s + l.gstAmount, 0);

  const customerDiscountAmount =
    customerDiscountType && customerDiscountValue
      ? customerDiscountType === "percentage"
        ? (subtotal * customerDiscountValue) / 100
        : Math.min(customerDiscountValue, subtotal)
      : 0;

  return {
    lines,
    subtotal,
    totalGst,
    customerDiscountAmount,
    grandTotal: subtotal - customerDiscountAmount + totalGst,
  };
}

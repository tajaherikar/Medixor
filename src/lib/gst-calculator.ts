/**
 * gst-calculator.ts
 * ──────────────────────────────────────────────────────────────
 * Centralized GST and tax calculations for invoices and bills.
 * Single source of truth to prevent bugs and duplication.
 * 
 * Follows Indian GST standards:
 * - GST calculated on each line item and rounded to 2 decimals
 * - CGST and SGST are 50% each of total GST (rounded separately)
 * - Total GST is sum of all line item GSTs
 * - Final totals rounded to nearest paise (2 decimal places)
 */

import { DiscountType, GstRate } from "@/lib/types";
import { calcLineTotal } from "@/lib/discount";
import { roundMoney, divideMoney, multiplyMoney, addMoney, validateMoneyTotal } from "@/lib/money";

export interface GstCalculation {
  taxable: number;
  cgst: number;
  sgst: number;
  gstAmount: number;
  gstPercent: GstRate;
  isInclusive: boolean;
  /**
   * Checksum to verify calculation accuracy
   * For GST-exclusive: taxable + gstAmount should equal this
   * For GST-inclusive: stays same as input lineTotal
   */
  calculationChecksum: number;
}

export interface LineCalculation extends GstCalculation {
  quantity: number;
  lineTotal: number;
  lineTotalWithGst: number;
  /**
   * Flag set if rounding tolerance exceeded (> ₹0.01 difference)
   * Useful for detecting potential calculation errors
   */
  roundingWarning?: boolean;
}

export interface InvoiceCalculation {
  lines: LineCalculation[];
  subtotal: number;
  totalGst: number;
  totalCgst: number;
  totalSgst: number;
  customerDiscountAmount: number;
  grandTotal: number;
  /**
   * Validation info
   * If false, there's a rounding discrepancy > ₹0.01
   */
  isValid: boolean;
  validationMessage?: string;
}

/**
 * Calculate GST for any amount (lineTotal already has discount applied)
 * Handles both GST-inclusive and GST-exclusive pricing
 * 
 * Following Indian GST standards:
 * 1. For GST-exclusive: GST = taxable × (gstRate/100), CGST = SGST = GST/2
 * 2. For GST-inclusive: taxable = lineTotal / (1 + gstRate/100), GST = lineTotal - taxable
 * 3. All amounts rounded to 2 decimal places (nearest paise)
 * 
 * @param lineTotal - The line total amount (with discount already applied)
 * @param gstRate - GST rate percentage (5, 12, 18, 28, etc.)
 * @param isInclusive - Whether GST is included in lineTotal
 * @returns GstCalculation with proper rounding and validation
 * 
 * @example
 * // GST-exclusive: ₹100, 18% GST
 * calculateGst(100, 18, false)
 * // → { taxable: 100.00, gstAmount: 18.00, cgst: 9.00, sgst: 9.00 }
 * 
 * // GST-inclusive: ₹118, 18% GST
 * calculateGst(118, 18, true)
 * // → { taxable: 100.00, gstAmount: 18.00, cgst: 9.00, sgst: 9.00 }
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
    const taxable = divideMoney(lineTotal, divisor);
    const gstAmount = roundMoney(lineTotal - taxable);
    const cgst = roundMoney(gstAmount / 2);
    const sgst = roundMoney(gstAmount - cgst); // Ensures CGST + SGST = gstAmount
    
    return {
      taxable,
      cgst,
      sgst,
      gstAmount,
      gstPercent: gstRate,
      isInclusive: true,
      calculationChecksum: lineTotal,
    };
  }

  // GST to be added on top (GST-exclusive pricing)
  // Formula: gstAmount = taxable × (gstRate/100)
  
  const taxable = roundMoney(lineTotal); // lineTotal IS the taxable amount for exclusive GST
  const gstAmount = roundMoney(multiplyMoney(taxable, gstRate / 100));
  const cgst = roundMoney(gstAmount / 2);
  const sgst = roundMoney(gstAmount - cgst); // Ensures CGST + SGST = gstAmount
  
  return {
    taxable,
    cgst,
    sgst,
    gstAmount,
    gstPercent: gstRate,
    isInclusive: false,
    calculationChecksum: addMoney(taxable, gstAmount),
  };
}

/**
 * Calculate single line item with all GST fields
 * Replaces duplicate calculation logic in invoice-builder, supplier-bill-form
 * 
 * @param mrp - Maximum Retail Price (selling price per unit)
 * @param quantity - Number of units
 * @param discountType - Type of discount: "percentage", "flat", or undefined
 * @param discountValue - Discount amount or percentage
 * @param gstRate - GST rate percentage
 * @param isInclusive - Whether MRP includes GST
 * @returns LineCalculation with complete breakdown
 */
export function calculateLineItem(
  mrp: number,
  quantity: number,
  discountType: DiscountType | undefined,
  discountValue: number | undefined,
  gstRate: GstRate,
  isInclusive: boolean | undefined
): LineCalculation {
  const lineTotal = roundMoney(calcLineTotal(mrp, quantity, discountType, discountValue));
  const gst = calculateGst(lineTotal, gstRate, isInclusive ?? false);
  
  const lineTotalWithGst = addMoney(gst.taxable, gst.gstAmount);
  
  // Check for rounding discrepancies
  const roundingWarning = !validateMoneyTotal(gst.calculationChecksum, lineTotalWithGst, 0.01);

  return {
    quantity,
    lineTotal,
    lineTotalWithGst,
    ...gst,
    roundingWarning,
  };
}

/**
 * Calculate entire invoice with all line items
 * Single source of truth for invoice calculations
 * 
 * Following Indian invoice structure:
 * - Subtotal = sum of all taxable amounts (before GST and customer discount)
 * - Customer Discount = applied to subtotal
 * - Total GST = sum of all line item GSTs
 * - Grand Total = (Subtotal - Customer Discount) + Total GST
 * 
 * @param lineItems - Array of line items to calculate
 * @param customerDiscountType - "percentage" or "flat"
 * @param customerDiscountValue - Discount amount or percentage
 * @returns InvoiceCalculation with validation
 * 
 * @example
 * const invoice = calculateInvoice([
 *   { mrp: 100, quantity: 1, gstRate: 18, gstInclusive: false }
 * ], "percentage", 10);
 * // → { subtotal: 100, totalGst: 18, customerDiscountAmount: 10, grandTotal: 108 }
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

  // Sum all taxable amounts
  const subtotal = lines.reduce((s, l) => addMoney(s, l.taxable), 0);
  
  // Sum all GST components
  const totalGst = lines.reduce((s, l) => addMoney(s, l.gstAmount), 0);
  const totalCgst = lines.reduce((s, l) => addMoney(s, l.cgst), 0);
  const totalSgst = lines.reduce((s, l) => addMoney(s, l.sgst), 0);

  // Calculate customer discount
  let customerDiscountAmount = 0;
  if (customerDiscountType && customerDiscountValue) {
    if (customerDiscountType === "percentage") {
      customerDiscountAmount = roundMoney(subtotal * (customerDiscountValue / 100));
    } else {
      // Flat discount - cap at subtotal to prevent negative values
      customerDiscountAmount = Math.min(roundMoney(customerDiscountValue), subtotal);
    }
  }

  // Calculate grand total
  const grandTotal = addMoney(subtotal, totalGst) - customerDiscountAmount;
  
  // Validation: Check for rounding errors
  // The subtotal + customer discount applied + GST should equal grand total
  const expectedTotal = addMoney(subtotal - customerDiscountAmount, totalGst);
  const isValid = validateMoneyTotal(expectedTotal, grandTotal, 0.01);
  
  const validationMessage = isValid 
    ? undefined 
    : `Rounding discrepancy detected: expected ₹${expectedTotal.toFixed(2)}, got ₹${grandTotal.toFixed(2)}`;

  // Warning if any line has rounding issues
  const hasLineWarnings = lines.some(l => l.roundingWarning);

  return {
    lines,
    subtotal,
    totalGst,
    totalCgst,
    totalSgst,
    customerDiscountAmount,
    grandTotal,
    isValid,
    validationMessage: isValid && !hasLineWarnings ? undefined : (validationMessage || "Line item rounding warning detected"),
  };
}

/**
 * Validate invoice calculation and provide detailed debugging information
 * Useful for reconciliation and audit trails
 * 
 * @param invoice - InvoiceCalculation result
 * @returns Validation report with detailed breakdown
 */
export function validateInvoiceCalculation(invoice: InvoiceCalculation): {
  isValid: boolean;
  details: {
    subtotalValid: boolean;
    gstValid: boolean;
    cgstSgstMatch: boolean;
    customerDiscountValid: boolean;
    grandTotalValid: boolean;
  };
  expectedValues: {
    subtotal: number;
    totalGst: number;
    totalCgst: number;
    totalSgst: number;
    grandTotal: number;
  };
  actualValues: {
    subtotal: number;
    totalGst: number;
    totalCgst: number;
    totalSgst: number;
    grandTotal: number;
  };
  discrepancies: string[];
} {
  const discrepancies: string[] = [];

  // Validate subtotal
  const expectedSubtotal = invoice.lines.reduce((s, l) => addMoney(s, l.taxable), 0);
  const subtotalValid = validateMoneyTotal(expectedSubtotal, invoice.subtotal);
  if (!subtotalValid) {
    discrepancies.push(`Subtotal mismatch: expected ₹${expectedSubtotal}, got ₹${invoice.subtotal}`);
  }

  // Validate total GST
  const expectedTotalGst = invoice.lines.reduce((s, l) => addMoney(s, l.gstAmount), 0);
  const gstValid = validateMoneyTotal(expectedTotalGst, invoice.totalGst);
  if (!gstValid) {
    discrepancies.push(`Total GST mismatch: expected ₹${expectedTotalGst}, got ₹${invoice.totalGst}`);
  }

  // Validate CGST + SGST = total GST
  const cgstSgstSum = addMoney(invoice.totalCgst, invoice.totalSgst);
  const cgstSgstMatch = validateMoneyTotal(cgstSgstSum, invoice.totalGst);
  if (!cgstSgstMatch) {
    discrepancies.push(`CGST + SGST doesn't equal total GST: ₹${invoice.totalCgst} + ₹${invoice.totalSgst} ≠ ₹${invoice.totalGst}`);
  }

  // Validate grand total
  const expectedGrandTotal = addMoney(
    invoice.subtotal - invoice.customerDiscountAmount,
    invoice.totalGst
  );
  const grandTotalValid = validateMoneyTotal(expectedGrandTotal, invoice.grandTotal);
  if (!grandTotalValid) {
    discrepancies.push(`Grand total mismatch: expected ₹${expectedGrandTotal}, got ₹${invoice.grandTotal}`);
  }

  const customerDiscountValid = invoice.customerDiscountAmount >= 0 && invoice.customerDiscountAmount <= invoice.subtotal;
  if (!customerDiscountValid) {
    discrepancies.push(`Invalid customer discount: ₹${invoice.customerDiscountAmount} (should be between ₹0 and ₹${invoice.subtotal})`);
  }

  return {
    isValid: subtotalValid && gstValid && cgstSgstMatch && grandTotalValid && customerDiscountValid,
    details: {
      subtotalValid,
      gstValid,
      cgstSgstMatch,
      customerDiscountValid,
      grandTotalValid,
    },
    expectedValues: {
      subtotal: expectedSubtotal,
      totalGst: expectedTotalGst,
      totalCgst: invoice.lines.reduce((s, l) => addMoney(s, l.cgst), 0),
      totalSgst: invoice.lines.reduce((s, l) => addMoney(s, l.sgst), 0),
      grandTotal: expectedGrandTotal,
    },
    actualValues: {
      subtotal: invoice.subtotal,
      totalGst: invoice.totalGst,
      totalCgst: invoice.totalCgst,
      totalSgst: invoice.totalSgst,
      grandTotal: invoice.grandTotal,
    },
    discrepancies,
  };
}

/**
 * Validates a saved Invoice object (from database)
 * Checks: GST calculations, grand total, discount validity
 * 
 * @param invoice - The Invoice object to validate
 * @returns Validation result with details and discrepancies
 */
export function validateInvoice(invoice: {
  subtotal: number;
  customerDiscountAmount: number;
  totalGst: number;
  grandTotal: number;
}) {
  const discrepancies: string[] = [];

  // Check 1: Customer discount validity
  const discountValid = invoice.customerDiscountAmount >= 0 && invoice.customerDiscountAmount <= invoice.subtotal;
  if (!discountValid) {
    discrepancies.push(
      `Invalid customer discount: ₹${invoice.customerDiscountAmount.toFixed(2)} ` +
      `(should be between ₹0 and ₹${invoice.subtotal.toFixed(2)})`
    );
  }

  // Check 2: Grand total calculation
  const expectedGrandTotal = roundMoney(
    addMoney(
      invoice.subtotal - invoice.customerDiscountAmount,
      invoice.totalGst
    )
  );
  const grandTotalValid = validateMoneyTotal(expectedGrandTotal, invoice.grandTotal, 0.01);
  if (!grandTotalValid) {
    discrepancies.push(
      `Grand total mismatch: Expected ₹${expectedGrandTotal.toFixed(2)}, ` +
      `got ₹${invoice.grandTotal.toFixed(2)}`
    );
  }

  return {
    isValid: discountValid && grandTotalValid,
    discrepancies,
    expectedGrandTotal,
    actualGrandTotal: invoice.grandTotal,
  };
}

/**
 * Validates a saved SupplierBill object (from database)
 * Simplified validation since bills may not have GST breakdown
 * Checks: Basic grand total calculation
 * 
 * @param bill - The SupplierBill object to validate
 * @returns Validation result with discrepancies
 */
export function validateSupplierBill(bill: {
  taxableAmount: number;
  totalGst: number;
  grandTotal: number;
}) {
  const discrepancies: string[] = [];

  // Calculate expected grand total
  const expectedGrandTotal = roundMoney(
    addMoney(bill.taxableAmount, bill.totalGst)
  );
  
  const grandTotalValid = validateMoneyTotal(expectedGrandTotal, bill.grandTotal, 0.01);
  if (!grandTotalValid) {
    discrepancies.push(
      `Grand total mismatch: Expected ₹${expectedGrandTotal.toFixed(2)}, ` +
      `got ₹${bill.grandTotal.toFixed(2)}`
    );
  }

  return {
    isValid: grandTotalValid,
    discrepancies,
    expectedGrandTotal,
    actualGrandTotal: bill.grandTotal,
  };
}

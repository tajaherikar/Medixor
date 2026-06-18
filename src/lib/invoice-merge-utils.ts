/**
 * Utility functions for detecting and merging duplicate invoices
 * Groups invoices by invoiceNumber + supplierId + date
 */

import { SupplierBill, SupplierBillItem } from "@/lib/types";
import { combineBillItems } from "@/lib/bill-recovery-utils";

export interface DuplicateGroup {
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  billIds: string[];
  billCount: number;
  dates: string[];
  totalItems: number;
  shouldMerge: boolean;
  description: string;
}

export interface MergeReport {
  totalBills: number;
  duplicateGroupsFound: number;
  billsToMerge: number;
  groups: DuplicateGroup[];
}

/** Normalize bill date to YYYY-MM-DD for grouping */
export function normalizeBillDate(date: string): string {
  return date.slice(0, 10);
}

/** Build a stable key for duplicate detection */
export function duplicateGroupKey(
  invoiceNumber: string,
  supplierId: string,
  date: string
): string {
  return `${invoiceNumber.trim()}::${supplierId}::${normalizeBillDate(date)}`;
}

/**
 * Analyze supplier bills to find duplicates (same invoice number + supplier + date)
 */
export function analyzeForDuplicates(bills: SupplierBill[]): MergeReport {
  const groupMap = new Map<string, DuplicateGroup>();

  for (const bill of bills) {
    const billDate = normalizeBillDate(bill.date);
    const key = duplicateGroupKey(bill.invoiceNumber, bill.supplierId, billDate);

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        invoiceNumber: bill.invoiceNumber,
        supplierId: bill.supplierId,
        supplierName: bill.supplierName,
        date: billDate,
        billIds: [],
        billCount: 0,
        dates: [],
        totalItems: 0,
        shouldMerge: false,
        description: "",
      });
    }

    const group = groupMap.get(key)!;
    group.billIds.push(bill.id);
    group.billCount += 1;
    group.dates.push(billDate);
    group.totalItems += bill.items.length;
  }

  const duplicateGroups = Array.from(groupMap.values())
    .filter((g) => g.billCount > 1)
    .map((g) => ({
      ...g,
      shouldMerge: true,
      dates: [...new Set(g.dates)].sort(),
      description: `${g.billCount} bills with ${g.totalItems} total items on ${g.date}`,
    }));

  const billsToMerge = duplicateGroups.reduce(
    (sum, g) => sum + (g.billCount - 1),
    0
  );

  return {
    totalBills: bills.length,
    duplicateGroupsFound: duplicateGroups.length,
    billsToMerge,
    groups: duplicateGroups,
  };
}

function resolvePaymentStatus(
  paidAmount: number,
  grandTotal: number
): SupplierBill["paymentStatus"] {
  if (paidAmount >= grandTotal) return "paid";
  if (paidAmount > 0) return "partial";
  return "unpaid";
}

/**
 * Merge multiple bills into the first one
 * Returns the merged bill and list of bill IDs that were merged
 */
export function mergeInvoiceGroup(
  billsToMerge: SupplierBill[]
): { mergedBill: SupplierBill; mergedBillIds: string[] } {
  if (billsToMerge.length === 0) {
    throw new Error("No bills to merge");
  }

  if (billsToMerge.length === 1) {
    return {
      mergedBill: billsToMerge[0],
      mergedBillIds: [],
    };
  }

  const sorted = [...billsToMerge].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const primaryBill = sorted[0];
  const otherBills = sorted.slice(1);
  const mergedBillIds = otherBills.map((b) => b.id);

  // Flatten all items and combine lines with the same batch + item (sum quantities)
  const mergedItems = combineBillItems(
    billsToMerge.flatMap((b) => b.items)
  );

  const taxableAmount = mergedItems.reduce((s, i) => s + (i.taxableAmount || 0), 0);
  const totalGst = mergedItems.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0), 0);
  const grandTotal = taxableAmount + totalGst;
  const paidAmount = billsToMerge.reduce((s, b) => s + (b.paidAmount ?? 0), 0);

  const mergedBill: SupplierBill = {
    ...primaryBill,
    items: mergedItems,
    taxableAmount,
    totalGst,
    grandTotal,
    paidAmount,
    paymentStatus: resolvePaymentStatus(paidAmount, grandTotal),
    editedAt: new Date().toISOString(),
  };

  return {
    mergedBill,
    mergedBillIds,
  };
}

/**
 * Generate a human-readable report of what will be merged
 */
export function generateMergeReport(report: MergeReport): string {
  if (report.duplicateGroupsFound === 0) {
    return "✅ No duplicate invoices found!";
  }

  let text = `🔍 Found ${report.duplicateGroupsFound} duplicate invoice groups\n`;
  text += `📊 Total: ${report.totalBills} bills, ${report.billsToMerge} will be consolidated\n\n`;

  for (const group of report.groups) {
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Invoice: ${group.invoiceNumber} | Supplier: ${group.supplierName}\n`;
    text += `Date: ${group.date} | Bills: ${group.billCount} | Items: ${group.totalItems}\n`;
    text += `Bill IDs: ${group.billIds.join(", ")}\n`;
  }

  return text;
}

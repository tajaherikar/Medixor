/**
 * Reconcile supplier bills with inventory batch records.
 */

import { Batch, SupplierBill, SupplierBillItem } from "@/lib/types";
import { calculateGst } from "@/lib/gst-calculator";

export interface OrphanBatchGroup {
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  batchIds: string[];
  batchCount: number;
  earliestDate: string;
}

export interface RecoveryReport {
  totalBatches: number;
  orphanGroups: number;
  batchesWithoutBill: number;
  groups: OrphanBatchGroup[];
}

export interface IncompleteBill {
  billId: string;
  invoiceNumber: string;
  supplierName: string;
  date: string;
  billItemCount: number;
  inventoryBatchCount: number;
  expectedItemCount: number;
  billTotalQty: number;
  expectedTotalQty: number;
}

export interface SyncReport {
  totalBills: number;
  incompleteBills: number;
  bills: IncompleteBill[];
}

export interface ReconcileReport {
  recovery: RecoveryReport;
  sync: SyncReport;
}

function billLookupKey(supplierId: string, invoiceNumber: string): string {
  return `${supplierId}::${invoiceNumber.trim().toLowerCase()}`;
}

function lineItemKey(item: Pick<SupplierBillItem, "batchNumber" | "itemName">): string {
  return `${item.batchNumber.trim().toLowerCase()}::${item.itemName.trim().toLowerCase()}`;
}

/** Combine line items that share batch number + item name (sum quantities and amounts) */
export function combineBillItems(items: SupplierBillItem[]): SupplierBillItem[] {
  const map = new Map<string, SupplierBillItem>();

  for (const item of items) {
    const key = lineItemKey(item);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...item });
      continue;
    }

    existing.quantity += item.quantity;
    existing.schemeQuantity = (existing.schemeQuantity ?? 0) + (item.schemeQuantity ?? 0);
    existing.taxableAmount += item.taxableAmount ?? 0;
    existing.cgst += item.cgst ?? 0;
    existing.sgst += item.sgst ?? 0;
    existing.lineTotal += item.lineTotal ?? 0;
    if (item.schemePattern && !existing.schemePattern) {
      existing.schemePattern = item.schemePattern;
    }
  }

  return Array.from(map.values());
}

function batchesForBill(bill: SupplierBill, batches: Batch[]): Batch[] {
  const inv = bill.invoiceNumber.trim().toLowerCase();
  const supplierName = bill.supplierName?.trim().toLowerCase();

  return batches.filter((b) => {
    if (!b.invoiceNumber?.trim()) return false;
    if (b.invoiceNumber.trim().toLowerCase() !== inv) return false;
    if (bill.supplierId && b.supplierId === bill.supplierId) return true;
    if (supplierName && b.supplierName?.trim().toLowerCase() === supplierName) return true;
    return false;
  });
}

function gstHintForBatch(
  batch: Batch,
  existingItems: SupplierBillItem[]
): SupplierBillItem["gstRate"] {
  const match = existingItems.find(
    (i) =>
      i.batchNumber.trim().toLowerCase() === batch.batchNumber.trim().toLowerCase() &&
      i.itemName.trim().toLowerCase() === batch.itemName.trim().toLowerCase()
  );
  return match?.gstRate ?? 12;
}

function batchToBillItem(
  batch: Batch,
  gstRate: SupplierBillItem["gstRate"] = 12
): SupplierBillItem {
  const quantity = batch.originalQty ?? batch.availableQty;
  const gross = batch.purchasePrice * quantity;
  const gst = calculateGst(gross, gstRate, false);

  return {
    itemName: batch.itemName,
    hsnCode: "3004",
    batchNumber: batch.batchNumber,
    expiryDate: batch.expiryDate,
    mrp: batch.mrp,
    purchasePrice: batch.purchasePrice,
    quantity,
    gstRate,
    taxableAmount: gst.taxable,
    cgst: gst.cgst,
    sgst: gst.sgst,
    lineTotal: gst.taxable + gst.gstAmount,
    ...(batch.unitType && { unitType: batch.unitType }),
    ...(batch.packSize && { packSize: batch.packSize }),
    ...(batch.schemeQuantity && { schemeQuantity: batch.schemeQuantity }),
    ...(batch.schemePattern && { schemePattern: batch.schemePattern }),
  };
}

/** One bill line per inventory batch — preserves all stock records as separate lines */
export function batchesToBillItemsPerBatch(
  batches: Batch[],
  existingItems: SupplierBillItem[] = []
): SupplierBillItem[] {
  return batches.map((b) => batchToBillItem(b, gstHintForBatch(b, existingItems)));
}

/** Build bill line items from inventory batches (combine duplicate batch+item keys) */
export function batchesToBillItems(batches: Batch[]): SupplierBillItem[] {
  return combineBillItems(batches.map((b) => batchToBillItem(b)));
}

function billTotals(items: SupplierBillItem[]) {
  const taxableAmount = items.reduce((s, i) => s + (i.taxableAmount || 0), 0);
  const totalGst = items.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0), 0);
  return {
    taxableAmount,
    totalGst,
    grandTotal: taxableAmount + totalGst,
  };
}

/** Find inventory batch groups that have no matching supplier bill */
export function analyzeOrphanBatches(
  batches: Batch[],
  bills: SupplierBill[]
): RecoveryReport {
  const existingBillKeys = new Set(
    bills.map((b) => billLookupKey(b.supplierId, b.invoiceNumber))
  );

  const groupMap = new Map<string, OrphanBatchGroup>();

  for (const batch of batches) {
    if (!batch.invoiceNumber?.trim()) continue;

    const key = billLookupKey(batch.supplierId, batch.invoiceNumber);
    if (existingBillKeys.has(key)) continue;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        supplierId: batch.supplierId,
        supplierName: batch.supplierName,
        invoiceNumber: batch.invoiceNumber,
        batchIds: [],
        batchCount: 0,
        earliestDate: batch.createdAt.slice(0, 10),
      });
    }

    const group = groupMap.get(key)!;
    group.batchIds.push(batch.id);
    group.batchCount += 1;
    const batchDate = batch.createdAt.slice(0, 10);
    if (batchDate < group.earliestDate) {
      group.earliestDate = batchDate;
    }
  }

  const groups = Array.from(groupMap.values()).sort((a, b) =>
    b.earliestDate.localeCompare(a.earliestDate)
  );

  return {
    totalBatches: batches.length,
    orphanGroups: groups.length,
    batchesWithoutBill: groups.reduce((s, g) => s + g.batchCount, 0),
    groups,
  };
}

/** Find existing bills with fewer items than matching inventory batches */
export function analyzeIncompleteBills(
  batches: Batch[],
  bills: SupplierBill[]
): SyncReport {
  const incomplete: IncompleteBill[] = [];

  for (const bill of bills) {
    const matching = batchesForBill(bill, batches);
    if (matching.length === 0) continue;

    const expectedItems = batchesToBillItemsPerBatch(matching, bill.items);
    const billQty = bill.items.reduce((s, i) => s + i.quantity, 0);
    const expectedQty = expectedItems.reduce((s, i) => s + i.quantity, 0);

    const needsSync =
      matching.length > bill.items.length ||
      expectedItems.length > bill.items.length ||
      expectedQty > billQty + 0.001;

    if (needsSync) {
      incomplete.push({
        billId: bill.id,
        invoiceNumber: bill.invoiceNumber,
        supplierName: bill.supplierName,
        date: bill.date.slice(0, 10),
        billItemCount: bill.items.length,
        inventoryBatchCount: matching.length,
        expectedItemCount: expectedItems.length,
        billTotalQty: billQty,
        expectedTotalQty: expectedQty,
      });
    }
  }

  return {
    totalBills: bills.length,
    incompleteBills: incomplete.length,
    bills: incomplete.sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export function analyzeReconciliation(
  batches: Batch[],
  bills: SupplierBill[]
): ReconcileReport {
  return {
    recovery: analyzeOrphanBatches(batches, bills),
    sync: analyzeIncompleteBills(batches, bills),
  };
}

/** Build a supplier bill from a group of orphan batches */
export function buildBillFromBatches(
  tenantId: string,
  batches: Batch[],
  group: OrphanBatchGroup
): SupplierBill {
  const groupBatches = batches.filter((b) => group.batchIds.includes(b.id));
  const items = batchesToBillItemsPerBatch(groupBatches);
  const totals = billTotals(items);

  return {
    id: `sbill-recovered-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tenantId,
    supplierId: group.supplierId,
    supplierName: group.supplierName,
    invoiceNumber: group.invoiceNumber,
    date: group.earliestDate,
    items,
    ...totals,
    paymentStatus: "unpaid",
    paidAmount: 0,
    dueDate: group.earliestDate,
    createdAt: new Date().toISOString(),
    editedAt: new Date().toISOString(),
  };
}

/** Rebuild a bill's line items from matching inventory batches */
export function syncBillFromBatches(
  bill: SupplierBill,
  batches: Batch[]
): SupplierBill {
  const matching = batchesForBill(bill, batches);
  const items = batchesToBillItemsPerBatch(matching, bill.items);
  const totals = billTotals(items);
  const paidAmount = bill.paidAmount ?? 0;

  return {
    ...bill,
    items,
    ...totals,
    paymentStatus:
      paidAmount >= totals.grandTotal
        ? "paid"
        : paidAmount > 0
        ? "partial"
        : "unpaid",
    editedAt: new Date().toISOString(),
  };
}

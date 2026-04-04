import { addDays, isBefore, isAfter, parseISO } from "date-fns";
import { Batch, BatchSelectionStrategy, InventoryStatus, UnitType } from "@/lib/types";

// ─── Inventory Status ─────────────────────────────────────────────────────────

export function getInventoryStatus(expiryDate: string): InventoryStatus {
  const today = new Date();
  const expiry = parseISO(expiryDate);
  const nearExpiryThreshold = addDays(today, 90);

  if (isBefore(expiry, today)) return "expired";
  if (isBefore(expiry, nearExpiryThreshold)) return "near_expiry";
  return "active";
}

// ─── Batch Sorting Strategies ─────────────────────────────────────────────────

/**
 * FEFO: First Expiry First Out — sort by expiryDate ascending (nearest expiry first)
 */
export function sortByFEFO(batches: Batch[]): Batch[] {
  return [...batches].sort(
    (a, b) => parseISO(a.expiryDate).getTime() - parseISO(b.expiryDate).getTime()
  );
}

/**
 * FIFO: First In First Out — sort by createdAt ascending (oldest entry first)
 */
export function sortByFIFO(batches: Batch[]): Batch[] {
  return [...batches].sort(
    (a, b) => parseISO(a.createdAt).getTime() - parseISO(b.createdAt).getTime()
  );
}

/**
 * Returns non-expired batches with available stock, sorted by chosen strategy.
 */
export function getAvailableBatches(
  batches: Batch[],
  strategy: Exclude<BatchSelectionStrategy, "manual">
): Batch[] {
  const withStock = batches.filter(
    (b) => b.availableQty > 0 && getInventoryStatus(b.expiryDate) !== "expired"
  );
  return strategy === "fefo" ? sortByFEFO(withStock) : sortByFIFO(withStock);
}

// ─── Quantity Split Logic ─────────────────────────────────────────────────────

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  itemName: string;
  expiryDate: string;
  mrp: number;
  allocatedQty: number;
  unitType?: UnitType;
  packSize?: number;
}

/**
 * Splits requested quantity across multiple batches.
 * Returns an array of allocations (one entry per batch used).
 * Throws if total available stock is insufficient.
 */
export function allocateQuantity(
  sortedBatches: Batch[],
  requestedQty: number
): BatchAllocation[] {
  const totalAvailable = sortedBatches.reduce(
    (sum, b) => sum + b.availableQty,
    0
  );
  if (totalAvailable < requestedQty) {
    throw new Error(
      `Insufficient stock. Requested: ${requestedQty}, Available: ${totalAvailable}`
    );
  }

  const allocations: BatchAllocation[] = [];
  let remaining = requestedQty;

  for (const batch of sortedBatches) {
    if (remaining <= 0) break;
    const allocate = Math.min(batch.availableQty, remaining);
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      itemName: batch.itemName,
      expiryDate: batch.expiryDate,
      mrp: batch.mrp,
      allocatedQty: allocate,
      ...(batch.unitType && { unitType: batch.unitType }),
      ...(batch.packSize && { packSize: batch.packSize }),
    });
    remaining -= allocate;
  }

  return allocations;
}

// ─── Scheme / Free Samples Utilities ──────────────────────────────────────────

/**
 * Calculate actual inventory quantity including scheme/free samples
 * @param paidQty - Quantity paid for (billed quantity)
 * @param schemeQty - Free samples received
 * @returns Total inventory quantity (paid + scheme)
 */
export function calculateTotalInventoryQty(
  paidQty: number,
  schemeQty?: number
): number {
  return paidQty + (schemeQty || 0);
}

/**
 * Parse scheme pattern to extract paid qty and scheme qty
 * Examples: "10+1" → {paid: 10, scheme: 1}, "20+2" → {paid: 20, scheme: 2}
 * @param pattern - Pattern string like "10+1" or "10+5"
 * @returns Object with paid and scheme quantities
 */
export function parseSchemePattern(
  pattern: string
): { paid: number; scheme: number } | null {
  const match = pattern.match(/^(\d+)\+(\d+)$/);
  if (!match) return null;
  return {
    paid: parseInt(match[1], 10),
    scheme: parseInt(match[2], 10),
  };
}

/**
 * Calculate profit margin benefit from scheme
 * @param schemeQty - Free items given
 * @param mrp - Selling price per unit
 * @param purchasePrice - Cost per unit
 * @returns Object with scheme benefit (as revenue and margin)
 */
export function calculateSchemeBenefit(
  schemeQty: number,
  mrp: number,
  purchasePrice: number
): { schemeRevenue: number; schemeMarginPerUnit: number; totalSchemeMargin: number } {
  return {
    schemeRevenue: schemeQty * mrp,
    schemeMarginPerUnit: mrp - purchasePrice,
    totalSchemeMargin: schemeQty * (mrp - purchasePrice),
  };
}

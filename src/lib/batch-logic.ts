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

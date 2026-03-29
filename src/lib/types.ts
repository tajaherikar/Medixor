// ─── Shared TypeScript Types ──────────────────────────────────────────────────

export type InventoryStatus = "active" | "near_expiry" | "expired";

export type BatchSelectionStrategy = "fefo" | "fifo" | "manual";

export type DiscountType = "percentage" | "flat";

// ─── Supplier ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string; // ISO date string
}

// ─── Batch ───────────────────────────────────────────────────────────────────

export interface Batch {
  id: string;
  tenantId: string;
  itemName: string;
  batchNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  expiryDate: string; // ISO date string (YYYY-MM-DD)
  mrp: number;
  purchasePrice: number;
  availableQty: number;
  originalQty: number;
  status: InventoryStatus;
  createdAt: string; // ISO date string — used for FIFO ordering
}

// ─── Supplier Bill (Stock Inward) ─────────────────────────────────────────────

export interface SupplierBillItem {
  itemName: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  purchasePrice: number;
  quantity: number;
}

export interface SupplierBill {
  id: string;
  tenantId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  items: SupplierBillItem[];
  createdAt: string;
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface CustomerDiscount {
  type: DiscountType;
  value: number; // % or flat amount
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  discount?: CustomerDiscount;
  createdAt: string;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  batchId: string;
  itemName: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  quantity: number;
  discountType?: DiscountType;
  discountValue?: number; // % or flat
  lineTotal: number; // after item discount
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  lineItems: InvoiceLineItem[];
  customerDiscountType?: DiscountType;
  customerDiscountValue?: number;
  subtotal: number;
  customerDiscountAmount: number;
  grandTotal: number;
  createdAt: string;
}

// ─── Billing Draft (in-progress invoice, lives in Zustand) ───────────────────

export interface BillingLineItemDraft {
  batchId: string;
  itemName: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  quantity: number;
  availableQty: number;
  discountType: DiscountType;
  discountValue: number;
}

export interface BillingDraft {
  customerId: string | null;
  customerName: string;
  strategy: BatchSelectionStrategy;
  lineItems: BillingLineItemDraft[];
}

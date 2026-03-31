// ─── Shared TypeScript Types ──────────────────────────────────────────────────

export type InventoryStatus = "active" | "near_expiry" | "expired";

export type BatchSelectionStrategy = "fefo" | "fifo" | "manual";

export type DiscountType = "percentage" | "flat";

export type PaymentStatus = "paid" | "partial" | "unpaid";

export type GstRate = 0 | 5 | 12 | 18 | 28;

export type DoctorType = "doctor" | "lab" | "consultant";

// ─── App User ────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "viewer";

export interface AppUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string; // ISO date string
}

// ─── Doctor (Reference Person) ───────────────────────────────────────────────

export interface Doctor {
  id: string;
  tenantId: string;
  name: string;
  type: DoctorType;
  phone?: string;
  targetAmount: number; // monthly billing target in ₹
  createdAt: string;
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

// ─── Supplier Bill (Stock Inward / GRN) ──────────────────────────────────────

export interface SupplierBillItem {
  itemName: string;
  hsnCode: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  purchasePrice: number;
  quantity: number;
  gstRate: GstRate; // 0 | 5 | 12 | 18 | 28
  taxableAmount: number; // purchasePrice * qty before GST
  cgst: number;
  sgst: number;
  lineTotal: number; // after GST
}

export interface SupplierBill {
  id: string;
  tenantId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  items: SupplierBillItem[];
  taxableAmount: number;
  totalGst: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  dueDate: string;
  createdAt: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  tenantId: string;
  partyId: string;          // supplierId or customerId
  partyType: "supplier" | "customer";
  invoiceId: string;
  amount: number;
  date: string;
  mode: "cash" | "upi" | "bank" | "cheque";
  reference?: string;
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
  hsnCode: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  quantity: number;
  discountType?: DiscountType;
  discountValue?: number; // % or flat
  lineTotal: number;      // after item discount, before GST
  gstRate: GstRate;
  taxableAmount: number;  // == lineTotal
  cgst: number;
  sgst: number;
  gstAmount: number;
  lineTotalWithGst: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  referredById?: string;        // Doctor ID (linked to doctors table)
  referredBy?: string;          // Doctor / Lab / Consultant name (free-text fallback)
  lineItems: InvoiceLineItem[];
  customerDiscountType?: DiscountType;
  customerDiscountValue?: number;
  subtotal: number;
  customerDiscountAmount: number;
  taxableAmount: number;
  totalGst: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  dueDate: string;
  createdAt: string;
}

// ─── Billing Draft (in-progress invoice, lives in Zustand) ───────────────────

export interface BillingLineItemDraft {
  batchId: string;
  itemName: string;
  hsnCode: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  quantity: number;
  availableQty: number;
  discountType: DiscountType;
  discountValue: number;
  gstRate: GstRate;
}

export interface BillingDraft {
  customerId: string | null;
  customerName: string;
  strategy: BatchSelectionStrategy;
  lineItems: BillingLineItemDraft[];
}

// ─── Business / Tenant Settings ───────────────────────────────────────────────

export interface BusinessSettings {
  // Identity
  businessName: string;
  logoBase64: string | null;   // data URI — used in print headers
  gstin: string;
  address: string;
  phone: string;

  // Appearance
  accentHue: number;           // oklch hue — 196=teal(default), 240=blue, 275=violet …

  // Invoice
  invoicePrefix: string;       // e.g. "INV-" → INV-2026-001
  invoiceFooter: string;       // text printed at bottom of invoice
}

export const defaultBusinessSettings: BusinessSettings = {
  businessName: "",
  logoBase64: null,
  gstin: "",
  address: "",
  phone: "",
  accentHue: 196,
  invoicePrefix: "INV-",
  invoiceFooter: "Thank you for your business.",
};


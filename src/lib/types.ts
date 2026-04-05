// ─── Shared TypeScript Types ──────────────────────────────────────────────────

export type InventoryStatus = "active" | "near_expiry" | "expired";

export type BatchSelectionStrategy = "fefo" | "fifo" | "manual";

export type DiscountType = "percentage" | "flat";

export type PaymentStatus = "paid" | "partial" | "unpaid";

export type GstRate = 0 | 5 | 12 | 18 | 28;

export type DoctorType = "doctor" | "lab" | "consultant";

// ─── Pharmaceutical Unit Types ────────────────────────────────────────────────
// Dosage form of the medicine (used in inventory & billing)
export type UnitType =
  // Solid / Oral Solid
  | "Tab"        // Tablet (plain)
  | "Cap"        // Capsule
  | "SR Tab"     // Sustained Release Tablet
  | "ER Tab"     // Extended Release Tablet
  | "XR Tab"     // Extended Release (alternate brand labelling)
  | "CR Tab"     // Controlled Release Tablet
  | "EC Tab"     // Enteric Coated Tablet (acid-resistant)
  | "DT"         // Dispersible Tablet (dissolves in water - paediatric)
  | "MD Tab"     // Mouth Dissolving / Fast Dissolving Tablet
  | "Chew Tab"   // Chewable Tablet
  | "Eff Tab"    // Effervescent Tablet
  | "SL Tab"     // Sub-Lingual Tablet
  | "SF Tab"     // Sugar-Free Tablet
  | "Loz"        // Lozenge
  | "Gran"       // Granules
  | "Pellets"    // Pellets / Sprinkles
  | "Sachet"     // Sachet (ORS, probiotics, etc.)
  // Liquid
  | "Syp"        // Syrup
  | "Susp"       // Suspension (shake before use)
  | "Sol"        // Solution
  | "Drops"      // Oral Drops
  | "Eye Drops"  // Ophthalmic Drops
  | "Ear Drops"  // Otic Drops
  | "Nasal Drops"// Nasal Drops
  | "Nasal Spray"// Nasal Spray
  | "Mouth Wash" // Mouth Wash / Gargle
  // Injectable
  | "Inj"        // Injection (ampoule or vial)
  | "Vial"       // Multi-dose Vial (insulin, vaccines)
  | "Amp"        // Ampoule (sealed glass)
  | "IV Inf"     // IV Infusion (NS, RL, DNS bag)
  // Topical / External
  | "Cream"      // Cream (tube/jar)
  | "Oint"       // Ointment
  | "Gel"        // Gel
  | "Lotion"     // Lotion
  | "Dusting Pwd"// Dusting Powder
  | "Spray"      // Topical / Throat Spray
  | "Patch"      // Transdermal Patch
  | "Shampoo"    // Medicated Shampoo
  | "Soap"       // Medicated Soap
  // Respiratory
  | "MDI"        // Metered Dose Inhaler (puffer)
  | "Rotacap"    // Rotahaler Capsule (for inhalation)
  | "Turbuhaler" // Turbuhaler Dry Powder Inhaler
  | "Neb Sol"    // Nebulization Solution
  // Other
  | "Supp"       // Suppository
  | "Pessary"    // Vaginal Pessary
  | "Device";    // Medical Device (strips, syringes, lancets);

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
  address?: string;
  gstNumber?: string;
  licenseNumber?: string;
  createdAt: string; // ISO date string
}

// ─── Doctor (Reference Person) ───────────────────────────────────────────────

export interface Doctor {
  id: string;
  tenantId: string;
  name: string;
  type: DoctorType;
  phone?: string;
  allocatedAmount: number; // monthly credit/budget given to doctor in ₹
  targetPercentage: number; // target growth percentage (e.g., 20 for 20%)
  targetAmount: number; // derived: allocatedAmount × (1 + targetPercentage/100)
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
  unitType?: UnitType;  // dosage form (Tab, Cap, Syp, Inj, Cream...)
  packSize?: number;    // units per strip/bottle (e.g. 10 for Tab 10, 60 for 60ml)
  createdAt: string; // ISO date string — used for FIFO ordering
  // ─── Scheme / Free Samples ─────────────────────────────────────────────────
  schemeQuantity?: number; // Free samples received (e.g., 1 in "10+1")
  schemePattern?: string; // Pattern: "10+1", "10+5" etc.
  // Note: originalQty = paid quantity; availableQty = paid + scheme (total inventory)
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
  gstInclusive?: boolean; // true when line total including GST
  taxableAmount: number; // purchasePrice * qty before GST (or adjusted for inclusive)
  cgst: number;
  sgst: number;
  lineTotal: number; // after GST
  unitType?: UnitType;
  packSize?: number;
  // ─── Scheme / Free Samples ─────────────────────────────────────────────────
  schemeQuantity?: number; // Number of free items (e.g., 1 in "10+1" scheme)
  schemePattern?: string; // Pattern for reference: "10+1", "10+5", "20+2" etc.
  // Note: Cost calculations are based on quantity only, not schemeQuantity
}

export interface SupplierBill {
  id: string;
  tenantId: string;
  supplierId: string;
  supplierName: string;
  supplierGstNumber?: string;
  supplierLicenseNumber?: string;
  supplierAddress?: string;
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
  editedAt?: string;
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
  address?: string;
  gstNumber?: string;
  licenseNumber?: string;
  discount?: CustomerDiscount;
  createdAt: string;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  batchId: string;
  itemName: string;
  unitType?: UnitType;
  packSize?: number;
  hsnCode: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  quantity: number;
  discountType?: DiscountType;
  discountValue?: number; // % or flat
  gstInclusive?: boolean; // true when MRP includes GST
  lineTotal: number;      // after item discount, before GST (or adjusted for inclusive)
  gstRate: GstRate;
  taxableAmount: number;  // == lineTotal (for exclusive) or lineTotal / (1 + gstRate/100) for inclusive
  cgst: number;
  sgst: number;
  gstAmount: number;
  lineTotalWithGst: number;
  // ─── Scheme / Free Samples ─────────────────────────────────────────────────
  schemeQuantity?: number; // Number of free items offered to customer (e.g., 1 in "10+1")
  schemePattern?: string; // Pattern for reference: "10+1", "10+5", "20+2" etc.
  // Note: Billing is based on quantity only, schemeQuantity is informational for customer
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerGstNumber?: string;
  customerLicenseNumber?: string;
  customerAddress?: string;
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
  showReferenceField: boolean; // show/hide the Doctor/Lab/Consultant reference field in invoice builder
  enableQuickBilling: boolean; // enable quick billing mode (minimal customer details required)

  // Inventory
  lowStockThreshold: number;   // batches with availableQty below this are flagged as low stock
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
  showReferenceField: false,
  enableQuickBilling: false,
  lowStockThreshold: 20,
};

